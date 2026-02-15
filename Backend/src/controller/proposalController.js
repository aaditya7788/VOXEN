// Proposal Controller - Handle proposal-related operations
const Proposal = require('../model/Proposal');
const Space = require('../model/Space');
const Activity = require('../model/Activity');

// Create a new proposal (only space owner/members can)
const createProposal = async (req, res) => {
  try {
    const { spaceId } = req.params;
    const userId = req.user.id;
    const {
      title, description, voting_type, options, start_date, end_date,
      blockchain_proposal_id, blockchain_tx_hash, contract_address, use_blockchain, blockchain_verified
    } = req.body;

    // Validate space exists
    const space = await Space.getSpaceById(spaceId);
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }

    // Check if user is owner of space
    const userRole = await Space.getMemberRole(spaceId, userId);
    if (userRole !== 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Only space owners can create proposals'
      });
    }

    // Generate content hash if using blockchain
    let content_hash = null;
    if (use_blockchain) {
      const { generateContentHash } = require('../utils/hashGenerator');
      content_hash = generateContentHash(title, description, options);
    }

    // Create proposal
    const proposal = await Proposal.createProposal(spaceId, userId, {
      title,
      description,
      voting_type: voting_type || space.voting_strategy,
      options,
      start_date,
      end_date,
      blockchain_proposal_id,
      blockchain_tx_hash,
      contract_address,
      use_blockchain,
      blockchain_verified,
      content_hash,
      is_hash_verified: !!blockchain_verified // If already verified on blockchain
    });

    // Increment space proposal count
    if (proposal) {
      await Space.incrementProposalCount(spaceId);

      // Log activity
      await Activity.logActivity(
        spaceId,
        userId,
        'proposal_created',
        `Created proposal: "${proposal.title}"`,
        proposal.id,
        { voting_type: proposal.voting_type }
      );
    }

    res.status(201).json({
      success: true,
      message: 'Proposal created successfully',
      data: proposal
    });
  } catch (error) {
    console.error('Create proposal error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create proposal',
      error: error.message
    });
  }
};

// Get proposals for a space
const getSpaceProposals = async (req, res) => {
  try {
    const { spaceId } = req.params;
    const { status, page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;

    // Validate space exists
    const space = await Space.getSpaceById(spaceId);
    if (!space) {
      return res.status(404).json({
        success: false,
        message: 'Space not found'
      });
    }

    // Check if user has access (public space or member)
    if (space.visibility === 'private' && req.user) {
      const userRole = await Space.getMemberRole(spaceId, req.user.id);
      if (!userRole) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this private space'
        });
      }
    }

    const result = await Proposal.getProposalsBySpace(spaceId, {
      status,
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder
    });

    res.json({
      success: true,
      data: result.proposals,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get proposals error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch proposals',
      error: error.message
    });
  }
};

// Get single proposal
const getProposal = async (req, res) => {
  try {
    const { spaceId, proposalId } = req.params;

    const proposal = await Proposal.getProposalById(proposalId);
    if (!proposal || proposal.space_id !== spaceId) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }

    // Get user's vote if they are a member
    let userVote = null;
    if (req.user) {
      userVote = await Proposal.getUserVote(proposalId, req.user.id);
    }

    res.json({
      success: true,
      data: {
        ...proposal,
        user_vote: userVote
      }
    });
  } catch (error) {
    console.error('Get proposal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch proposal',
      error: error.message
    });
  }
};

// Cast vote on proposal
const castVote = async (req, res) => {
  try {
    const { spaceId, proposalId } = req.params;
    const userId = req.user.id;
    const { votes, blockchain_tx_hash, vote_hash } = req.body;

    if (!votes) {
      return res.status(400).json({
        success: false,
        message: 'Votes data is required'
      });
    }

    // Validate proposal exists
    const proposal = await Proposal.getProposalById(proposalId);
    if (!proposal || proposal.space_id !== spaceId) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }

    // Check if proposal is still active
    if (proposal.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Proposal is ${proposal.status} and not accepting votes`
      });
    }

    // Check if voting period is still open
    if (new Date() > new Date(proposal.end_date)) {
      return res.status(400).json({
        success: false,
        message: 'Voting period has ended'
      });
    }

    // Check if user is member of space
    const userRole = await Space.getMemberRole(spaceId, userId);
    if (!userRole) {
      return res.status(403).json({
        success: false,
        message: 'You must be a member of this space to vote'
      });
    }

    // Get user's voting power (1 for one-person-one-vote, could be different for other strategies)
    let votePower = 1;
    if (proposal.voting_strategy === 'token-weighted') {
      // In a real app, this would fetch token balance from blockchain
      votePower = 1; // Default for now
    }

    // Cast/update vote
    const vote = await Proposal.castVote(proposalId, userId, spaceId, votes, votePower, blockchain_tx_hash, vote_hash);

    // Recalculate results
    const updated = await Proposal.calculateResults(proposalId);

    // Log activity
    await Activity.logActivity(
      spaceId,
      userId,
      'proposal_voted',
      `Voted on proposal: "${proposal.title}"`,
      proposalId,
      { voting_type: proposal.voting_type }
    );

    res.json({
      success: true,
      message: 'Vote cast successfully',
      data: {
        vote,
        proposal: updated
      }
    });
  } catch (error) {
    console.error('Cast vote error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to cast vote',
      error: error.message
    });
  }
};

// Get votes on proposal
const getProposalVotes = async (req, res) => {
  try {
    const { spaceId, proposalId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Validate proposal exists
    const proposal = await Proposal.getProposalById(proposalId);
    if (!proposal || proposal.space_id !== spaceId) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }

    const result = await Proposal.getProposalVotes(proposalId, parseInt(page), parseInt(limit));

    res.json({
      success: true,
      data: result.votes,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get votes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch votes',
      error: error.message
    });
  }
};

// Check if user has voted on a proposal
const checkUserVote = async (req, res) => {
  try {
    const { spaceId, proposalId } = req.params;
    const userId = req.user?.id;

    // If no user is logged in, return not voted
    if (!userId) {
      return res.json({
        success: true,
        data: {
          voted: false,
          vote: null
        }
      });
    }

    // Validate proposal exists
    const proposal = await Proposal.getProposalById(proposalId);
    if (!proposal || proposal.space_id !== spaceId) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }

    // Check if user has voted
    const userVote = await Proposal.getUserVote(proposalId, userId);

    res.json({
      success: true,
      data: {
        voted: !!userVote,
        vote: userVote || null
      }
    });
  } catch (error) {
    console.error('Check user vote error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check vote status',
      error: error.message
    });
  }
};

// Get proposal analytics (owner only)
const getProposalAnalytics = async (req, res) => {
  try {
    const { spaceId, proposalId } = req.params;
    const userId = req.user.id;

    // Validate proposal exists
    const proposal = await Proposal.getProposalById(proposalId);
    if (!proposal || proposal.space_id !== spaceId) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }

    // Check if user is space owner
    const userRole = await Space.getMemberRole(spaceId, userId);
    if (userRole !== 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Only space owners can view analytics'
      });
    }

    // Get all votes for the proposal
    const allVotes = await Proposal.getProposalVotes(proposalId, 1, 10000);
    const votes = allVotes.votes || [];

    // Parse options
    let options = proposal.options || [];
    if (typeof options === 'string') {
      try {
        options = JSON.parse(options);
      } catch (err) {
        options = [];
      }
    }

    // Parse results
    let results = proposal.results || {};
    if (typeof results === 'string') {
      try {
        results = JSON.parse(results);
      } catch (err) {
        results = {};
      }
    }

    // Calculate analytics
    const totalVotes = votes.length;
    const totalVotePower = votes.reduce((sum, v) => sum + (v.vote_power || 1), 0);

    // Get voting results by option
    const votingResults = options.map((option, index) => ({
      option,
      votes: parseInt(results[index.toString()] || 0),
      percentage: totalVotePower > 0 ? Math.round((results[index.toString()] || 0) / totalVotePower * 100) : 0
    }));

    // Get participation rate
    const now = new Date();
    const endDate = new Date(proposal.end_date);
    const isEnded = endDate <= now;

    res.json({
      success: true,
      data: {
        proposal: {
          id: proposal.id,
          title: proposal.title,
          description: proposal.description,
          status: proposal.status,
          voting_type: proposal.voting_type,
          created_at: proposal.created_at,
          end_date: proposal.end_date,
          is_ended: isEnded
        },
        analytics: {
          total_votes: totalVotes,
          total_vote_power: totalVotePower,
          voting_results: votingResults,
          top_option: votingResults.length > 0
            ? votingResults.reduce((max, curr) => curr.votes > max.votes ? curr : max)
            : null,
          voter_list: votes.map(v => ({
            username: v.username,
            profile_pic: v.profile_pic,
            voted_at: v.created_at,
            vote_power: v.vote_power
          }))
        }
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
};

// Close/finalize proposal voting
const closeProposal = async (req, res) => {
  try {
    const { spaceId, proposalId } = req.params;
    const userId = req.user.id;

    // Validate proposal exists
    const proposal = await Proposal.getProposalById(proposalId);
    if (!proposal || proposal.space_id !== spaceId) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }

    // Only space owner can close proposal
    const userRole = await Space.getMemberRole(spaceId, userId);
    if (userRole !== 'owner') {
      return res.status(403).json({
        success: false,
        message: 'Only space owners can close proposals'
      });
    }

    // Update proposal status
    const updated = await Proposal.updateProposalStatus(proposalId, 'closed');

    // Calculate final results
    const finalized = await Proposal.calculateResults(proposalId);

    // Log activity
    await Activity.logActivity(
      spaceId,
      userId,
      'proposal_closed',
      `Closed proposal: "${proposal.title}"`,
      proposalId,
      {}
    );

    res.json({
      success: true,
      message: 'Proposal closed successfully',
      data: finalized
    });
  } catch (error) {
    console.error('Close proposal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to close proposal',
      error: error.message
    });
  }
};

// Get user feed (random proposals from joined spaces)
const getUserFeed = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20 } = req.query;

    const proposals = await Proposal.getUserProposalFeed(userId, parseInt(limit));

    // Map to frontend friendly format if needed, but Proposal model returns mostly correct fields
    // Ensure space_image works (s.profile_pic as space_image)

    res.json({
      success: true,
      data: proposals
    });
  } catch (error) {
    console.error('Get user feed error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feed',
      error: error.message
    });
  }
};

module.exports = {
  createProposal,
  getSpaceProposals,
  getProposal,
  castVote,
  getProposalVotes,
  checkUserVote,
  getProposalAnalytics,
  closeProposal,
  getUserFeed
};
