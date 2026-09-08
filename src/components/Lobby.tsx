import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Monitor,
  Loader2,
  KeyRound,
  Calendar,
  AlertCircle,
  LogOut,
  User
} from 'lucide-react';
import { UserRole, UserAccount } from '../types';

interface LobbyProps {
  initialRoomId?: string;
  initialPasscode?: string;
  currentUserAccount?: UserAccount | null;
  onOpenGoogleSignIn?: () => void;
  onSignOutGoogle?: () => void;
  onJoin: (config: {
    roomId: string;
    roomTitle: string;
    name: string;
    role: UserRole;
    isAudioMuted: boolean;
    isVideoMuted: boolean;
    localStream: MediaStream | null;
    passcode?: string;
  }) => void;
  onOpenAdminPanel?: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  initialRoomId = '',
  initialPasscode = '',
  currentUserAccount,
  onOpenGoogleSignIn,
  onSignOutGoogle,
  onJoin,
  onOpenAdminPanel
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>(initialRoomId ? 'join' : 'create');
  const [name, setName] = useState(currentUserAccount?.name || '');
  const [roomTitle, setRoomTitle] = useState('');
  const [roomId, setRoomId] = useState(initialRoomId);
  const [studentPasscode, setStudentPasscode] = useState(initialPasscode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  // Sync props when initialRoomId or initialPasscode changes/arrives
  useEffect(() => {
    if (initialRoomId) {
      setRoomId(initialRoomId);
      setActiveTab('join');
    }
    if (initialPasscode) {
      setStudentPasscode(initialPasscode);
    }
  }, [initialRoomId, initialPasscode]);

  // Sync name with account if logged in
  useEffect(() => {
    if (currentUserAccount?.name && !name) {
      setName(currentUserAccount.name);
    }
  }, [currentUserAccount]);

  // Audio / Video device states in lobby
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize preview stream
  useEffect(() => {
    let active = true;

    async function setupPreview() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: true
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        setLocalStream(stream);
        setPermissionError(null);

        // Audio visualizer setup
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioContextClass();
          audioContextRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkVolume = () => {
            if (!active) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            setAudioLevel(Math.min(100, Math.round((average / 128) * 100)));
            animationFrameRef.current = requestAnimationFrame(checkVolume);
          };
          checkVolume();
        } catch (e) {
          console.warn('Could not setup audio level meter in lobby:', e);
        }
      } catch (err: any) {
        console.warn('getUserMedia error in lobby:', err);
        setPermissionError('No se pudo acceder a la cámara o micrófono. Verifica los permisos de tu navegador.');
      }
    }

    setupPreview();

    return () => {
      active = false;
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Sync stream to video element
  useEffect(() => {
    if (videoPreviewRef.current && localStream) {
      videoPreviewRef.current.srcObject = localStream;
      videoPreviewRef.current.play().catch(() => {});
    }
  }, [localStream]);

  // Sync mute toggles to stream tracks
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => {
        t.enabled = !isAudioMuted;
      });
      localStream.getVideoTracks().forEach((t) => {
        t.enabled = !isVideoMuted;
      });
    }
  }, [isAudioMuted, isVideoMuted, localStream]);

  const handleToggleAudio = () => {
    setIsAudioMuted((prev) => !prev);
  };

  const handleToggleVideo = () => {
    setIsVideoMuted((prev) => !prev);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const finalName = name.trim() || (activeTab === 'create' ? 'Prof. Administrador' : 'Estudiante');

    if (activeTab === 'create') {
      const generatedRoomId =
        'SALA-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      const finalTitle = roomTitle.trim() || `Clase Virtual de ${finalName}`;

      setIsSubmitting(true);
      setRoomError(null);

      onJoin({
        roomId: generatedRoomId,
        roomTitle: finalTitle,
        name: finalName,
        role: 'admin',
        isAudioMuted,
        isVideoMuted,
        localStream
      });
    } else {
      const targetRoom = roomId.trim().toUpperCase();
      if (!targetRoom) {
        setRoomError('Por favor ingresa el código o ID de la sala.');
        return;
      }

      setIsSubmitting(true);
      setRoomError(null);

      let resolvedTitle = `Clase Virtual (${targetRoom})`;

      // Check local storage for matching class first (for instant resilience)
      let localClassMatch: any = null;
      try {
        const stored = localStorage.getItem('virtual_class_scheduled_classes');
        if (stored) {
          const list = JSON.parse(stored);
          localClassMatch = list.find((c: any) => c.id.toUpperCase() === targetRoom);
          if (localClassMatch && localClassMatch.title) {
            resolvedTitle = localClassMatch.title;
          }
        }
      } catch {}

      // Verify passcode if room is a scheduled class
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const verifyRes = await fetch(`/api/scheduled-classes/${encodeURIComponent(targetRoom)}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passcode: studentPasscode.trim() }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (verifyRes.status === 401) {
          const errData = await verifyRes.json();
          setRoomError(errData.error || 'Código de inicio de sesión de estudiante incorrecto.');
          setIsSubmitting(false);
          return;
        } else if (verifyRes.ok) {
          const okData = await verifyRes.json();
          if (okData.title) {
            resolvedTitle = okData.title;
          } else if (okData.class?.title) {
            resolvedTitle = okData.class.title;
          }
        }
      } catch (err) {
        console.warn('Server verification error or offline, checking local cache:', err);
        // If local class exists and has passcode, check it
        if (localClassMatch && localClassMatch.passcode) {
          if (studentPasscode.trim() && studentPasscode.trim() !== localClassMatch.passcode) {
            setRoomError('Código de inicio de sesión de estudiante incorrecto.');
            setIsSubmitting(false);
            return;
          }
        }
      }

      onJoin({
        roomId: targetRoom,
        roomTitle: resolvedTitle,
        name: finalName,
        role: 'student',
        isAudioMuted,
        isVideoMuted,
        localStream,
        passcode: studentPasscode.trim()
      });
    }
  };

  return (
    <div
      id="lobby-container"
      className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-x-hidden"
    >
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col md:flex-row">
        {/* Left Side: Video Preview & Hardware Controls */}
        <div className="w-full md:w-1/2 p-6 sm:p-8 bg-slate-950/60 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/40">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold tracking-wide text-slate-200">
                Videoconferencias HD
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Comprueba tu equipo
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mb-6">
              Ajusta tu cámara y micrófono antes de ingresar a la clase en línea.
            </p>
          </div>

          {/* Camera Video Preview Box */}
          <div className="relative w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner group">
            <video
              ref={videoPreviewRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${
                isVideoMuted || !localStream ? 'opacity-0' : 'opacity-100'
              }`}
            />

            {(isVideoMuted || !localStream) && (
              <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold text-slate-300 border border-slate-700">
                  {name.trim().charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="text-xs text-slate-400">Cámara desactivada</span>
              </div>
            )}

            {/* Mic Level Indicator Pill */}
            {!isAudioMuted && localStream && (
              <div
                id="meter-audio-level"
                className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-800 text-xs text-slate-300"
              >
                <div
                  className="w-2 h-2 rounded-full transition-colors duration-200"
                  style={{
                    backgroundColor: audioLevel > 15 ? '#10b981' : '#64748b'
                  }}
                />
                <span className="text-[10px] font-medium">
                  {audioLevel > 15 ? 'Voz detectada' : 'Micrófono listo'}
                </span>
              </div>
            )}

            {/* Controls Bar over preview */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <button
                id="btn-lobby-toggle-mic"
                type="button"
                onClick={handleToggleAudio}
                className={`p-2.5 rounded-xl backdrop-blur-md border transition-all cursor-pointer ${
                  isAudioMuted
                    ? 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30'
                    : 'bg-slate-900/80 text-emerald-400 border-slate-700 hover:bg-slate-800'
                }`}
                title={isAudioMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
              >
                {isAudioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                id="btn-lobby-toggle-video"
                type="button"
                onClick={handleToggleVideo}
                className={`p-2.5 rounded-xl backdrop-blur-md border transition-all cursor-pointer ${
                  isVideoMuted
                    ? 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30'
                    : 'bg-slate-900/80 text-blue-400 border-slate-700 hover:bg-slate-800'
                }`}
                title={isVideoMuted ? 'Activar cámara' : 'Apagar cámara'}
              >
                {isVideoMuted ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {permissionError && (
            <p className="mt-3 text-xs text-amber-400 bg-amber-950/40 border border-amber-800/60 p-2.5 rounded-xl">
              {permissionError}
            </p>
          )}

          <div className="mt-6 flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-blue-400" /> Pantalla HD
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> WebRTC Seguro
            </span>
          </div>
        </div>

        {/* Right Side: Form (Create or Join) */}
        <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col justify-between bg-slate-900">
          <div>
            {/* Admin Panel Quick Access Banner */}
            {onOpenAdminPanel && (
              <div className="mb-4 flex items-center justify-between p-2.5 bg-blue-950/40 border border-blue-500/30 rounded-2xl">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-600/30 flex items-center justify-center text-blue-400">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200 leading-tight">
                      Panel de Administración
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Programa por fecha/hora y comparte por WhatsApp
                    </p>
                  </div>
                </div>
                <button
                  id="btn-goto-admin-panel"
                  type="button"
                  onClick={onOpenAdminPanel}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
                >
                  Abrir Panel
                </button>
              </div>
            )}

            {/* Google / Gmail Account Status Bar or Sign In */}
            <div className="mb-4">
              {currentUserAccount ? (
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {currentUserAccount.avatarUrl ? (
                      <img
                        src={currentUserAccount.avatarUrl}
                        alt={currentUserAccount.name}
                        className="w-8 h-8 rounded-full border border-blue-500/40 object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                        {currentUserAccount.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-200">
                          {currentUserAccount.name}
                        </span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded-full border border-emerald-500/30">
                          Gmail conectado
                        </span>
                      </div>
                      <span className="text-[11px] text-blue-400 font-mono">
                        {currentUserAccount.email}
                      </span>
                    </div>
                  </div>

                  {onSignOutGoogle && (
                    <button
                      type="button"
                      onClick={onSignOutGoogle}
                      className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-red-400 text-xs flex items-center gap-1 transition cursor-pointer"
                      title="Cerrar sesión de Gmail"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span className="text-[11px] hidden sm:inline">Salir</span>
                    </button>
                  )}
                </div>
              ) : (
                onOpenGoogleSignIn && (
                  <button
                    id="btn-lobby-signin-google"
                    type="button"
                    onClick={onOpenGoogleSignIn}
                    className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 text-slate-200 rounded-2xl flex items-center justify-center gap-2.5 text-xs font-semibold shadow-sm transition cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Iniciar sesión con cuenta de Gmail</span>
                  </button>
                )
              )}
            </div>

            {/* Direct Invitation Banner */}
            {initialRoomId && (
              <div className="mb-4 p-3.5 bg-emerald-950/50 border border-emerald-500/40 rounded-2xl flex items-center gap-3 animate-in fade-in">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-emerald-300">Invitación a Clase Virtual</p>
                  <p className="text-[11px] text-slate-300 truncate">
                    Sala: <span className="font-mono font-bold text-white">{roomId || initialRoomId}</span>
                    {studentPasscode && <span className="ml-2 text-emerald-400">✓ Código verificado</span>}
                  </p>
                </div>
              </div>
            )}

            {/* Tab Navigation */}
            <div
              id="lobby-tabs"
              className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 mb-6"
            >
              <button
                id="tab-create-room"
                type="button"
                onClick={() => setActiveTab('create')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                  activeTab === 'create'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Crear clase (Admin)</span>
              </button>
              <button
                id="tab-join-room"
                type="button"
                onClick={() => setActiveTab('join')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                  activeTab === 'join'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Unirse a clase</span>
              </button>
            </div>

            {/* Form */}
            <form id="form-lobby" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Tu Nombre
                </label>
                <input
                  id="input-user-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={activeTab === 'create' ? 'Ej. Prof. Carlos Mendoza (o deja en blanco)' : 'Ej. María Gómez'}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {activeTab === 'create' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Título de la Clase (Opcional)
                  </label>
                  <input
                    id="input-room-title"
                    type="text"
                    value={roomTitle}
                    onChange={(e) => setRoomTitle(e.target.value)}
                    placeholder="Ej. Matemáticas Aplicadas - Sesión 1"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition"
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Se generará un enlace único para que tus estudiantes puedan ingresar directamente.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Código o ID de la Sala
                    </label>
                    <input
                      id="input-room-id"
                      type="text"
                      value={roomId}
                      onChange={(e) => {
                        setRoomId(e.target.value.toUpperCase());
                        setRoomError(null);
                      }}
                      placeholder="Ej. SALA-9B2F"
                      className={`w-full px-4 py-3 bg-slate-950 border rounded-xl text-slate-100 placeholder-slate-500 text-sm font-mono tracking-wide focus:outline-none transition ${
                        roomError ? 'border-red-500 focus:border-red-500' : 'border-slate-800 focus:border-blue-500'
                      }`}
                    />
                    {roomError ? (
                      <p className="text-[11px] text-red-400 mt-1.5 font-medium">{roomError}</p>
                    ) : (
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        Pega el código de sala proporcionado por tu profesor o anfitrión.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                      <span>Código de Inicio de Sesión</span>
                    </label>
                    <input
                      id="input-student-passcode"
                      type="text"
                      value={studentPasscode}
                      onChange={(e) => {
                        setStudentPasscode(e.target.value);
                        setRoomError(null);
                      }}
                      placeholder="Ej. 749210 (opcional según la clase)"
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm font-mono tracking-wider focus:outline-none focus:border-blue-500 transition"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Si la clase fue programada por el profesor, ingresa el código enviado en WhatsApp.
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-3">
                <button
                  id="btn-submit-lobby"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {activeTab === 'create'
                          ? 'Creando e iniciando clase...'
                          : 'Entrando a la clase...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        {initialRoomId
                          ? `Entrar a la clase ahora (${roomId || initialRoomId})`
                          : activeTab === 'create'
                          ? 'Crear e Iniciar Clase (Admin)'
                          : 'Entrar a la clase'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <p className="text-[11px] text-slate-500">
              Sin descargas ni instalaciones requeridas • Compatible con Chrome, Edge, Safari y Firefox
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
