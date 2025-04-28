const User = require('../models/User');
const Game = require('../models/Game');
const logger = require('../utils/logger');
const { generateClientSeed, verifyResult, getServerSeedHash } = require('../utils/fairness');

// @desc    Verify a game's fairness
// @route   GET /api/games/verify/:gameId
// @access  Private
exports.verifyGame = async (req, res) => {
  try {
    const { gameId } = req.params;
    const userId = req.user.id;
    
    // Find the game
    const game = await Game.findById(gameId);
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }
    
    // Check if game belongs to user or if user is admin
    if (game.user.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to verify this game'
      });
    }
    
    // Check if server seed is available
    if (!game.serverSeed) {
      return res.status(400).json({
        success: false,
        message: 'Server seed not yet revealed for this game'
      });
    }
    
    let verificationResult;
    
    // Verify based on game type
    switch (game.gameType) {
      case 'dice': {
        // Extract game data
        const { prediction, direction, result } = game.gameData;
        
        // Verify dice result
        const verifiedResult = verifyResult(
          game.serverSeed,
          game.clientSeed,
          game.nonce,
          0,
          100
        );
        
        // Check if result matches
        const resultMatches = Math.abs(verifiedResult - result) < 0.01; // Allow small floating point difference
        
        verificationResult = {
          gameType: 'dice',
          prediction,
          direction,
          result,
          verifiedResult,
          resultMatches,
          fairnessData: {
            serverSeed: game.serverSeed,
            clientSeed: game.clientSeed,
            nonce: game.nonce,
            hash: game.fairnessHash
          }
        };
        break;
      }
      
      case 'crash': {
        // Extract game data
        const { crashPoint, cashedOutAt } = game.gameData;
        
        // Verify crash result (implementation would depend on crash point generation logic)
        // This is a placeholder for actual crash verification
        
        verificationResult = {
          gameType: 'crash',
          crashPoint,
          cashedOutAt,
          fairnessData: {
            serverSeed: game.serverSeed,
            clientSeed: game.clientSeed,
            nonce: game.nonce,
            hash: game.fairnessHash
          }
        };
        break;
      }
      
      case 'mines': {
        // Extract game data
        const { minesCount, minePositions, revealedPositions, finalMultiplier } = game.gameData;
        
        // Verify mines positions (implementation would depend on mines position generation logic)
        // This is a placeholder for actual mines verification
        
        verificationResult = {
          gameType: 'mines',
          minesCount,
          minePositions,
          revealedPositions,
          finalMultiplier,
          fairnessData: {
            serverSeed: game.serverSeed,
            clientSeed: game.clientSeed,
            nonce: game.nonce,
            hash: game.fairnessHash
          }
        };
        break;
      }
      
      default:
        return res.status(400).json({
          success: false,
          message: 'Unsupported game type'
        });
    }
    
    res.status(200).json({
      success: true,
      data: verificationResult
    });
  } catch (error) {
    logger.error(`Game verification error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error verifying game'
    });
  }
};

// @desc    Get user's client and server seed
// @route   GET /api/games/seeds
// @access  Private
exports.getUserSeeds = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get client seed or generate a new one
    const clientSeed = user.clientSeed || generateClientSeed();
    
    // Get server seed hash (not the actual seed for security)
    const serverSeedHash = user.serverSeedHash || 'No active server seed';
    
    res.status(200).json({
      success: true,
      data: {
        clientSeed,
        serverSeedHash
      }
    });
  } catch (error) {
    logger.error(`Get user seeds error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving seeds'
    });
  }
};

// @desc    Update user's client seed
// @route   POST /api/games/seeds
// @access  Private
exports.updateClientSeed = async (req, res) => {
  try {
    const { clientSeed } = req.body;
    const userId = req.user.id;
    
    if (!clientSeed) {
      return res.status(400).json({
        success: false,
        message: 'Client seed is required'
      });
    }
    
    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          clientSeed,
          // Generate new server seed hash when client seed is updated
          serverSeedHash: getServerSeedHash(generateClientSeed())
        }
      },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        clientSeed: user.clientSeed,
        serverSeedHash: user.serverSeedHash,
        message: 'Seeds updated successfully'
      }
    });
  } catch (error) {
    logger.error(`Update client seed error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error updating client seed'
    });
  }
}; 