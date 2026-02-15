// Twitter OAuth Controller - Handle Twitter/X OAuth 2.0 authentication
const axios = require('axios');
const { generateRandomString } = require('../utils/helpers');
const User = require('../model/User');

// Twitter OAuth endpoints
const TWITTER_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';
const TWITTER_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
const TWITTER_API_URL = 'https://api.twitter.com/2/users/me';

// Store state temporarily (in production, use Redis or database)
const stateStore = new Map();

/**
 * Step 1: Generate authorization URL
 * User clicks "Connect Twitter" → redirects to this
 */
const getAuthorizationUrl = (req, res) => {
  try {
    const clientId = process.env.TWITTER_CLIENT_ID;
    const redirectUri = process.env.TWITTER_REDIRECT_URI;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!clientId || !redirectUri) {
      return res.status(500).json({
        success: false,
        message: 'Twitter OAuth not configured'
      });
    }

    // For client-initiated OAuth, we need the user's auth token
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to connect Twitter'
      });
    }

    // Generate PKCE challenge (S256)
    const crypto = require('crypto');
    const state = generateRandomString(32);
    const codeVerifier = generateRandomString(64);
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Store state, verifier, and token for callback
    stateStore.set(state, {
      codeVerifier,
      token,
      createdAt: Date.now()
    });

    // Build authorization URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'tweet.read users.read offline.access',
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    const authUrl = `${TWITTER_AUTH_URL}?${params.toString()}`;

    res.json({
      success: true,
      authUrl
    });
  } catch (error) {
    console.error('Get authorization URL error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Step 2: Handle OAuth callback
 * Twitter redirects here with authorization code
 */
const handleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        message: 'Missing code or state'
      });
    }

    // Verify state and get stored data
    const stateData = stateStore.get(state);
    if (!stateData) {
      return res.status(400).json({
        success: false,
        message: 'Invalid state'
      });
    }

    // Check if state is not older than 10 minutes
    if (Date.now() - stateData.createdAt > 10 * 60 * 1000) {
      stateStore.delete(state);
      return res.status(400).json({
        success: false,
        message: 'State expired'
      });
    }

    const { codeVerifier, token } = stateData;

    // Decode token to get userId
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(token);
    const userId = decoded?.id;

    if (!userId) {
      stateStore.delete(state);
      return res.status(401).json({
        success: false,
        message: 'Invalid session'
      });
    }

    // Step 3: Exchange code for access token
    const tokenResponse = await axios.post(TWITTER_TOKEN_URL, {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: process.env.TWITTER_REDIRECT_URI,
      code_verifier: codeVerifier,
      client_id: process.env.TWITTER_CLIENT_ID
    }, {
      auth: {
        username: process.env.TWITTER_CLIENT_ID,
        password: process.env.TWITTER_CLIENT_SECRET
      }
    });

    const { access_token } = tokenResponse.data;


    // Step 4: Get user info (includes created_at)
    const userResponse = await axios.get(
      `${TWITTER_API_URL}?user.fields=created_at,public_metrics`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      }
    );

    const twitterUser = userResponse.data.data;
    const twitterHandle = twitterUser.username;
    const twitterCreatedAt = new Date(twitterUser.created_at);
    const accountAgeMs = Date.now() - twitterCreatedAt.getTime();
    const accountAgeDays = Math.floor(accountAgeMs / (1000 * 60 * 60 * 24));

    // Step 5: Check if account is 6+ months old (180 days)
    const isOldEnough = accountAgeDays >= 180;

    // Check if handle is in cooldown
    const cooldown = await User.getTwitterHandleCooldown(twitterHandle);
    if (cooldown && new Date(cooldown.cooldown_until) > new Date()) {
      throw new Error(`This Twitter handle is in cooldown. Try again after ${cooldown.cooldown_until}`);
    }

    // Check if handle is already linked to another user
    const existing = await User.findByUsername(twitterHandle);
    if (existing && existing.id !== userId) {
      throw new Error('This Twitter handle is already linked to another user.');
    }

    // Save to database
    await User.updateUser(userId, {
      twitter_handle: twitterHandle,
      twitter_linked_at: new Date(),
      twitter_account_age_days: accountAgeDays,
      twitter_created_at: twitterCreatedAt
    });

    // Clean up state
    stateStore.delete(state);

    // Log success and user info
    console.log('Twitter OAuth Success:', {
      userId,
      twitterHandle,
      accountAgeDays,
      isOldEnough
    });

    // Optionally, send a login response (JSON) if requested via Accept header
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.json({
        success: true,
        twitterHandle,
        accountAgeDays,
        isOldEnough
      });
    }

    // Redirect to frontend callback page with success using .env variable
    const frontendCallbackBase = process.env.FRONTEND_TWITTER_CALLBACK_URL || 'http://localhost:3000/auth/twitter/callback';
    const frontendCallbackUrl = `${frontendCallbackBase}?success=true&handle=${twitterHandle}&age=${accountAgeDays}&isOldEnough=${isOldEnough}`;
    res.redirect(frontendCallbackUrl);
  } catch (error) {
    console.error('OAuth callback error:', error.response?.data || error.message);
    // Redirect to frontend with error
    const errorMessage = error.response?.data?.error_description || error.message;
    res.redirect(`http://localhost:3000/auth/twitter/callback?error=${encodeURIComponent(errorMessage)}`);
  }
};

/**
 * Get Twitter verification status
 * Check if user's Twitter account is verified and 6+ months old
 */
const getTwitterStatus = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const user = await User.findById(userId);

    if (!user.twitter_handle) {
      // Check if there's a cooldown for this user (from previous disconnect)
      const cooldowns = await User.getTwitterHandleCooldown(user.twitter_handle);
      const cooldownData = {
        linked: false,
        handle: null,
        accountAgeDays: null,
        isOldEnough: false,
        canDisconnect: false
      };
      
      if (cooldowns && new Date(cooldowns.cooldown_until) > new Date()) {
        cooldownData.cooldown_until = cooldowns.cooldown_until;
      }
      
      return res.json({
        success: true,
        data: cooldownData
      });
    }

    const accountAgeDays = user.twitter_account_age_days || 0;
    const isOldEnough = accountAgeDays >= 180;
    const linkedDate = new Date(user.twitter_linked_at);
    
    // Check if 15 days have passed since linking (connection cooldown)
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    const canDisconnect = linkedDate <= fifteenDaysAgo;
    const disconnectAvailableAt = !canDisconnect 
      ? new Date(linkedDate.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    res.json({
      success: true,
      data: {
        linked: true,
        handle: user.twitter_handle,
        linkedAt: linkedDate.toISOString(),
        accountAgeDays,
        isOldEnough,
        canDisconnect,
        disconnectAvailableAt,
        eligibleDate: !isOldEnough
          ? new Date(linkedDate.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString()
          : null
      }
    });
  } catch (error) {
    console.error('Get Twitter status error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Disconnect Twitter account
 */
const disconnectTwitter = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get the user's current handle before disconnecting
    const user = await User.findById(userId);
    const handle = user.twitter_handle;

    await User.updateUser(userId, {
      twitter_handle: null,
      twitter_linked_at: null,
      twitter_account_age_days: null,
      twitter_created_at: null
    });

    // Set cooldown for this handle (15 days)
    if (handle) {
      await User.setTwitterHandleCooldown(handle, userId);
    }

    res.json({
      success: true,
      message: 'Twitter account disconnected. You cannot reconnect this handle for 15 days.'
    });
  } catch (error) {
    console.error('Disconnect Twitter error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getAuthorizationUrl,
  handleCallback,
  getTwitterStatus,
  disconnectTwitter
};
