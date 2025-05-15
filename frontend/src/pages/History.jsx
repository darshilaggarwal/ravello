import React from 'react';
import { motion } from 'framer-motion';
import CombinedHistory from '../components/games/CombinedHistory';

const History = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold text-white mb-6">Your Betting History</h1>
        <CombinedHistory />
      </motion.div>
    </div>
  );
};

export default History; 