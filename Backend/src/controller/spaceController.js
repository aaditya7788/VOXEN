// Join space by invite link or slug
const joinByInviteLink = async (req, res) => {
  try {
    const { invite } = req.body; // invite can be a link or token
    const userId = req.user.id;
    let inviteToken = invite;
    // If invite is a full link, extract token
    const match = typeof invite === 'string' ? invite.match(/invite\/([\w-]+)/) : null;
    if (match) {
      inviteToken = match[1];
    }
    // Find space by invite_token, if not found try username
    let space = await Space.getSpaceByInviteToken(inviteToken);
    if (!space) {
      // try username fallback
      space = await Space.getSpaceByUsername(inviteToken);
    }
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }
    // Add user as member if not already
    const membership = await Space.addMember(space.id, userId, 'member');

    // Log activity
    await Activity.logActivity(
      space.id,
      userId,
      'member_joined',
      `Joined space: "${space.name}"`,
      null,
      { role: 'member' }
    );

    res.json({
      success: true,
      message: 'Joined space successfully',
      data: membership,
      space
    });
  } catch (error) {
    console.error('Join by invite link error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join by invite link',
      error: error.message
    });
  }
};
// Space Controller - Handle space-related operations
const Space = require('../model/Space');
const Activity = require('../model/Activity');

// Create a new space
const createSpace = async (req, res) => {
  try {
    const { name, description, logo, category, visibility, voting_strategy, username } = req.body;
    const creator_id = req.user.id;

    // Validation
    if (!name || name.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Space name must be at least 3 characters'
      });
    }

    // Username is mandatory and must be unique
    if (!username || String(username).trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username is required and must be at least 3 characters'
      });
    }
    const normalizedUsername = String(username).trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    const existingByUsername = await Space.getSpaceByUsername(normalizedUsername);
    if (existingByUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username already used'
      });
    }

    if (!description || description.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Description must be at least 10 characters'
      });
    }

    // Create space
    const space = await Space.createSpace({
      name: name.trim(),
      description: description.trim(),
      logo: logo || null,
      category: category || 'General',
      username: normalizedUsername,
      visibility: visibility || 'public',
      voting_strategy: voting_strategy || 'one-person-one-vote',
      creator_id
    });

    res.status(201).json({
      success: true,
      message: 'Space created successfully',
      data: space
    });
  } catch (error) {
    console.error('Create space error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create space',
      error: error.message
    });
  }
};

// Get all public spaces
const getSpaces = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;

    const result = await Space.getPublicSpaces(
      parseInt(page),
      parseInt(limit),
      search
    );

    res.json({
      success: true,
      data: result.spaces,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get spaces error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch spaces',
      error: error.message
    });
  }
};

// Get space by slug
const getSpaceBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const space = await Space.getSpaceBySlug(slug);

    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }

    // Check if private space and user not a member
    if (space.visibility === 'private') {
      if (!req.user) {
        return res.status(403).json({
          success: false,
          message: 'This is a private space'
        });
      }

      const membership = await Space.isMember(space.id, req.user.id);
      if (!membership) {
        return res.status(403).json({
          success: false,
          message: 'You are not a member of this private space'
        });
      }
    }

    // Get user's membership if authenticated
    let userMembership = null;
    if (req.user) {
      userMembership = await Space.isMember(space.id, req.user.id);
    }

    res.json({
      success: true,
      data: {
        ...space,
        is_member: !!userMembership,
        user_role: userMembership?.role || null
      }
    });
  } catch (error) {
    console.error('Get space error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch space',
      error: error.message
    });
  }
};

// Get space by ID
const getSpaceById = async (req, res) => {
  try {
    const { id } = req.params;

    const space = await Space.getSpaceById(id);

    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }

    res.json({
      success: true,
      data: space
    });
  } catch (error) {
    console.error('Get space by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch space',
      error: error.message
    });
  }
};

// Get spaces created by current user
const getMySpaces = async (req, res) => {
  try {
    const userId = req.user.id;
    const spaces = await Space.getSpacesByCreator(userId);

    res.json({
      success: true,
      data: spaces
    });
  } catch (error) {
    console.error('Get my spaces error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your spaces',
      error: error.message
    });
  }
};

// Get spaces user has joined
const getJoinedSpaces = async (req, res) => {
  try {
    const userId = req.user.id;
    const spaces = await Space.getUserSpaces(userId);

    res.json({
      success: true,
      data: spaces
    });
  } catch (error) {
    console.error('Get joined spaces error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch joined spaces',
      error: error.message
    });
  }
};

// Update space
const updateSpace = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user.id;

    // Get space
    const space = await Space.getSpaceById(id);

    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }

    // Check if user is owner or admin
    const memberRole = await Space.getMemberRole(id, userId);
    if (!['owner', 'admin'].includes(memberRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only space owners and admins can update space settings'
      });
    }

    const updatedSpace = await Space.updateSpace(id, updates);

    res.json({
      success: true,
      message: 'Space updated successfully',
      data: updatedSpace
    });
  } catch (error) {
    console.error('Update space error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update space',
      error: error.message
    });
  }
};

// Delete space
const deleteSpace = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get space
    const space = await Space.getSpaceById(id);

    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }

    // Check if user is owner
    const memberRole = await Space.getMemberRole(id, userId);
    if (memberRole !== 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Only the space owner can delete this space'
      });
    }

    await Space.deleteSpace(id);

    res.json({
      success: true,
      message: 'Space deleted successfully'
    });
  } catch (error) {
    console.error('Delete space error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete space',
      error: error.message
    });
  }
};

// Join space
const joinSpace = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const space = await Space.getSpaceById(id);

    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }

    // Check if private space
    if (space.visibility === 'private') {
      return res.status(403).json({
        success: false,
        message: 'This is a private space. You need an invitation to join.'
      });
    }

    const membership = await Space.addMember(id, userId, 'member');

    // Log activity
    await Activity.logActivity(
      id,
      userId,
      'member_joined',
      `Joined space: "${space.name}"`,
      null,
      { role: 'member' }
    );

    res.json({
      success: true,
      message: 'Joined space successfully',
      data: membership
    });
  } catch (error) {
    console.error('Join space error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join space',
      error: error.message
    });
  }
};

// Leave space
const leaveSpace = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user is owner
    const memberRole = await Space.getMemberRole(id, userId);
    if (memberRole === 'owner') {
      return res.status(400).json({
        success: false,
        message: 'Space owner cannot leave. Transfer ownership or delete the space.'
      });
    }

    await Space.removeMember(id, userId);

    res.json({
      success: true,
      message: 'Left space successfully'
    });
  } catch (error) {
    console.error('Leave space error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave space',
      error: error.message
    });
  }
};

// Get space members
const getSpaceMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const space = await Space.getSpaceById(id);

    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }

    const result = await Space.getSpaceMembers(id, parseInt(page), parseInt(limit));

    res.json({
      success: true,
      data: result.members,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get space members error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch members',
      error: error.message
    });
  }
};

// Invite member (for private spaces)
const inviteMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, role = 'member' } = req.body;
    const inviterId = req.user.id;

    const space = await Space.getSpaceById(id);

    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }

    // Check if inviter has permission
    const inviterRole = await Space.getMemberRole(id, inviterId);
    if (!['owner', 'admin', 'moderator'].includes(inviterRole)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to invite members'
      });
    }

    // Prevent inviting as owner
    if (role === 'owner') {
      return res.status(400).json({
        success: false,
        message: 'Cannot invite someone as owner'
      });
    }

    const membership = await Space.addMember(id, user_id, role);

    res.json({
      success: true,
      message: 'Member invited successfully',
      data: membership
    });
  } catch (error) {
    console.error('Invite member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to invite member',
      error: error.message
    });
  }
};

// Remove member
const removeMember = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const requesterId = req.user.id;

    // Check if requester has permission
    const requesterRole = await Space.getMemberRole(id, requesterId);
    if (!['owner', 'admin'].includes(requesterRole)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to remove members'
      });
    }

    // Cannot remove owner
    const targetRole = await Space.getMemberRole(id, userId);
    if (targetRole === 'owner') {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove the space owner'
      });
    }

    await Space.removeMember(id, userId);

    res.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove member',
      error: error.message
    });
  }
};

// Update member role
const updateMemberRole = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { role } = req.body;
    const requesterId = req.user.id;

    // Check if requester is owner
    const requesterRole = await Space.getMemberRole(id, requesterId);
    if (requesterRole !== 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Only the space owner can change member roles'
      });
    }

    // Cannot change owner role
    if (role === 'owner') {
      return res.status(400).json({
        success: false,
        message: 'Use transfer ownership instead'
      });
    }

    const member = await Space.updateMemberRole(id, userId, role);

    res.json({
      success: true,
      message: 'Member role updated successfully',
      data: member
    });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update member role',
      error: error.message
    });
  }
};

module.exports = {
  createSpace,
  getSpaces,
  getSpaceBySlug,
  getSpaceById,
  getMySpaces,
  getJoinedSpaces,
  updateSpace,
  deleteSpace,
  joinSpace,
  leaveSpace,
  getSpaceMembers,
  inviteMember,
  removeMember,
  updateMemberRole,
  joinByInviteLink,
};
