// Proposal Routes
const express = require('express');
const router = express.Router();
const proposalController = require('../controller/proposalController');
const discussionController = require('../controller/discussionController');
const { authMiddleware } = require('../middleware');

/**
 * POST /api/spaces/:spaceId/proposals
 * Create a new proposal (space members/owners only)
 */
router.post('/:spaceId/proposals', authMiddleware, proposalController.createProposal);

/**
 * GET /api/spaces/:spaceId/proposals
 * Get all proposals for a space
 */
router.get('/:spaceId/proposals', proposalController.getSpaceProposals);

/**
 * GET /api/spaces/:spaceId/proposals/:proposalId
 * Get a single proposal
 */
router.get('/:spaceId/proposals/:proposalId', proposalController.getProposal);

/**
 * POST /api/spaces/:spaceId/proposals/:proposalId/vote
 * Cast a vote on a proposal (members only)
 */
router.post('/:spaceId/proposals/:proposalId/vote', authMiddleware, proposalController.castVote);

/**
 * GET /api/spaces/:spaceId/proposals/:proposalId/votes
 * Get all votes on a proposal
 */
router.get('/:spaceId/proposals/:proposalId/votes', proposalController.getProposalVotes);

/**
 * GET /api/spaces/:spaceId/proposals/:proposalId/check-vote
 * Check if current user has voted on a proposal
 */
router.get('/:spaceId/proposals/:proposalId/check-vote', authMiddleware, proposalController.checkUserVote);

/**
 * GET /api/spaces/:spaceId/proposals/:proposalId/analytics
 * Get detailed analytics for a proposal (owner only)
 */
router.get('/:spaceId/proposals/:proposalId/analytics', authMiddleware, proposalController.getProposalAnalytics);

/**
 * POST /api/spaces/:spaceId/proposals/:proposalId/close
 * Close/finalize a proposal (owners/admins only)
 */
router.post('/:spaceId/proposals/:proposalId/close', authMiddleware, proposalController.closeProposal);

/**
 * GET /api/spaces/:spaceId/proposals/:proposalId/discussion
 * Get all discussion messages for a proposal
 */
router.get('/:spaceId/proposals/:proposalId/discussion', discussionController.getDiscussion);

/**
 * POST /api/spaces/:spaceId/proposals/:proposalId/discussion
 * Post a new discussion message (authenticated users only)
 */
router.post('/:spaceId/proposals/:proposalId/discussion', authMiddleware, discussionController.postMessage);

/**
 * DELETE /api/spaces/:spaceId/proposals/:proposalId/discussion/:messageId
 * Delete a discussion message (message owner only)
 */
router.delete('/:spaceId/proposals/:proposalId/discussion/:messageId', authMiddleware, discussionController.deleteMessage);

/**
 * PATCH /api/spaces/:spaceId/proposals/:proposalId/discussion/:messageId
 * Update a discussion message (message owner only)
 */
router.patch('/:spaceId/proposals/:proposalId/discussion/:messageId', authMiddleware, discussionController.updateMessage);

module.exports = router;
