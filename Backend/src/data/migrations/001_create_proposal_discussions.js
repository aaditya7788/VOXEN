const { sql } = require('../index');

async function createProposalDiscussionsTable() {
  try {
    console.log('Creating proposal_discussions table...');
    
    await sql`
      CREATE TABLE IF NOT EXISTS proposal_discussions (
        id BIGSERIAL PRIMARY KEY,
        proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_proposal_discussion_proposal FOREIGN KEY (proposal_id) REFERENCES proposals(id),
        CONSTRAINT fk_proposal_discussion_user FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `;

    // Create indexes for performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_proposal_discussions_proposal_id 
      ON proposal_discussions(proposal_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_proposal_discussions_user_id 
      ON proposal_discussions(user_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_proposal_discussions_created_at 
      ON proposal_discussions(created_at);
    `;

    console.log('proposal_discussions table created successfully');
    return true;
  } catch (error) {
    console.error('Error creating proposal_discussions table:', error);
    throw error;
  }
}

module.exports = { createProposalDiscussionsTable };
