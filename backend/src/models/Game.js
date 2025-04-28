const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  gameType: {
    type: String,
    enum: ['dice', 'crash', 'mines'],
    required: true
  },
  betAmount: {
    type: Number,
    required: true,
    min: [1, 'Bet amount must be at least 1']
  },
  outcome: {
    type: String,
    enum: ['win', 'loss'],
    required: true
  },
  winAmount: {
    type: Number,
    default: 0
  },
  multiplier: {
    type: Number,
    default: 1
  },
  gameData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  date: {
    type: Date,
    default: Date.now
  },
  clientSeed: {
    type: String
  },
  serverSeed: {
    type: String
  },
  nonce: {
    type: Number
  },
  fairnessHash: {
    type: String
  }
}, {
  timestamps: true
});

// Add compound index for faster querying
gameSchema.index({ user: 1, date: -1 });
gameSchema.index({ gameType: 1, date: -1 });
gameSchema.index({ outcome: 1 });

const Game = mongoose.model('Game', gameSchema);

module.exports = Game; 