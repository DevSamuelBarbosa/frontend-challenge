import type { SVGProps } from 'react'

/** Envelope com o cartão "THANK YOU" do recibo (traço na cor do texto) */
export function ThankYouIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 64 82"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M24 8V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" />
      <rect x="11" y="8" width="42" height="44" rx="4" />
      <text
        x="32"
        y="22.5"
        textAnchor="middle"
        fill="currentColor"
        stroke="none"
        fontSize="9"
        fontWeight="800"
        fontFamily="inherit"
      >
        THANK
      </text>
      <text
        x="32"
        y="33.5"
        textAnchor="middle"
        fill="currentColor"
        stroke="none"
        fontSize="9"
        fontWeight="800"
        fontFamily="inherit"
      >
        YOU
      </text>
      <rect x="3" y="40" width="58" height="38" rx="4" fill="var(--card)" />
      <path d="M3 43l29 19 29-19" />
      <path d="M3 76l21-17M61 76L40 59" />
    </svg>
  )
}
