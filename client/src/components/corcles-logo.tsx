
import React from 'react';

interface CorclesLogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export const CorclesLogo: React.FC<CorclesLogoProps> = ({ 
  width = 200, 
  height = 200,
  className = ''
}) => {
  return (
    <div className={className}>
      <img 
        src="/corcles-logo.svg" 
        alt="Corcles Logo" 
        width={width} 
        height={height}
        className="max-w-full h-auto"
      />
    </div>
  );
};

export default CorclesLogo;
