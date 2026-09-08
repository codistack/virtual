import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Copy,
  Check,
  Trash2,
  Video,
  Users,
  KeyRound,
  ExternalLink,
  ShieldCheck,
  Play,
  ArrowLeft,
  Search,
  MessageCircle,
  X,
  Radio,
  BookOpen,
  Info
} from 'lucide-react';
import { ScheduledClass } from '../types';

interface AdminPanelProps {
  onBackToLobby: () => void;
  onStartClassAsAdmin: (classData: { roomId: string; title: string; instructorName: string }) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  onBackToLobby,
  onStartClassAsAdmin
}) => {
  const [classes, setClasses] = useState<ScheduledClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'live' | 'scheduled'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // New Class Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    instructorName: 'Prof. Administrador',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '15:00',
    durationMinutes: 60,
    passcode: '',
    description: ''
  });
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch classes from backend
  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/scheduled-classes');
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
      }
    } catch (err) {
      console.error('Error fetching scheduled classes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
    const interval = setInterval(fetchClasses, 5000); // Poll for live concurrent updates
    return () => clearInterval(interval);
  }, []);

  // Open modal with fresh random passcode
  const handleOpenCreateModal = () => {
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(Math.ceil(now.getMinutes() / 15) * 15 % 60).padStart(2, '0');

    setFormData({
      title: '',
      subject: '',
      instructorName: 'Prof. Administrador',
      scheduledDate: now.toISOString().split('T')[0],
      scheduledTime: `${hours}:${minutes}`,
      durationMinutes: 60,
      passcode: randomCode,
      description: ''
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setErrorMsg('Por favor ingresa un título para la clase.');
      return;
    }

    setCreating(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/scheduled-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        const newCls = await res.json();
        setClasses((prev) => [newCls, ...prev]);
        setIsModalOpen(false);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'No se pudo crear la clase.');
      }
    } catch (err) {
      console.error('Error creating class:', err);
      setErrorMsg('Error de red al crear la clase.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteClass = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta clase virtual?')) return;

    try {
      const res = await fetch(`/api/scheduled-classes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setClasses((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error('Error deleting class:', err);
    }
  };

  // Helper to get full direct student URL
  const getDirectLink = (cls: ScheduledClass) => {
    const origin = window.location.origin;
    return `${origin}/?room=${encodeURIComponent(cls.id)}&passcode=${encodeURIComponent(cls.passcode)}`;
  };

  // Generate WhatsApp Message & URL
  const getWhatsAppUrl = (cls: ScheduledClass) => {
    const directLink = getDirectLink(cls);
    const message =
      `📚 *Invitación a Clase Virtual*\n\n` +
      `📌 *Materia / Clase:* ${cls.title}\n` +
      (cls.subject ? `🏷️ *Asignatura:* ${cls.subject}\n` : '') +
      `👨‍🏫 *Profesor:* ${cls.instructorName}\n` +
      `📅 *Fecha:* ${cls.scheduledDate}\n` +
      `⏰ *Hora:* ${cls.scheduledTime} hrs (${cls.durationMinutes} min)\n\n` +
      `🔑 *Código de inicio de sesión:* *${cls.passcode}*\n` +
      `🆔 *Código de Sala:* *${cls.id}*\n\n` +
      `🔗 *Enlace directo para entrar:* \n${directLink}\n\n` +
      `_Por favor ingresa puntual con tu micrófono y cámara listos._`;

    return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  };

  // Copy full formatted invitation to clipboard
  const handleCopyInvitation = async (cls: ScheduledClass, e: React.MouseEvent) => {
    e.stopPropagation();
    const directLink = getDirectLink(cls);
    const message =
      `📚 Invitación a Clase Virtual\n\n` +
      `Clase: ${cls.title}\n` +
      `Profesor: ${cls.instructorName}\n` +
      `Fecha: ${cls.scheduledDate}\n` +
      `Hora: ${cls.scheduledTime} hrs (${cls.durationMinutes} min)\n` +
      `Código de inicio de sesión: ${cls.passcode}\n` +
      `ID de Sala: ${cls.id}\n\n` +
      `Enlace directo para entrar:\n${directLink}`;

    await navigator.clipboard.writeText(message);
    setCopiedId(cls.id);
    setCopiedType('invitation');
    setTimeout(() => {
      setCopiedId(null);
      setCopiedType(null);
    }, 2500);
  };

  // Copy only passcode
  const handleCopyPasscode = async (cls: ScheduledClass, e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(cls.passcode);
    setCopiedId(cls.id);
    setCopiedType('passcode');
    setTimeout(() => {
      setCopiedId(null);
      setCopiedType(null);
    }, 2000);
  };

  // Copy direct link only
  const handleCopyLink = async (cls: ScheduledClass, e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(getDirectLink(cls));
    setCopiedId(cls.id);
    setCopiedType('link');
    setTimeout(() => {
      setCopiedId(null);
      setCopiedType(null);
    }, 2000);
  };

  // Filtering
  const filteredClasses = classes.filter((cls) => {
    const matchesSearch =
      cls.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.passcode.includes(searchQuery) ||
      (cls.subject && cls.subject.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterTab === 'live') return cls.status === 'live';
    if (filterTab === 'scheduled') return cls.status !== 'live';
    return true;
  });

  const liveClassesCount = classes.filter((c) => c.status === 'live').length;
  const totalStudentsActive = classes.reduce((sum, c) => sum + (c.activeParticipantsCount || 0), 0);

  return (
    <div id="admin-panel-container" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/90 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              id="btn-admin-back-lobby"
              onClick={onBackToLobby}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700/60 flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              title="Volver a la Sala de Espera"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Sala de Espera</span>
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>Panel del Administrador</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Gestión de Clases
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  Programación de clases por fecha/hora, soporte concurrente y enlaces para WhatsApp
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              id="btn-open-create-class-modal"
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/25 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Programar Nueva Clase</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col gap-6">
        {/* Metric Cards (Highlighting Concurrency Support) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Clases Programadas</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">{classes.length}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Gestión por fecha y hora</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Calendar className="w-6 h-6" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-slate-400">Clases Concurrentes</p>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{liveClassesCount}</p>
              <p className="text-[11px] text-emerald-500/80 mt-0.5">Activas en simultáneo</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Radio className="w-6 h-6" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Estudiantes en Línea</p>
              <p className="text-2xl font-bold text-slate-100 mt-1">{totalStudentsActive}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Conectados en todas las salas</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/40 p-2 rounded-2xl border border-slate-800/80">
          <div className="flex items-center gap-1 w-full sm:w-auto">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                filterTab === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              Todas ({classes.length})
            </button>
            <button
              onClick={() => setFilterTab('live')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                filterTab === 'live'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>En Vivo ({liveClassesCount})</span>
            </button>
            <button
              onClick={() => setFilterTab('scheduled')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                filterTab === 'scheduled'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              Próximas ({classes.filter((c) => c.status !== 'live').length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por clase, código o materia..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>
        </div>

        {/* Classes List */}
        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              Cargando clases programadas...
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="p-12 rounded-2xl bg-slate-900/30 border border-slate-800/80 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                <BookOpen className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-300">
                No se encontraron clases virtuales
              </p>
              <p className="text-xs text-slate-500 max-w-sm">
                Puedes programar una nueva clase virtual con fecha y hora personalizada usando el botón superior.
              </p>
              <button
                onClick={handleOpenCreateModal}
                className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Programar Primera Clase</span>
              </button>
            </div>
          ) : (
            filteredClasses.map((cls) => {
              const isLive = cls.status === 'live';
              const whatsAppUrl = getWhatsAppUrl(cls);
              const isItemCopied = copiedId === cls.id;

              return (
                <div
                  key={cls.id}
                  id={`card-class-${cls.id}`}
                  className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col gap-4 bg-slate-900/50 hover:bg-slate-900/80 ${
                    isLive ? 'border-emerald-500/40 shadow-lg shadow-emerald-950/20' : 'border-slate-800'
                  }`}
                >
                  {/* Class Top Row: Title, Badges, Date/Time */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1.5 max-w-2xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isLive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-semibold">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>EN VIVO ({cls.activeParticipantsCount || 1} activos)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60 text-xs font-medium">
                            <Clock className="w-3 h-3" />
                            <span>Programada</span>
                          </span>
                        )}
                        {cls.subject && (
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-950/60 border border-blue-500/30 text-blue-300 text-xs font-medium">
                            {cls.subject}
                          </span>
                        )}
                        <span className="text-xs text-slate-500 font-mono">
                          ID: {cls.id}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-slate-100">
                        {cls.title}
                      </h3>

                      {cls.description && (
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {cls.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-slate-400 mt-1 flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-slate-300 font-medium">{cls.scheduledDate}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-slate-300 font-medium">
                            {cls.scheduledTime} hrs ({cls.durationMinutes} min)
                          </span>
                        </span>
                        <span>• Prof: {cls.instructorName}</span>
                      </div>
                    </div>

                    {/* Right side: Start Class Action Button */}
                    <div className="flex items-center gap-2">
                      <button
                        id={`btn-start-admin-${cls.id}`}
                        onClick={() =>
                          onStartClassAsAdmin({
                            roomId: cls.id,
                            title: cls.title,
                            instructorName: cls.instructorName
                          })
                        }
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-md shadow-emerald-600/30 transition cursor-pointer"
                        title="Abrir aula virtual como Administrador/Profesor"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>{isLive ? 'Entrar a la Clase en Vivo' : 'Iniciar Clase (Admin)'}</span>
                      </button>

                      <button
                        id={`btn-delete-${cls.id}`}
                        onClick={(e) => handleDeleteClass(cls.id, e)}
                        className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700/60 hover:border-red-500/30 transition cursor-pointer"
                        title="Eliminar clase"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Student Access & Share Bar (WhatsApp + Passcode + Direct Link) */}
                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Código de inicio de sesión de estudiante */}
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-950/40 border border-blue-500/30 text-xs">
                        <KeyRound className="w-4 h-4 text-blue-400" />
                        <span className="text-slate-400 font-medium">Código Estudiante:</span>
                        <span className="font-mono font-bold text-blue-300 text-sm tracking-wider">
                          {cls.passcode}
                        </span>
                        <button
                          onClick={(e) => handleCopyPasscode(cls, e)}
                          className="p-1 text-slate-400 hover:text-white cursor-pointer ml-1"
                          title="Copiar código de inicio de sesión"
                        >
                          {isItemCopied && copiedType === 'passcode' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Enlace directo recortado */}
                      <div className="text-xs text-slate-400 flex items-center gap-1.5 max-w-xs truncate font-mono">
                        <span className="text-slate-500">Enlace:</span>
                        <span className="truncate text-slate-300">{getDirectLink(cls)}</span>
                      </div>
                    </div>

                    {/* Sharing Buttons: WhatsApp & Copy */}
                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                      {/* Direct WhatsApp Share Button */}
                      <a
                        id={`btn-share-whatsapp-${cls.id}`}
                        href={whatsAppUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#25D366]/20 transition cursor-pointer"
                        title="Compartir enlace y código por WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4 fill-slate-950" />
                        <span>Compartir por WhatsApp</span>
                      </a>

                      {/* Copy link button */}
                      <button
                        onClick={(e) => handleCopyLink(cls, e)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
                        title="Copiar enlace directo"
                      >
                        {isItemCopied && copiedType === 'link' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">¡Enlace Copiado!</span>
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Copiar Enlace</span>
                          </>
                        )}
                      </button>

                      {/* Copy full invitation */}
                      <button
                        onClick={(e) => handleCopyInvitation(cls, e)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
                        title="Copiar invitación completa con detalles y código"
                      >
                        {isItemCopied && copiedType === 'invitation' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">¡Invitación Copiada!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar Invitación</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Modal: Programar Nueva Clase Virtual */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            id="modal-create-class"
            className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Programar Nueva Clase Virtual
                  </h3>
                  <p className="text-xs text-slate-400">
                    Define fecha, hora, código de acceso y enlace para los estudiantes
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateClass} className="flex flex-col gap-4">
              {/* Título de la clase */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Título de la Clase *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ej. Matemáticas Avanzadas: Álgebra Lineal"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* Materia y Profesor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Materia / Asignatura
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Ej. Matemáticas"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Profesor / Anfitrión
                  </label>
                  <input
                    type="text"
                    value={formData.instructorName}
                    onChange={(e) => setFormData({ ...formData, instructorName: e.target.value })}
                    placeholder="Ej. Prof. Carlos Mendoza"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              {/* Fecha y Hora programada */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    <span>Fecha de la Clase *</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Hora de Inicio *</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              {/* Duración y Código de inicio de sesión */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Duración Estimada
                  </label>
                  <select
                    value={formData.durationMinutes}
                    onChange={(e) =>
                      setFormData({ ...formData, durationMinutes: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition"
                  >
                    <option value={30}>30 minutos</option>
                    <option value={45}>45 minutos</option>
                    <option value={60}>60 minutos (1 hora)</option>
                    <option value={90}>90 minutos (1.5 horas)</option>
                    <option value={120}>120 minutos (2 horas)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                    <span>Código de Acceso Estudiante</span>
                  </label>
                  <input
                    type="text"
                    value={formData.passcode}
                    onChange={(e) => setFormData({ ...formData, passcode: e.target.value })}
                    placeholder="Ej. 749210"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 font-mono tracking-wider focus:outline-none focus:border-blue-500 transition"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Código de inicio de sesión requerido para los alumnos.
                  </p>
                </div>
              </div>

              {/* Descripción / Temas */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Descripción o Temas a tratar (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ej. Temas: Vectores en el espacio, producto cruz y aplicaciones prácticas."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* Botón Guardar y Crear */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{creating ? 'Guardando...' : 'Crear y Generar Enlace'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
