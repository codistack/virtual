import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorOff,
  MessageSquare,
  CircleDot,
  Pause,
  Play,
  Square,
  LogOut
} from 'lucide-react';
import { UserRole } from '../types';

interface BottomControlsProps {
  role: UserRole;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
  isChatOpen: boolean;
  unreadChatCount: number;
  // Recording props
  isRecording: boolean;
  isPaused: boolean;
  isStudentLocalRecording: boolean;
  // Actions
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleChat: () => void;
  onStartAdminRecording: () => void;
  onPauseAdminRecording: () => void;
  onResumeAdminRecording: () => void;
  onStopAdminRecording: () => void;
  onToggleStudentRecording: () => void;
  onRequestExit: () => void;
}

export const BottomControls: React.FC<BottomControlsProps> = ({
  role,
  isAudioMuted,
  isVideoMuted,
  isScreenSharing,
  isChatOpen,
  unreadChatCount,
  isRecording,
  isPaused,
  isStudentLocalRecording,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleChat,
  onStartAdminRecording,
  onPauseAdminRecording,
  onResumeAdminRecording,
  onStopAdminRecording,
  onToggleStudentRecording,
  onRequestExit
}) => {
  const [showRecordingMenu, setShowRecordingMenu] = useState(false);

  const activeRecording = role === 'admin' ? isRecording : isStudentLocalRecording;

  const handleRecordButtonClick = () => {
    if (role === 'admin') {
      if (!isRecording) {
        onStartAdminRecording();
      } else {
        setShowRecordingMenu((prev) => !prev);
      }
    } else {
      // Student: direct toggle "Grabar mi clase"
      onToggleStudentRecording();
    }
  };

  return (
    <footer
      id="bottom-controls-bar"
      className="h-20 bg-slate-950/95 border-t border-slate-800/90 flex items-center justify-center px-4 z-30 select-none relative backdrop-blur-lg"
    >
      <div className="flex items-center gap-2 sm:gap-4 md:gap-6 max-w-2xl mx-auto">
        {/* 1. Micrófono */}
        <button
          id="btn-toggle-mic"
          onClick={onToggleAudio}
          className={`group relative flex flex-col items-center justify-center w-14 sm:w-16 h-14 rounded-2xl transition-all duration-200 cursor-pointer ${
            isAudioMuted
              ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
              : 'bg-slate-800/90 text-slate-100 hover:bg-slate-700/90 border border-slate-700/60 shadow-sm'
          }`}
          title={isAudioMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
        >
          {isAudioMuted ? (
            <MicOff className="w-5 h-5 sm:w-6 sm:h-6" />
          ) : (
            <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
          )}
          <span className="text-[10px] sm:text-[11px] font-medium tracking-tight mt-1 opacity-90">
            {isAudioMuted ? 'Silenciado' : 'Micrófono'}
          </span>
        </button>

        {/* 2. Cámara */}
        <button
          id="btn-toggle-camera"
          onClick={onToggleVideo}
          className={`group relative flex flex-col items-center justify-center w-14 sm:w-16 h-14 rounded-2xl transition-all duration-200 cursor-pointer ${
            isVideoMuted
              ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
              : 'bg-slate-800/90 text-slate-100 hover:bg-slate-700/90 border border-slate-700/60 shadow-sm'
          }`}
          title={isVideoMuted ? 'Iniciar video' : 'Detener video'}
        >
          {isVideoMuted ? (
            <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" />
          ) : (
            <Video className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
          )}
          <span className="text-[10px] sm:text-[11px] font-medium tracking-tight mt-1 opacity-90">
            {isVideoMuted ? 'Cámara off' : 'Cámara'}
          </span>
        </button>

        {/* 3. Compartir pantalla */}
        <button
          id="btn-toggle-screenshare"
          onClick={onToggleScreenShare}
          className={`group relative flex flex-col items-center justify-center w-14 sm:w-16 h-14 rounded-2xl transition-all duration-200 cursor-pointer ${
            isScreenSharing
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-500'
              : 'bg-slate-800/90 text-slate-100 hover:bg-slate-700/90 border border-slate-700/60 shadow-sm'
          }`}
          title={isScreenSharing ? 'Dejar de compartir' : 'Compartir pantalla (pantalla, ventana o pestaña)'}
        >
          {isScreenSharing ? (
            <MonitorOff className="w-5 h-5 sm:w-6 sm:h-6" />
          ) : (
            <MonitorUp className="w-5 h-5 sm:w-6 sm:h-6" />
          )}
          <span className="text-[10px] sm:text-[11px] font-medium tracking-tight mt-1 opacity-90 truncate max-w-[56px]">
            {isScreenSharing ? 'Compartiendo' : 'Compartir'}
          </span>
        </button>

        {/* 4. Chat */}
        <button
          id="btn-toggle-chat"
          onClick={onToggleChat}
          className={`group relative flex flex-col items-center justify-center w-14 sm:w-16 h-14 rounded-2xl transition-all duration-200 cursor-pointer ${
            isChatOpen
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
              : 'bg-slate-800/90 text-slate-100 hover:bg-slate-700/90 border border-slate-700/60 shadow-sm'
          }`}
          title="Abrir chat de la clase"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
            {!isChatOpen && unreadChatCount > 0 && (
              <span
                id="badge-chat-unread-count"
                className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow"
              >
                {unreadChatCount > 9 ? '9+' : unreadChatCount}
              </span>
            )}
          </div>
          <span className="text-[10px] sm:text-[11px] font-medium tracking-tight mt-1 opacity-90">
            Chat
          </span>
        </button>

        {/* 5. Grabar */}
        <div className="relative">
          <button
            id="btn-toggle-recording"
            onClick={handleRecordButtonClick}
            className={`group relative flex flex-col items-center justify-center w-14 sm:w-16 h-14 rounded-2xl transition-all duration-200 cursor-pointer ${
              activeRecording
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/40 animate-pulse'
                : 'bg-slate-800/90 text-slate-100 hover:bg-slate-700/90 border border-slate-700/60 shadow-sm'
            }`}
            title={
              role === 'admin'
                ? isRecording
                  ? 'Gestionar grabación'
                  : 'Iniciar grabación de la clase'
                : isStudentLocalRecording
                  ? 'Detener grabación de mi clase'
                  : 'Grabar mi clase (se guarda en tu dispositivo)'
            }
          >
            <CircleDot className={`w-5 h-5 sm:w-6 sm:h-6 ${activeRecording ? 'text-white' : 'text-red-400'}`} />
            <span className="text-[10px] sm:text-[11px] font-medium tracking-tight mt-1 opacity-90">
              {role === 'admin'
                ? isRecording
                  ? (isPaused ? 'Pausada' : 'Grabando')
                  : 'Grabar'
                : isStudentLocalRecording
                  ? 'Grabando'
                  : 'Grabar'}
            </span>
          </button>

          {/* Admin Recording Management Popover */}
          {role === 'admin' && isRecording && showRecordingMenu && (
            <div
              id="popover-admin-recording-menu"
              className="absolute bottom-18 left-1/2 -translate-x-1/2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-1 text-xs backdrop-blur-md"
            >
              <div className="px-2 py-1 text-slate-400 font-semibold border-b border-slate-800 text-[11px]">
                Control de Grabación
              </div>
              {isPaused ? (
                <button
                  id="btn-resume-recording"
                  onClick={() => {
                    onResumeAdminRecording();
                    setShowRecordingMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-2.5 py-2 text-left rounded-lg text-emerald-400 hover:bg-emerald-950/40 transition cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  <span>Reanudar grabación</span>
                </button>
              ) : (
                <button
                  id="btn-pause-recording"
                  onClick={() => {
                    onPauseAdminRecording();
                    setShowRecordingMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-2.5 py-2 text-left rounded-lg text-amber-400 hover:bg-amber-950/40 transition cursor-pointer"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pausar grabación</span>
                </button>
              )}
              <button
                id="btn-stop-recording"
                onClick={() => {
                  onStopAdminRecording();
                  setShowRecordingMenu(false);
                }}
                className="flex items-center gap-2 w-full px-2.5 py-2 text-left rounded-lg text-red-400 hover:bg-red-950/40 transition cursor-pointer"
              >
                <Square className="w-4 h-4" />
                <span>Detener y descargar</span>
              </button>
            </div>
          )}
        </div>

        {/* 6. Salir */}
        <button
          id="btn-exit-meeting"
          onClick={onRequestExit}
          className="group relative flex flex-col items-center justify-center w-14 sm:w-16 h-14 rounded-2xl bg-red-600/90 hover:bg-red-600 text-white shadow-lg shadow-red-900/30 transition-all duration-200 cursor-pointer"
          title={role === 'admin' ? 'Finalizar o salir de la reunión' : 'Salir de la reunión'}
        >
          <LogOut className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="text-[10px] sm:text-[11px] font-medium tracking-tight mt-1 opacity-95">
            Salir
          </span>
        </button>
      </div>
    </footer>
  );
};
