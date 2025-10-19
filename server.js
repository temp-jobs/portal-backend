require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const connectDB = require('./config/db');
const socketServer = require('./socket');

// Initialize app and server
const app = express();
const server = http.createServer(app);

// ✅ Dynamically configure CORS for local + deployed frontend
const allowedOrigins = [
  'http://localhost:3000', // Local dev frontend
  'https://parttime-uat.vercel.app', // UAT (Vercel)
  'https://parttime.vercel.app', // Optional: future prod
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.warn('❌ CORS blocked request from:', origin);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Parse JSON requests
app.use(express.json());

// ✅ Connect Database
connectDB();

// ✅ Basic API health check (for Render testing)
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Part-Time Match Backend is running!',
  });
});

// ✅ Mount routes
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/profile', require('./routes/profile'));
app.use('/api/v1/jobs', require('./routes/jobs'));
app.use('/api/v1/applications', require('./routes/applications'));
app.use('/api/v1/messages', require('./routes/messages'))
app.use('/api/v1/employer/dashboard', require('./routes/employerDashboard'));
app.use('/api/v1/chats', require('./routes/chats'))

// ✅ Setup Socket.IO (CORS must match frontend)
const io = require('socket.io')(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

// Initialize socket handlers
socketServer(io);

// ✅ Handle invalid routes safely
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`✅ Allowed Origins: ${allowedOrigins.join(', ')}`);
});
