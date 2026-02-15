const express = require('express');
const router = express.Router();
const proposalController = require('../controller/proposalController');
const { authMiddleware } = require('../middleware');

/**
 * GET /api/feed
 * Get random proposals from user's joined spaces
 */
router.get('/', authMiddleware, proposalController.getUserFeed);

module.exports = router;
