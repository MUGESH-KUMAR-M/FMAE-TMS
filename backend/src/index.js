// FMAE-TMS — Backend Server
// Formula/Motorsport Activity Event Team Management System
require('dotenv').config();
require('express-async-errors');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./utils/errorHandler');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

// Routes
const authRoutes = require('./routes/auth');
const registrationRoutes = require('./routes/registrations');
const competitionRoutes = require('./routes/competitions');
const taskRoutes = require('./routes/tasks');
const submissionRoutes = require('./routes/submissions');
const trackEventRoutes = require('./routes/trackEvents');
const paymentRoutes = require('./routes/payments');
const leaderboardRoutes = require('./routes/leaderboard');
const userRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');
const scrutineeringRoutes = require('./routes/scrutineering');
const certificateRoutes = require('./routes/certificates');
const auditLogRoutes = require('./routes/audit');
const { csrfProtection, getCsrfToken, cookieParser: csrfCookieParser } = require('./middleware/csrf');
const { sanitizeInput } = require('./utils/sanitize');

const app = express();
const server = http.createServer(app);

// ─── Socket.io (real-time leaderboard updates) ────────────────────────────────
const io = socketIo(server, {
  cors: {
    origin: process.env.SOCKET_CORS || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});
app.set('io', io);

io.on('connection', (socket) => {
  logger.debug(`Socket connected: ${socket.id}`);
  socket.on('join-competition', (competitionId) => {
    socket.join(`competition-${competitionId}`);
  });
  socket.on('join-user', (userId) => {
    socket.join(`user-${userId}`);
  });
  socket.on('disconnect', () => {
    logger.debug(`Socket disconnected: ${socket.id}`);
  });
});

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:3001',
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
}));

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet({ 
  contentSecurityPolicy: false,
  crossOriginOpenerPolicy: false
}));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, max: 1000,
  message: { success: false, message: 'Too many requests, please try again later' },
}));

// ─── Body Parser ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// ─── CSRF Protection ──────────────────────────────────────────────────────────
app.use(csrfCookieParser);
app.use(csrfProtection);

// ─── Input Sanitization ───────────────────────────────────────────────────────
app.use(sanitizeInput);
// ─── Static files (uploads) ──────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ─── Request Logging ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
  logger.debug(`[REQ] ${req.method} ${req.path}`);
  next();
});

// ─── Health Check & API Docs ────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'FMAE-TMS API', timestamp: new Date().toISOString() });
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── CSRF Token Endpoint ─────────────────────────────────────────────────────
app.get('/api/csrf-token', getCsrfToken);

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/competitions', competitionRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/track-events', trackEventRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/scrutineering', scrutineeringRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/audit', auditLogRoutes);

// ─── Error Handling ──────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`[START] FMAE-TMS Backend running on port ${PORT}`);
  logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`   Health:      http://localhost:${PORT}/health`);
  logger.info(`   Swagger:     http://localhost:${PORT}/api-docs\n`);
});

// ─── Graceful Shutdown ───────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  server.close(() => { logger.info('Server closed'); process.exit(0); });
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

module.exports = { app, server, io };
