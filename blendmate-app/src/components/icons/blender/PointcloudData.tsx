import type { SVGProps } from 'react';

interface PointcloudDataProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

export function PointcloudData({ size = 24, ...props }: PointcloudDataProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1600 1600"
      width={size}
      height={size}
      fill="currentColor"
      {...props}
    >
      <g fill="currentColor"><g enableBackground="new" transform="matrix(95.312415 0 0 100.99748 -10502.3145 -28561.311)"><path d="m114.20361 283.80598c1.65093 0 3 1.34907 3 3s-1.34907 3-3 3-3-1.34907-3-3 1.34907-3 3-3zm0 1c-1.11049 0-2 .88951-2 2s.88951 2 2 2 2-.88951 2-2-.88951-2-2-2z"/><path d="m115.59493 291.64794c1.65093 0 3 1.34907 3 3s-1.34907 3-3 3-3-1.34907-3-3 1.34907-3 3-3zm0 1c-1.11049 0-2 .88951-2 2s.88951 2 2 2 2-.88951 2-2-.88951-2-2-2z"/><path d="m122.93095 287.85344c1.65093 0 3 1.34907 3 3s-1.34907 3-3 3-3-1.34907-3-3 1.34907-3 3-3zm0 1c-1.11049 0-2 .88951-2 2s.88951 2 2 2 2-.88951 2-2-.88951-2-2-2z"/></g></g>
    </svg>
  );
}
