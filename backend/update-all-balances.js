const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected...'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Update all user balances to 10000
const updateAllBalances = async () => {
  try {
    const result = await User.updateMany(
      {}, // match all users
      { $set: { balance: 10000 } } // set balance to 10000
    );
    
    console.log(`Updated balance for ${result.modifiedCount} users`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating balances:', error);
    process.exit(1);
  }
};

updateAllBalances(); 