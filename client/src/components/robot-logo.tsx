import { motion } from "framer-motion";

export default function RobotLogo() {
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
      {/* Head */}
      <motion.rect
        x="35"
        y="20"
        width="50"
        height="45"
        rx="10"
        fill="#6ABF69"
        initial={{ y: -5 }}
        animate={{ y: 0 }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
      {/* Eyes */}
      <motion.circle
        cx="50"
        cy="40"
        r="5"
        fill="white"
        initial={{ scale: 1 }}
        animate={{ scale: 1.2 }}
        transition={{
          duration: 0.5,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
      <motion.circle
        cx="70"
        cy="40"
        r="5"
        fill="white"
        initial={{ scale: 1 }}
        animate={{ scale: 1.2 }}
        transition={{
          duration: 0.5,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
      {/* Body */}
      <rect x="45" y="65" width="30" height="35" rx="5" fill="#6ABF69" />
      {/* Arms */}
      <rect x="25" y="70" width="20" height="8" rx="4" fill="#6ABF69" />
      <rect x="75" y="70" width="20" height="8" rx="4" fill="#6ABF69" />
    </motion.svg>
  );
}