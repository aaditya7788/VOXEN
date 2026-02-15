// Activity Model - Database operations for activities table
const { sql } = require('../data');

// Create activities table if not exists
const createActivitiesTable = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS activities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      
      -- Activity Information
      space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      
      -- Activity Type and Description
      activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('proposal_created', 'proposal_closed', 'proposal_voted', 'member_joined', 'member_left')),
      description TEXT NOT NULL,
      
      -- Related Entity
      proposal_id UUID REFERENCES proposals(id) ON DELETE SET NULL,
      
      -- Metadata (JSON for flexibility)
      metadata JSONB DEFAULT '{}',
      
      -- Timestamps
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  // Create indices for better query performance
  await sql`
    CREATE INDEX IF NOT EXISTS idx_activities_space_id ON activities(space_id);
  `;
  
  await sql`
    CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
  `;
  
  await sql`
    CREATE INDEX IF NOT EXISTS idx_activities_proposal_id ON activities(proposal_id);
  `;
  
  await sql`
    CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
  `;
};

// Log an activity
const logActivity = async (spaceId, userId, activityType, description, proposalId = null, metadata = {}) => {
  try {
    const result = await sql`
      INSERT INTO activities (space_id, user_id, activity_type, description, proposal_id, metadata)
      VALUES (${spaceId}, ${userId}, ${activityType}, ${description}, ${proposalId}, ${JSON.stringify(metadata)})
      RETURNING *
    `;
    return result[0] || null;
  } catch (error) {
    console.error('Error logging activity:', error);
    return null;
  }
};

// Get space activities (recent first, limit to specified count)
const getSpaceActivities = async (spaceId, limit = 5) => {
  try {
    const activities = await sql`
      SELECT 
        a.*,
        u.username,
        u.profile_pic,
        p.title as proposal_title
      FROM activities a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN proposals p ON a.proposal_id = p.id
      WHERE a.space_id = ${spaceId}
      ORDER BY a.created_at DESC
      LIMIT ${limit}
    `;
    return activities || [];
  } catch (error) {
    console.error('Error fetching space activities:', error);
    return [];
  }
};

// Get user activities (recent first, limit to specified count)
const getUserActivities = async (userId, limit = 10) => {
  try {
    const activities = await sql`
      SELECT 
        a.*,
        s.name as space_name,
        s.slug as space_slug,
        p.title as proposal_title
      FROM activities a
      LEFT JOIN spaces s ON a.space_id = s.id
      LEFT JOIN proposals p ON a.proposal_id = p.id
      WHERE a.user_id = ${userId}
      ORDER BY a.created_at DESC
      LIMIT ${limit}
    `;
    return activities || [];
  } catch (error) {
    console.error('Error fetching user activities:', error);
    return [];
  }
};

// Get activities for a specific proposal
const getProposalActivities = async (proposalId, limit = 20) => {
  try {
    const activities = await sql`
      SELECT 
        a.*,
        u.username,
        u.profile_pic
      FROM activities a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.proposal_id = ${proposalId}
      ORDER BY a.created_at DESC
      LIMIT ${limit}
    `;
    return activities || [];
  } catch (error) {
    console.error('Error fetching proposal activities:', error);
    return [];
  }
};

module.exports = {
  createActivitiesTable,
  logActivity,
  getSpaceActivities,
  getUserActivities,
  getProposalActivities,
};
