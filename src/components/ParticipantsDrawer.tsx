import React from 'react';
import {
  X,
  Users,
  Mic,
  MicOff,
  Video,
  VideoOff,
  ShieldCheck,
  VolumeX,
  MessageCircle,
  Share2,
  Check
} from 'lucide-react';
import { Participant, UserRole } from '../types';

interface ParticipantsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole: UserRole;
  currentUserId: string;
  currentUserName: string;
  isCurrentUserMuted: boolean;
  isCurrentUserVideoOff: boolean;
  participants: Participant[];
  roomId: string;
  roomTitle: string;
  onAdminControlMedia: (
    targetSocketId: string,
    mediaType: 'audio' | 'video',
    action: 'mute' | 'unmute' | 'turn-off' | 'request-on'
  ) => void;
  onAdminMuteAll: () => void;
}

export const ParticipantsDrawer: React.FC<ParticipantsDrawerProps> = ({
  isOpen,
  onClose,
  currentUserRole,
  currentUserId,
  currentUserName,
  isCurrentUserMuted,
  isCurrentUserVideoOff,
  participants,
  roomId,
  roomTitle,
  onAdminControlMedia,
  onAdminMuteAll
}) => {
  const [copiedLink, setCopiedLink] = React.useState(false);

  if (!isOpen) return null;

  // Combine self + remote participants
  const allList = [
    {
      id: currentUserId,
      name: currentUserName,
      role: currentUserRole,
      isMuted: isCurrentUserMuted,
      isVideoOff: isCurrentUserVideoOff,
      isLocal: true
    },
    ...participants.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      isMuted: p.isMuted,
      isVideoOff: p.isVideoOff,
      isLocal: false
    }))
  ];

  const studentsCount = allList.filter((p) => p.role === 'student').length;

  const handleShareWhatsApp = () => {
    const link = `${window.location.origin}/?room=${encodeURIComponent(roomId)}`;
    const msg =
      `📚 *Enlace para unirse a la clase virtual*\n\n` +
      `📌 *Clase:* ${roomTitle}\n` +
      `🆔 *ID de Sala:* *${roomId}*\n\n` +
      `🔗 *Entra ahora aquí:* \n${link}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/?room=${encodeURIComponent(roomId)}`;
    await navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <aside
      id="participants-drawer"
      className="absolute top-0 right-0 bottom-0 w-80 sm:w-96 bg-slate-900/95 border-l border-slate-800 shadow-2xl flex flex-col z-40 backdrop-blur-xl animate-in slide-in-from-right duration-200"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          <h2 className="text-sm font-bold text-slate-100">
            Participantes ({allList.length})
          </h2>
        </div>
        <button
          id="btn-close-participants-drawer"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Admin Action: Mute All */}
      {currentUserRole === 'admin' && (
        <div className="p-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Estudiantes:</span>
            <span className="font-semibold text-slate-200">{studentsCount}</span>
          </div>
          <button
            id="btn-admin-mute-all"
            onClick={onAdminMuteAll}
            className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title="Silenciar los micrófonos de todos los alumnos de una sola vez"
          >
            <VolumeX className="w-3.5 h-3.5" />
            <span>Silenciar a todos</span>
          </button>
        </div>
      )}

      {/* Participants List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {allList.map((user) => {
          const isStudent = user.role === 'student';
          const canAdminControl = currentUserRole === 'admin' && !user.isLocal && isStudent;

          return (
            <div
              key={user.id}
              id={`participant-row-${user.id}`}
              className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 flex items-center justify-between gap-3 hover:bg-slate-950/80 transition"
            >
              {/* Avatar & User Details */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200 text-xs shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-semibold text-slate-200 truncate">
                      {user.name}
                    </p>
                    {user.isLocal && (
                      <span className="text-[10px] text-blue-400 font-bold shrink-0">
                        (Tú)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    {user.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-400 bg-blue-950/60 px-1.5 py-0.2 rounded border border-blue-500/30">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        Profesor
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">Estudiante</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status / Remote Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* 1. Mic control */}
                {canAdminControl ? (
                  <button
                    id={`btn-admin-control-mic-${user.id}`}
                    onClick={() =>
                      onAdminControlMedia(
                        user.id,
                        'audio',
                        user.isMuted ? 'request-on' : 'mute'
                      )
                    }
                    className={`p-1.5 rounded-lg border transition cursor-pointer ${
                      user.isMuted
                        ? 'bg-red-950/40 border-red-500/40 text-red-400 hover:bg-emerald-950/50 hover:border-emerald-500/40 hover:text-emerald-300'
                        : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:bg-red-950/50 hover:border-red-500/40 hover:text-red-300'
                    }`}
                    title={
                      user.isMuted
                        ? 'Solicitar al estudiante que active su micrófono'
                        : 'Silenciar micrófono del estudiante'
                    }
                  >
                    {user.isMuted ? (
                      <MicOff className="w-3.5 h-3.5" />
                    ) : (
                      <Mic className="w-3.5 h-3.5" />
                    )}
                  </button>
                ) : (
                  <div
                    className={`p-1.5 rounded-lg border text-xs ${
                      user.isMuted
                        ? 'bg-red-950/40 border-red-500/40 text-red-400'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400'
                    }`}
                    title={user.isMuted ? 'Micrófono silenciado' : 'Micrófono activo'}
                  >
                    {user.isMuted ? (
                      <MicOff className="w-3.5 h-3.5" />
                    ) : (
                      <Mic className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                )}

                {/* 2. Video camera control */}
                {canAdminControl ? (
                  <button
                    id={`btn-admin-control-cam-${user.id}`}
                    onClick={() =>
                      onAdminControlMedia(
                        user.id,
                        'video',
                        user.isVideoOff ? 'request-on' : 'turn-off'
                      )
                    }
                    className={`p-1.5 rounded-lg border transition cursor-pointer ${
                      user.isVideoOff
                        ? 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-blue-950/60 hover:border-blue-500/40 hover:text-blue-300'
                        : 'bg-blue-950/40 border-blue-500/40 text-blue-400 hover:bg-red-950/50 hover:border-red-500/40 hover:text-red-300'
                    }`}
                    title={
                      user.isVideoOff
                        ? 'Solicitar al estudiante que encienda su cámara'
                        : 'Apagar cámara del estudiante'
                    }
                  >
                    {user.isVideoOff ? (
                      <VideoOff className="w-3.5 h-3.5" />
                    ) : (
                      <Video className="w-3.5 h-3.5" />
                    )}
                  </button>
                ) : (
                  <div
                    className={`p-1.5 rounded-lg border text-xs ${
                      user.isVideoOff
                        ? 'bg-red-950/40 border-red-500/40 text-red-400'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400'
                    }`}
                    title={user.isVideoOff ? 'Cámara apagada' : 'Cámara activa'}
                  >
                    {user.isVideoOff ? (
                      <VideoOff className="w-3.5 h-3.5" />
                    ) : (
                      <Video className="w-3.5 h-3.5 text-blue-400" />
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Share Options */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-950/80 flex flex-col gap-2">
        <p className="text-[11px] font-semibold text-slate-400">Invitar más estudiantes:</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleShareWhatsApp}
            className="py-2 px-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-slate-950" />
            <span>WhatsApp</span>
          </button>
          <button
            onClick={handleCopyLink}
            className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">¡Copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>Copiar Enlace</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};
