// WebRTC Configuration and Peer Connection Helpers

export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
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

  // Add local tracks to peer connection if available
  if (localStream) {
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });
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
  newTrack: MediaStreamTrack | null
) {
  for (const socketId of Object.keys(peerConnections)) {
    const pc = peerConnections[socketId];
    const senders = pc.getSenders();
    const videoSender = senders.find((s) => s.track && s.track.kind === 'video');

    if (videoSender) {
      if (newTrack) {
        await videoSender.replaceTrack(newTrack);
      }
    } else if (newTrack) {
      // If no video sender previously, add track
      pc.addTrack(newTrack);
    }
  }
}
