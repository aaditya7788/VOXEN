// Space Model - Database operations for spaces table
const { sql } = require('../data');

// Generate unique slug from name
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')     // Replace spaces with dashes
    .replace(/-+/g, '-')      // Remove consecutive dashes
    .substring(0, 50);        // Limit length
};

// Create spaces table if not exists
const createSpacesTable = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS spaces (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      -- Basic Info
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      username VARCHAR(50) UNIQUE,
      category VARCHAR(50) DEFAULT 'General',
      invite_token VARCHAR(64) UNIQUE,
      description TEXT,
      logo TEXT,
      banner TEXT,
      
      -- Settings
      visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
      voting_strategy VARCHAR(50) DEFAULT 'one-person-one-vote',
      
      -- Stats (denormalized for performance)
      member_count INTEGER DEFAULT 0,
      proposal_count INTEGER DEFAULT 0,
      
      -- Ownership
      creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      
      -- Status
      is_verified BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      
      -- Timestamps
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Create index for faster lookups
  await sql`CREATE INDEX IF NOT EXISTS idx_spaces_slug ON spaces(slug)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_spaces_creator ON spaces(creator_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_spaces_visibility ON spaces(visibility)`;

  console.log('✅ Spaces table ready');
};

// Create space_members junction table
const createSpaceMembersTable = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS space_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      
      -- Role within space
      role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin', 'owner')),
      
      -- Voting power specific to this space
      voting_power INTEGER DEFAULT 1,
      
      -- Status
      is_active BOOLEAN DEFAULT true,
      
      -- Timestamps
      joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      
      UNIQUE(space_id, user_id)
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_space_members_space ON space_members(space_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_space_members_user ON space_members(user_id)`;

  console.log('✅ Space Members table ready');
};

// Initialize tables
const initTables = async () => {
  await createSpacesTable();
  await createSpaceMembersTable();
};

const crypto = require('crypto');
// Create a new space
const createSpace = async (spaceData) => {
  const {
    name,
    description,
    logo,
    banner,
    category = 'General',
    visibility = 'public',
    voting_strategy = 'one-person-one-vote',
    creator_id
  } = spaceData;

  // Normalize and validate requested username if provided
  let requestedUsername = spaceData.username ? String(spaceData.username).trim().toLowerCase() : null;
  if (requestedUsername) {
    // basic normalization: allow alphanumerics, dashes and underscores
    requestedUsername = requestedUsername.replace(/[^a-z0-9-_]/g, '');
    if (requestedUsername.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }
    // ensure username is unique
    const existingByUsername = await sql`SELECT id FROM spaces WHERE username = ${requestedUsername}`;
    if (existingByUsername.length > 0) {
      throw new Error('Username already used');
    }
  }

  // Generate unique slug
  let baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;

  // Check for slug uniqueness
  while (true) {
    const existing = await sql`SELECT id FROM spaces WHERE slug = ${slug}`;
    if (existing.length === 0) break;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  // Generate unique invite token
  let invite_token;
  while (true) {
    invite_token = crypto.randomUUID();
    const existing = await sql`SELECT id FROM spaces WHERE invite_token = ${invite_token}`;
    if (existing.length === 0) break;
  }

  // Create space
  const [space] = await sql`
    INSERT INTO spaces (
      name, slug, username, category, invite_token, description, logo, banner, 
      visibility, voting_strategy, creator_id, member_count
    )
    VALUES (
      ${name}, ${slug}, ${requestedUsername || null}, ${category}, ${invite_token}, ${description || null}, ${logo || null}, ${banner || null},
      ${visibility}, ${voting_strategy}, ${creator_id}, 1
    )
    RETURNING *
  `;

  // Add creator as owner member
  await sql`
    INSERT INTO space_members (space_id, user_id, role, voting_power)
    VALUES (${space.id}, ${creator_id}, 'owner', 1)
  `;

  return space;
};

// Get space by ID
const getSpaceById = async (id) => {
  const [space] = await sql`
    SELECT s.*, u.username as creator_username, u.wallet_address as creator_wallet
    FROM spaces s
    LEFT JOIN users u ON s.creator_id = u.id
    WHERE s.id = ${id} AND s.is_active = true
  `;
  return space || null;
};

// Get space by slug
const getSpaceBySlug = async (slug) => {
  const [space] = await sql`
    SELECT s.*, u.username as creator_username, u.wallet_address as creator_wallet
    FROM spaces s
    LEFT JOIN users u ON s.creator_id = u.id
    WHERE s.slug = ${slug} AND s.is_active = true
  `;
  return space || null;
};

// Get space by username
const getSpaceByUsername = async (username) => {
  const [space] = await sql`
    SELECT s.*, u.username as creator_username, u.wallet_address as creator_wallet
    FROM spaces s
    LEFT JOIN users u ON s.creator_id = u.id
    WHERE s.username = ${username} AND s.is_active = true
  `;
  return space || null;
};

// Get space by invite_token
const getSpaceByInviteToken = async (invite_token) => {
  const [space] = await sql`
    SELECT s.*, u.username as creator_username, u.wallet_address as creator_wallet
    FROM spaces s
    LEFT JOIN users u ON s.creator_id = u.id
    WHERE s.invite_token = ${invite_token} AND s.is_active = true
  `;
  return space || null;
};

// Get all public spaces with pagination
const getPublicSpaces = async (page = 1, limit = 20, search = '') => {
  const offset = (page - 1) * limit;

  let spaces;
  let totalCount;

  if (search) {
    spaces = await sql`
      SELECT s.*, u.username as creator_username
      FROM spaces s
      LEFT JOIN users u ON s.creator_id = u.id
      WHERE s.visibility = 'public' 
        AND s.is_active = true
        AND (s.name ILIKE ${'%' + search + '%'} OR s.description ILIKE ${'%' + search + '%'})
      ORDER BY s.member_count DESC, s.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [count] = await sql`
      SELECT COUNT(*) as total FROM spaces 
      WHERE visibility = 'public' 
        AND is_active = true
        AND (name ILIKE ${'%' + search + '%'} OR description ILIKE ${'%' + search + '%'})
    `;
    totalCount = parseInt(count.total);
  } else {
    spaces = await sql`
      SELECT s.*, u.username as creator_username
      FROM spaces s
      LEFT JOIN users u ON s.creator_id = u.id
      WHERE s.visibility = 'public' AND s.is_active = true
      ORDER BY s.member_count DESC, s.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [count] = await sql`
      SELECT COUNT(*) as total FROM spaces 
      WHERE visibility = 'public' AND is_active = true
    `;
    totalCount = parseInt(count.total);
  }

  return {
    spaces,
    pagination: {
      page,
      limit,
      total: totalCount,
      pages: Math.ceil(totalCount / limit)
    }
  };
};

// Get spaces by creator
const getSpacesByCreator = async (creatorId) => {
  const spaces = await sql`
    SELECT * FROM spaces
    WHERE creator_id = ${creatorId} AND is_active = true
    ORDER BY created_at DESC
  `;
  return spaces;
};

// Get spaces user is a member of
const getUserSpaces = async (userId) => {
  const spaces = await sql`
    SELECT s.*, s.username as username, s.invite_token as invite_token, sm.role as user_role, sm.voting_power, sm.joined_at
    FROM spaces s
    INNER JOIN space_members sm ON s.id = sm.space_id
    WHERE sm.user_id = ${userId} AND sm.is_active = true AND s.is_active = true
    ORDER BY sm.joined_at DESC
  `;
  return spaces;
};

// Update space
const updateSpace = async (id, updates) => {
  const allowedFields = ['name', 'description', 'logo', 'banner', 'visibility', 'voting_strategy'];
  const updateData = {};

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      updateData[field] = updates[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return await getSpaceById(id);
  }

  // Build dynamic update query
  const setClause = Object.entries(updateData)
    .map(([key, _], index) => `${key} = $${index + 2}`)
    .join(', ');

  const values = [id, ...Object.values(updateData)];

  // Re-generate slug if name changed
  if (updateData.name) {
    let baseSlug = generateSlug(updateData.name);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await sql`SELECT id FROM spaces WHERE slug = ${slug} AND id != ${id}`;
      if (existing.length === 0) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    updateData.slug = slug;
  }

  const [space] = await sql`
    UPDATE spaces 
    SET 
      name = COALESCE(${updateData.name || null}, name),
      slug = COALESCE(${updateData.slug || null}, slug),
      description = COALESCE(${updateData.description || null}, description),
      logo = COALESCE(${updateData.logo || null}, logo),
      banner = COALESCE(${updateData.banner || null}, banner),
      visibility = COALESCE(${updateData.visibility || null}, visibility),
      voting_strategy = COALESCE(${updateData.voting_strategy || null}, voting_strategy),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
    RETURNING *
  `;

  return space;
};

// Delete space (soft delete)
const deleteSpace = async (id) => {
  const [space] = await sql`
    UPDATE spaces SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
    RETURNING *
  `;
  return space;
};

// Add member to space
const addMember = async (spaceId, userId, role = 'member') => {
  // Check if already a member
  const existing = await sql`
    SELECT * FROM space_members 
    WHERE space_id = ${spaceId} AND user_id = ${userId}
  `;

  if (existing.length > 0) {
    // Reactivate if was inactive
    if (!existing[0].is_active) {
      const [member] = await sql`
        UPDATE space_members 
        SET is_active = true, updated_at = CURRENT_TIMESTAMP
        WHERE space_id = ${spaceId} AND user_id = ${userId}
        RETURNING *
      `;

      // Update member count
      await sql`
        UPDATE spaces SET member_count = member_count + 1 
        WHERE id = ${spaceId}
      `;

      return member;
    }
    return existing[0];
  }

  const [member] = await sql`
    INSERT INTO space_members (space_id, user_id, role)
    VALUES (${spaceId}, ${userId}, ${role})
    RETURNING *
  `;

  // Update member count
  await sql`
    UPDATE spaces SET member_count = member_count + 1 
    WHERE id = ${spaceId}
  `;

  return member;
};

// Remove member from space
const removeMember = async (spaceId, userId) => {
  const [member] = await sql`
    UPDATE space_members 
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE space_id = ${spaceId} AND user_id = ${userId}
    RETURNING *
  `;

  if (member) {
    // Update member count
    await sql`
      UPDATE spaces SET member_count = GREATEST(member_count - 1, 0) 
      WHERE id = ${spaceId}
    `;
  }

  return member;
};

// Get space members
const getSpaceMembers = async (spaceId, page = 1, limit = 50) => {
  const offset = (page - 1) * limit;

  const members = await sql`
    SELECT sm.*, u.username, u.wallet_address, u.profile_pic, u.name
    FROM space_members sm
    INNER JOIN users u ON sm.user_id = u.id
    WHERE sm.space_id = ${spaceId} AND sm.is_active = true
    ORDER BY sm.role DESC, sm.joined_at ASC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const [count] = await sql`
    SELECT COUNT(*) as total FROM space_members
    WHERE space_id = ${spaceId} AND is_active = true
  `;

  return {
    members,
    pagination: {
      page,
      limit,
      total: parseInt(count.total),
      pages: Math.ceil(parseInt(count.total) / limit)
    }
  };
};

// Check if user is member of space
const isMember = async (spaceId, userId) => {
  const [member] = await sql`
    SELECT * FROM space_members
    WHERE space_id = ${spaceId} AND user_id = ${userId} AND is_active = true
  `;
  return member || null;
};

// Get member role in space
const getMemberRole = async (spaceId, userId) => {
  const [member] = await sql`
    SELECT role FROM space_members
    WHERE space_id = ${spaceId} AND user_id = ${userId} AND is_active = true
  `;
  return member?.role || null;
};

// Update member role
const updateMemberRole = async (spaceId, userId, newRole) => {
  const [member] = await sql`
    UPDATE space_members
    SET role = ${newRole}, updated_at = CURRENT_TIMESTAMP
    WHERE space_id = ${spaceId} AND user_id = ${userId}
    RETURNING *
  `;
  return member;
};

// Increment proposal count
const incrementProposalCount = async (spaceId) => {
  await sql`
    UPDATE spaces SET proposal_count = proposal_count + 1 
    WHERE id = ${spaceId}
  `;
};

// Find space by ID
const findSpaceById = async (spaceId) => {
  return await sql`
    SELECT * FROM spaces WHERE id = ${spaceId} AND is_active = true
  `.then((rows) => rows[0]);
};

module.exports = {
  initTables,
  createSpace,
  getSpaceById,
  getSpaceBySlug,
  getSpaceByUsername,
  getSpaceByInviteToken,
  getPublicSpaces,
  getSpacesByCreator,
  getUserSpaces,
  updateSpace,
  deleteSpace,
  addMember,
  removeMember,
  getSpaceMembers,
  isMember,
  getMemberRole,
  updateMemberRole,
  incrementProposalCount,
  findSpaceById
};
