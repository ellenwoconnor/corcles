import React from "react";

export default function TreeLogo() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Tree trunk */}
      <rect
        x="55"
        y="75"
        width="10"
        height="30"
        fill="#000000"
      />

      {/* Five circles outlined in green of different sizes */}
      {/* Bottom center circle */}
      <circle
        cx="60"
        cy="65"
        r="18"
        stroke="#6ABF69"
        strokeWidth="2"
        fill="none"
      />

      {/* Left bottom circle */}
      <circle
        cx="40"
        cy="65"
        r="14"
        stroke="#6ABF69"
        strokeWidth="2"
        fill="none"
      />

      {/* Right bottom circle */}
      <circle
        cx="80"
        cy="65"
        r="14"
        stroke="#6ABF69"
        strokeWidth="2"
        fill="none"
      />

      {/* Left top circle */}
      <circle
        cx="45"
        cy="40"
        r="12"
        stroke="#6ABF69"
        strokeWidth="2"
        fill="none"
      />

      {/* Right top circle */}
      <circle
        cx="75"
        cy="40"
        r="12"
        stroke="#6ABF69"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}