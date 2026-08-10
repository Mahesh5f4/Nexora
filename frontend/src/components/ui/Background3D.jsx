import React from 'react';
import { motion } from 'framer-motion';

const Background3D = () => {
  return (
    <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none bg-black">
      {/* Primary Animated Blob */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0],
          x: [-100, 100, -100],
          y: [-50, 50, -50],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full mix-blend-screen"
      />

      {/* Secondary Animated Blob */}
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          rotate: [90, 0, 90],
          x: [100, -100, 100],
          y: [50, -50, 50],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-secondary/15 blur-[100px] rounded-full mix-blend-screen"
      />

      {/* Accent Animated Blob */}
      <motion.div
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/10 blur-[150px] rounded-full mix-blend-screen"
      />

      {/* Subtle Grid Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '100px 100px'
        }}
      />
    </div>
  );
};

export default Background3D;
