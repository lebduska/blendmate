import type { SVGProps } from 'react';

interface ModBevelProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

export function ModBevel({ size = 24, ...props }: ModBevelProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1600 1600"
      width={size}
      height={size}
      fill="currentColor"
      {...props}
    >
      <g fill="currentColor"><g enableBackground="new" transform="matrix(100 0 0 100 -19399.6 -28300.388)"><path d="m203.5 284a.50005.50005 0 0 0 -.35352.14648l-8 8a.50005.50005 0 0 0 -.14648.35352l-.008 5.00586a.50005.50005 0 0 0 .5.50195l13.008-.00781a.50005.50005 0 0 0 .5-.5v-13a.50005.50005 0 0 0 -.5-.5zm.20703 1h4.29297v12l-12.00781.008.008-4.30078z" fillRule="evenodd"/><path d="m200.5 284-5.00781.008a.50005.50005 0 0 0 -.5.5v5a.50005.50005 0 1 0 1 0v-4.50195l4.50781-.00605a.50005.50005 0 1 0 0-1z" opacity=".5"/></g></g>
    </svg>
  );
}
