// Proposal Model - Database operations for proposals and votes
const { sql } = require('../data');

// Create a proposal
const createProposal = async (spaceId, creatorId, proposalData) => {
  const {
    title,
    description,
    voting_type = 'single',
    options = [],
    start_date = new Date(),
    end_date,
    // Blockchain fields
    blockchain_proposal_id = null,
    blockchain_tx_hash = null, // Coming from frontend
    contract_address = null,
    use_blockchain = false,
    blockchain_verified = false,
    content_hash = null,
    is_hash_verified = false
  } = proposalData;

  if (!title || title.trim().length === 0) {
    throw new Error('Proposal title is required');
  }

  if (!end_date) {
    throw new Error('End date is required');
  }

  if (options.length < 2) {
    throw new Error('At least 2 voting options are required');
  }

  // Initialize results object with zero votes for each option
  const results = {};
  options.forEach((option, index) => {
    results[index.toString()] = 0;
  });

  const [proposal] = await sql`
    INSERT INTO proposals (
      space_id, creator_id, title, description, voting_type, options, 
      start_date, end_date, results,
      blockchain_proposal_id, transaction_hash, contract_address, use_blockchain, blockchain_verified,
      content_hash, is_hash_verified
    )
    VALUES (
      ${spaceId}, ${creatorId}, ${title.trim()}, ${description?.trim() || null}, 
      ${voting_type}, ${JSON.stringify(options)}, ${new Date(start_date)}, 
      ${new Date(end_date)}, ${JSON.stringify(results)},
      ${blockchain_proposal_id}, ${blockchain_tx_hash}, ${contract_address}, ${use_blockchain}, ${blockchain_verified},
      ${content_hash}, ${is_hash_verified}
    )
    RETURNING *
  `;

  return proposal;
};

// Get proposal by ID
const getProposalById = async (id) => {
  const [proposal] = await sql`
    SELECT p.*, u.username as creator_username, u.profile_pic as creator_pic
    FROM proposals p
    LEFT JOIN users u ON p.creator_id = u.id
    WHERE p.id = ${id}
  `;
  return proposal || null;
};

// Get proposals by space
const getProposalsBySpace = async (spaceId, options = {}) => {
  const {
    status = null,
    page = 1,
    limit = 10,
    sortBy = 'created_at',
    sortOrder = 'DESC'
  } = options;

  const offset = (page - 1) * limit;

  // Validate sortOrder
  const validSortOrder = ['ASC', 'DESC'].includes(sortOrder?.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

  // Build query based on status filter
  let proposals;
  let count;

  if (status && ['draft', 'active', 'closed', 'cancelled'].includes(status)) {
    // Query with status filter
    proposals = await sql`
      SELECT p.*, u.username as creator_username, u.profile_pic as creator_pic
      FROM proposals p
      LEFT JOIN users u ON p.creator_id = u.id
      WHERE p.space_id = ${spaceId} AND p.status = ${status}
      ORDER BY p.created_at ${sql.unsafe(validSortOrder)}
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const result = await sql`
      SELECT COUNT(*) as total 
      FROM proposals 
      WHERE space_id = ${spaceId} AND status = ${status}
    `;
    count = result[0];
  } else {
    // Query without status filter
    proposals = await sql`
      SELECT p.*, u.username as creator_username, u.profile_pic as creator_pic
      FROM proposals p
      LEFT JOIN users u ON p.creator_id = u.id
      WHERE p.space_id = ${spaceId}
      ORDER BY p.created_at ${sql.unsafe(validSortOrder)}
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const result = await sql`
      SELECT COUNT(*) as total 
      FROM proposals 
      WHERE space_id = ${spaceId}
    `;
    count = result[0];
  }

  return {
    proposals,
    pagination: {
      page,
      limit,
      total: parseInt(count.total),
      pages: Math.ceil(parseInt(count.total) / limit)
    }
  };
};

// Cast a vote on proposal
const castVote = async (proposalId, userId, spaceId, votes, votePower = 1, blockchainTxHash = null, voteHash = null) => {
  // Check if user already voted
  const existing = await sql`
    SELECT * FROM proposal_votes 
    WHERE proposal_id = ${proposalId} AND user_id = ${userId}
  `;

  if (existing.length > 0) {
    // Update existing vote
    const [vote] = await sql`
      UPDATE proposal_votes
      SET votes = ${JSON.stringify(votes)}, vote_power = ${votePower}, 
          blockchain_tx_hash = ${blockchainTxHash}, vote_hash = ${voteHash}, updated_at = CURRENT_TIMESTAMP
      WHERE proposal_id = ${proposalId} AND user_id = ${userId}
      RETURNING *
    `;
    return vote;
  }

  // Create new vote
  const [vote] = await sql`
    INSERT INTO proposal_votes (
      proposal_id, user_id, space_id, votes, vote_power, blockchain_tx_hash, vote_hash
    )
    VALUES (${proposalId}, ${userId}, ${spaceId}, ${JSON.stringify(votes)}, ${votePower}, ${blockchainTxHash}, ${voteHash})
    RETURNING *
  `;

  return vote;
};

// Get user's vote on proposal
const getUserVote = async (proposalId, userId) => {
  const [vote] = await sql`
    SELECT * FROM proposal_votes
    WHERE proposal_id = ${proposalId} AND user_id = ${userId}
  `;
  return vote || null;
};

// Get all votes for a proposal
const getProposalVotes = async (proposalId, page = 1, limit = 50) => {
  const offset = (page - 1) * limit;

  const votes = await sql`
    SELECT pv.*, u.username, u.profile_pic
    FROM proposal_votes pv
    LEFT JOIN users u ON pv.user_id = u.id
    WHERE pv.proposal_id = ${proposalId}
    ORDER BY pv.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const [count] = await sql`
    SELECT COUNT(*) as total FROM proposal_votes WHERE proposal_id = ${proposalId}
  `;

  return {
    votes,
    pagination: {
      page,
      limit,
      total: parseInt(count.total),
      pages: Math.ceil(parseInt(count.total) / limit)
    }
  };
};

// Update proposal status
const updateProposalStatus = async (proposalId, status) => {
  const validStatuses = ['draft', 'active', 'closed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid status');
  }

  const [proposal] = await sql`
    UPDATE proposals
    SET status = ${status}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${proposalId}
    RETURNING *
  `;

  return proposal;
};

// Calculate proposal results
const calculateResults = async (proposalId) => {
  const proposal = await getProposalById(proposalId);
  if (!proposal) throw new Error('Proposal not found');

  const votes = await sql`
    SELECT * FROM proposal_votes WHERE proposal_id = ${proposalId}
  `;

  const results = {};

  // Parse options if it's a JSON string
  let options = proposal.options || [];
  if (typeof options === 'string') {
    try {
      options = JSON.parse(options);
    } catch (err) {
      options = [];
    }
  }

  // Initialize results
  options.forEach((_, index) => {
    results[index.toString()] = 0;
  });

  // Calculate votes based on voting type
  votes.forEach((vote) => {
    let votedData = vote.votes;

    // Parse votedData if it's a JSON string
    if (typeof votedData === 'string') {
      try {
        votedData = JSON.parse(votedData);
      } catch (err) {
        votedData = {};
      }
    }

    if (proposal.voting_type === 'single') {
      // Single choice: add vote power to single option
      if (votedData.option !== undefined) {
        results[votedData.option.toString()] = (results[votedData.option.toString()] || 0) + vote.vote_power;
      }
    } else if (proposal.voting_type === 'multiple') {
      // Multiple choice: add vote power to each selected option
      const selectedOptions = Array.isArray(votedData) ? votedData : [];
      selectedOptions.forEach((optionId) => {
        results[optionId.toString()] = (results[optionId.toString()] || 0) + vote.vote_power;
      });
    } else if (proposal.voting_type === 'weighted') {
      // Weighted: distribute voting power
      Object.entries(votedData || {}).forEach(([optionId, weight]) => {
        results[optionId] = (results[optionId] || 0) + (vote.vote_power * weight);
      });
    }
  });

  // Update results in database
  const [updated] = await sql`
    UPDATE proposals
    SET results = ${JSON.stringify(results)}, vote_count = ${votes.length}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ${proposalId}
    RETURNING *
  `;

  return updated;
};

// Count active proposals for a space
const countActiveProposals = async (spaceId) => {
  const [result] = await sql`
    SELECT COUNT(*) as total FROM proposals 
    WHERE space_id = ${spaceId} AND status = 'active'
  `;
  return parseInt(result.total) || 0;
};

module.exports = {
  createProposal,
  getProposalById,
  getProposalsBySpace,
  castVote,
  getUserVote,
  getProposalVotes,
  updateProposalStatus,
  calculateResults,
  countActiveProposals
};
