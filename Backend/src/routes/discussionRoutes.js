const express = require('express');
const router = express.Router({ mergeParams: true });
const { authMiddleware } = require('../middleware');
const {
  getDiscussion,
  postMessage,
  deleteMessage,
  updateMessage,
} = require('../controller');

// Get all discussion messages for a proposal
router.get('/discussion', getDiscussion);

// Post a new discussion message (requires auth)
router.post('/discussion', authMiddleware, postMessage);

// Delete a discussion message (requires auth)
router.delete('/discussion/:messageId', authMiddleware, deleteMessage);

// Update a discussion message (requires auth)
router.patch('/discussion/:messageId', authMiddleware, updateMessage);

module.exports = router;
