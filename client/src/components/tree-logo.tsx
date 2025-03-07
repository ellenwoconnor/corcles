
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
      {/* Trunk circle */}
      <motion.circle
        cx="60"
        cy="80"
        r="18"
        fill="#6ABF69"
        initial={{ y: 0 }}
        animate={{ y: -2 }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
      
      {/* Left bottom circle */}
      <motion.circle
        cx="40"
        cy="60"
        r="16"
        fill="#6ABF69"
        initial={{ x: 0, y: 0 }}
        animate={{ x: -1, y: -1 }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
      
      {/* Right bottom circle */}
      <motion.circle
        cx="80"
        cy="60"
        r="16"
        fill="#6ABF69"
        initial={{ x: 0, y: 0 }}
        animate={{ x: 1, y: -1 }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
      
      {/* Left top circle */}
      <motion.circle
        cx="50"
        cy="40"
        r="14"
        fill="#6ABF69"
        initial={{ x: 0, y: 0 }}
        animate={{ x: -2, y: -2 }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
      
      {/* Right top circle */}
      <motion.circle
        cx="70"
        cy="40"
        r="14"
        fill="#6ABF69"
        initial={{ x: 0, y: 0 }}
        animate={{ x: 2, y: -2 }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
    </motion.svg>
  );
}
