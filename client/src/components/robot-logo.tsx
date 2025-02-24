
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
      <motion.path
        d="M40 30 L80 30 L85 40 L85 60 L35 60 L35 40 L40 30"
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
      <motion.rect
        x="45"
        y="40"
        width="8"
        height="8"
        fill="white"
        initial={{ scale: 1 }}
        animate={{ scale: 1.2 }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
      <motion.rect
        x="67"
        y="40"
        width="8"
        height="8"
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
      <path
        d="M35 65 L85 65 L90 90 L30 90 L35 65"
        fill="#6ABF69"
      />
      {/* Body details */}
      <rect x="45" y="72" width="30" height="3" rx="1" fill="white" />
      <rect x="45" y="80" width="30" height="3" rx="1" fill="white" />
      {/* Antenna */}
      <motion.path
        d="M60 20 L60 30"
        stroke="#6ABF69"
        strokeWidth="4"
        strokeLinecap="round"
        initial={{ rotateZ: -5 }}
        animate={{ rotateZ: 5 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      />
    </motion.svg>
  );
}
