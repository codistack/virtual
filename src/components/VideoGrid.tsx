import React, { useState } from 'react';
import { Participant, UserRole } from '../types';
import { VideoTile } from './VideoTile';

interface VideoGridProps {
  localUser: {
    id: string;
    name: string;
    role: UserRole;
    isMuted: boolean;
    isVideoOff: boolean;
    isScreenSharing: boolean;
    stream: MediaStream | null;
  };
  remoteParticipants: Participant[];
  currentUserRole?: UserRole;
  onAdminControlMedia?: (
    targetSocketId: string,
    mediaType: 'audio' | 'video',
    action: 'mute' | 'unmute' | 'turn-off' | 'request-on'
  ) => void;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  localUser,
  remoteParticipants,
  currentUserRole,
  onAdminControlMedia
}) => {
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  // Check if someone is sharing screen
  const screenSharer =
    (localUser.isScreenSharing ? localUser : null) ||
    remoteParticipants.find((p) => p.isScreenSharing);

  // If someone is sharing screen or pinned, use stage mode
  const activeStageId = screenSharer ? screenSharer.id : pinnedId;

  const allParticipants = [
    {
      id: localUser.id,
      name: localUser.name,
      role: localUser.role,
      isLocal: true,
      stream: localUser.stream,
      isMuted: localUser.isMuted,
      isVideoOff: localUser.isVideoOff,
      isScreenSharing: localUser.isScreenSharing
    },
    ...remoteParticipants.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      isLocal: false,
      stream: p.stream || null,
      isMuted: p.isMuted,
      isVideoOff: p.isVideoOff,
      isScreenSharing: p.isScreenSharing
    }))
  ];

  const stageParticipant = activeStageId
    ? allParticipants.find((p) => p.id === activeStageId)
    : null;

  const filmstripParticipants = activeStageId
    ? allParticipants.filter((p) => p.id !== activeStageId)
    : [];

  const handleTogglePin = (id: string) => {
    setPinnedId((current) => (current === id ? null : id));
  };

  // Determine grid columns classes for standard grid
  const totalCount = allParticipants.length;

  let gridColsClass = 'grid-cols-1';
  if (totalCount === 2) {
    gridColsClass = 'grid-cols-1 md:grid-cols-2';
  } else if (totalCount >= 3 && totalCount <= 4) {
    gridColsClass = 'grid-cols-1 sm:grid-cols-2';
  } else if (totalCount >= 5 && totalCount <= 6) {
    gridColsClass = 'grid-cols-2 md:grid-cols-3';
  } else if (totalCount > 6) {
    gridColsClass = 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
  }

  return (
    <div
      id="video-grid-container"
      className="flex-1 w-full h-full p-3 sm:p-4 md:p-6 overflow-hidden flex flex-col justify-center items-center"
    >
      {/* 1. Stage Mode (Screen Share or Pinned participant) */}
      {stageParticipant ? (
        <div className="w-full h-full flex flex-col lg:flex-row gap-3 overflow-hidden">
          {/* Main Stage View */}
          <div className="flex-1 w-full h-full min-h-[300px] flex items-center justify-center overflow-hidden">
            <VideoTile
              id={stageParticipant.id}
              name={stageParticipant.name}
              role={stageParticipant.role}
              isLocal={stageParticipant.isLocal}
              stream={stageParticipant.stream}
              isMuted={stageParticipant.isMuted}
              isVideoOff={stageParticipant.isVideoOff}
              isScreenSharing={stageParticipant.isScreenSharing}
              isPinned={true}
              onTogglePin={() => handleTogglePin(stageParticipant.id)}
              currentUserRole={currentUserRole}
              onAdminControlMedia={onAdminControlMedia}
            />
          </div>

          {/* Side / Bottom Filmstrip */}
          {filmstripParticipants.length > 0 && (
            <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto lg:w-64 xl:w-72 flex-shrink-0 max-h-40 lg:max-h-full py-1">
              {filmstripParticipants.map((p) => (
                <div
                  key={p.id}
                  className="w-48 lg:w-full h-32 lg:h-44 flex-shrink-0"
                >
                  <VideoTile
                    id={p.id}
                    name={p.name}
                    role={p.role}
                    isLocal={p.isLocal}
                    stream={p.stream}
                    isMuted={p.isMuted}
                    isVideoOff={p.isVideoOff}
                    isScreenSharing={p.isScreenSharing}
                    isPinned={false}
                    onTogglePin={() => handleTogglePin(p.id)}
                    currentUserRole={currentUserRole}
                    onAdminControlMedia={onAdminControlMedia}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* 2. Standard Grid Mode */
        <div
          className={`grid ${gridColsClass} gap-3 sm:gap-4 w-full h-full max-w-7xl max-h-[84vh] auto-rows-fr items-center justify-center`}
        >
          {allParticipants.map((p) => (
            <div key={p.id} className="w-full h-full min-h-[160px] flex items-center justify-center">
              <VideoTile
                id={p.id}
                name={p.name}
                role={p.role}
                isLocal={p.isLocal}
                stream={p.stream}
                isMuted={p.isMuted}
                isVideoOff={p.isVideoOff}
                isScreenSharing={p.isScreenSharing}
                isPinned={false}
                onTogglePin={() => handleTogglePin(p.id)}
                currentUserRole={currentUserRole}
                onAdminControlMedia={onAdminControlMedia}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
