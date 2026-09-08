// WebRTC Configuration and Peer Connection Helpers

export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ],
  iceCandidatePoolSize: 10,
};

export interface PeerConnectionMap {
  [socketId: string]: RTCPeerConnection;
}

export function createPeerConnection(
  targetSocketId: string,
  localStream: MediaStream | null,
  onIceCandidate: (candidate: RTCIceCandidate) => void,
  onRemoteTrack: (event: RTCTrackEvent) => void,
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void
): RTCPeerConnection {
  const pc = new RTCPeerConnection(ICE_SERVERS);

  // Add existing local tracks
  if (localStream) {
    localStream.getTracks().forEach((track) => {
      try {
        pc.addTrack(track, localStream);
      } catch (err) {
        console.warn('Error adding track to peer connection:', err);
      }
    });
  }

  // Ensure transceivers exist for both audio and video
  // so SDP offers and answers always contain media m-lines
  const senders = pc.getSenders();
  const hasAudioSender = senders.some((s) => s.track?.kind === 'audio');
  const hasVideoSender = senders.some((s) => s.track?.kind === 'video');

  if (!hasAudioSender) {
    try {
      pc.addTransceiver('audio', { direction: 'sendrecv' });
    } catch (e) {
      console.warn('Could not add audio transceiver:', e);
    }
  }

  if (!hasVideoSender) {
    try {
      pc.addTransceiver('video', { direction: 'sendrecv' });
    } catch (e) {
      console.warn('Could not add video transceiver:', e);
    }
  }

  // ICE candidate event
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      onIceCandidate(event.candidate);
    }
  };

  // Remote track event
  pc.ontrack = (event) => {
    onRemoteTrack(event);
  };

  // Connection state change
  pc.onconnectionstatechange = () => {
    if (onConnectionStateChange) {
      onConnectionStateChange(pc.connectionState);
    }
  };

  return pc;
}

/**
 * Replace outgoing video track (e.g. switching between webcam and screen share)
 */
export async function replaceVideoTrack(
  peerConnections: PeerConnectionMap,
  newTrack: MediaStreamTrack | null,
  fallbackStream?: MediaStream | null
) {
  for (const socketId of Object.keys(peerConnections)) {
    const pc = peerConnections[socketId];
    if (!pc || pc.signalingState === 'closed') continue;

    const senders = pc.getSenders();
    const videoSender = senders.find(
      (s) => s.track && s.track.kind === 'video'
    );

    if (videoSender) {
      try {
        await videoSender.replaceTrack(newTrack);
      } catch (e) {
        console.warn('Error replacing video track:', e);
      }
    } else if (newTrack && fallbackStream) {
      try {
        pc.addTrack(newTrack, fallbackStream);
      } catch (e) {
        console.warn('Error adding video track:', e);
      }
    }
  }
}

/**
 * Replace outgoing audio track
 */
export async function replaceAudioTrack(
  peerConnections: PeerConnectionMap,
  newTrack: MediaStreamTrack | null,
  fallbackStream?: MediaStream | null
) {
  for (const socketId of Object.keys(peerConnections)) {
    const pc = peerConnections[socketId];
    if (!pc || pc.signalingState === 'closed') continue;

    const senders = pc.getSenders();
    const audioSender = senders.find(
      (s) => s.track && s.track.kind === 'audio'
    );

    if (audioSender) {
      try {
        await audioSender.replaceTrack(newTrack);
      } catch (e) {
        console.warn('Error replacing audio track:', e);
      }
    } else if (newTrack && fallbackStream) {
      try {
        pc.addTrack(newTrack, fallbackStream);
      } catch (e) {
        console.warn('Error adding audio track:', e);
      }
    }
  }
}
