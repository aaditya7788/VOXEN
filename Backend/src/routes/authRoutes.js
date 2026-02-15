// Auth Routes
const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const twitterOAuthController = require('../controller/twitterOAuthController');
const { authMiddleware } = require('../middleware');

// Wallet Signature Authentication (Recommended)
router.post('/nonce', authController.getNonce);              // Step 1: Get nonce to sign
router.post('/verify', authController.verifyAndLogin);       // Step 2: Verify signature & login

// Legacy routes (without signature - for testing only)
router.post('/register', authController.register);
router.post('/login/wallet', authController.loginWithWallet);

// Public routes
router.get('/users/search', authController.searchUsers);
router.get('/users/:id', authController.getUserById);
router.get('/username/:username/available', authController.checkUsername);

// Email Verification routes
router.post('/email/request-verification', authMiddleware, authController.requestEmailVerification);  // Request email verification
router.get('/email/status', authMiddleware, authController.getEmailVerificationStatus);              // Get verification status

// OTP Email Verification routes (new)
router.post('/email/send-otp', authMiddleware, authController.sendEmailOTP);                        // Send or resend OTP
router.post('/email/verify-otp', authMiddleware, authController.verifyEmailOTP);                    // Verify OTP

// Protected routes (require authentication)
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, authController.updateProfile);
router.post('/logout', authMiddleware, authController.logout);

// Twitter OAuth routes
router.get('/twitter', twitterOAuthController.getAuthorizationUrl);
router.get('/twitter/callback', twitterOAuthController.handleCallback); // No auth required - Twitter redirects here
router.get('/twitter/status', authMiddleware, twitterOAuthController.getTwitterStatus);
router.post('/twitter/disconnect', authMiddleware, twitterOAuthController.disconnectTwitter);

module.exports = router;
