import React from 'react';
import { motion } from 'framer-motion';

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-4xl md:text-6xl font-medium text-white mb-6">
          AI Workbench
        </h1>
        <p className="text-white/60 text-lg max-w-lg mx-auto">
          Welcome to your new AI development environment. Connect your data, train agents, and build intelligent workflows.
        </p>
      </motion.div>
    </div>
  );
};

export default Home;
