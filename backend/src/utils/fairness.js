const crypto = require('crypto');

/**
 * Generate a cryptographically secure random server seed
 * @returns {string} - Hex string of the server seed
 */
exports.generateServerSeed = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Generate a default client seed
 * @returns {string} - Random client seed
 */
exports.generateClientSeed = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

/**
 * Generate a game hash from seeds and nonce
 * @param {string} serverSeed - The server seed
 * @param {string} clientSeed - The client seed
 * @param {number} nonce - The nonce/game counter
 * @returns {string} - The resulting hash
 */
exports.generateGameHash = (serverSeed, clientSeed, nonce) => {
  return crypto
    .createHmac('sha256', serverSeed)
    .update(`${clientSeed}:${nonce}`)
    .digest('hex');
};

/**
 * Calculate a game result from a hash with a specified range
 * @param {string} hash - The game hash
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {number} - The result value within the specified range
 */
exports.calculateResult = (hash, min, max) => {
  // Take first 8 characters of hash (4 bytes)
  const decimal = parseInt(hash.substring(0, 8), 16);
  
  // Divide by max possible value for 4 bytes to get a value between 0-1
  const floatValue = decimal / 0xffffffff;
  
  // Scale to our desired range
  const result = min + floatValue * (max - min);
  
  // Return with 2 decimal places
  return parseFloat(result.toFixed(2));
};

/**
 * Verify a game result
 * @param {string} serverSeed - The server seed
 * @param {string} clientSeed - The client seed
 * @param {number} nonce - The nonce/game counter
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {number} - The verified game result
 */
exports.verifyResult = (serverSeed, clientSeed, nonce, min, max) => {
  const hash = this.generateGameHash(serverSeed, clientSeed, nonce);
  return this.calculateResult(hash, min, max);
};

/**
 * Generate a public server seed hash to show before revealing actual seed
 * @param {string} serverSeed - The server seed
 * @returns {string} - SHA-256 hash of the server seed
 */
exports.getServerSeedHash = (serverSeed) => {
  return crypto
    .createHash('sha256')
    .update(serverSeed)
    .digest('hex');
}; 