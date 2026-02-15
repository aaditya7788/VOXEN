// Profile Controller - Handle user profile operations
const User = require('../model/User');

// Get user by ID or username (public)
const getUserById = async (req, res) => {
  try {
    const { identifier } = req.params;
    let user;

    // Try ID first
    user = await User.findById(identifier);

    // Try username if ID didn't work
    if (!user) {
      user = await User.findByUsername(identifier);
    }

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
        username: user.username,
        name: user.name,
        bio: user.bio,
        profile_pic: user.profile_pic,
        background_color: user.background_color,
        is_verified: user.is_verified,
          created_at: user.created_at,
          twitter_handle: user.twitter_handle,
          twitter_linked_at: user.twitter_linked_at,
          discord_handle: user.discord_handle,
          discord_linked_at: user.discord_linked_at,
          telegram_handle: user.telegram_handle,
          telegram_linked_at: user.telegram_linked_at,
          email_verified_at: user.email_verified_at
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

// Get user activities (proposals, votes, etc.)
const getUserActivities = async (req, res) => {
  try {
    const { identifier } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Get user first
    let user = await User.findById(identifier);
    if (!user) {
      user = await User.findByUsername(identifier);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user activities (proposals, votes, comments)
    const activities = await User.getUserActivities(user.id, limit, offset);
    const totalCount = await User.getUserActivityCount(user.id);

    res.json({
      success: true,
      data: {
        activities,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get activities',
      error: error.message
    });
  }
};

// Get user's joined spaces
const getUserSpaces = async (req, res) => {
  try {
    const { identifier } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Get user first
    let user = await User.findById(identifier);
    if (!user) {
      user = await User.findByUsername(identifier);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user spaces
    const spaces = await User.getUserSpaces(user.id, limit, offset);
    const totalCount = await User.getUserSpaceCount(user.id);

    res.json({
      success: true,
      data: {
        spaces,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user spaces error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user spaces',
      error: error.message
    });
  }
};

// Get user notifications (protected)
const getUserNotifications = async (req, res) => {
  try {
    const { identifier } = req.params;
    const { page = 1, limit = 20, unread_only = false } = req.query;
    const offset = (page - 1) * limit;

    // Get user first
    let user = await User.findById(identifier);
    if (!user) {
      user = await User.findByUsername(identifier);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get notifications
    const notifications = await User.getUserNotifications(
      user.id,
      limit,
      offset,
      unread_only === 'true'
    );
    const totalCount = await User.getUserNotificationCount(user.id, unread_only === 'true');

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notifications',
      error: error.message
    });
  }
};

// Get current user profile (protected)
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
        created_at: user.created_at,
        updated_at: user.updated_at,
        twitter_handle: user.twitter_handle,
        twitter_linked_at: user.twitter_linked_at,
        discord_handle: user.discord_handle,
        discord_linked_at: user.discord_linked_at,
        telegram_handle: user.telegram_handle,
        telegram_linked_at: user.telegram_linked_at,
        email_verified_at: user.email_verified_at
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

// Update user profile (protected)
const updateProfile = async (req, res) => {
  try {
    const { username, name, email, bio, twitter_handle, discord_handle, telegram_handle } = req.body;

    // Check username availability if changing
    if (username && username !== req.body.currentUsername) {
      const isAvailable = await User.isUsernameAvailable(username, req.user.id);
      if (!isAvailable) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken'
        });
      }
    }

    // If social handle provided, set linked_at to NOW() so backend records link time
    const now = new Date();
    const updates = {
      username,
      name,
      email,
      bio
    };

    if (twitter_handle) {
      updates.twitter_handle = twitter_handle;
      updates.twitter_linked_at = now;
    }
    if (discord_handle) {
      updates.discord_handle = discord_handle;
      updates.discord_linked_at = now;
    }
    if (telegram_handle) {
      updates.telegram_handle = telegram_handle;
      updates.telegram_linked_at = now;
    }

    const user = await User.updateUser(req.user.id, updates);

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
        background_color: user.background_color,
        updated_at: user.updated_at
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

// Update avatar (protected)
const updateAvatar = async (req, res) => {
  try {
    const { profile_pic } = req.body;

    if (!profile_pic) {
      return res.status(400).json({
        success: false,
        message: 'Profile picture is required'
      });
    }

    const user = await User.updateUser(req.user.id, {
      profile_pic
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Avatar updated successfully',
      data: {
        profile_pic: user.profile_pic
      }
    });
  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update avatar',
      error: error.message
    });
  }
};

// Update bio (protected)
const updateBio = async (req, res) => {
  try {
    const { bio } = req.body;

    if (bio && bio.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Bio must be less than 500 characters'
      });
    }

    const user = await User.updateUser(req.user.id, {
      bio
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Bio updated successfully',
      data: {
        bio: user.bio
      }
    });
  } catch (error) {
    console.error('Update bio error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update bio',
      error: error.message
    });
  }
};

// Update username (protected)
const updateUsername = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username || username.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters'
      });
    }

    if (username.length > 30) {
      return res.status(400).json({
        success: false,
        message: 'Username must be less than 30 characters'
      });
    }

    // Check availability
    const isAvailable = await User.isUsernameAvailable(username, req.user.id);
    if (!isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Username already taken'
      });
    }

    const user = await User.updateUser(req.user.id, {
      username
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Username updated successfully',
      data: {
        username: user.username
      }
    });
  } catch (error) {
    console.error('Update username error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update username',
      error: error.message
    });
  }
};

// Get KYC status (protected)
const getKYCStatus = async (req, res) => {
  try {
    const status = await User.getKYCStatus(req.user.id);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Get KYC status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get KYC status',
      error: error.message
    });
  }
};

// Submit KYC verification (protected)
const submitKYCVerification = async (req, res) => {
  try {
    const { full_name, id_type, id_number, country } = req.body;

    if (!full_name || !id_type || !id_number || !country) {
      return res.status(400).json({
        success: false,
        message: 'All KYC fields are required'
      });
    }

    const result = await User.submitKYCVerification(req.user.id, {
      full_name,
      id_type,
      id_number,
      country
    });

    res.json({
      success: true,
      message: 'KYC verification submitted',
      data: result
    });
  } catch (error) {
    console.error('Submit KYC error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit KYC',
      error: error.message
    });
  }
};

// Get user settings (protected)
const getUserSettings = async (req, res) => {
  try {
    const settings = await User.getUserSettings(req.user.id);

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get settings',
      error: error.message
    });
  }
};

// Update user settings (protected)
const updateUserSettings = async (req, res) => {
  try {
    const { theme, language, email_notifications } = req.body;

    const settings = await User.updateUserSettings(req.user.id, {
      theme,
      language,
      email_notifications
    });

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message
    });
  }
};

// Update privacy settings (protected)
const updatePrivacySettings = async (req, res) => {
  try {
    const { profile_private, show_email, show_wallet } = req.body;

    const settings = await User.updatePrivacySettings(req.user.id, {
      profile_private,
      show_email,
      show_wallet
    });

    res.json({
      success: true,
      message: 'Privacy settings updated',
      data: settings
    });
  } catch (error) {
    console.error('Update privacy error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update privacy settings',
      error: error.message
    });
  }
};

// Update notification preferences (protected)
const updateNotificationPreferences = async (req, res) => {
  try {
    const { notifications } = req.body;

    const prefs = await User.updateNotificationPreferences(req.user.id, notifications);

    res.json({
      success: true,
      message: 'Notification preferences updated',
      data: prefs
    });
  } catch (error) {
    console.error('Update notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update preferences',
      error: error.message
    });
  }
};

// Get notification preferences
const getNotificationPreferences = async (req, res) => {
  try {
    const prefs = await User.getUserNotificationPreferences ? 
      await User.getUserNotificationPreferences(req.user.id) : 
      { email_on_proposal: true, email_on_vote: true, email_on_member_join: true, push_enabled: false };

    res.json({
      success: true,
      data: prefs
    });
  } catch (error) {
    console.error('Get notification preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification preferences',
      error: error.message
    });
  }
};

// Get current user's activities
const getCurrentUserActivities = async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const activities = await User.getUserActivities(req.user.id, parseInt(limit), parseInt(offset));
    const count = await User.getUserActivityCount(req.user.id);

    res.json({
      success: true,
      data: activities,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: count
      }
    });
  } catch (error) {
    console.error('Get current user activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get activities',
      error: error.message
    });
  }
};

// Delete account (protected - soft delete)
const deleteAccount = async (req, res) => {
  try {
    const { password_confirmation } = req.body;

    if (!password_confirmation) {
      return res.status(400).json({
        success: false,
        message: 'Confirmation required to delete account'
      });
    }

    await User.deleteUser(req.user.id);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: error.message
    });
  }
};

module.exports = {
  getUserById,
  getUserActivities,
  getUserSpaces,
  getUserNotifications,
  getProfile,
  updateProfile,
  updateAvatar,
  updateBio,
  updateUsername,
  getKYCStatus,
  submitKYCVerification,
  getUserSettings,
  updateUserSettings,
  updatePrivacySettings,
  updateNotificationPreferences,
  getNotificationPreferences,
  getCurrentUserActivities,
  deleteAccount
};
