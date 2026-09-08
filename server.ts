import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(express.json());

// In-memory conference room store
interface RoomParticipant {
  id: string;
  name: string;
  role: 'admin' | 'student';
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
}

interface StoredMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

interface RoomRecord {
  id: string;
  title: string;
  adminSocketId: string;
  createdAt: number;
  isRecording: boolean;
  participants: Map<string, RoomParticipant>;
  messages: StoredMessage[];
}

const rooms = new Map<string, RoomRecord>();

// Scheduled & Concurrent Classes store
interface ScheduledClassRecord {
  id: string; // Room ID
  title: string;
  subject?: string;
  scheduledDate: string; // "YYYY-MM-DD"
  scheduledTime: string; // "HH:MM"
  durationMinutes: number;
  passcode: string; // Student session start code
  description?: string;
  instructorName: string;
  createdAt: number;
  status: 'scheduled' | 'live' | 'completed';
}

const scheduledClasses = new Map<string, ScheduledClassRecord>();

// Seed with concurrent classes
const todayStr = new Date().toISOString().split('T')[0];
scheduledClasses.set('MAT-4820', {
  id: 'MAT-4820',
  title: 'Cálculo Vectorial y Geometría Analítica',
  subject: 'Matemáticas',
  scheduledDate: todayStr,
  scheduledTime: '15:00',
  durationMinutes: 90,
  passcode: '839201',
  description: 'Unidad 3: Integrales múltiples, teoremas de Green y Stokes.',
  instructorName: 'Prof. Carlos Mendoza',
  createdAt: Date.now() - 3600000,
  status: 'scheduled'
});

scheduledClasses.set('FIS-1044', {
  id: 'FIS-1044',
  title: 'Física Clásica: Cinemática y Dinámica (Grupo Concurrente B)',
  subject: 'Física',
  scheduledDate: todayStr,
  scheduledTime: '15:30',
  durationMinutes: 60,
  passcode: '419528',
  description: 'Resolución de problemas de leyes de Newton y conservación de la energía.',
  instructorName: 'Dra. Elena Ruiz',
  createdAt: Date.now() - 1800000,
  status: 'scheduled'
});

scheduledClasses.set('PROG-9231', {
  id: 'PROG-9231',
  title: 'Estructuras de Datos y Algoritmos en Tiempo Real',
  subject: 'Informática',
  scheduledDate: todayStr,
  scheduledTime: '17:00',
  durationMinutes: 120,
  passcode: '620184',
  description: 'Árboles balanceados, grafos y análisis de complejidad temporal.',
  instructorName: 'Ing. Roberto Silva',
  createdAt: Date.now() - 600000,
  status: 'scheduled'
});

// REST API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeRooms: rooms.size, timestamp: Date.now() });
});

// List scheduled classes with real-time live & concurrency status
app.get('/api/scheduled-classes', (req, res) => {
  const list = Array.from(scheduledClasses.values()).map((item) => {
    const room = rooms.get(item.id);
    const activeCount = room ? room.participants.size : 0;
    return {
      ...item,
      activeParticipantsCount: activeCount,
      status: activeCount > 0 ? 'live' : item.status
    };
  });
  res.json(list);
});

// Create new scheduled class with custom/auto code and passcode
app.post('/api/scheduled-classes', (req, res) => {
  const {
    title,
    subject,
    scheduledDate,
    scheduledTime,
    durationMinutes,
    passcode,
    description,
    instructorName
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'El título de la clase es obligatorio' });
  }

  const cleanSubject = subject?.trim() || 'CLASE';
  const prefix = cleanSubject.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase() || 'SALA';
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const id = `${prefix}-${randomSuffix}`;

  const cleanPasscode = (passcode && passcode.trim()) ? passcode.trim() : Math.floor(100000 + Math.random() * 900000).toString();
  const today = new Date().toISOString().split('T')[0];
  const currentTime = new Date().toTimeString().substring(0, 5);

  const newClass: ScheduledClassRecord = {
    id,
    title: title.trim(),
    subject: cleanSubject,
    scheduledDate: scheduledDate || today,
    scheduledTime: scheduledTime || currentTime,
    durationMinutes: Number(durationMinutes) || 60,
    passcode: cleanPasscode,
    description: description?.trim() || '',
    instructorName: instructorName?.trim() || 'Profesor Administrador',
    createdAt: Date.now(),
    status: 'scheduled'
  };

  scheduledClasses.set(id, newClass);
  res.json(newClass);
});

// Delete scheduled class
app.delete('/api/scheduled-classes/:id', (req, res) => {
  const id = req.params.id.toUpperCase();
  if (scheduledClasses.has(id)) {
    scheduledClasses.delete(id);
    return res.json({ success: true, id });
  }
  res.status(404).json({ error: 'Clase no encontrada' });
});

// Verify passcode for student join
app.post('/api/scheduled-classes/:id/verify', (req, res) => {
  const id = req.params.id.toUpperCase();
  const { passcode } = req.body;
  const scheduled = scheduledClasses.get(id);

  if (!scheduled) {
    return res.json({ valid: true, requiresPasscode: false });
  }

  if (!scheduled.passcode) {
    return res.json({ valid: true, requiresPasscode: false, title: scheduled.title });
  }

  if (scheduled.passcode.toUpperCase() === (passcode || '').toString().trim().toUpperCase()) {
    return res.json({ valid: true, title: scheduled.title });
  }

  return res.status(401).json({
    valid: false,
    error: 'Código de inicio de sesión incorrecto. Verifica el código proporcionado por tu profesor.'
  });
});

app.post('/api/rooms', (req, res) => {
  const { title } = req.body;
  const roomId = Math.random().toString(36).substring(2, 7).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  const newRoom: RoomRecord = {
    id: roomId,
    title: title?.trim() || `Clase en Línea (${roomId})`,
    adminSocketId: '',
    createdAt: Date.now(),
    isRecording: false,
    participants: new Map(),
    messages: []
  };
  rooms.set(roomId, newRoom);
  res.json({ roomId: newRoom.id, title: newRoom.title });
});

app.get('/api/rooms/:id', (req, res) => {
  const room = rooms.get(req.params.id.toUpperCase());
  if (!room) {
    return res.status(404).json({ error: 'Sala no encontrada' });
  }
  res.json({
    id: room.id,
    title: room.title,
    createdAt: room.createdAt,
    participantsCount: room.participants.size,
    isRecording: room.isRecording
  });
});

// Socket.IO signaling & realtime state
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  let currentRoomId: string | null = null;
  let currentUser: RoomParticipant | null = null;

  socket.on('join-room', ({ roomId, title, name, role, isMuted, isVideoOff }: {
    roomId: string;
    title?: string;
    name: string;
    role: 'admin' | 'student';
    isMuted?: boolean;
    isVideoOff?: boolean;
  }) => {
    const normalizedRoomId = (roomId || 'AULA-DEMO').trim().toUpperCase();
    currentRoomId = normalizedRoomId;

    let room = rooms.get(normalizedRoomId);
    const scheduledInfo = scheduledClasses.get(normalizedRoomId);

    if (!room) {
      const defaultTitle = scheduledInfo?.title || title?.trim() || (role === 'admin' ? `Clase de ${name || 'Profesor'}` : `Clase Virtual (${normalizedRoomId})`);
      room = {
        id: normalizedRoomId,
        title: defaultTitle,
        adminSocketId: role === 'admin' ? socket.id : '',
        createdAt: Date.now(),
        isRecording: false,
        participants: new Map(),
        messages: []
      };
      rooms.set(normalizedRoomId, room);
    } else if (title?.trim() && role === 'admin') {
      room.title = title.trim();
    } else if (scheduledInfo?.title && !room.title) {
      room.title = scheduledInfo.title;
    }

    if (scheduledInfo) {
      scheduledInfo.status = 'live';
    }

    if (role === 'admin' && !room.adminSocketId) {
      room.adminSocketId = socket.id;
    }

    const assignedRole: 'admin' | 'student' = (role === 'admin' || room.adminSocketId === socket.id) ? 'admin' : 'student';

    currentUser = {
      id: socket.id,
      name: name?.trim() || (assignedRole === 'admin' ? 'Profesor / Admin' : 'Estudiante'),
      role: assignedRole,
      isMuted: !!isMuted,
      isVideoOff: !!isVideoOff,
      isScreenSharing: false
    };

    room.participants.set(socket.id, currentUser);
    socket.join(normalizedRoomId);

    // Prepare participants list for joining client (excluding themselves)
    const existingParticipants = Array.from(room.participants.values()).filter(p => p.id !== socket.id);

    // Send confirmation & existing room state to joining client
    socket.emit('room-joined', {
      room: {
        id: room.id,
        title: room.title,
        isRecording: room.isRecording,
        adminSocketId: room.adminSocketId
      },
      self: currentUser,
      participants: existingParticipants,
      messages: room.messages
    });

    // Notify other participants in the room
    socket.to(normalizedRoomId).emit('user-joined', currentUser);

    // System welcome chat message
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const systemMsg: StoredMessage = {
      id: `sys-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderId: 'system',
      senderName: 'Sistema',
      text: `${currentUser.name} (${assignedRole === 'admin' ? 'Administrador' : 'Estudiante'}) se ha unido a la reunión.`,
      timestamp: timeStr,
      isSystem: true
    };
    room.messages.push(systemMsg);
    io.to(normalizedRoomId).emit('new-chat-message', systemMsg);
  });

  // WebRTC Signaling: offer, answer, ice-candidate
  socket.on('signal', ({ target, signalData, type }: { target: string; signalData: any; type: string }) => {
    io.to(target).emit('signal', {
      caller: socket.id,
      signalData,
      type
    });
  });

  // Media status toggle (Mute / Video / Screen)
  socket.on('toggle-media', ({ type, enabled }: { type: 'audio' | 'video' | 'screen'; enabled: boolean }) => {
    if (!currentRoomId || !currentUser) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    if (type === 'audio') {
      currentUser.isMuted = !enabled;
    } else if (type === 'video') {
      currentUser.isVideoOff = !enabled;
    } else if (type === 'screen') {
      currentUser.isScreenSharing = enabled;
    }

    room.participants.set(socket.id, currentUser);

    socket.to(currentRoomId).emit('user-media-toggled', {
      userId: socket.id,
      type,
      enabled
    });
  });

  // Chat message
  socket.on('send-chat-message', ({ text }: { text: string }) => {
    if (!currentRoomId || !currentUser || !text || !text.trim()) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const message: StoredMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderId: socket.id,
      senderName: currentUser.name,
      text: text.trim(),
      timestamp: timeStr,
      isSystem: false
    };

    room.messages.push(message);
    if (room.messages.length > 300) {
      room.messages.shift();
    }

    io.to(currentRoomId).emit('new-chat-message', message);
  });

  // Recording status update (by Admin)
  socket.on('set-recording-state', ({ isRecording }: { isRecording: boolean }) => {
    if (!currentRoomId || !currentUser) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    room.isRecording = isRecording;

    io.to(currentRoomId).emit('recording-state-changed', {
      isRecording,
      recordedBy: currentUser.name
    });

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const statusMsg: StoredMessage = {
      id: `sys-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderId: 'system',
      senderName: 'Sistema',
      text: isRecording
        ? `🔴 El administrador (${currentUser.name}) ha iniciado la grabación de la clase.`
        : `⏹ El administrador (${currentUser.name}) ha detenido la grabación de la clase.`,
      timestamp: timeStr,
      isSystem: true
    };
    room.messages.push(statusMsg);
    io.to(currentRoomId).emit('new-chat-message', statusMsg);
  });

  // Admin controlling student media (microphone or camera)
  socket.on('admin-control-media', ({ targetSocketId, mediaType, action }: {
    targetSocketId: string;
    mediaType: 'audio' | 'video';
    action: 'mute' | 'unmute' | 'turn-off' | 'request-on';
  }) => {
    if (!currentRoomId || !currentUser) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    if (currentUser.role !== 'admin' && room.adminSocketId !== socket.id) {
      return;
    }

    const targetUser = room.participants.get(targetSocketId);
    if (targetUser) {
      if (action === 'mute' && mediaType === 'audio') {
        targetUser.isMuted = true;
      } else if (action === 'turn-off' && mediaType === 'video') {
        targetUser.isVideoOff = true;
      }
      room.participants.set(targetSocketId, targetUser);

      // Notify the target user directly
      io.to(targetSocketId).emit('admin-media-command', {
        mediaType,
        action,
        adminName: currentUser.name
      });

      // Broadcast media state update to everyone in room
      io.to(currentRoomId).emit('user-media-toggled', {
        userId: targetSocketId,
        type: mediaType,
        enabled: action === 'unmute' || action === 'request-on'
      });
    }
  });

  // Admin mute all students
  socket.on('admin-mute-all', () => {
    if (!currentRoomId || !currentUser) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    if (currentUser.role !== 'admin' && room.adminSocketId !== socket.id) {
      return;
    }

    // Mute all students
    room.participants.forEach((participant, id) => {
      if (participant.role !== 'admin' && id !== socket.id) {
        participant.isMuted = true;
        io.to(id).emit('admin-media-command', {
          mediaType: 'audio',
          action: 'mute',
          adminName: currentUser.name
        });
        io.to(currentRoomId).emit('user-media-toggled', {
          userId: id,
          type: 'audio',
          enabled: false
        });
      }
    });

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const muteMsg: StoredMessage = {
      id: `sys-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderId: 'system',
      senderName: 'Sistema',
      text: `🔇 El administrador (${currentUser.name}) ha silenciado los micrófonos de todos los estudiantes.`,
      timestamp: timeStr,
      isSystem: true
    };
    room.messages.push(muteMsg);
    io.to(currentRoomId).emit('new-chat-message', muteMsg);
  });

  // Admin ending the room for all
  socket.on('admin-end-room', () => {
    if (!currentRoomId || !currentUser) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    if (currentUser.role !== 'admin' && room.adminSocketId !== socket.id) {
      return;
    }

    io.to(currentRoomId).emit('room-ended', {
      reason: 'El administrador ha finalizado la sesión para todos los participantes.'
    });

    rooms.delete(currentRoomId);
  });

  // Leave room or disconnect
  const handleLeave = () => {
    if (!currentRoomId || !currentUser) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    room.participants.delete(socket.id);
    socket.to(currentRoomId).emit('user-left', {
      userId: socket.id,
      name: currentUser.name
    });

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const leaveMsg: StoredMessage = {
      id: `sys-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderId: 'system',
      senderName: 'Sistema',
      text: `${currentUser.name} ha salido de la reunión.`,
      timestamp: timeStr,
      isSystem: true
    };
    room.messages.push(leaveMsg);
    io.to(currentRoomId).emit('new-chat-message', leaveMsg);

    if (room.participants.size === 0) {
      setTimeout(() => {
        if (rooms.get(currentRoomId!)?.participants.size === 0) {
          rooms.delete(currentRoomId!);
        }
      }, 60000);
    }

    currentRoomId = null;
    currentUser = null;
  };

  socket.on('leave-room', handleLeave);
  socket.on('disconnect', handleLeave);
});

// Vite Middleware Integration
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Videoconferencing server running on http://0.0.0.0:${PORT}`);
  });
}

start();
