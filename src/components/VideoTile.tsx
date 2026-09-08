import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, ShieldCheck, Monitor, Maximize2, Minimize2 } from 'lucide-react';
import { UserRole } from '../types';

interface VideoTileProps {
  id: string;
  name: string;
  role: UserRole;
  isLocal?: boolean;
  stream?: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing?: boolean;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export const VideoTile: React.FC<VideoTileProps> = ({
  id,
  name,
  role,
  isLocal = false,
  stream,
  isMuted,
  isVideoOff,
  isScreenSharing = false,
  isPinned = false,
  onTogglePin
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (stream) {
      videoElement.srcObject = stream;
      videoElement.play().catch((err) => {
        console.warn(`Video play error for ${name}:`, err);
      });
    } else {
      videoElement.srcObject = null;
    }
  }, [stream]);

  // Initial letter for fallback avatar
  const initial = (name || '?').trim().charAt(0).toUpperCase();

  return (
    <div
      id={`video-tile-${id}`}
      className={`relative w-full h-full bg-slate-900/90 rounded-2xl overflow-hidden border transition-all duration-300 flex items-center justify-center select-none shadow-md ${
        isPinned
          ? 'border-blue-500 shadow-blue-500/20'
          : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // Mute local audio to prevent feedback loop
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isVideoOff || !stream ? 'opacity-0 absolute pointer-events-none' : 'opacity-100'
        } ${isLocal && !isScreenSharing ? 'scale-x-[-1]' : ''}`} // Mirror local camera (except screen share)
      />

      {/* Camera Off Avatar Fallback */}
      {(isVideoOff || !stream) && (
        <div
          id={`avatar-fallback-${id}`}
          className="flex flex-col items-center justify-center gap-3 p-4 text-center z-10"
        >
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 border-2 border-slate-600/80 flex items-center justify-center text-2xl sm:text-3xl font-bold text-slate-200 shadow-xl">
            {initial}
          </div>
          <span className="text-sm font-medium text-slate-300 truncate max-w-[180px]">
            {name} {isLocal && '(Tú)'}
          </span>
        </div>
      )}

      {/* Top badges (Screen sharing or Admin badge) */}
      <div className="absolute top-3 left-3 flex items-center gap-2 z-20">
        {isScreenSharing && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-600/90 text-white text-[11px] font-medium shadow-md backdrop-blur-sm">
            <Monitor className="w-3 h-3" />
            <span>Presentando pantalla</span>
          </span>
        )}
        {role === 'admin' && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-950/80 border border-blue-500/40 text-blue-300 text-[10px] font-semibold">
            <ShieldCheck className="w-3 h-3 text-blue-400" />
            <span>Profesor / Admin</span>
          </span>
        )}
      </div>

      {/* Top right: Pin / Expand tile control */}
      {onTogglePin && (
        <button
          id={`btn-pin-tile-${id}`}
          onClick={onTogglePin}
          className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-opacity backdrop-blur-sm z-20 opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100 cursor-pointer"
          title={isPinned ? 'Desanclar vista' : 'Fijar participante en pantalla grande'}
        >
          {isPinned ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      )}

      {/* Bottom info bar */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-20 pointer-events-none">
        {/* Name pill */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-800/80 text-xs font-medium text-slate-200 truncate max-w-[80%]">
          <span className="truncate">{name}</span>
          {isLocal && <span className="text-blue-400 font-semibold text-[11px]">(Tú)</span>}
        </div>

        {/* Audio status badge */}
        <div
          id={`mic-status-${id}`}
          className={`p-1.5 rounded-lg backdrop-blur-md border transition-colors ${
            isMuted
              ? 'bg-red-950/80 border-red-500/40 text-red-400'
              : 'bg-slate-950/80 border-slate-800 text-emerald-400'
          }`}
          title={isMuted ? 'Micrófono silenciado' : 'Micrófono activo'}
        >
          {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        </div>
      </div>
    </div>
  );
};
