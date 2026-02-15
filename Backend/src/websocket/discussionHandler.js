const jwt = require('jsonwebtoken');
const { sql } = require('../data');
const User = require('../model/User');

const activeUsers = new Map(); // Track users in discussions: Map<proposalId, Set<userId>>

const initializeDiscussionHandler = (io) => {
  io.on('connection', async (socket) => {
    let userId;
    let currentProposalId;

    // Authenticate user
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        socket.disconnect();
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-key');
      userId = decoded.id;
      socket.userId = userId;

      console.log(`[Discussion] User ${userId} connected`);
    } catch (error) {
      console.error('[Discussion] Authentication failed:', error.message);
      socket.disconnect();
      return;
    }

    // Join discussion room for a proposal
    socket.on('join_discussion', async (data) => {
      const { proposal_id } = data;
      
      if (!proposal_id) {
        socket.emit('error', { message: 'Invalid proposal ID' });
        return;
      }

      // Leave previous discussion if any
      if (currentProposalId) {
        const prevRoom = `discussion:${currentProposalId}`;
        socket.leave(prevRoom);
        
        // Update active users count
        if (activeUsers.has(currentProposalId)) {
          activeUsers.get(currentProposalId).delete(userId);
          io.to(prevRoom).emit('users_count', {
            proposal_id: currentProposalId,
            count: activeUsers.get(currentProposalId).size,
          });
        }
      }

      currentProposalId = proposal_id;
      const room = `discussion:${proposal_id}`;

      // Join the room
      socket.join(room);

      // Track active users
      if (!activeUsers.has(proposal_id)) {
        activeUsers.set(proposal_id, new Set());
      }
      activeUsers.get(proposal_id).add(userId);

      // Notify others of active users
      io.to(room).emit('users_count', {
        proposal_id,
        count: activeUsers.get(proposal_id).size,
      });

      // Fetch and send user info for avatar
      try {
        const user = await User.findById(userId);
        socket.emit('join_discussion_success', {
          proposal_id,
          user_id: userId,
          username: user.username,
        });
      } catch (err) {
        console.error('[Discussion] Error fetching user:', err);
      }

      console.log(`[Discussion] User ${userId} joined discussion for proposal ${proposal_id}`);
    });

    // Send message
    socket.on('send_message', async (data) => {
      const { message } = data;

      if (!currentProposalId || !message || !message.trim()) {
        socket.emit('error', { message: 'Invalid message' });
        return;
      }

      try {
        // Save message to database
        const result = await sql`
          INSERT INTO proposal_discussions 
            (proposal_id, user_id, message, created_at)
          VALUES 
            (${currentProposalId}, ${userId}, ${message.trim()}, NOW())
          RETURNING 
            id, proposal_id, user_id, message, created_at
        `;

        const savedMessage = result[0];

        // Fetch user details for broadcast
        const user = await User.findById(userId);

        const broadcastMessage = {
          id: savedMessage.id,
          proposal_id: currentProposalId,
          user_id: userId,
          username: user.username,
          profile_pic: user.profile_pic,
          message: savedMessage.message,
          created_at: savedMessage.created_at,
        };

        // Broadcast to all users in this discussion
        io.to(`discussion:${currentProposalId}`).emit('discussion_message', {
          proposal_id: currentProposalId,
          message: broadcastMessage,
        });

        console.log(`[Discussion] Message added to proposal ${currentProposalId} by user ${userId}`);
      } catch (error) {
        console.error('[Discussion] Error saving message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Leave discussion
    socket.on('leave_discussion', (data) => {
      const { proposal_id } = data;

      if (!proposal_id) return;

      const room = `discussion:${proposal_id}`;
      socket.leave(room);

      if (activeUsers.has(proposal_id)) {
        activeUsers.get(proposal_id).delete(userId);
        io.to(room).emit('users_count', {
          proposal_id,
          count: activeUsers.get(proposal_id).size,
        });
      }

      if (currentProposalId === proposal_id) {
        currentProposalId = null;
      }

      console.log(`[Discussion] User ${userId} left discussion for proposal ${proposal_id}`);
    });

    // Typing indicator
    socket.on('user_typing', (data) => {
      const { proposal_id, isTyping } = data;

      if (!proposal_id) return;

      socket.to(`discussion:${proposal_id}`).emit('user_typing', {
        proposal_id,
        user_id: userId,
        isTyping,
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      if (currentProposalId && activeUsers.has(currentProposalId)) {
        activeUsers.get(currentProposalId).delete(userId);
        io.to(`discussion:${currentProposalId}`).emit('users_count', {
          proposal_id: currentProposalId,
          count: activeUsers.get(currentProposalId).size,
        });
      }

      console.log(`[Discussion] User ${userId} disconnected`);
    });
  });
};

module.exports = initializeDiscussionHandler;
