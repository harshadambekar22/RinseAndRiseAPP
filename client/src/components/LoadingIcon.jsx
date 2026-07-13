import { useId } from 'react'

// The app's loading indicator, used everywhere something is loading (see
// index.css for the ".li-*" keyframes this markup animates with — CSS-only,
// no timers/JS, so it's cheap to mount in many places at once).
//
// Loop (6s, repeats): a splattered stain fades as soap sweeps across it on
// a diagonal -> sparkles pop to say "clean" -> an iron glides over the
// shirt -> the shirt visibly trifolds (right flap in, left flap over it,
// then the strip folds down) -> unfolds, stain reappears, repeat.
//
// The shirt body is drawn once in <defs> and reused three times, each
// copy clipped to a vertical third and folded independently, so the fold
// reads as real cloth panels closing over each other instead of the whole
// shirt shrinking in place.
export default function LoadingIcon({ size = 56, className = '' }) {
  const uid = useId()
  const body = `${uid}-body`
  const collar = `${uid}-collar`
  const clipMid = `${uid}-clip-mid`
  const clipRight = `${uid}-clip-right`
  const clipLeft = `${uid}-clip-left`

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Loading"
    >
      <defs>
        <path
          id={body}
          d="M43,22 L50,29 L57,22 L68,27 L84,37 L72,46 L72,78 L28,78 L28,46 L16,37 L32,27 Z"
          fill="#ffffff"
          stroke="#d7dbe0"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path id={collar} d="M45,24 L50,31 L55,24" fill="none" stroke="#d7dbe0" strokeWidth="1.4" />
        <clipPath id={clipMid}><rect x="38" y="0" width="24" height="100" /></clipPath>
        <clipPath id={clipRight}><rect x="62" y="0" width="38" height="100" /></clipPath>
        <clipPath id={clipLeft}><rect x="0" y="0" width="38" height="100" /></clipPath>
      </defs>

      <rect x="6" y="6" width="88" height="88" rx="18" fill="var(--primary-wash)" stroke="var(--line)" strokeWidth="1.5" />

      {/* Shirt, split into three foldable panels. Painted mid -> right ->
          left so each flap lands visibly on top of the one it folds over. */}
      <g className="li-fold-mid" clipPath={`url(#${clipMid})`}>
        <use href={`#${body}`} /><use href={`#${collar}`} />
      </g>
      <g className="li-fold-right" clipPath={`url(#${clipRight})`}>
        <use href={`#${body}`} /><use href={`#${collar}`} />
      </g>
      <g className="li-fold-left" clipPath={`url(#${clipLeft})`}>
        <use href={`#${body}`} /><use href={`#${collar}`} />
      </g>

      {/* Splattered stain: one irregular blob plus scattered droplets. */}
      <g className="li-stain" fill="#a9754a">
        <path d="M50,48.5 C53.5,48.3 56.5,50.8 56.2,54.2 C56,57.6 53.4,60.3 49.8,60 C46.4,59.7 43.9,57 44.3,53.6 C44.6,51 47,48.7 50,48.5 Z" />
        <ellipse cx="42.5" cy="49.5" rx="2.3" ry="1.6" transform="rotate(-25 42.5 49.5)" />
        <ellipse cx="58" cy="51" rx="1.9" ry="1.3" transform="rotate(20 58 51)" />
        <ellipse cx="53.5" cy="61.5" rx="1.7" ry="1.2" transform="rotate(50 53.5 61.5)" />
        <circle cx="45.5" cy="58.5" r="1" />
        <circle cx="59.5" cy="56" r="0.8" />
      </g>

      {/* Soap sweeps diagonally (bottom-left to top-right) across the stain. */}
      <g className="li-soap">
        <circle cx="50" cy="54" r="6" fill="#eef7ff" stroke="#bfe0f5" strokeWidth="1.4" />
        <circle cx="44" cy="48" r="2.2" fill="#eef7ff" stroke="#bfe0f5" strokeWidth="1" />
        <circle cx="57" cy="49" r="1.6" fill="#eef7ff" stroke="#bfe0f5" strokeWidth="1" />
      </g>

      {/* Sparkle burst once the stain is gone, before the iron comes in. */}
      <g className="li-sparkle" fill="#bfe0f5">
        <path transform="translate(31,34) rotate(-10) scale(1.1)" d="M0,-4.2 C0.6,-1.3 1.3,-0.6 4.2,0 C1.3,0.6 0.6,1.3 0,4.2 C-0.6,1.3 -1.3,0.6 -4.2,0 C-1.3,-0.6 -0.6,-1.3 0,-4.2 Z" />
        <path transform="translate(69,33) rotate(18)" d="M0,-4.2 C0.6,-1.3 1.3,-0.6 4.2,0 C1.3,0.6 0.6,1.3 0,4.2 C-0.6,1.3 -1.3,0.6 -4.2,0 C-1.3,-0.6 -0.6,-1.3 0,-4.2 Z" />
        <path transform="translate(63,66) rotate(-30) scale(.8)" d="M0,-4.2 C0.6,-1.3 1.3,-0.6 4.2,0 C1.3,0.6 0.6,1.3 0,4.2 C-0.6,1.3 -1.3,0.6 -4.2,0 C-1.3,-0.6 -0.6,-1.3 0,-4.2 Z" />
      </g>

      <g className="li-iron">
        <path
          d="M38,42 L62,42 Q66,42 66,46 L64,50 Q50,54 36,50 L34,46 Q34,42 38,42 Z"
          fill="#7c8794"
          stroke="#5b6673"
          strokeWidth="1.2"
        />
        <path d="M44,42 Q50,32 56,42" fill="none" stroke="#5b6673" strokeWidth="2.4" strokeLinecap="round" />
      </g>
    </svg>
  )
}
