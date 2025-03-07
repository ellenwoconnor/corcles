
import { motion } from "framer-motion";

export default function TreeLogo() {
  return (
    <motion.svg
      width="64"
      height="64"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      transition={{
        duration: 2,
        repeat: Infinity,
        repeatType: "reverse",
      }}
    >
      {/* Trunk */}
      <motion.rect
        x="55"
        y="80"
        width="10"
        height="25"
        fill="#8B4513"
        initial={{ y: 0 }}
        animate={{ y: -1 }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
      
      {/* Bottom circle (main canopy) */}
      <motion.circle
        cx="60"
        cy="65"
        r="20"
        fill="#6ABF69"
        initial={{ y: 0 }}
        animate={{ y: -2 }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
      
      {/* Left middle circle */}
      <motion.circle
        cx="45"
        cy="50"
        r="15"
        fill="#6ABF69"
        initial={{ x: 0, y: 0 }}
        animate={{ x: -1, y: -1 }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
      
      {/* Right middle circle */}
      <motion.circle
        cx="75"
        cy="50"
        r="15"
        fill="#6ABF69"
        initial={{ x: 0, y: 0 }}
        animate={{ x: 1, y: -1 }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
      
      {/* Top circle */}
      <motion.circle
        cx="60"
        cy="35"
        r="14"
        fill="#6ABF69"
        initial={{ y: 0 }}
        animate={{ y: -2 }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
      
      {/* Left top small circle */}
      <motion.circle
        cx="45"
        cy="30"
        r="10"
        fill="#6ABF69"
        initial={{ x: 0, y: 0 }}
        animate={{ x: -1, y: -1 }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
      
      {/* Right top small circle */}
      <motion.circle
        cx="75"
        cy="30"
        r="10"
        fill="#6ABF69"
        initial={{ x: 0, y: 0 }}
        animate={{ x: 1, y: -1 }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
    </motion.svg>
  );
}
