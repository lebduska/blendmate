'use client';
import { useRef, useState, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
function FloatingPaths({ position }: { position: number }) {

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // generate numeric paths and compute bounding box so negative coords are included
  // then normalize coordinates into a fixed internal coordinate system (1000 x 1000)
  const generated = (() => {
    const items: { id: number; d: string; color: string; width: number; points: number[] }[] = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // first pass: compute raw points and bounding box
    const raw: { id: number; points: number[]; strokeWidth: number; color: string }[] = [];
    for (let i = 0; i < 36; i++) {
      const a = 380 - i * 5 * position;
      const b = 189 + i * 6;
      const c = 312 - i * 5 * position;
      const d_ = 216 - i * 6;
      const e = 152 - i * 5 * position;
      const f = 343 - i * 6;
      const j = 684 - i * 5 * position;
      const k = 875 - i * 6;

      const startX = -a;
      const startY = -b;
      const c1x = -a;
      const c1y = -b;
      const c2x = -c;
      const c2y = d_;
      const end1x = e;
      const end1y = f;
      // enforce C1 continuity: make the first control point of second segment
      // a reflection of the previous segment's second control point across end1
      // const c3x = 2 * end1x - c2x; // reflection for smooth tangent
      // const c3y = 2 * end1y - c2y;
      // enforce C1 direction but with a smoothing factor to avoid sharp kinks
      // (keep tangent direction, but scale magnitude down for smoother transition)
      // smoothing: keeps full reflection near position==1, but clamps to a reasonable minimum
      // to avoid overly small smoothing for large position values (which produced kinks)
      const smoothingRaw = 1 / Math.max(0.0001, Math.abs(position));
      const smoothing = Math.max(0.75, Math.min(1, smoothingRaw));

      // Blend reflection with direction to next end point to avoid kinks for non-1 positions
      const reflectedX = end1x - c2x; // vector from c2 to end1
      const reflectedY = end1y - c2y;
      const refLen = Math.hypot(reflectedX, reflectedY) || 1;
      const refDirX = reflectedX / refLen;
      const refDirY = reflectedY / refLen;

      const toEnd2X = j - end1x; // end2x - end1x
      const toEnd2Y = k - end1y;
      const toEnd2Len = Math.hypot(toEnd2X, toEnd2Y) || 1;
      const toEnd2DirX = toEnd2X / toEnd2Len;
      const toEnd2DirY = toEnd2Y / toEnd2Len;

      // weight how much to blend toward the direction to the next endpoint
      const blend = Math.max(0, Math.min(1, (Math.abs(position) - 1) / 1.5));
      const dirX = refDirX * (1 - blend) + toEnd2DirX * blend;
      const dirY = refDirY * (1 - blend) + toEnd2DirY * blend;
      const dirLen = Math.hypot(dirX, dirY) || 1;
      const normDirX = dirX / dirLen;
      const normDirY = dirY / dirLen;

      // choose a length interpolated between the reflected length and distance to end2
      const len = refLen * (1 - blend) + toEnd2Len * blend;
      // combine small-scale smoothing with direction blend to preserve C1 and avoid kinks
      const c3x = end1x + normDirX * len * smoothing;
      const c3y = end1y + normDirY * len * smoothing;
      const c4x = j;
      const c4y = k;
      let end2x = j;
      let end2y = k;

      // extend final endpoint a bit along the tangent (from c4 to end) to avoid perfectly aligned flat edge
      const strokeWidth = 0.5 + i * 0.03;
      const ext = Math.max(2, Math.ceil(strokeWidth * 2));
      const dx = end2x - c4x;
      const dy = end2y - c4y;
      const dist = Math.hypot(dx, dy) || 1;
      end2x = end2x + (dx / dist) * ext;
      end2y = end2y + (dy / dist) * ext;

      const points = [
        startX, startY,
        c1x, c1y, c2x, c2y, end1x, end1y,
        c3x, c3y, c4x, c4y, end2x, end2y,
      ];

      for (let p = 0; p < points.length; p += 2) {
        const x = points[p];
        const y = points[p + 1];
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }

      raw.push({ id: i, points, strokeWidth, color: `rgba(15,23,42,${ i * 0.001})` });
    }

    // compute bbox and normalization scale -> map to fixed 1000x1000 internal units
    const width = Math.max(1, maxX - minX);
    const height = Math.max(1, maxY - minY);
    const normW = 1000;
    const normH = 1000;
    const scaleX = normW / width;
    const scaleY = normH / height;
    // use uniform scale to preserve aspect ratio of paths
    const scale = Math.min(scaleX, scaleY);
    // compute offset so shapes are centered in normalized box
    const extraX = (normW - width * scale) / 2;
    const extraY = (normH - height * scale) / 2;

    // second pass: build normalized path strings and normalized stroke widths
    for (const r of raw) {
      const p = r.points;
      const normPoints: number[] = [];
      for (let i = 0; i < p.length; i += 2) {
        const x = p[i];
        const y = p[i + 1];
        const nx = (x - minX) * scale + extraX;
        const ny = (y - minY) * scale + extraY;
        normPoints.push(nx, ny);
      }

      // reconstruct d from normalized points (same structure)
      const [sx, sy, c1x, c1y, c2x, c2y, e1x, e1y, c3x, c3y, c4x, c4y, e2x, e2y] = normPoints;
      const d = `M${sx} ${sy} C${c1x} ${c1y} ${c2x} ${c2y} ${e1x} ${e1y} C${c3x} ${c3y} ${c4x} ${c4y} ${e2x} ${e2y}`;

      // scale stroke width proportionally
      const strokeW = Math.max(0.1, r.strokeWidth * scale);
      items.push({ id: r.id, d, color: r.color, width: strokeW, points: normPoints });
    }

    return { items, bbox: { minX, minY, maxX, maxY, width, height }, scale };
  })();

  const paths = generated.items;

  // remap normalized points back to raw coordinates (invert normalization)
  const rawMinX = generated.bbox.minX;
  const rawMinY = generated.bbox.minY;
  const rawWidth = generated.bbox.width;
  const rawHeight = generated.bbox.height;
  const normScale = (generated as any).scale as number;
  const extraX = (1000 - rawWidth * normScale) / 2;
  const extraY = (1000 - rawHeight * normScale) / 2;

  // compute raw points and raw d strings for each path (no extra spread scaling)
  const rawPaths = paths.map((p) => {
    const pts = p.points; // normalized points
    const rawPts: number[] = [];
    for (let i = 0; i < pts.length; i += 2) {
      const nx = pts[i];
      const ny = pts[i + 1];
      const rx = (nx - extraX) / normScale + rawMinX;
      const ry = (ny - extraY) / normScale + rawMinY;
      rawPts.push(rx, ry);
    }
    const [sx, sy, c1x, c1y, c2x, c2y, e1x, e1y, c3x, c3y, c4x, c4y, e2x, e2y] = rawPts;
    const dRaw = `M${sx} ${sy} C${c1x} ${c1y} ${c2x} ${c2y} ${e1x} ${e1y} C${c3x} ${c3y} ${c4x} ${c4y} ${e2x} ${e2y}`;
    return { id: p.id, dRaw, rawPts, normStroke: p.width, color: p.color };
  });

  // compute scale to container (slice behavior) so shape fills the container and overflows (so ends get clipped)
  const containerW = size.width;
  const containerH = size.height;
  const scaleToContainer = (containerW && containerH) ? Math.max(containerW / rawWidth, containerH / rawHeight) : 1;

  // compute translation in SVG (viewport) coordinates so that: x_svg = S * x_raw + tx
  // we want x_svg = S*(x_raw - rawMinX) + offsetX where offsetX centers the scaled raw content inside viewport
  // => tx = -S*rawMinX + offsetX
  const offsetX = (containerW - rawWidth * scaleToContainer) / 2;
  const offsetY = (containerH - rawHeight * scaleToContainer) / 2;
  const txRaw = -scaleToContainer * rawMinX + offsetX;
  const tyRaw = -scaleToContainer * rawMinY + offsetY;

   // container size comes from measured state
   const containerWidth = size.width;
   const containerHeight = size.height;

   // measure the parent container and store width/height in state
   useLayoutEffect(() => {
     const el = containerRef.current;
     if (!el) return;

     const updateFromRect = (rect: { width: number; height: number }) => {
       const w = Math.max(1, Math.round(rect.width));
       const h = Math.max(1, Math.round(rect.height));
       setSize((prev) => (prev.width !== w || prev.height !== h ? { width: w, height: h } : prev));
     };

     // initial measurement
     const rect = el.getBoundingClientRect();
     if (rect.width || rect.height) updateFromRect(rect);

     if (typeof ResizeObserver === 'undefined') {
       // fallback for very old browsers
       const onResize = () => updateFromRect(el.getBoundingClientRect());
       window.addEventListener('resize', onResize);
       return () => window.removeEventListener('resize', onResize);
     }

     const ro = new ResizeObserver((entries) => {
       for (const entry of entries) {
         const r = entry.contentRect;
         updateFromRect(r as unknown as { width: number; height: number });
       }
     });
     ro.observe(el);
     return () => ro.disconnect();
   }, []);

   return (
       <div ref={containerRef} className="absolute inset-0 pointer-events-none">
         {containerWidth > 0 && containerHeight > 0 ? (
           <svg
               className="w-full h-full bg-transparent"
               viewBox={`0 0 ${containerWidth} ${containerHeight}`}
               preserveAspectRatio="none"
               fill="none"
           >
             <g transform={`scale(${scaleToContainer}) translate(${txRaw} ${tyRaw})`}>
             {rawPaths.map((path) => {
                 // stroke in SVG px should be raw stroke * scaleToContainer. raw stroke = normStroke / normScale
                 const strokePx = (path.normStroke / (generated as any).scale as number) * scaleToContainer;
                 return (
                 <motion.path
                     key={path.id}
                     d={path.dRaw}
                     stroke="#FF6A00"
                     strokeWidth={strokePx}
                     strokeOpacity={path.id * 0.01}
                     strokeLinecap="round"
                     strokeLinejoin="round"
                     initial={{ pathLength: 0.3, opacity: 0.6 }}
                     animate={{
                       pathLength: 1,
                       opacity: [0.3, 0.6, 0.3],
                       pathOffset: [0, 1, 0],
                     }}
                     transition={{
                       duration: 20 + Math.random() * 10,
                       repeat: Number.POSITIVE_INFINITY,
                       ease: 'linear',
                     }}
                 />
                 );
             })}
             </g>
           </svg>
          ) : null}
        </div>
    );
  }
export function BackgroundPaths({}: BackgroundPathsProps) {

    return (
        // place background SVG behind panels explicitly
        <div className="absolute inset-0 -z-10 pointer-events-none min-h-screen w-full flex items-center justify-center overflow-hidden">
             <div className="absolute inset-0">
                 <FloatingPaths position={1} />
                 <FloatingPaths position={1.5} />
             </div>
         </div>
     );
 }
 export interface BackgroundPathsProps {
  title?: string;
  count?: number;
  color?: string;
}

export default BackgroundPaths;

