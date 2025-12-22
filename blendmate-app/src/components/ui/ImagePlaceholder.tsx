export default function ImagePlaceholder({ className = '', label = 'Preview' }: { className?: string; label?: string }) {
  return (
    <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-white/4 to-white/2 ${className}`} role="img" aria-label={label}>
      <div className="animate-pulse flex items-center justify-center w-full h-full p-4">
        <svg width="120" height="80" viewBox="0 0 96 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-60">
          <rect width="96" height="64" rx="8" fill="#0b1220"/>
          <g transform="translate(12,14)" stroke="#a8bcd6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M0 26 L18 6 L34 22 L54 0 L84 38 L96 26" opacity="0.6"/>
            <circle cx="6" cy="6" r="3" fill="#a8bcd6" opacity="0.8"/>
          </g>
        </svg>
      </div>
      <div className="mt-2 text-[11px] text-white/30">{label}</div>
    </div>
  );
}
