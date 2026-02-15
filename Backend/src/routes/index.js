const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./authRoutes');
const profileRoutes = require('./profileRoutes');
const spaceRoutes = require('./spaceRoutes');
const proposalRoutes = require('./proposalRoutes');
const overviewRoutes = require('./overviewRoutes');
const activityRoutes = require('./activityRoutes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/users', profileRoutes); // Also available under /users
router.use('/spaces', spaceRoutes);
router.use('/spaces', proposalRoutes); // Proposals nested under spaces
router.use('/overview', overviewRoutes);
router.use('/activities', activityRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
