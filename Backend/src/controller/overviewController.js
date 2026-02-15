const Space = require('../model/Space');
const Activity = require('../model/Activity');
const Proposal = require('../model/Proposal');

// Get overview data for a space
exports.getOverviewData = async (req, res) => {
  const { spaceId } = req.params;

  try {
    // Fetch space stats
    const space = await Space.getSpaceById(spaceId);
    if (!space) {
      return res.status(404).json({ success: false, message: 'Space not found' });
    }

    // Fetch active proposal count
    const activeProposalCount = await Proposal.countActiveProposals(spaceId);

    // Fetch recent activities (limit to 5)
    const recentActivities = await Activity.getSpaceActivities(spaceId, 5);

    res.json({
      success: true,
      data: {
        memberCount: space.member_count || 0,
        proposalCount: activeProposalCount,
        recentActivities: recentActivities || [],
      },
    });
  } catch (error) {
    console.error('Error fetching overview data:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch overview data', error: error.message });
  }
};
