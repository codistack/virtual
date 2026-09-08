import React, { useState } from 'react';
import { Copy, Check, ShieldCheck, Users, Radio, Sparkles, MessageCircle } from 'lucide-react';
import { UserRole } from '../types';
import { formatDuration } from '../utils/recorder';

interface HeaderBarProps {
  roomTitle: string;
  roomId: string;
  passcode?: string;
  role: UserRole;
  participantCount: number;
  isMeetingRecording: boolean;
  meetingRecordingSeconds: number;
  isLocalRecording: boolean;
  localRecordingSeconds: number;
  onToggleParticipants?: () => void;
  isParticipantsOpen?: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  roomTitle,
  roomId,
  passcode,
  role,
  participantCount,
  isMeetingRecording,
  meetingRecordingSeconds,
  isLocalRecording,
  localRecordingSeconds,
  onToggleParticipants,
  isParticipantsOpen = false
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedPasscode, setCopiedPasscode] = useState(false);

  const getDirectLink = () => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const passParam = passcode ? `&passcode=${encodeURIComponent(passcode)}` : '';
    return `${origin}${pathname}?room=${encodeURIComponent(roomId)}${passParam}`;
  };

  const handleCopyLink = async () => {
    const fullUrl = getDirectLink();
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      prompt('Copia el enlace de la sala:', fullUrl);
    }
  };

  const handleCopyPasscodeOnly = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!passcode) return;
    try {
      await navigator.clipboard.writeText(passcode);
      setCopiedPasscode(true);
      setTimeout(() => setCopiedPasscode(false), 2000);
    } catch {}
  };

  const handleShareWhatsApp = () => {
    const fullUrl = getDirectLink();
    const msg =
      `📚 *Enlace para unirse a la clase virtual*\n\n` +
      `📌 *Clase:* ${roomTitle}\n` +
      `🆔 *ID de Sala:* *${roomId}*\n` +
      (passcode ? `🔑 *Código de inicio de sesión:* *${passcode}*\n\n` : '\n') +
      `🔗 *Entra directamente aquí:* \n${fullUrl}\n\n` +
      `_Abre el enlace para sincronizarte en vivo con audio y video._`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <header
      id="header-bar"
      className="h-16 px-4 md:px-6 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between text-white select-none z-30 transition-all"
    >
      {/* Left: Meeting title and Room ID with Copy Link */}
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm shadow-blue-500/30 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm md:text-base font-semibold text-slate-100 truncate max-w-[180px] sm:max-w-xs md:max-w-md">
              {roomTitle || 'Clase Virtual'}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
              <span className="font-mono text-slate-300">ID: {roomId}</span>

              {passcode && (
                <>
                  <span className="text-slate-600">•</span>
                  <button
                    onClick={handleCopyPasscodeOnly}
                    title="Copiar código de acceso"
                    className="flex items-center gap-1 font-mono text-blue-300 hover:text-white bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-500/30 cursor-pointer"
                  >
                    <span>Código: {passcode}</span>
                    {copiedPasscode ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-blue-400" />
                    )}
                  </button>
                </>
              )}

              <span className="text-slate-600">•</span>
              <button
                id="btn-copy-invite-link"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors font-medium cursor-pointer"
                title="Copiar enlace de invitación completo con código"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">¡Enlace copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar enlace</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Center: Prominent Recording Indicator */}
      <div className="flex items-center gap-2">
        {isMeetingRecording && (
          <div
            id="badge-meeting-recording"
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-500/40 text-red-300 text-xs font-semibold animate-pulse shadow-sm shadow-red-900/30"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <Radio className="w-3.5 h-3.5 text-red-400" />
            <span>REC {formatDuration(meetingRecordingSeconds)}</span>
            <span className="hidden sm:inline text-red-400 font-normal">| Clase en grabación</span>
          </div>
        )}

        {isLocalRecording && !isMeetingRecording && (
          <div
            id="badge-local-recording"
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs font-semibold shadow-sm"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Mi grabación {formatDuration(localRecordingSeconds)}</span>
          </div>
        )}
      </div>

      {/* Right: WhatsApp Share, Role indicator & Participant Counter / Drawer Toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* WhatsApp Share Button */}
        <button
          id="btn-header-share-whatsapp"
          onClick={handleShareWhatsApp}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-bold text-xs shadow-sm transition cursor-pointer"
          title="Compartir enlace de la clase por WhatsApp"
        >
          <MessageCircle className="w-3.5 h-3.5 fill-slate-950" />
          <span>WhatsApp</span>
        </button>

        {/* Role badge */}
        <div
          id="badge-user-role"
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            role === 'admin'
              ? 'bg-blue-950/60 border-blue-500/30 text-blue-300'
              : 'bg-slate-800/80 border-slate-700 text-slate-300'
          }`}
        >
          {role === 'admin' ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Administrador</span>
            </>
          ) : (
            <span>Estudiante</span>
          )}
        </div>

        {/* Participants count button (Toggles drawer) */}
        {onToggleParticipants ? (
          <button
            id="badge-participant-count"
            onClick={onToggleParticipants}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
              isParticipantsOpen
                ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                : 'bg-slate-800/90 hover:bg-slate-800 border-slate-700/80 text-slate-200'
            }`}
            title="Ver y gestionar participantes"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Participantes ({participantCount})</span>
          </button>
        ) : (
          <div
            id="badge-participant-count"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/90 border border-slate-700/80 text-slate-200 text-xs font-medium"
            title="Participantes en la sala"
          >
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>{participantCount}</span>
          </div>
        )}
      </div>
    </header>
  );
};
