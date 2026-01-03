import type { SVGProps } from 'react';

interface ModMaskProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

export function ModMask({ size = 24, ...props }: ModMaskProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1600 1600"
      width={size}
      height={size}
      fill="currentColor"
      {...props}
    >
      <g fill="currentColor"><path d="m342.5 158c-.27613.00003-.49997.22387-.5.5v13c.00003.27613.22387.49997.5.5h13c.27613-.00003.49997-.22387.5-.5v-13c-.00003-.27613-.22387-.49997-.5-.5zm6.5 3c2.20237 0 4 1.79764 4 4 0 2.20237-1.79763 4-4 4-2.20236 0-4-1.79763-4-4 0-2.20236 1.79764-4 4-4z" transform="matrix(100 0 0 100 -34100 -15700)"/></g>
    </svg>
  );
}
