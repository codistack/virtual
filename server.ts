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

// REST API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeRooms: rooms.size, timestamp: Date.now() });
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

  socket.on('join-room', ({ roomId, name, role, isMuted, isVideoOff }: {
    roomId: string;
    name: string;
    role: 'admin' | 'student';
    isMuted?: boolean;
    isVideoOff?: boolean;
  }) => {
    const normalizedRoomId = (roomId || 'AULA-DEMO').trim().toUpperCase();
    currentRoomId = normalizedRoomId;

    let room = rooms.get(normalizedRoomId);
    if (!room) {
      room = {
        id: normalizedRoomId,
        title: role === 'admin' ? `Clase de ${name || 'Profesor'}` : `Clase Virtual (${normalizedRoomId})`,
        adminSocketId: role === 'admin' ? socket.id : '',
        createdAt: Date.now(),
        isRecording: false,
        participants: new Map(),
        messages: []
      };
      rooms.set(normalizedRoomId, room);
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
