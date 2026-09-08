import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Participant, ChatMessage, UserRole } from './types';
import { HeaderBar } from './components/HeaderBar';
import { VideoGrid } from './components/VideoGrid';
import { BottomControls } from './components/BottomControls';
import { ChatDrawer } from './components/ChatDrawer';
import { Lobby } from './components/Lobby';
import { RecordingModal } from './components/RecordingModal';
import { ExitModal } from './components/ExitModal';
import { createPeerConnection, replaceVideoTrack } from './utils/webrtc';
import { MeetingRecorder, RecordedFile } from './utils/recorder';

export default function App() {
  // Session & Room State
  const [isInMeeting, setIsInMeeting] = useState<boolean>(false);
  const [roomId, setRoomId] = useState<string>('');
  const [roomTitle, setRoomTitle] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [userRole, setUserRole] = useState<UserRole>('student');
  const [socketId, setSocketId] = useState<string>('');

  // Media streams & hardware toggles
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);

  // Participants & Chat
  const [remoteParticipants, setRemoteParticipants] = useState<Participant[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);

  // Recording State
  const [isMeetingRecording, setIsMeetingRecording] = useState<boolean>(false);
  const [meetingRecordingSeconds, setMeetingRecordingSeconds] = useState<number>(0);
  const [isAdminRecordingPaused, setIsAdminRecordingPaused] = useState<boolean>(false);

  const [isStudentRecording, setIsStudentRecording] = useState<boolean>(false);
  const [studentRecordingSeconds, setStudentRecordingSeconds] = useState<number>(0);

  const [recordedFile, setRecordedFile] = useState<RecordedFile | null>(null);
  const [isRecordingModalOpen, setIsRecordingModalOpen] = useState<boolean>(false);

  // Exit Modal
  const [isExitModalOpen, setIsExitModalOpen] = useState<boolean>(false);
  const [endedByAdminMessage, setEndedByAdminMessage] = useState<string | null>(null);

  // Refs for WebRTC & Socket
  const socketRef = useRef<Record<string, any> | null>(null);
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MeetingRecorder>(new MeetingRecorder());
  const meetingTimerIntervalRef = useRef<any>(null);

  // Check URL params for room invitation
  const [initialRoomFromUrl, setInitialRoomFromUrl] = useState<string>('');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setInitialRoomFromUrl(roomParam.toUpperCase());
    }
  }, []);

  // Sync ref with local stream
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Clean up WebRTC peer connections
  const cleanupPeerConnections = useCallback(() => {
    Object.keys(peerConnectionsRef.current).forEach((key) => {
      const pc = peerConnectionsRef.current[key];
      if (pc) {
        pc.close();
      }
    });
    peerConnectionsRef.current = {};
  }, []);

  // Leave room handler
  const handleLeaveRoom = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('leave-room');
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    cleanupPeerConnections();

    // Stop tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
    }

    // Stop recorder if running
    if (recorderRef.current.getState() !== 'inactive') {
      recorderRef.current.stopRecording().catch(() => {});
    }

    if (meetingTimerIntervalRef.current) {
      clearInterval(meetingTimerIntervalRef.current);
    }

    setIsInMeeting(false);
    setRemoteParticipants([]);
    setChatMessages([]);
    setIsScreenSharing(false);
    setIsMeetingRecording(false);
    setIsStudentRecording(false);
    setIsExitModalOpen(false);
  }, [cleanupPeerConnections, screenStream]);

  // Handle Admin End Room for all
  const handleEndRoomForAll = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('admin-end-room');
    }
    handleLeaveRoom();
  }, [handleLeaveRoom]);

  // Join handler called from Lobby
  const handleJoinFromLobby = async (config: {
    roomId: string;
    roomTitle: string;
    name: string;
    role: UserRole;
    isAudioMuted: boolean;
    isVideoMuted: boolean;
    localStream: MediaStream | null;
  }) => {
    setRoomId(config.roomId);
    setRoomTitle(config.roomTitle);
    setUserName(config.name);
    setUserRole(config.role);
    setIsAudioMuted(config.isAudioMuted);
    setIsVideoMuted(config.isVideoMuted);

    // Enter meeting room immediately without blocking
    setIsInMeeting(true);

    const activeStream = config.localStream;
    setLocalStream(activeStream);
    localStreamRef.current = activeStream;

    // Asynchronously try to get media stream if not available from lobby
    if (!activeStream && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          setLocalStream(stream);
          localStreamRef.current = stream;
        })
        .catch((err) => {
          console.warn('Unable to get media devices on join:', err);
        });
    }

    // Connect to Socket.IO signaling server (polling first for instant connection, then upgrade)
    const socket = io({
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      timeout: 10000
    });
    socketRef.current = socket;

    const emitJoin = () => {
      setSocketId(socket.id || '');
      socket.emit('join-room', {
        roomId: config.roomId,
        title: config.roomTitle,
        name: config.name,
        role: config.role,
        isMuted: config.isAudioMuted,
        isVideoOff: config.isVideoMuted
      });
    };

    if (socket.connected) {
      emitJoin();
    } else {
      socket.on('connect', emitJoin);
    }

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error (retrying):', err);
    });

    // Room joined callback from server
    socket.on('room-joined', async (data: {
      room: { id: string; title: string; isRecording: boolean };
      self: any;
      participants: Participant[];
      messages: ChatMessage[];
    }) => {
      if (data.room?.title) {
        setRoomTitle(data.room.title);
      }
      setIsMeetingRecording(!!data.room?.isRecording);
      setChatMessages(data.messages || []);

      // Existing participants in the room
      const initialRemotes: Participant[] = data.participants.map((p) => ({
        ...p,
        stream: new MediaStream()
      }));
      setRemoteParticipants(initialRemotes);

      // Create WebRTC offer for each existing participant
      for (const participant of data.participants) {
        const pc = createPeerConnection(
          participant.id,
          localStreamRef.current,
          (candidate) => {
            socket.emit('signal', {
              target: participant.id,
              signalData: candidate,
              type: 'candidate'
            });
          },
          (event) => {
            // Received remote track
            setRemoteParticipants((prev) =>
              prev.map((p) => {
                if (p.id === participant.id) {
                  const s = p.stream || new MediaStream();
                  if (!s.getTracks().some((t) => t.id === event.track.id)) {
                    s.addTrack(event.track);
                  }
                  return { ...p, stream: s };
                }
                return p;
              })
            );
          }
        );

        peerConnectionsRef.current[participant.id] = pc;

        // Create and send offer
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('signal', {
            target: participant.id,
            signalData: offer,
            type: 'offer'
          });
        } catch (err) {
          console.error('Error creating WebRTC offer:', err);
        }
      }
    });

    // When another user joins after us
    socket.on('user-joined', (newUser: Participant) => {
      setRemoteParticipants((prev) => {
        if (prev.some((p) => p.id === newUser.id)) return prev;
        return [...prev, { ...newUser, stream: new MediaStream() }];
      });
    });

    // WebRTC Signaling Relay
    socket.on('signal', async ({ caller, signalData, type }: { caller: string; signalData: any; type: string }) => {
      let pc = peerConnectionsRef.current[caller];

      if (!pc) {
        pc = createPeerConnection(
          caller,
          localStreamRef.current,
          (candidate) => {
            socket.emit('signal', {
              target: caller,
              signalData: candidate,
              type: 'candidate'
            });
          },
          (event) => {
            setRemoteParticipants((prev) =>
              prev.map((p) => {
                if (p.id === caller) {
                  const s = p.stream || new MediaStream();
                  if (!s.getTracks().some((t) => t.id === event.track.id)) {
                    s.addTrack(event.track);
                  }
                  return { ...p, stream: s };
                }
                return p;
              })
            );
          }
        );
        peerConnectionsRef.current[caller] = pc;
      }

      if (type === 'offer') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('signal', {
            target: caller,
            signalData: answer,
            type: 'answer'
          });
        } catch (err) {
          console.error('Error handling WebRTC offer:', err);
        }
      } else if (type === 'answer') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        } catch (err) {
          console.error('Error handling WebRTC answer:', err);
        }
      } else if (type === 'candidate') {
        try {
          if (signalData) {
            await pc.addIceCandidate(new RTCIceCandidate(signalData));
          }
        } catch (err) {
          console.error('Error handling ICE candidate:', err);
        }
      }
    });

    // Remote user media toggle
    socket.on('user-media-toggled', ({ userId, type, enabled }: { userId: string; type: string; enabled: boolean }) => {
      setRemoteParticipants((prev) =>
        prev.map((p) => {
          if (p.id === userId) {
            if (type === 'audio') return { ...p, isMuted: !enabled };
            if (type === 'video') return { ...p, isVideoOff: !enabled };
            if (type === 'screen') return { ...p, isScreenSharing: enabled };
          }
          return p;
        })
      );
    });

    // Chat message received
    socket.on('new-chat-message', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
      setIsChatOpen((open) => {
        if (!open && !msg.isSystem) {
          setUnreadChatCount((count) => count + 1);
        }
        return open;
      });
    });

    // Recording state changed by Admin
    socket.on('recording-state-changed', ({ isRecording }: { isRecording: boolean }) => {
      setIsMeetingRecording(isRecording);
      if (isRecording) {
        setMeetingRecordingSeconds(0);
        if (meetingTimerIntervalRef.current) clearInterval(meetingTimerIntervalRef.current);
        meetingTimerIntervalRef.current = setInterval(() => {
          setMeetingRecordingSeconds((s) => s + 1);
        }, 1000);
      } else {
        if (meetingTimerIntervalRef.current) {
          clearInterval(meetingTimerIntervalRef.current);
        }
      }
    });

    // User left room
    socket.on('user-left', ({ userId }: { userId: string }) => {
      if (peerConnectionsRef.current[userId]) {
        peerConnectionsRef.current[userId].close();
        delete peerConnectionsRef.current[userId];
      }
      setRemoteParticipants((prev) => prev.filter((p) => p.id !== userId));
    });

    // Admin ended room for all
    socket.on('room-ended', ({ reason }: { reason: string }) => {
      setEndedByAdminMessage(reason || 'La clase ha finalizado.');
      handleLeaveRoom();
    });
  };

  // Toggle local microphone
  const handleToggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        const nextState = !audioTrack.enabled;
        audioTrack.enabled = nextState;
        setIsAudioMuted(!nextState);

        if (socketRef.current) {
          socketRef.current.emit('toggle-media', {
            type: 'audio',
            enabled: nextState
          });
        }
      }
    }
  };

  // Toggle local camera
  const handleToggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        const nextState = !videoTrack.enabled;
        videoTrack.enabled = nextState;
        setIsVideoMuted(!nextState);

        if (socketRef.current) {
          socketRef.current.emit('toggle-media', {
            type: 'video',
            enabled: nextState
          });
        }
      }
    }
  };

  // Toggle Screen Share (1-click: Full screen, window, or tab)
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen sharing
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);

      // Restore camera track to peer connections
      const cameraVideoTrack = localStream?.getVideoTracks()[0] || null;
      await replaceVideoTrack(peerConnectionsRef.current, cameraVideoTrack);

      if (socketRef.current) {
        socketRef.current.emit('toggle-media', {
          type: 'screen',
          enabled: false
        });
      }
    } else {
      // Start screen sharing
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'monitor',
            frameRate: { ideal: 30 }
          },
          audio: true
        });

        setScreenStream(displayStream);
        setIsScreenSharing(true);

        const screenTrack = displayStream.getVideoTracks()[0];

        // Replace track on all active peer connections
        await replaceVideoTrack(peerConnectionsRef.current, screenTrack);

        if (socketRef.current) {
          socketRef.current.emit('toggle-media', {
            type: 'screen',
            enabled: true
          });
        }

        // Handle user stopping screen share via browser float bar
        screenTrack.onended = async () => {
          setIsScreenSharing(false);
          setScreenStream(null);
          const camTrack = localStream?.getVideoTracks()[0] || null;
          await replaceVideoTrack(peerConnectionsRef.current, camTrack);

          if (socketRef.current) {
            socketRef.current.emit('toggle-media', {
              type: 'screen',
              enabled: false
            });
          }
        };
      } catch (err) {
        console.warn('Screen share cancelled or failed:', err);
      }
    }
  };

  // Toggle chat drawer
  const handleToggleChat = () => {
    setIsChatOpen((prev) => {
      if (!prev) setUnreadChatCount(0);
      return !prev;
    });
  };

  // Send Chat message
  const handleSendMessage = (text: string) => {
    if (socketRef.current && text.trim()) {
      socketRef.current.emit('send-chat-message', { text: text.trim() });
    }
  };

  // --- RECORDING HANDLERS ---
  // 1. Admin Recording
  const handleStartAdminRecording = async () => {
    try {
      recorderRef.current.onTimeUpdate = (seconds) => {
        setMeetingRecordingSeconds(seconds);
      };

      await recorderRef.current.startRecording({
        screenStream: screenStream || null,
        localMicStream: localStream,
        captureDisplay: true
      });

      setIsMeetingRecording(true);
      setIsAdminRecordingPaused(false);

      if (socketRef.current) {
        socketRef.current.emit('set-recording-state', { isRecording: true });
      }
    } catch (err: any) {
      console.error('Error starting admin recording:', err);
      alert(err.message || 'No se pudo iniciar la grabación.');
    }
  };

  const handlePauseAdminRecording = () => {
    recorderRef.current.pauseRecording();
    setIsAdminRecordingPaused(true);
  };

  const handleResumeAdminRecording = () => {
    recorderRef.current.resumeRecording();
    setIsAdminRecordingPaused(false);
  };

  const handleStopAdminRecording = async () => {
    try {
      const file = await recorderRef.current.stopRecording();
      setIsMeetingRecording(false);
      setIsAdminRecordingPaused(false);

      if (socketRef.current) {
        socketRef.current.emit('set-recording-state', { isRecording: false });
      }

      setRecordedFile(file);
      setIsRecordingModalOpen(true);
    } catch (err) {
      console.error('Error stopping admin recording:', err);
    }
  };

  // 2. Student Local Recording ("Grabar mi clase")
  const handleToggleStudentRecording = async () => {
    if (!isStudentRecording) {
      try {
        recorderRef.current.onTimeUpdate = (seconds) => {
          setStudentRecordingSeconds(seconds);
        };

        await recorderRef.current.startRecording({
          screenStream: screenStream || null,
          localMicStream: localStream,
          captureDisplay: true
        });

        setIsStudentRecording(true);
      } catch (err: any) {
        console.error('Error starting student recording:', err);
        alert(err.message || 'No se pudo iniciar la grabación en tu dispositivo.');
      }
    } else {
      try {
        const file = await recorderRef.current.stopRecording();
        setIsStudentRecording(false);
        setRecordedFile(file);
        setIsRecordingModalOpen(true);
      } catch (err) {
        console.error('Error stopping student recording:', err);
      }
    }
  };

  // If not in meeting, show clean Lobby
  if (!isInMeeting) {
    return (
      <div className="relative w-full h-full min-h-screen">
        {endedByAdminMessage && (
          <div
            id="banner-ended-by-admin"
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-red-600/95 text-white text-sm font-semibold rounded-2xl shadow-xl flex items-center gap-3 animate-bounce"
          >
            <span>{endedByAdminMessage}</span>
            <button
              onClick={() => setEndedByAdminMessage(null)}
              className="text-xs text-white/80 hover:text-white underline cursor-pointer"
            >
              Entendido
            </button>
          </div>
        )}
        <Lobby
          initialRoomId={initialRoomFromUrl}
          onJoin={handleJoinFromLobby}
        />
      </div>
    );
  }

  // Active meeting view
  const currentLocalStream = screenStream || localStream;

  return (
    <div
      id="app-meeting-container"
      className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden select-none"
    >
      {/* Top Header Bar */}
      <HeaderBar
        roomTitle={roomTitle}
        roomId={roomId}
        role={userRole}
        participantCount={1 + remoteParticipants.length}
        isMeetingRecording={isMeetingRecording}
        meetingRecordingSeconds={meetingRecordingSeconds}
        isLocalRecording={isStudentRecording}
        localRecordingSeconds={studentRecordingSeconds}
      />

      {/* Main Workspace (Video grid + optional Chat Drawer) */}
      <div className="flex-1 flex overflow-hidden relative">
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <VideoGrid
            localUser={{
              id: socketId || 'local-user',
              name: userName,
              role: userRole,
              isMuted: isAudioMuted,
              isVideoOff: isVideoMuted,
              isScreenSharing: isScreenSharing,
              stream: currentLocalStream
            }}
            remoteParticipants={remoteParticipants}
          />
        </main>

        {/* Chat Drawer */}
        <ChatDrawer
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          messages={chatMessages}
          currentUserId={socketId}
          onSendMessage={handleSendMessage}
        />
      </div>

      {/* Bottom Controls Bar (Strictly the 6 required controls) */}
      <BottomControls
        role={userRole}
        isAudioMuted={isAudioMuted}
        isVideoMuted={isVideoMuted}
        isScreenSharing={isScreenSharing}
        isChatOpen={isChatOpen}
        unreadChatCount={unreadChatCount}
        isRecording={isMeetingRecording}
        isPaused={isAdminRecordingPaused}
        isStudentLocalRecording={isStudentRecording}
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleChat={handleToggleChat}
        onStartAdminRecording={handleStartAdminRecording}
        onPauseAdminRecording={handlePauseAdminRecording}
        onResumeAdminRecording={handleResumeAdminRecording}
        onStopAdminRecording={handleStopAdminRecording}
        onToggleStudentRecording={handleToggleStudentRecording}
        onRequestExit={() => setIsExitModalOpen(true)}
      />

      {/* Modals */}
      <RecordingModal
        isOpen={isRecordingModalOpen}
        recordedFile={recordedFile}
        onClose={() => {
          setIsRecordingModalOpen(false);
          setRecordedFile(null);
        }}
      />

      <ExitModal
        isOpen={isExitModalOpen}
        role={userRole}
        onCancel={() => setIsExitModalOpen(false)}
        onLeaveMeeting={handleLeaveRoom}
        onEndMeetingForAll={userRole === 'admin' ? handleEndRoomForAll : undefined}
      />
    </div>
  );
}
