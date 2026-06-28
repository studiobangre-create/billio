import { useLayoutEffect, useRef } from 'react';
import { ICONS } from '@/icons';

interface IconProps {
  name: string;
  ariaHidden?: boolean;
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export default function Icon({ name, ariaHidden = true, size, className, style }: IconProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const inner = ICONS[name];
    if (inner === undefined) return;
    // Safely set inner content — ICONS is a static compile-time constant, not user input.
    // We use DOM API directly so React's reconciler never sees raw HTML strings.
    const parser = new DOMParser();
    const doc = parser.parseFromString(
      `<svg xmlns="http://www.w3.org/2000/svg">${inner}</svg>`,
      'image/svg+xml',
    );
    const parsed = doc.documentElement;
    svg.replaceChildren(...Array.from(parsed.childNodes).map(n => n.cloneNode(true)));
  }, [name]);

  if (ICONS[name] === undefined) return null;

  return (
    <i className={['ti', className].filter(Boolean).join(' ')} style={style}>
      <svg
        ref={svgRef}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        width={size ?? '1em'}
        height={size ?? '1em'}
        aria-hidden={ariaHidden}
      />
    </i>
  );
}
