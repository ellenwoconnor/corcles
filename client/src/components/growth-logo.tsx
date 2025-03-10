
import React from "react";

export default function GrowthLogo() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Simple abstract growth representation with circles */}
      <circle cx="60" cy="80" r="20" stroke="#6ABF69" strokeWidth="2.5" fill="none" />
      <circle cx="60" cy="55" r="15" stroke="#6ABF69" strokeWidth="2.5" fill="none" />
      <circle cx="60" cy="35" r="10" stroke="#6ABF69" strokeWidth="2.5" fill="none" />
      
      {/* Connecting line representing growth */}
      <line x1="60" y1="100" x2="60" y2="25" stroke="#000000" strokeWidth="2.5" />
      
      {/* Small circles on line to emphasize growth points */}
      <circle cx="60" cy="80" r="2.5" fill="#000000" />
      <circle cx="60" cy="55" r="2.5" fill="#000000" />
      <circle cx="60" cy="35" r="2.5" fill="#000000" />
    </svg>
  );
}
