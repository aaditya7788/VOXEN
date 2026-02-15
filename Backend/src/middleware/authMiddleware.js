const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../model/User');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required' 
      });
    }

    // Verify JWT
    const decoded = jwt.verify(token, config.jwt.secret);

    // Validate token matches active session
    const isValidSession = await User.validateActiveToken(decoded.id, token);
    
    if (!isValidSession) {
      return res.status(401).json({ 
        success: false,
        message: 'Session expired. Please login again.',
        code: 'SESSION_EXPIRED'
      });
    }

    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired. Please login again.',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({ 
      success: false,
      message: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
};

module.exports = authMiddleware;
