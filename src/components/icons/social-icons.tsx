import type { SVGProps } from 'react'

/** Ícones de marcas do footer (o lucide-react não inclui mais ícones de marcas) */
type IconProps = SVGProps<SVGSVGElement>

const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

export const FacebookIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z" />
  </svg>
)

export const InstagramIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
  </svg>
)

export const TwitterIcon = (props: IconProps) => (
  <svg {...base} {...props} fill="currentColor" stroke="none">
    <path d="M22 5.8c-.7.3-1.5.5-2.3.6.8-.5 1.5-1.3 1.8-2.2-.8.5-1.7.8-2.6 1a4 4 0 0 0-6.9 3.7A11.4 11.4 0 0 1 3.7 4.7a4 4 0 0 0 1.2 5.4c-.6 0-1.3-.2-1.8-.5 0 2 1.4 3.6 3.2 4a4 4 0 0 1-1.8.1 4 4 0 0 0 3.8 2.8A8.1 8.1 0 0 1 2 18.1 11.4 11.4 0 0 0 8.2 20c7.4 0 11.5-6.2 11.5-11.5v-.5c.8-.6 1.5-1.3 2.1-2.2z" />
  </svg>
)

export const LinkedinIcon = (props: IconProps) => (
  <svg {...base} {...props} fill="currentColor" stroke="none">
    <path d="M4.5 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM3 9h3v12H3zM9 9h2.9v1.7c.4-.8 1.4-1.9 3.3-1.9 3 0 3.8 2 3.8 4.6V21h-3v-6.8c0-1.6-.3-2.8-1.8-2.8s-2.2 1.2-2.2 2.8V21H9z" />
  </svg>
)

export const YoutubeIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
    <path d="M10.5 9.5v5l4-2.5z" fill="currentColor" />
  </svg>
)
