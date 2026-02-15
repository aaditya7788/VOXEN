// Space Routes
const express = require('express');
const router = express.Router();
const spaceController = require('../controller/spaceController');
const authMiddleware = require('../middleware/authMiddleware');

// Optional auth middleware - adds user to req if authenticated, but doesn't require it
const optionalAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return next();
  }
  
  try {
    const jwt = require('jsonwebtoken');
    const config = require('../config');
    const User = require('../model/User');
    
    const decoded = jwt.verify(token, config.jwt.secret);
    const isValidSession = await User.validateActiveToken(decoded.id, token);
    
    if (isValidSession) {
      req.user = decoded;
      req.token = token;
    }
  } catch (error) {
    // Token invalid, continue without auth
  }
  next();
};

// Public routes (with optional auth for membership info)
router.get('/', spaceController.getSpaces);
router.get('/:slug', optionalAuth, spaceController.getSpaceBySlug);
router.get('/id/:id', spaceController.getSpaceById);
router.get('/:id/members', spaceController.getSpaceMembers);

// Protected routes (require authentication)
router.post('/', authMiddleware, spaceController.createSpace);
router.get('/user/created', authMiddleware, spaceController.getMySpaces);
router.get('/user/joined', authMiddleware, spaceController.getJoinedSpaces);
router.put('/:id', authMiddleware, spaceController.updateSpace);
router.delete('/:id', authMiddleware, spaceController.deleteSpace);

// Membership routes
router.post('/:id/join', authMiddleware, spaceController.joinSpace);
// Join by invite link (slug or link in body)
router.post('/join-by-link', authMiddleware, spaceController.joinByInviteLink);
router.post('/:id/leave', authMiddleware, spaceController.leaveSpace);
router.post('/:id/invite', authMiddleware, spaceController.inviteMember);
router.delete('/:id/members/:userId', authMiddleware, spaceController.removeMember);
router.put('/:id/members/:userId/role', authMiddleware, spaceController.updateMemberRole);

module.exports = router;
