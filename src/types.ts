export type UserRole = 'admin' | 'student';

export interface Participant {
  id: string;
  name: string;
  role: UserRole;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  stream?: MediaStream;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

export interface RoomDetails {
  id: string;
  title: string;
  createdAt: number;
  adminSocketId: string;
  isRecording: boolean;
  participantsCount: number;
}

export interface RecordingStatus {
  isRecording: boolean;
  isPaused: boolean;
  durationSeconds: number;
  isLocalOnly: boolean;
}
