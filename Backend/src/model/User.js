// Twitter handle cooldown logic
// Set cooldown for a handle (15 days)
const setTwitterHandleCooldown = async (twitter_handle, user_id) => {
  const cooldownUntil = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 days from now
  await sql`
    INSERT INTO twitter_handle_cooldowns (twitter_handle, user_id, disconnected_at, cooldown_until)
    VALUES (${twitter_handle}, ${user_id}, NOW(), ${cooldownUntil})
    ON CONFLICT (twitter_handle) DO UPDATE SET
      user_id = ${user_id},
      disconnected_at = NOW(),
      cooldown_until = ${cooldownUntil}
  `;
};

// Check if a handle is in cooldown (returns true/false and cooldown_until)
const getTwitterHandleCooldown = async (twitter_handle) => {
  const [row] = await sql`
    SELECT * FROM twitter_handle_cooldowns WHERE twitter_handle = ${twitter_handle}
  `;
  if (!row) return null;
  return row;
};

// Remove cooldown for a handle (if needed)
const clearTwitterHandleCooldown = async (twitter_handle) => {
  await sql`
    DELETE FROM twitter_handle_cooldowns WHERE twitter_handle = ${twitter_handle}
  `;
};
// User Model - Database operations for users table
const { sql } = require('../data');

// Default avatar colors for random assignment
const DEFAULT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8B500', '#FF6F61', '#6B5B95', '#88B04B', '#F7CAC9',
  '#92A8D1', '#955251', '#B565A7', '#009B77', '#DD4124'
];

// Generate random color
const getRandomColor = () => {
  return DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
};

// Generate default avatar URL (using DiceBear API)
const getDefaultAvatar = (seed) => {
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${seed}`;
};

// Create users table if not exists
const createUsersTable = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      -- Core Identity
      wallet_address VARCHAR(255) UNIQUE,
      username VARCHAR(100) UNIQUE,
      name VARCHAR(255),
      email VARCHAR(255) UNIQUE,
      bio TEXT,
      
      -- Profile Appearance
      profile_pic TEXT,
      background_color VARCHAR(10),
      -- Social Links (handles and linked timestamps)
      twitter_handle VARCHAR(255),
      twitter_linked_at TIMESTAMP WITH TIME ZONE,
      discord_handle VARCHAR(255),
      discord_linked_at TIMESTAMP WITH TIME ZONE,
      telegram_handle VARCHAR(255),
      telegram_linked_at TIMESTAMP WITH TIME ZONE,
      email_verified_at TIMESTAMP WITH TIME ZONE,
      
      -- Status
      is_verified BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
      
      -- Session Management
      active_token TEXT,
      login_at TIMESTAMP WITH TIME ZONE,
      nonce VARCHAR(100),
      nonce_expires_at TIMESTAMP WITH TIME ZONE,
      
      -- Timestamps
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  console.log('Users table created/verified');
};

// Create a new user
const createUser = async (userData) => {
  const {
    wallet_address,
    username,
    name,
    email,
    bio,
    profile_pic,
    background_color
  } = userData;

  // Generate defaults
  const finalProfilePic = profile_pic || getDefaultAvatar(wallet_address || Date.now());
  const finalBgColor = background_color || getRandomColor();

  const [user] = await sql`
    INSERT INTO users (
      wallet_address, username, name, email, bio,
      profile_pic, background_color
    )
    VALUES (
      ${wallet_address || null},
      ${username || null},
      ${name || null},
      ${email || null},
      ${bio || null},
      ${finalProfilePic},
      ${finalBgColor}
    )
    RETURNING *
  `;
  return user;
};

// Find user by ID
const findById = async (id) => {
  if (!id) return null;
  try {
    const [user] = await sql`
      SELECT * FROM users WHERE id = ${id}
    `;
    return user;
  } catch (error) {
    console.error('Find user by ID error:', error);
    return null;
  }
};

// Find user by wallet address
const findByWallet = async (wallet_address) => {
  const [user] = await sql`
    SELECT * FROM users WHERE wallet_address = ${wallet_address}
  `;
  return user;
};

// Find user by username
const findByUsername = async (username) => {
  if (!username) return null;
  const [user] = await sql`
    SELECT * FROM users WHERE username = ${username}
  `;
  return user;
};

// Find user by email
const findByEmail = async (email) => {
  if (!email) return null;
  const [user] = await sql`
    SELECT * FROM users WHERE email = ${email}
  `;
  return user;
};

// Update user profile
const updateUser = async (id, updates) => {
  // Convert undefined to null for postgres compatibility
  const safeValue = (val) => val === undefined ? null : val;

  const username = safeValue(updates.username) || null;
  const name = safeValue(updates.name) || null;
  const email = safeValue(updates.email) || null;
  const bio = safeValue(updates.bio) || null;
  const profile_pic = safeValue(updates.profile_pic) || null;
  const background_color = safeValue(updates.background_color) || null;
  const twitter_handle = safeValue(updates.twitter_handle) || null;
  const twitter_linked_at = safeValue(updates.twitter_linked_at) || null;
  const twitter_account_age_days = updates.twitter_account_age_days !== undefined ? updates.twitter_account_age_days : null;
  const twitter_created_at = safeValue(updates.twitter_created_at) || null;
  const discord_handle = safeValue(updates.discord_handle) || null;
  const discord_linked_at = safeValue(updates.discord_linked_at) || null;
  const telegram_handle = safeValue(updates.telegram_handle) || null;
  const telegram_linked_at = safeValue(updates.telegram_linked_at) || null;
  const email_verified_at = safeValue(updates.email_verified_at) || null;

  // OTP fields
  const email_otp = safeValue(updates.email_otp) || null;
  const email_otp_created_at = safeValue(updates.email_otp_created_at) || null;
  const email_otp_attempts = updates.email_otp_attempts !== undefined ? updates.email_otp_attempts : null;
  const email_otp_verified = updates.email_otp_verified !== undefined ? updates.email_otp_verified : null;

  const [user] = await sql`
    UPDATE users
    SET
      username = COALESCE(${username}, username),
      name = COALESCE(${name}, name),
      email = COALESCE(${email}, email),
      bio = COALESCE(${bio}, bio),
      profile_pic = COALESCE(${profile_pic}, profile_pic),
      background_color = COALESCE(${background_color}, background_color),
      twitter_handle = COALESCE(${twitter_handle}, twitter_handle),
      twitter_linked_at = COALESCE(${twitter_linked_at}, twitter_linked_at),
      twitter_account_age_days = COALESCE(${twitter_account_age_days}, twitter_account_age_days),
      twitter_created_at = COALESCE(${twitter_created_at}, twitter_created_at),
      discord_handle = COALESCE(${discord_handle}, discord_handle),
      discord_linked_at = COALESCE(${discord_linked_at}, discord_linked_at),
      telegram_handle = COALESCE(${telegram_handle}, telegram_handle),
      telegram_linked_at = COALESCE(${telegram_linked_at}, telegram_linked_at),
      email_verified_at = COALESCE(${email_verified_at}, email_verified_at),
      email_otp = COALESCE(${email_otp}, email_otp),
      email_otp_created_at = COALESCE(${email_otp_created_at}, email_otp_created_at),
      email_otp_attempts = COALESCE(${email_otp_attempts}, email_otp_attempts),
      email_otp_verified = COALESCE(${email_otp_verified}, email_otp_verified),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return user;
};

// Verify user
const verifyUser = async (id) => {
  const [user] = await sql`
    UPDATE users
    SET is_verified = true, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return user;
};

// Unverify user
const unverifyUser = async (id) => {
  const [user] = await sql`
    UPDATE users
    SET is_verified = false, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return user;
};

// Update user role
const updateRole = async (id, role) => {
  const [user] = await sql`
    UPDATE users
    SET role = ${role}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return user;
};

// Get all users (with pagination)
const getAllUsers = async (limit = 50, offset = 0) => {
  const users = await sql`
    SELECT id, wallet_address, username, name, profile_pic, 
           background_color, is_verified, role, created_at
    FROM users
    WHERE is_active = true
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  return users;
};

// Search users by username or name
const searchUsers = async (query, limit = 20) => {
  const users = await sql`
    SELECT id, wallet_address, username, name, profile_pic, 
           background_color, is_verified
    FROM users
    WHERE is_active = true
      AND (
        username ILIKE ${'%' + query + '%'}
        OR name ILIKE ${'%' + query + '%'}
      )
    ORDER BY 
      CASE WHEN username ILIKE ${query + '%'} THEN 0 ELSE 1 END,
      created_at DESC
    LIMIT ${limit}
  `;
  return users;
};

// Delete user (soft delete)
const deleteUser = async (id) => {
  const [user] = await sql`
    UPDATE users
    SET is_active = false, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return user;
};

// Check if username is available
const isUsernameAvailable = async (username, excludeUserId = null) => {
  const [existing] = await sql`
    SELECT id FROM users 
    WHERE username = ${username}
    ${excludeUserId ? sql`AND id != ${excludeUserId}` : sql``}
  `;
  return !existing;
};

// Get user count
const getUserCount = async () => {
  const [result] = await sql`
    SELECT COUNT(*) as count FROM users WHERE is_active = true
  `;
  return parseInt(result.count);
};

// Update login session (store token and login time)
const updateLoginSession = async (id, token) => {
  const [user] = await sql`
    UPDATE users
    SET 
      active_token = ${token},
      login_at = NOW(),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return user;
};

// Validate token matches active token
const validateActiveToken = async (id, token) => {
  const [user] = await sql`
    SELECT id, active_token FROM users WHERE id = ${id}
  `;
  return user && user.active_token === token;
};

// Logout (clear active token)
const logout = async (id) => {
  const [user] = await sql`
    UPDATE users
    SET active_token = NULL, updated_at = NOW()
    WHERE id = ${id}
    RETURNING id
  `;
  return user;
};

// Generate nonce for wallet signature verification
const generateNonce = async (wallet_address) => {
  const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Check if user exists
  let [user] = await sql`
    SELECT id FROM users WHERE wallet_address = ${wallet_address}
  `;

  if (user) {
    // Update existing user's nonce
    [user] = await sql`
      UPDATE users
      SET nonce = ${nonce}, nonce_expires_at = ${expiresAt}
      WHERE wallet_address = ${wallet_address}
      RETURNING id, wallet_address, nonce
    `;
  } else {
    // Create temp record with nonce (will be completed on verify)
    const profilePic = getDefaultAvatar(wallet_address);
    const bgColor = getRandomColor();
    [user] = await sql`
      INSERT INTO users (wallet_address, nonce, nonce_expires_at, profile_pic, background_color)
      VALUES (${wallet_address}, ${nonce}, ${expiresAt}, ${profilePic}, ${bgColor})
      RETURNING id, wallet_address, nonce
    `;
  }

  return { nonce, wallet_address };
};

// Validate nonce and clear it
const validateAndClearNonce = async (wallet_address, nonce) => {
  const [user] = await sql`
    SELECT id, nonce, nonce_expires_at 
    FROM users 
    WHERE wallet_address = ${wallet_address}
  `;

  if (!user) return { valid: false, error: 'User not found' };
  if (!user.nonce) return { valid: false, error: 'No pending nonce' };
  if (user.nonce !== nonce) return { valid: false, error: 'Invalid nonce' };
  if (new Date(user.nonce_expires_at) < new Date()) {
    return { valid: false, error: 'Nonce expired' };
  }

  // Clear the nonce after validation
  await sql`
    UPDATE users
    SET nonce = NULL, nonce_expires_at = NULL
    WHERE wallet_address = ${wallet_address}
  `;

  return { valid: true, userId: user.id };
};

// Get user activities (proposals, votes, comments)
const getUserActivities = async (userId, limit = 20, offset = 0) => {
  try {
    const Activity = require('./Activity');
    return await Activity.getUserActivities(userId, limit);
  } catch (error) {
    console.error('Get activities error:', error);
    return [];
  }
};

// Get user activity count
const getUserActivityCount = async (userId) => {
  try {
    const [result] = await sql`
      SELECT COUNT(*) as count FROM activities WHERE user_id = ${userId}
    `;
    return parseInt(result.count);
  } catch (error) {
    console.error('Get activity count error:', error);
    return 0;
  }
};

// Get user's joined spaces
const getUserSpaces = async (userId, limit = 20, offset = 0) => {
  try {
    const spaces = await sql`
      SELECT s.id, s.name, s.slug, s.logo, s.visibility, us.role as user_role, us.joined_at
      FROM space_members us
      JOIN spaces s ON us.space_id = s.id
      WHERE us.user_id = ${userId} AND us.is_active = true
      ORDER BY us.joined_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    return spaces;
  } catch (error) {
    console.error('Get user spaces error:', error);
    return [];
  }
};

// Get user space count
const getUserSpaceCount = async (userId) => {
  try {
    const [result] = await sql`
      SELECT COUNT(*) as count FROM space_members WHERE user_id = ${userId} AND is_active = true
    `;
    return parseInt(result.count);
  } catch (error) {
    console.error('Get space count error:', error);
    return 0;
  }
};

// Get user notifications
const getUserNotifications = async (userId, limit = 20, offset = 0, unreadOnly = false) => {
  try {
    const query = unreadOnly
      ? sql`
        SELECT id, type, title, message, is_read, created_at
        FROM notifications
        WHERE user_id = ${userId} AND is_read = false
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
      : sql`
        SELECT id, type, title, message, is_read, created_at
        FROM notifications
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

    return await query;
  } catch (error) {
    console.error('Get notifications error:', error);
    return [];
  }
};

// Get user notification count
const getUserNotificationCount = async (userId, unreadOnly = false) => {
  try {
    const query = unreadOnly
      ? sql`
        SELECT COUNT(*) as count FROM notifications
        WHERE user_id = ${userId} AND is_read = false
      `
      : sql`
        SELECT COUNT(*) as count FROM notifications
        WHERE user_id = ${userId}
      `;

    const [result] = await query;
    return parseInt(result.count);
  } catch (error) {
    console.error('Get notification count error:', error);
    return 0;
  }
};

// Check if user is eligible for KYC (all linked socials must be 6+ months old)
const checkKYCEligibility = async (userId) => {
  try {
    const [user] = await sql`
      SELECT twitter_linked_at, discord_linked_at, telegram_linked_at, email_verified_at
      FROM users
      WHERE id = ${userId}
    `;

    if (!user) return { eligible: false, reason: 'User not found', nextEligibleDate: null };

    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

    // Collect all linked accounts with their ages
    const linkedAccounts = [];
    const oldestDates = [];

    if (user.twitter_linked_at) {
      const linkedDate = new Date(user.twitter_linked_at);
      linkedAccounts.push({ platform: 'Twitter', linkedDate, isOldEnough: linkedDate <= sixMonthsAgo });
      oldestDates.push(linkedDate);
    }
    if (user.discord_linked_at) {
      const linkedDate = new Date(user.discord_linked_at);
      linkedAccounts.push({ platform: 'Discord', linkedDate, isOldEnough: linkedDate <= sixMonthsAgo });
      oldestDates.push(linkedDate);
    }
    if (user.telegram_linked_at) {
      const linkedDate = new Date(user.telegram_linked_at);
      linkedAccounts.push({ platform: 'Telegram', linkedDate, isOldEnough: linkedDate <= sixMonthsAgo });
      oldestDates.push(linkedDate);
    }
    if (user.email_verified_at) {
      const linkedDate = new Date(user.email_verified_at);
      linkedAccounts.push({ platform: 'Email', linkedDate, isOldEnough: linkedDate <= sixMonthsAgo });
      oldestDates.push(linkedDate);
    }

    // If no linked accounts, not eligible
    if (linkedAccounts.length === 0) {
      return {
        eligible: false,
        reason: 'No linked social accounts',
        linkedAccounts: [],
        nextEligibleDate: null,
      };
    }

    // Check if ALL linked accounts are 6+ months old
    const allOldEnough = linkedAccounts.every(acc => acc.isOldEnough);

    if (allOldEnough) {
      return {
        eligible: true,
        reason: 'All linked social accounts are 6+ months old',
        linkedAccounts,
        nextEligibleDate: null,
      };
    }

    // Calculate when user becomes eligible (6 months from oldest account that's not old enough)
    const newestLinkedDate = new Date(Math.max(...oldestDates.map(d => d.getTime())));
    const nextEligibleDate = new Date(newestLinkedDate.getTime() + 180 * 24 * 60 * 60 * 1000);

    return {
      eligible: false,
      reason: 'All linked social accounts must be at least 6 months old',
      linkedAccounts,
      nextEligibleDate,
    };
  } catch (error) {
    console.error('Check KYC eligibility error:', error);
    return { eligible: false, reason: 'Error checking eligibility', nextEligibleDate: null };
  }
};

// Get KYC status
const getKYCStatus = async (userId) => {
  try {
    let status = null;

    try {
      const result = await sql`
        SELECT id, status, submitted_at, verified_at
        FROM kyc_verifications
        WHERE user_id = ${userId}
        ORDER BY submitted_at DESC
        LIMIT 1
      `;
      status = result[0] || null;
    } catch (dbError) {
      // Table might not exist yet - continue with null status
      if (dbError.code !== '42P01') {
        throw dbError;
      }
    }

    // Also get eligibility info
    const eligibility = await checkKYCEligibility(userId);

    return {
      ...(status || { status: 'not_started' }),
      eligibility,
    };
  } catch (error) {
    console.error('Get KYC status error:', error);
    return { status: 'not_started', eligibility: { eligible: false } };
  }
};

// Submit KYC verification
const submitKYCVerification = async (userId, data) => {
  try {
    const { full_name, id_type, id_number, country } = data;

    // Check eligibility
    const eligibility = await checkKYCEligibility(userId);

    if (!eligibility.eligible) {
      const err = new Error(
        `KYC submission requires all linked social accounts to be at least 6 months old. ${eligibility.nextEligibleDate
          ? `You'll be eligible on ${new Date(eligibility.nextEligibleDate).toLocaleDateString()}`
          : 'Please link a social account first.'
        }`
      );
      err.status = 400;
      throw err;
    }

    const [result] = await sql`
      INSERT INTO kyc_verifications (
        user_id, full_name, id_type, id_number, country, status, submitted_at
      )
      VALUES (
        ${userId}, ${full_name}, ${id_type}, ${id_number}, ${country}, 'pending', NOW()
      )
      RETURNING id, status, submitted_at
    `;

    return result;
  } catch (error) {
    console.error('Submit KYC error:', error);
    throw error;
  }
};

// Get user settings
const getUserSettings = async (userId) => {
  try {
    const [settings] = await sql`
      SELECT theme, language, email_notifications, created_at, updated_at
      FROM user_settings
      WHERE user_id = ${userId}
    `;

    return settings || { theme: 'dark', language: 'en', email_notifications: true };
  } catch (error) {
    console.error('Get user settings error:', error);
    return { theme: 'dark', language: 'en', email_notifications: true };
  }
};

// Update user settings
const updateUserSettings = async (userId, settings) => {
  try {
    const { theme, language, email_notifications } = settings;

    const [result] = await sql`
      INSERT INTO user_settings (user_id, theme, language, email_notifications, updated_at)
      VALUES (${userId}, ${theme || 'dark'}, ${language || 'en'}, ${email_notifications !== false}, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        theme = COALESCE(${theme}, theme),
        language = COALESCE(${language}, language),
        email_notifications = COALESCE(${email_notifications}, email_notifications),
        updated_at = NOW()
      RETURNING *
    `;

    return result;
  } catch (error) {
    console.error('Update settings error:', error);
    throw error;
  }
};

// Update privacy settings
const updatePrivacySettings = async (userId, settings) => {
  try {
    const { profile_private, show_email, show_wallet } = settings;

    const [result] = await sql`
      INSERT INTO user_privacy_settings (user_id, profile_private, show_email, show_wallet, updated_at)
      VALUES (${userId}, ${profile_private || false}, ${show_email || false}, ${show_wallet || false}, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        profile_private = COALESCE(${profile_private}, profile_private),
        show_email = COALESCE(${show_email}, show_email),
        show_wallet = COALESCE(${show_wallet}, show_wallet),
        updated_at = NOW()
      RETURNING *
    `;

    return result;
  } catch (error) {
    console.error('Update privacy error:', error);
    throw error;
  }
};

// Update notification preferences
const updateNotificationPreferences = async (userId, preferences) => {
  try {
    const prefs = JSON.stringify(preferences);

    const [result] = await sql`
      INSERT INTO user_notification_preferences (user_id, preferences, updated_at)
      VALUES (${userId}, ${prefs}, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        preferences = ${prefs},
        updated_at = NOW()
      RETURNING preferences
    `;

    return JSON.parse(result.preferences);
  } catch (error) {
    console.error('Update notification prefs error:', error);
    throw error;
  }
};

// Email verification methods - simplified for Supabase Auth
const markEmailAsVerified = async (userId) => {
  const [user] = await sql`
    UPDATE users
    SET 
      email_verified = true,
      email_verified_at = NOW(),
      updated_at = NOW()
    WHERE id = ${userId}
    RETURNING *
  `;
  return user;
};

const isEmailVerified = async (userId) => {
  const [result] = await sql`
    SELECT email_verified FROM users WHERE id = ${userId}
  `;
  return result ? result.email_verified : false;
};

const getUserByEmail = async (email) => {
  const [user] = await sql`
    SELECT * FROM users WHERE email = ${email}
  `;
  return user;
};

// Get recent activities for a space
const getRecentActivities = async (spaceId, limit = 5) => {
  try {
    const activities = await sql`
      SELECT * FROM activities
      WHERE space_id = ${spaceId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return activities || [];
  } catch (error) {
    console.error('Error fetching activities:', error);
    // Return empty array if activities table doesn't exist
    return [];
  }
};

module.exports = {
  createUsersTable,
  createUser,
  findById,
  findByWallet,
  findByUsername,
  findByEmail,
  getUserByEmail,
  updateUser,
  verifyUser,
  unverifyUser,
  updateRole,
  getAllUsers,
  searchUsers,
  deleteUser,
  isUsernameAvailable,
  getUserCount,
  updateLoginSession,
  validateActiveToken,
  logout,
  generateNonce,
  validateAndClearNonce,
  getUserActivities,
  getUserActivityCount,
  getUserSpaces,
  getUserSpaceCount,
  getUserNotifications,
  getUserNotificationCount,
  checkKYCEligibility,
  getKYCStatus,
  submitKYCVerification,
  getUserSettings,
  updateUserSettings,
  updatePrivacySettings,
  updateNotificationPreferences,
  getRandomColor,
  getDefaultAvatar,
  setTwitterHandleCooldown,
  getTwitterHandleCooldown,
  clearTwitterHandleCooldown,
  markEmailAsVerified,
  isEmailVerified,
  getUserByEmail,
  getRecentActivities
};
