const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const overviewController = require('../controller/overviewController');

// Get overview data for a space
router.get('/:spaceId', authMiddleware, overviewController.getOverviewData);

module.exports = router;