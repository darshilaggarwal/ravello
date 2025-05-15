const mongoose = require('mongoose');
const User = require('./src/models/User');
const { WALLET } = require('./src/utils/constants');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected...'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Update all users' balances
const updateAllBalances = async () => {
  try {
    console.log('Starting balance update...');
    const defaultBalance = WALLET.DEFAULT_BALANCE;
    
    // Update all users with the default balance
    const result = await User.updateMany({}, { balance: defaultBalance });
    
    console.log(`Updated ${result.modifiedCount} users with a balance of $${defaultBalance}`);
    console.log(`${result.matchedCount} users found, ${result.modifiedCount} users updated`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating balances:', error);
    process.exit(1);
  }
};

updateAllBalances(); 