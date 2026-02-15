// Helper utility functions

/**
 * Generate random string for OAuth state and code verifier
 * @param {number} length - Length of string to generate
 * @returns {string} Random string
 */
const generateRandomString = (length) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Calculate days between two dates
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @returns {number} Number of days
 */
const daysBetween = (startDate, endDate = new Date()) => {
  const ms = endDate.getTime() - startDate.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};

/**
 * Check if account is old enough (6+ months = 180 days)
 * @param {Date} createdDate 
 * @returns {boolean}
 */
const isAccountOldEnough = (createdDate) => {
  return daysBetween(new Date(createdDate)) >= 180;
};

/**
 * Calculate when account will be old enough
 * @param {Date} createdDate 
 * @returns {Date|null} Future date when eligible, or null if already eligible
 */
const getEligibleDate = (createdDate) => {
  const created = new Date(createdDate);
  const eligible = new Date(created.getTime() + 180 * 24 * 60 * 60 * 1000);
  return eligible > new Date() ? eligible : null;
};

module.exports = {
  generateRandomString,
  daysBetween,
  isAccountOldEnough,
  getEligibleDate
};
