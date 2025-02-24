
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
        x="30"
        y="25"
        width="60"
        height="40"
        rx="8"
        fill="#6ABF69"
        initial={{ y: -3 }}
        animate={{ y: 0 }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
      {/* Eyes */}
      <motion.circle
        cx="48"
        cy="45"
        r="4"
        fill="white"
        initial={{ scale: 1 }}
        animate={{ scale: 1.2 }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
      <motion.circle
        cx="72"
        cy="45"
        r="4"
        fill="white"
        initial={{ scale: 1 }}
        animate={{ scale: 1.2 }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
      {/* Body */}
      <rect x="45" y="70" width="30" height="25" rx="4" fill="#6ABF69" />
      {/* Arms */}
      <rect x="30" y="75" width="12" height="6" rx="3" fill="#6ABF69" />
      <rect x="78" y="75" width="12" height="6" rx="3" fill="#6ABF69" />
    </motion.svg>
  );
}
