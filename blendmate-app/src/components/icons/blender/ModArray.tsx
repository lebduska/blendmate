import type { SVGProps } from 'react';

interface ModArrayProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

export function ModArray({ size = 24, ...props }: ModArrayProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1600 1600"
      width={size}
      height={size}
      fill="currentColor"
      {...props}
    >
      <g fill="currentColor"><g enableBackground="new" transform="matrix(100 0 0 100 -23599.609 -28300.4)"><path d="m240.49805 288-3.00586.008a.50005.50005 0 0 0 -.5.5v9a.50005.50005 0 0 0 .5.5h3a.50005.50005 0 0 0 .5-.5l.00781-9.008a.50005.50005 0 0 0 -.50195-.5zm-.49805 1.00195-.008 8.00586h-2v-8.00195z" opacity=".5"/><path d="m250.49805 284-3.00586.008a.50005.50005 0 0 0 -.5.5v9a.50005.50005 0 0 0 .5.5h3a.50005.50005 0 0 0 .5-.5l.00781-9.008a.50005.50005 0 0 0 -.50195-.5zm-.49805 1.00195-.008 8.00586h-2v-8.00195zm-4.50195.99805-3.00586.008a.50005.50005 0 0 0 -.5.5v9a.50005.50005 0 0 0 .5.5h3a.50005.50005 0 0 0 .5-.5l.00781-9.008a.50005.50005 0 0 0 -.50195-.5zm-.49805 1.00195-.008 8.00586h-2v-8.00195z"/></g></g>
    </svg>
  );
}
