const { sql } = require('../data');
const User = require('../model/User');

// Get all discussion messages for a proposal
async function getDiscussion(req, res) {
  try {
    const { proposalId } = req.params;

    if (!proposalId) {
      return res.status(400).json({ error: 'Proposal ID is required' });
    }

    const messages = await sql`
      SELECT 
        pd.id,
        pd.proposal_id,
        pd.user_id,
        pd.message,
        pd.created_at,
        pd.updated_at,
        u.username,
        u.profile_pic
      FROM proposal_discussions pd
      LEFT JOIN users u ON pd.user_id = u.id
      WHERE pd.proposal_id = ${proposalId}
      ORDER BY pd.created_at ASC
    `;

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('[Discussion Controller] Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch discussion messages' });
  }
}

// Post a new discussion message
async function postMessage(req, res) {
  try {
    const { proposalId } = req.params;
    const { message } = req.body;
    const userId = req.user?.id;

    if (!proposalId) {
      return res.status(400).json({ error: 'Proposal ID is required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    // Verify proposal exists
    const proposal = await sql`
      SELECT id FROM proposals WHERE id = ${proposalId}
    `;

    if (proposal.length === 0) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    // Insert message
    const result = await sql`
      INSERT INTO proposal_discussions 
        (proposal_id, user_id, message, created_at)
      VALUES 
        (${proposalId}, ${userId}, ${message.trim()}, NOW())
      RETURNING 
        id, proposal_id, user_id, message, created_at
    `;

    const savedMessage = result[0];

    // Fetch user details
    const user = await User.findById(userId);

    const responseMessage = {
      id: savedMessage.id,
      proposal_id: savedMessage.proposal_id,
      user_id: savedMessage.user_id,
      username: user.username,
      profile_pic: user.profile_pic,
      message: savedMessage.message,
      created_at: savedMessage.created_at,
    };

    res.status(201).json({
      success: true,
      data: responseMessage,
    });
  } catch (error) {
    console.error('[Discussion Controller] Error posting message:', error);
    res.status(500).json({ error: 'Failed to post message' });
  }
}

// Delete a discussion message
async function deleteMessage(req, res) {
  try {
    const { proposalId, messageId } = req.params;
    const userId = req.user?.id;

    if (!proposalId || !messageId) {
      return res.status(400).json({ error: 'Proposal ID and Message ID are required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Fetch message to verify ownership
    const messages = await sql`
      SELECT user_id FROM proposal_discussions 
      WHERE id = ${messageId} AND proposal_id = ${proposalId}
    `;

    if (messages.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = messages[0];

    // Check if user owns the message or is admin
    if (message.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }

    // Delete message
    await sql`
      DELETE FROM proposal_discussions 
      WHERE id = ${messageId} AND proposal_id = ${proposalId}
    `;

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('[Discussion Controller] Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
}

// Update a discussion message
async function updateMessage(req, res) {
  try {
    const { proposalId, messageId } = req.params;
    const { message } = req.body;
    const userId = req.user?.id;

    if (!proposalId || !messageId) {
      return res.status(400).json({ error: 'Proposal ID and Message ID are required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    // Fetch message to verify ownership
    const messages = await sql`
      SELECT user_id FROM proposal_discussions 
      WHERE id = ${messageId} AND proposal_id = ${proposalId}
    `;

    if (messages.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const msg = messages[0];

    // Check if user owns the message
    if (msg.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this message' });
    }

    // Update message
    const result = await sql`
      UPDATE proposal_discussions 
      SET message = ${message.trim()}, updated_at = NOW()
      WHERE id = ${messageId} AND proposal_id = ${proposalId}
      RETURNING id, proposal_id, user_id, message, created_at, updated_at
    `;

    const updatedMessage = result[0];
    const user = await User.findById(userId);

    res.status(200).json({
      success: true,
      data: {
        id: updatedMessage.id,
        proposal_id: updatedMessage.proposal_id,
        user_id: updatedMessage.user_id,
        username: user.username,
        message: updatedMessage.message,
        created_at: updatedMessage.created_at,
        updated_at: updatedMessage.updated_at,
      },
    });
  } catch (error) {
    console.error('[Discussion Controller] Error updating message:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
}

module.exports = {
  getDiscussion,
  postMessage,
  deleteMessage,
  updateMessage,
};
