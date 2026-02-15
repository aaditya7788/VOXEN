const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

// Load environment variables
dotenv.config();

// Import routes and database
const routes = require('./routes');
const { connectDB } = require('./data');
const { createUsersTable } = require('./model/User');
const Space = require('./model/Space');
const Activity = require('./model/Activity');
const initializeDiscussionHandler = require('./websocket/discussionHandler');
const { createProposalDiscussionsTable } = require('./data/migrations/001_create_proposal_discussions');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));
// Increase body size limits to accept larger JSON payloads (e.g. base64 images)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api', routes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Voxen API is running' });
});

// Initialize WebSocket handlers
initializeDiscussionHandler(io);

// Connect to database and start server
const startServer = async () => {
  try {
    await connectDB();

    // Run migrations

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`WebSocket server initialized`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
