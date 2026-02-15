const Activity = require('../model/Activity');
const Space = require('../model/Space');

// Get space activities
exports.getSpaceActivities = async (req, res) => {
  const { spaceId } = req.params;
  const { limit = 5 } = req.query;

  try {
    const space = await Space.getSpaceById(spaceId);
    if (!space) {
      return res.status(404).json({ success: false, message: 'Space not found' });
    }

    const activities = await Activity.getSpaceActivities(spaceId, parseInt(limit));

    res.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error('Error fetching space activities:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch activities' });
  }
};

// Get user activities
exports.getUserActivities = async (req, res) => {
  const userId = req.user?.id;
  const { limit = 10 } = req.query;

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  try {
    const activities = await Activity.getUserActivities(userId, parseInt(limit));

    res.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error('Error fetching user activities:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch activities' });
  }
};

// Get proposal activities
exports.getProposalActivities = async (req, res) => {
  const { spaceId, proposalId } = req.params;
  const { limit = 20 } = req.query;

  try {
    const activities = await Activity.getProposalActivities(proposalId, parseInt(limit));

    res.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error('Error fetching proposal activities:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch activities' });
  }
};
