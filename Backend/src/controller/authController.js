// Auth Controller - Handle login/register logic
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');

const config = require('../config');
const User = require('../model/User');
const { supabaseClient } = require('../utils/supabaseClient');
const emailService = require('../utils/emailService');
const { createPublicClient, http } = require('viem');
const { base, baseSepolia } = require('viem/chains');

// Initialize Viem clients for signature verification
const baseClient = createPublicClient({
  chain: base,
  transport: http()
});

const baseSepoliaClient = createPublicClient({
  chain: baseSepolia,
  transport: http()
});

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      wallet_address: user.wallet_address,
      role: user.role
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

// Get nonce for wallet signature
const getNonce = async (req, res) => {
  try {
    const { wallet_address } = req.body;

    if (!wallet_address) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address is required'
      });
    }

    // Validate wallet address format
    if (!ethers.isAddress(wallet_address)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address format'
      });
    }

    const { nonce } = await User.generateNonce(wallet_address.toLowerCase());

    // Create message for signing
    const message = `Sign this message to verify your wallet ownership.\n\nNonce: ${nonce}\nWallet: ${wallet_address.toLowerCase()}\n\nThis signature will not trigger any blockchain transaction.`;

    res.json({
      success: true,
      data: {
        nonce,
        message,
        wallet_address: wallet_address.toLowerCase()
      }
    });
  } catch (error) {
    console.error('Get nonce error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate nonce',
      error: error.message
    });
  }
};

// Verify signature and login
const verifyAndLogin = async (req, res) => {
  try {
    const { wallet_address, signature, nonce } = req.body;

    if (!wallet_address || !signature || !nonce) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address, signature, and nonce are required'
      });
    }

    const normalizedAddress = wallet_address.toLowerCase();

    // Validate nonce
    const nonceValidation = await User.validateAndClearNonce(normalizedAddress, nonce);
    if (!nonceValidation.valid) {
      return res.status(401).json({
        success: false,
        message: nonceValidation.error,
        code: 'INVALID_NONCE'
      });
    }

    // Reconstruct the message that was signed
    const message = `Sign this message to verify your wallet ownership.\n\nNonce: ${nonce}\nWallet: ${normalizedAddress}\n\nThis signature will not trigger any blockchain transaction.`;

    // Verify signature using Viem (supports both EOA and Smart Contract Wallets via EIP-1271)
    let isValid = false;
    try {
      // Try Base Mainnet first
      isValid = await baseClient.verifyMessage({
        address: normalizedAddress,
        message: message,
        signature: signature
      });

      // If failed, try Sepolia (in case user is on testnet)
      if (!isValid) {
        isValid = await baseSepoliaClient.verifyMessage({
          address: normalizedAddress,
          message: message,
          signature: signature
        });
      }
    } catch (err) {
      console.error('Signature verification error:', err);
      // Fallback for malformed signatures
      return res.status(401).json({
        success: false,
        message: 'Invalid signature format',
        code: 'INVALID_SIGNATURE'
      });
    }

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Signature verification failed',
        code: 'INVALID_SIGNATURE'
      });
    }

    // Get user (should exist from getNonce)
    let user = await User.findByWallet(normalizedAddress);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Generate token
    const token = generateToken(user);

    // Store token and update login_at
    user = await User.updateLoginSession(user.id, token);

    res.json({
      success: true,
      message: 'Wallet verified and logged in successfully',
      data: {
        user: {
          id: user.id,
          wallet_address: user.wallet_address,
          username: user.username,
          name: user.name,
          email: user.email,
          profile_pic: user.profile_pic,
          background_color: user.background_color,
          is_verified: user.is_verified,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Verify and login error:', error);
    res.status(500).json({
      success: false,
      message: 'Verification failed',
      error: error.message
    });
  }
};

// Register new user (legacy - without signature, keep for testing)
const register = async (req, res) => {
  try {
    const { wallet_address, username, name, email, bio, profile_pic, background_color } = req.body;

    // Validate required fields
    if (!wallet_address && !email) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address or email is required'
      });
    }

    // Check if user already exists
    if (wallet_address) {
      const existingWallet = await User.findByWallet(wallet_address);
      if (existingWallet) {
        return res.status(400).json({
          success: false,
          message: 'Wallet address already registered'
        });
      }
    }

    if (email) {
      const existingEmail = await User.findByEmail(email);
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }
    }

    if (username) {
      const isAvailable = await User.isUsernameAvailable(username);
      if (!isAvailable) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken'
        });
      }
    }

    // Create user
    let user = await User.createUser({
      wallet_address,
      username,
      name,
      email,
      bio,
      profile_pic,
      background_color
    });

    // Generate token
    const token = generateToken(user);

    // Store token and update login_at
    user = await User.updateLoginSession(user.id, token);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          wallet_address: user.wallet_address,
          username: user.username,
          name: user.name,
          email: user.email,
          profile_pic: user.profile_pic,
          background_color: user.background_color,
          is_verified: user.is_verified,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

// Login with wallet
const loginWithWallet = async (req, res) => {
  try {
    const { wallet_address } = req.body;

    if (!wallet_address) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address is required'
      });
    }

    // Find user
    let user = await User.findByWallet(wallet_address);

    // Auto-register if not found
    if (!user) {
      user = await User.createUser({ wallet_address });
    }

    // Check if active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Generate token
    const token = generateToken(user);

    // Store token and update login_at (invalidates previous sessions)
    user = await User.updateLoginSession(user.id, token);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          wallet_address: user.wallet_address,
          username: user.username,
          name: user.name,
          email: user.email,
          profile_pic: user.profile_pic,
          background_color: user.background_color,
          is_verified: user.is_verified,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        wallet_address: user.wallet_address,
        username: user.username,
        name: user.name,
        email: user.email,
        bio: user.bio,
        profile_pic: user.profile_pic,
        background_color: user.background_color,
        is_verified: user.is_verified,
        role: user.role,
        twitter_handle: user.twitter_handle,
        twitter_linked_at: user.twitter_linked_at,
        email_verified_at: user.email_verified_at,
        discord_handle: user.discord_handle,
        telegram_handle: user.telegram_handle,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { username, name, email, bio, profile_pic, background_color } = req.body;

    // Check username availability if changing
    if (username) {
      const isAvailable = await User.isUsernameAvailable(username, req.user.id);
      if (!isAvailable) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken'
        });
      }
    }

    const user = await User.updateUser(req.user.id, {
      username,
      name,
      email,
      bio,
      profile_pic,
      background_color
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user.id,
        wallet_address: user.wallet_address,
        username: user.username,
        name: user.name,
        email: user.email,
        bio: user.bio,
        profile_pic: user.profile_pic,
        background_color: user.background_color
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

// Get user by ID (public profile)
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user || !user.is_active) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        wallet_address: user.wallet_address,
        username: user.username,
        name: user.name,
        bio: user.bio,
        profile_pic: user.profile_pic,
        background_color: user.background_color,
        is_verified: user.is_verified,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user',
      error: error.message
    });
  }
};

// Search users
const searchUsers = async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const users = await User.searchUsers(q, parseInt(limit));

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search users',
      error: error.message
    });
  }
};

// Check username availability
const checkUsername = async (req, res) => {
  try {
    const { username } = req.params;

    if (!username || username.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters'
      });
    }

    const isAvailable = await User.isUsernameAvailable(username);

    res.json({
      success: true,
      data: {
        username,
        available: isAvailable
      }
    });
  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check username',
      error: error.message
    });
  }
};

// Logout - invalidate current session
const logout = async (req, res) => {
  try {
    await User.logout(req.user.id);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
};

// Request email verification
const requestEmailVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const userId = req.user.id;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Check if email is already taken
    const existingUser = await User.findByEmail(email);
    if (existingUser && existingUser.id !== userId) {
      return res.status(400).json({
        success: false,
        message: 'Email is already in use',
        code: 'EMAIL_TAKEN'
      });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Update email and store in DB with OTP
    await User.updateUser(userId, {
      email,
      email_otp: otp,
      email_otp_created_at: new Date(),
      email_otp_attempts: 0,
      email_otp_verified: false
    });

    // Send verification email via AWS SES instead of Supabase
    await emailService.sendOTPEmail(email, otp, user.name || 'User');

    res.json({
      success: true,
      message: 'Verification email sent successfully',
      data: {
        email,
        expiresIn: '24 hours'
      }
    });
  } catch (error) {
    console.error('Request email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send verification email',
      error: error.message
    });
  }
};

// Verify email (called when user clicks link in email)
const verifyEmail = async (req, res) => {
  try {
    const { userId } = req.body;

    // This would typically be handled by Supabase Auth callback
    // Mark email as verified in user DB
    const user = await User.markEmailAsVerified(userId);

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          email_verified: user.email_verified
        }
      }
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify email',
      error: error.message
    });
  }
};

// Get email verification status
const getEmailVerificationStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    res.json({
      success: true,
      data: {
        email: user.email,
        email_verified: user.email_verified || false,
        email_verified_at: user.email_verified_at
      }
    });
  } catch (error) {
    console.error('Get email verification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get verification status',
      error: error.message
    });
  }
};

// Send email OTP (Send or Resend)
const sendEmailOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const userId = req.user.id;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Check if email is already in use by another user
    const existingUser = await User.findByEmail(email);
    if (existingUser && existingUser.id !== userId) {
      return res.status(400).json({
        success: false,
        message: 'Email is already in use',
        code: 'EMAIL_TAKEN'
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Store OTP and email in database
    await User.updateUser(userId, {
      email,
      email_otp: otp,
      email_otp_created_at: new Date(),
      email_otp_attempts: 0,
      email_otp_verified: false
    });

    // Send OTP via centralized Email Service
    try {
      await emailService.sendOTPEmail(email, otp, user.name || 'User');
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      return res.status(500).json({
        success: false,
        message: 'Failed to send OTP email via AWS SES',
        error: emailError.message
      });
    }

    res.json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        email,
        expiresIn: '10 minutes'
      }
    });
  } catch (error) {
    console.error('Send email OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error: error.message
    });
  }
};

// Verify email OTP
const verifyEmailOTP = async (req, res) => {
  try {
    const { otp } = req.body;
    const userId = req.user.id;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: 'OTP is required'
      });
    }

    // Get user and check OTP
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if OTP exists and is not expired (10 minutes)
    if (!user.email_otp) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found. Please request a new one.'
      });
    }

    const otpCreatedTime = new Date(user.email_otp_created_at);
    const currentTime = new Date();
    const minutesElapsed = (currentTime - otpCreatedTime) / (1000 * 60);

    if (minutesElapsed > 10) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    // Check OTP attempts (max 5)
    if (user.email_otp_attempts > 5) {
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.'
      });
    }

    // Verify OTP
    if (user.email_otp !== otp) {
      // Increment attempts
      await User.updateUser(userId, {
        email_otp_attempts: (user.email_otp_attempts || 0) + 1
      });

      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
        attemptsRemaining: 5 - ((user.email_otp_attempts || 0) + 1)
      });
    }

    // OTP is correct - mark email as verified
    const updatedUser = await User.updateUser(userId, {
      email_otp_verified: true,
      email_verified_at: new Date(),
      email_otp: null,  // Clear OTP
      email_otp_created_at: null,
      email_otp_attempts: 0
    });

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          email_verified: true
        }
      }
    });
  } catch (error) {
    console.error('Verify email OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP',
      error: error.message
    });
  }
};

module.exports = {
  getNonce,
  verifyAndLogin,
  register,
  loginWithWallet,
  getProfile,
  updateProfile,
  getUserById,
  searchUsers,
  checkUsername,
  logout,
  requestEmailVerification,
  verifyEmail,
  getEmailVerificationStatus,
  sendEmailOTP,
  verifyEmailOTP
};
