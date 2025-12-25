import React from "react";

interface BackgroundPathsProps {
  color?: string;
  className?: string;
}

export default function BackgroundPaths({ color = "rgba(99,102,241,0.18)", className = "" }: BackgroundPathsProps) {
  // Subtle organic paths with low opacity for background texture
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 -z-10 ${className}`}>
      <svg className="w-full h-full" viewBox="0 0 1200 800" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bp1" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        <g fill="none" stroke="url(#bp1)" strokeWidth="80" strokeLinecap="round" strokeLinejoin="round">
          <path d="M-200,100 C200,200 400,0 800,120" opacity="0.25" />
          <path d="M0,300 C250,380 550,240 1200,320" opacity="0.22" />
          <path d="M-100,500 C180,620 420,420 900,560" opacity="0.20" />
        </g>

      </svg>
    </div>
  );
}

