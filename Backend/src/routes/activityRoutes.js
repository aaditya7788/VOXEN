const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const activityController = require('../controller/activityController');

// Get space activities
router.get('/spaces/:spaceId', authMiddleware, activityController.getSpaceActivities);

// Get user activities (current user)
router.get('/user', authMiddleware, activityController.getUserActivities);

// Get proposal activities
router.get('/proposals/:proposalId', authMiddleware, activityController.getProposalActivities);

module.exports = router;
