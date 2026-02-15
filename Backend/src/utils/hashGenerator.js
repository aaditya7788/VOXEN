const { keccak256, encodeAbiParameters } = require('viem');

/**
 * Generate content hash for proposal
 * @param {string} title - Proposal title
 * @param {string} description - Proposal description
 * @param {string[]} options - Voting options
 * @returns {string} Content hash (0x...)
 */
function generateContentHash(title, description, options) {
    // Use encodeAbiParameters to match Solidity's abi.encode
    return keccak256(encodeAbiParameters(
        [
            { type: 'string' },
            { type: 'string' },
            { type: 'string[]' }
        ],
        [title, description, options]
    ));
}

/**
 * Verify content hash matches expected
 * @param {string} title - Proposal title
 * @param {string} description - Proposal description
 * @param {string[]} options - Voting options
 * @param {string} expectedHash - Expected hash from blockchain
 * @returns {boolean} True if hashes match
 */
function verifyContentHash(title, description, options, expectedHash) {
    const generatedHash = generateContentHash(title, description, options);
    return generatedHash.toLowerCase() === expectedHash.toLowerCase();
}

module.exports = {
    generateContentHash,
    verifyContentHash
};
