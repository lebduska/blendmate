import { useMemo, memo } from "react";

interface BackgroundPathsProps {
  color?: string;
  className?: string;
}

function BackgroundPathsComponent({ color = "rgba(99,102,241,0.18)", className = "" }: BackgroundPathsProps) {
  // Procedurally generate multiple layers of paths with slight randomness and different animations
  const width = 1400;
  const height = 900;

  // simple deterministic PRNG with better distribution
  function makeRng(seed: number) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => {
      s = (s * 48271) % 2147483647; // standard Lehmer generator
      return (s - 1) / 2147483646;
    };
  }

  // Build a multi-segment wavy cubic path between startX and endX.
  function makeWavyPath(startX: number, yStart: number, endX: number, yEnd: number, rng: () => number, amp: number, segments = 5) {
    const span = endX - startX;
    const pts: Array<{ x: number; y: number }> = [];
    pts.push({ x: startX, y: yStart });

    for (let s = 1; s < segments; s++) {
      const t = s / segments;
      const x = startX + span * t;
      const yBase = yStart + (yEnd - yStart) * t;
      // Use simpler wave generation to reduce complexity
      const wave = Math.sin(t * Math.PI * 2 + rng() * Math.PI) * amp;
      const jitter = (rng() - 0.5) * amp * 0.2;
      pts.push({ x, y: yBase + wave + jitter });
    }
    pts.push({ x: endX, y: yEnd });

    let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const dx = p1.x - p0.x;
      const cp1x = (p0.x + dx * 0.38).toFixed(1);
      const cp1y = (p0.y + (rng() - 0.5) * amp * 0.5).toFixed(1);
      const cp2x = (p0.x + dx * 0.62).toFixed(1);
      const cp2y = (p1.y + (rng() - 0.5) * amp * 0.5).toFixed(1);
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
    }
    return d;
  }

  const layerPaths = useMemo(() => {
    const layers = [
      { count: 22, strokeWidth: 1, opacity: 0.8, anim: 'bm-anim-slow', amp: 180, blur: true },
      { count: 12, strokeWidth: 1,  opacity: 0.9, anim: 'bm-anim-med', amp: 120 },
      { count: 43, strokeWidth: 1,  opacity: 0.7, anim: 'bm-anim-fast', amp: 90 },
    ];

    return layers.map((layer, li) => {
      const rng = makeRng(2000 + li * 137);
      const paths: Array<{ d: string; delay: string; strokeWidth: number; opacity: number; duration: string }> = [];
      const baseY = height * 0.5;
      
      for (let i = 0; i < layer.count; i++) {
        const t = i / Math.max(1, layer.count - 1);
        const yStart = baseY + (t - 0.5) * 600 + (rng() - 0.5) * 100;
        const yEnd = yStart + (rng() - 0.5) * 150;

        const EXTENT = width * 1.5;
        const startX = -EXTENT;
        const endX = width + EXTENT;

        const segments = Math.max(3, Math.min(5, Math.round(layer.amp / 40)));
        const d = makeWavyPath(startX, yStart, endX, yEnd, rng, layer.amp, segments);
        
        const delay = `${-(rng() * 60).toFixed(2)}s`;
        const baseDur = layer.anim === 'bm-anim-slow' ? 60 : layer.anim === 'bm-anim-med' ? 45 : 30;
        const dur = baseDur * (0.8 + rng() * 0.4);
        const duration = `${dur.toFixed(2)}s`;
        
        const sw = layer.strokeWidth * (0.8 + rng() * 0.4);
        const op = layer.opacity * (0.8 + rng() * 0.4);
        paths.push({ d, delay, duration, strokeWidth: Number(sw.toFixed(1)), opacity: Number(op.toFixed(3)) });
      }
      return { layer, paths };
    });
  }, []);

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`}>
      <svg className="w-full h-full scale-105" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bp1" x1="0" x2="1" y1="0.5" y2="0.5">
            <stop offset="0%" stopColor={color} stopOpacity="0" />
            <stop offset="20%" stopColor={color} stopOpacity="0.8" />
            <stop offset="80%" stopColor={color} stopOpacity="0.8" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        <style>{`
          .bm-paths {             
            will-change: transform;
            transform-box: fill-box;
            transform-origin: center;
          }
          @keyframes bm-drift {
            0% { transform: translate3d(-1.5%, 0, 0); }
            50% { transform: translate3d(1.5%, 0.5%, 0); }
            100% { transform: translate3d(-1.5%, 0, 0); }
          }

          .bm-anim-slow  { animation: bm-drift 20s ease-in-out infinite; }
          .bm-anim-med   { animation: bm-drift 10s ease-in-out infinite; }
          .bm-anim-fast  { animation: bm-drift 5s ease-in-out infinite; }

          @media (prefers-reduced-motion: reduce) { 
            .bm-anim-slow, .bm-anim-med, .bm-anim-fast { 
              /* animation: none !important; */ 
            } 
          }
        `}</style>

        {layerPaths.map(({ layer, paths }, li) => (
          <g 
            key={li} 
            className={`bm-paths ${layer.anim}`} 
            style={{ 
              filter: layer.blur ? 'blur(3px)' : 'none',
              // use CSS filter instead of SVG filter for better GPU performance
            }}
          >
            {paths.map((p, pi) => (
              <path
                key={pi}
                d={p.d}
                stroke="url(#bp1)"
                strokeWidth={p.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={p.opacity}
                style={{ 
                  animationDelay: p.delay, 
                  animationDuration: p.duration,
                }}
                fill="none"
              />
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}

const BackgroundPaths = memo(BackgroundPathsComponent);
export default BackgroundPaths;
