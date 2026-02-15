// Twitter OAuth Routes
const express = require('express');
const router = express.Router();
const twitterOAuthController = require('../controller/twitterOAuthController');
const { authMiddleware } = require('../middleware');

/**
 * GET /api/auth/twitter
 * Get Twitter OAuth authorization URL
 */
router.get('/twitter', twitterOAuthController.getAuthorizationUrl);

/**
 * GET /api/auth/twitter/callback
 * Handle Twitter OAuth callback (redirect from Twitter)
 * NOTE: No authMiddleware required - Twitter redirects here without authentication
 */
router.get('/twitter/callback', twitterOAuthController.handleCallback);

/**
 * GET /api/auth/twitter/status
 * Get current Twitter verification status
 */
router.get('/twitter/status', authMiddleware, twitterOAuthController.getTwitterStatus);

/**
 * POST /api/auth/twitter/disconnect
 * Disconnect Twitter account
 */
router.post('/twitter/disconnect', authMiddleware, twitterOAuthController.disconnectTwitter);

module.exports = router;
