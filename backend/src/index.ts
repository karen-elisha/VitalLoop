import http from 'http';
import { Server as SocketServer } from 'socket.io';
import app from './app';
import config from './config';

const server = http.createServer(app);

// Socket.io setup for real-time notifications
const io = new SocketServer(server, {
  cors: {
    origin: config.cors.origin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  // Token verification happens here — simplified for now
  // In production, verify JWT and attach user info
  next();
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Join user-specific room for targeted notifications
  socket.on('join:user', (userId: string) => {
    socket.join(`user:${userId}`);
    console.log(`Socket ${socket.id} joined room user:${userId}`);
  });
  
  // Join provider room for patient alerts
  socket.on('join:provider', (providerId: string) => {
    socket.join(`provider:${providerId}`);
  });
  
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Export io for use in other modules
export { io };

// Start server
server.listen(config.port, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║                                                  ║
║   🫀 VitalLoop Backend Server                    ║
║                                                  ║
║   Environment: ${config.env.padEnd(33)}║
║   Port:        ${String(config.port).padEnd(33)}║
║   API:         http://localhost:${config.port}/api${' '.repeat(14)}║
║   Health:      http://localhost:${config.port}/api/health${' '.repeat(7)}║
║                                                  ║
╚══════════════════════════════════════════════════╝
  `);
});

export default server;
