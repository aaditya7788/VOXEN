// Profile Routes - User profile endpoints
const express = require('express');
const router = express.Router();
const profileController = require('../controller/profileController');
const { authMiddleware } = require('../middleware');

// Public profile routes
router.get('/users/:identifier', profileController.getUserById);           // Get user by ID or username
router.get('/users/:id/activities', profileController.getUserActivities);  // Get user activities
router.get('/users/:id/spaces', profileController.getUserSpaces);          // Get user's joined spaces
router.get('/users/:id/notifications', profileController.getUserNotifications); // Get notifications

// Protected profile routes
router.get('/me/profile', authMiddleware, profileController.getProfile);    // Get current user profile
router.put('/me/profile', authMiddleware, profileController.updateProfile); // Update current user profile
router.post('/me/avatar', authMiddleware, profileController.updateAvatar);  // Upload avatar
router.put('/me/bio', authMiddleware, profileController.updateBio);         // Update bio
router.put('/me/username', authMiddleware, profileController.updateUsername); // Update username

// KYC/Verification routes
router.get('/me/kyc-status', authMiddleware, profileController.getKYCStatus);       // Get KYC status
router.post('/me/kyc-verify', authMiddleware, profileController.submitKYCVerification); // Submit KYC

// Activity routes (current user)
router.get('/me/activity', authMiddleware, profileController.getCurrentUserActivities); // Get current user activities

// Settings
router.get('/me/settings', authMiddleware, profileController.getUserSettings); // Get user settings
router.put('/me/settings', authMiddleware, profileController.updateUserSettings); // Update settings
router.put('/me/privacy', authMiddleware, profileController.updatePrivacySettings); // Update privacy

// Notification preferences
router.get('/me/notification-preferences', authMiddleware, profileController.getNotificationPreferences); // Get notification preferences
router.post('/me/notification-preferences', authMiddleware, profileController.updateNotificationPreferences); // Update notification preferences

// Delete account
router.delete('/me/account', authMiddleware, profileController.deleteAccount); // Delete account (soft delete)

module.exports = router;
