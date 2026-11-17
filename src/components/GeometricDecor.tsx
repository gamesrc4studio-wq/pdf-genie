import React from "react";

interface StarProps {
  className?: string;
  fill?: string;
  stroke?: string;
}

export const FourPointStar: React.FC<StarProps> = ({
  className = "w-6 h-6",
  fill = "#F47A35",
  stroke = "#17213B",
}) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M16 2L19.8 12.2L30 16L19.8 19.8L16 30L12.2 19.8L2 16L12.2 12.2L16 2Z"
      fill={fill}
      stroke={stroke}
      strokeWidth="2.2"
      strokeLinejoin="round"
    />
  </svg>
);

export const EightPointStar: React.FC<StarProps> = ({
  className = "w-7 h-7",
  fill = "#2855D9",
  stroke = "#17213B",
}) => (
  <svg
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M18 2L21.5 11.5L31 8L24.5 16L34 18L24.5 20L31 28L21.5 24.5L18 34L14.5 24.5L5 28L11.5 20L2 18L11.5 16L5 8L14.5 11.5L18 2Z"
      fill={fill}
      stroke={stroke}
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);
