-- Create proposals table
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  
  -- Proposal content
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Voting configuration
  voting_type VARCHAR(20) DEFAULT 'single' CHECK (voting_type IN ('single', 'multiple', 'weighted')),
  options JSONB NOT NULL DEFAULT '[]', -- Array of voting options
  
  -- Timeline
  start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed', 'cancelled')),
  
  -- Vote results
  vote_count INTEGER DEFAULT 0,
  results JSONB DEFAULT '{}', -- Stores vote counts per option
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for proposals table
CREATE INDEX IF NOT EXISTS idx_proposals_space_id ON proposals(space_id);
CREATE INDEX IF NOT EXISTS idx_proposals_creator_id ON proposals(creator_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_end_date ON proposals(end_date);

-- Create proposal votes table
CREATE TABLE IF NOT EXISTS proposal_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  
  -- Vote data
  votes JSONB NOT NULL DEFAULT '{}', -- For single: {option_id}, for multiple: [option_ids], for weighted: {option_id: weight}
  vote_power INTEGER DEFAULT 1, -- Voting power at time of vote
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraint: One vote per user per proposal
  UNIQUE(proposal_id, user_id)
);

-- Create indexes for proposal votes table
CREATE INDEX IF NOT EXISTS idx_proposal_votes_proposal_id ON proposal_votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_proposal_votes_user_id ON proposal_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_proposal_votes_space_id ON proposal_votes(space_id);
