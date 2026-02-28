require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const { admin } = require('./config/firestore');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST']
  }
});

// Import routes
const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const wardRoutes = require('./routes/wards');
const analyticsRoutes = require('./routes/analytics');
const policyRoutes = require('./routes/policy');
const dashboardRoutes = require('./routes/dashboard');

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Firestore initialized via Firebase Admin
console.log('✅ Firestore initialized');

// Socket.IO for real-time updates
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  socket.on('join-ward', (wardNumber) => {
    socket.join(`ward-${wardNumber}`);
    console.log(`Socket ${socket.id} joined ward ${wardNumber}`);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Make io accessible in routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/wards', wardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/policy', policyRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    firestore: admin.apps.length ? 'initialized' : 'uninitialized'
  });
});

// Security middleware for static files
const path = require('path');
app.use((req, res, next) => {
  const normalizedPath = req.path.toLowerCase();
  if (
    normalizedPath.startsWith('/backend') ||
    normalizedPath.includes('.env') ||
    normalizedPath.includes('.git') ||
    normalizedPath.includes('package.json') ||
    normalizedPath.includes('serviceaccountkey')
  ) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../')));

// Root route (API Info)
app.get('/api', (req, res) => {
  res.json({
    name: 'Madurai Swachh AI Grid API',
    version: '1.0.0',
    description: 'Government-grade AI waste governance platform',
    endpoints: {
      auth: '/api/auth',
      reports: '/api/reports',
      wards: '/api/wards',
      analytics: '/api/analytics',
      policy: '/api/policy',
      dashboard: '/api/dashboard'
    }
  });
});

// Serve app-index.html for root route fallback if not caught by static
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../app-index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🌿 MADURAI SWACHH AI GRID - Backend Server            ║
║                                                           ║
║   Status: ✅ RUNNING                                      ║
║   Port: ${PORT}                                             ║
║   Environment: ${process.env.NODE_ENV || 'development'}                                  ║
║   Firestore: ${admin.apps.length ? '✅ Initialized' : '❌ Uninitialized'}                               ║
║                                                           ║
║   Powered by: Gemini AI + Google Cloud                   ║
║   Government-Grade Intelligence Platform                  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = { app, io };
