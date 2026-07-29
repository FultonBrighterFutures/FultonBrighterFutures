import { useId } from 'react'
import BuildingTypeIcon from './BuildingTypeIcon'
import { getFutureSticker } from '../../data/futureStickers'
import './SelectedBuildingOrb.css'

/**
 * Glowing selected-building preview orb (Figma Look Ahead style)
 * with a pulse similar to the Overview page StaticBuildingIcon rings.
 */
export default function SelectedBuildingOrb({ typeId, stickerId = null, className = '' }) {
  const uid = useId().replace(/:/g, '')
  const sticker = getFutureSticker(stickerId)

  const filter0 = `orb-dd-${uid}`
  const filter1 = `orb-n1-${uid}`
  const filter2 = `orb-n2-${uid}`
  const filter3 = `orb-nf-${uid}`
  const filter4 = `orb-f-${uid}`
  const mask1 = `orb-m1-${uid}`
  const mask2 = `orb-m2-${uid}`
  const paint0 = `orb-p0-${uid}`
  const paint1 = `orb-p1-${uid}`
  const paint2 = `orb-p2-${uid}`
  const paint3 = `orb-p3-${uid}`
  const paint4 = `orb-p4-${uid}`
  const paint5 = `orb-p5-${uid}`

  return (
    <div className={`selected-building-orb${className ? ` ${className}` : ''}`} aria-hidden="true">
      <span className="selected-building-orb__pulse selected-building-orb__pulse--1" aria-hidden="true" />
      <span className="selected-building-orb__pulse selected-building-orb__pulse--2" aria-hidden="true" />
      <span className="selected-building-orb__pulse selected-building-orb__pulse--3" aria-hidden="true" />

      <svg
        className="selected-building-orb__svg"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 240 241"
        fill="none"
      >
        <g className="selected-building-orb__glow" filter={`url(#${filter0})`}>
          <g filter={`url(#${filter1})`}>
            <mask
              id={mask1}
              maskUnits="userSpaceOnUse"
              x="39.543"
              y="39.5431"
              width="160"
              height="161"
              fill="black"
            >
              <rect fill="white" x="39.543" y="39.5431" width="160" height="161" />
              <path d="M198.537 120.055C198.537 163.968 163.169 199.567 119.54 199.567C75.9112 199.567 40.543 163.968 40.543 120.055C40.543 76.1418 75.9112 40.5431 119.54 40.5431C163.169 40.5431 198.537 76.1418 198.537 120.055ZM56.8051 120.055C56.8051 154.928 84.8925 183.199 119.54 183.199C154.188 183.199 182.275 154.928 182.275 120.055C182.275 85.1817 154.188 56.9112 119.54 56.9112C84.8925 56.9112 56.8051 85.1817 56.8051 120.055Z" />
            </mask>
            <path
              className="selected-building-orb__ring selected-building-orb__ring--outer"
              d="M198.537 120.055C198.537 163.968 163.169 199.567 119.54 199.567C75.9112 199.567 40.543 163.968 40.543 120.055C40.543 76.1418 75.9112 40.5431 119.54 40.5431C163.169 40.5431 198.537 76.1418 198.537 120.055ZM56.8051 120.055C56.8051 154.928 84.8925 183.199 119.54 183.199C154.188 183.199 182.275 154.928 182.275 120.055C182.275 85.1817 154.188 56.9112 119.54 56.9112C84.8925 56.9112 56.8051 85.1817 56.8051 120.055Z"
              fill={`url(#${paint0})`}
            />
            <path
              d="M198.537 120.055C198.537 163.968 163.169 199.567 119.54 199.567C75.9112 199.567 40.543 163.968 40.543 120.055C40.543 76.1418 75.9112 40.5431 119.54 40.5431C163.169 40.5431 198.537 76.1418 198.537 120.055ZM56.8051 120.055C56.8051 154.928 84.8925 183.199 119.54 183.199C154.188 183.199 182.275 154.928 182.275 120.055C182.275 85.1817 154.188 56.9112 119.54 56.9112C84.8925 56.9112 56.8051 85.1817 56.8051 120.055Z"
              stroke={`url(#${paint1})`}
              strokeWidth="1.08622"
              mask={`url(#${mask1})`}
            />
          </g>

          <g filter={`url(#${filter2})`}>
            <mask
              id={mask2}
              maskUnits="userSpaceOnUse"
              x="55.1543"
              y="55.2621"
              width="128"
              height="128"
              fill="black"
            >
              <rect fill="white" x="55.1543" y="55.2621" width="128" height="128" />
              <path d="M181.1 119.639C181.1 154.088 153.354 182.015 119.127 182.015C84.9005 182.015 57.1543 154.088 57.1543 119.639C57.1543 85.1891 84.9005 57.2621 119.127 57.2621C153.354 57.2621 181.1 85.1891 181.1 119.639ZM92.9325 119.639C92.9325 134.2 104.66 146.004 119.127 146.004C133.594 146.004 145.322 134.2 145.322 119.639C145.322 105.078 133.594 93.2735 119.127 93.2735C104.66 93.2735 92.9325 105.078 92.9325 119.639Z" />
            </mask>
            <path
              className="selected-building-orb__ring selected-building-orb__ring--mid"
              d="M181.1 119.639C181.1 154.088 153.354 182.015 119.127 182.015C84.9005 182.015 57.1543 154.088 57.1543 119.639C57.1543 85.1891 84.9005 57.2621 119.127 57.2621C153.354 57.2621 181.1 85.1891 181.1 119.639ZM92.9325 119.639C92.9325 134.2 104.66 146.004 119.127 146.004C133.594 146.004 145.322 134.2 145.322 119.639C145.322 105.078 133.594 93.2735 119.127 93.2735C104.66 93.2735 92.9325 105.078 92.9325 119.639Z"
              stroke={`url(#${paint2})`}
              strokeWidth="2.17244"
              mask={`url(#${mask2})`}
            />
          </g>

          <g filter={`url(#${filter3})`}>
            <ellipse cx="101.025" cy="124.57" rx="20.8706" ry="21.0066" fill={`url(#${paint3})`} />
          </g>
          <g filter={`url(#${filter4})`}>
            <ellipse
              cx="28.1114"
              cy="28.2946"
              rx="28.1114"
              ry="28.2946"
              transform="matrix(1 0 0 -1 98.8955 143.861)"
              fill={`url(#${paint4})`}
            />
          </g>

          <path
            className="selected-building-orb__core"
            d="M119.126 74.9541C143.64 74.9541 163.519 94.9573 163.519 119.64C163.519 144.322 143.64 164.325 119.126 164.325C94.6125 164.325 74.7339 144.322 74.7339 119.64C74.7339 94.9573 94.6125 74.9541 119.126 74.9541Z"
            fill="white"
            fillOpacity="0.16"
          />
          <path
            d="M119.126 74.9541C143.64 74.9541 163.519 94.9573 163.519 119.64C163.519 144.322 143.64 164.325 119.126 164.325C94.6125 164.325 74.7339 144.322 74.7339 119.64C74.7339 94.9573 94.6125 74.9541 119.126 74.9541Z"
            stroke={`url(#${paint5})`}
            style={{ mixBlendMode: 'plus-lighter' }}
            strokeWidth="1.08622"
          />
        </g>

        <defs>
          <filter
            id={filter0}
            x="0"
            y="0"
            width="239.08"
            height="240.11"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha"
            />
            <feOffset />
            <feGaussianBlur stdDeviation="8" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 0.683333 0 0 0 0 0 0 0 0 1 0" />
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha"
            />
            <feOffset />
            <feGaussianBlur stdDeviation="24" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 0.85 0 0 0 0 0.15 0 0 0 0.55 0" />
            <feBlend mode="normal" in2="effect1_dropShadow" result="effect2_dropShadow" />
            <feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow" result="shape" />
          </filter>

          <filter
            id={filter1}
            x="40"
            y="40"
            width="159.08"
            height="160.11"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          </filter>

          <filter
            id={filter2}
            x="56.0679"
            y="56.1759"
            width="126.118"
            height="126.926"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          </filter>

          <filter
            id={filter3}
            x="68.9667"
            y="92.3755"
            width="64.1174"
            height="64.3893"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
            <feGaussianBlur stdDeviation="5.59404" result="effect2_foregroundBlur" />
          </filter>

          <filter
            id={filter4}
            x="88.0333"
            y="76.4099"
            width="77.9471"
            height="78.3137"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
            <feGaussianBlur stdDeviation="5.43111" result="effect1_foregroundBlur" />
          </filter>

          <radialGradient
            id={paint0}
            cx="0"
            cy="0"
            r="1"
            gradientTransform="matrix(36.5252 63.6758 -67.484 39.2158 119.54 120.055)"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FFEE00" stopOpacity="0.7" />
            <stop offset="1" stopColor="#FFD500" stopOpacity="0" />
          </radialGradient>
          <linearGradient
            id={paint1}
            x1="106.562"
            y1="50.4033"
            x2="144.508"
            y2="209.128"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FFAE00" stopOpacity="0.5" />
            <stop offset="1" stopColor="#2D2600" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient
            id={paint2}
            x1="108.946"
            y1="64.9974"
            x2="138.714"
            y2="189.516"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FFAE00" />
            <stop offset="1" stopColor="#2D2600" />
          </linearGradient>
          <radialGradient
            id={paint3}
            cx="0"
            cy="0"
            r="1"
            gradientTransform="matrix(13.8083 21.6962 -21.5557 13.8983 105.136 127.382)"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FFAE00" />
            <stop offset="1" stopColor="#FFD500" />
          </radialGradient>
          <linearGradient id={paint4} x1="28.1114" y1="56.5892" x2="28.1114" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFF1E6" />
            <stop offset="1" stopColor="#998000" />
          </linearGradient>
          <linearGradient
            id={paint5}
            x1="107.839"
            y1="81.9135"
            x2="131.538"
            y2="149.339"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FFAF46" />
            <stop offset="1" stopColor="#FFE046" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      <span className="selected-building-orb__icon">
        <BuildingTypeIcon type={typeId} lit />
      </span>

      {sticker && (
        <span className="selected-building-orb__sticker">
          <img src={sticker.src} alt="" />
        </span>
      )}
    </div>
  )
}
