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

export interface ScheduledClass {
  id: string; // Room ID (e.g., "MAT-4820")
  title: string;
  subject?: string;
  scheduledDate: string; // "YYYY-MM-DD"
  scheduledTime: string; // "HH:MM"
  durationMinutes: number; // e.g. 60
  passcode: string; // Student entry passcode, e.g. "749210"
  description?: string;
  instructorName: string;
  createdAt: number;
  status: 'scheduled' | 'live' | 'completed';
  activeParticipantsCount?: number;
}

export interface RemoteMediaCommand {
  mediaType: 'audio' | 'video';
  action: 'mute' | 'unmute' | 'turn-off' | 'request-on';
  adminName: string;
}
