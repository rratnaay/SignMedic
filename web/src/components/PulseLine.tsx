import React from 'react';

interface PulseLineProps {
  className?: string;
  isAnimated?: boolean;
}

export const PulseLine: React.FC<PulseLineProps> = ({ className = '', isAnimated = false }) => {
  return (
    <svg
      viewBox="0 0 120 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`h-5 w-24 text-blue ${isAnimated ? 'animate-pulse' : ''} ${className}`}
      aria-hidden="true"
    >
      <path
        d="M2 12H30L38 4L48 20L58 8L66 16L74 12H118"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
