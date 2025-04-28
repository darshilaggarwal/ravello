const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'win', 'loss', 'bonus'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game'
  },
  gameType: {
    type: String,
    enum: ['dice', 'crash', 'mines', null],
    default: null
  },
  description: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add index for faster querying
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ gameId: 1 });
transactionSchema.index({ type: 1, status: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction; 