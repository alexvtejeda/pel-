'use client'

import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import styles from './pelu-loading-logo.module.css'

type PieceStyle = CSSProperties & Record<`--${string}`, string>

/**
 * The 7 pieces of the Pelú paw, in assembly order.
 *
 * The source assets/logo.svg also contains a flattened full-silhouette first
 * path — it is deliberately DISCARDED here. These 7 cover it to within 0.29%
 * (antialiased edges only); keeping it would assemble one solid blob.
 *
 * The 4x3px splinter shares the right wing's exact delta and delay so it
 * travels WITH the wing instead of reading as a stray speck.
 */
const PIECES: { name: string; fill: string; style: PieceStyle; d: string }[] = [
  {
    name: 'u',
    fill: 'oklch(44.6% 0.043 257.281)',
    style: { '--d': '0s', '--fromY': '70px' },
    d: 'M251.79,95.42c2.34,2.2,3.32,5.62,4.78,8.91l5.48,12.31,8.6,19.34,3.94,8.23,13.58,27.4c4.23,8.54,13.61,5.97,13.55,9.6-4.27.87-8.62.56-13.29-.62l-.14,39.26c-.1,26.7-13.87,55.13-35.86,70.74-9.01-2.89-17.96-5.77-27.55-5.48-21.34.64-41.13,11.59-49.87,31.4l-17.12.03c-9.35-20.15-27.64-30.15-49.11-31.39-9.7-.56-18.61,2.33-27.79,5.42-20.99-14.83-35.48-43.24-35.65-68.97l-.28-41.45c-4.69,1.4-9.48,2.18-13.99,1.06l.26-1.7c.21-1.36,9.21-.25,13.61-8.53l22.9-43.13,3.79-6.95c1.96-3.6,4.29-7.11,6-10.87,2.44-5.34,6.14-9.71,8.73-14.47l33.39.23.2,111.48c.01,6.84,3.49,14.97,6.78,20.15,11.07,17.42,27.99,19.27,46.29,18.54,15.73-.63,30.21-8.94,36.32-23.68,2.16-5.22,4.7-10.82,4.7-16.77l.07-109.81,37.68-.27Z',
  },
  {
    name: 'left-wing',
    fill: 'oklch(37.3% 0.034 259.733)',
    style: { '--d': '.12s', '--fromX': '-130px', '--fromY': '-30px', '--fromRot': '-16deg' },
    d: 'M86.35,95.56c-2.59,4.76-6.29,9.13-8.73,14.47-1.71,3.76-4.04,7.27-6,10.87l-3.79,6.95-22.9,43.13c-4.4,8.28-13.4,7.17-13.61,8.53l-.26,1.7c-20.75-5.15-36.15-21.03-29.49-44.53,1.62-5.7,3.29-11.26,5.85-16.51,11.23-23.04,28.45-41.82,50.27-54.84,8.95-5.34,37.72-18.09,44.73-7.2,1.15,1.8,1.25,5.53.24,7.39l-16.32,30.03Z',
  },
  {
    name: 'right-wing',
    fill: 'oklch(37.2% 0.044 257.287)',
    style: { '--d': '.12s', '--fromX': '130px', '--fromY': '-30px', '--fromRot': '16deg' },
    d: 'M268.79,61.69c.39.77,1.19,2.2,1.7,2.98.39.6,2.23-.1,2.59-.51,22.49,10.72,42.76,34.52,53.31,57.39,1.42,3.08,2.18,6.32,3.24,9.49,2.8,8.37,4.64,17.19,1.71,26.04-4.55,13.75-16.46,21.45-29.63,24.12.07-3.63-9.31-1.05-13.55-9.6l-13.58-27.4-3.94-8.23-8.6-19.34-5.48-12.31c-1.46-3.29-2.44-6.71-4.78-8.91-1.74-5.46-3.86-11.02-6.55-16.4s-8.26-15.18-4.74-19.61c5.12-6.44,22.03-.74,28.3,2.28Z',
  },
  {
    name: 'splinter',
    fill: '#314158',
    style: { '--d': '.12s', '--fromX': '130px', '--fromY': '-30px', '--fromRot': '16deg' },
    d: 'M273.08,64.16c-.36.41-2.2,1.1-2.59.51-.51-.78-1.31-2.21-1.7-2.98,1.49.72,3.05,1.58,4.29,2.47Z',
  },
  {
    name: 'tail',
    fill: 'oklch(37.2% 0.044 257.287)',
    style: { '--d': '.24s', '--fromX': '-60px', '--fromY': '80px' },
    d: 'M144.43,349.34c-4,1.83-7.2,2.84-11.59,2.84l-49.94-.04c-4.34.28-12.37-2.92-12.57-3.09-3.48-2.1-6.39-4.52-8.42-7.38,0,0-1.2-2.64-1.53-4.07-4.03-10.96,1.53-23.39,10.01-30.09,10-10.74,23.28-14.75,37.71-14.75h.64c22.34.18,41.87,14.4,45.57,36.88,1.38,8.41-2.77,16.45-9.88,19.7Z',
  },
  {
    name: 'left-pad',
    fill: 'oklch(37.2% 0.044 257.287)',
    style: { '--d': '.24s', '--fromX': '60px', '--fromY': '80px' },
    d: 'M270.21,342.94c-1.68,2.7-3.21,5.37-6.24,5.52-2.56,2.46-6.4,3.77-9.98,3.82l-25.6.34-19.6-.06c-5.14-.02-17.38-1.7-20.63-4.02-8.77-6.82-9.13-29.54.67-40.51,17.96-20.09,54.08-20.27,72.73-1.69,8.18,8.15,15.61,25.42,8.65,36.6Z',
  },
  {
    name: 'right-pad',
    fill: 'oklch(37.2% 0.044 257.287)',
    // Last piece in the stagger: this '.36s' plus --dur (0.7s) is where the
    // breathe animation's 1.06s delay in pelu-loading-logo.module.css comes
    // from. Retune the stagger and that delay has to move with it, or the
    // pulse starts before the paw has finished landing.
    style: { '--d': '.36s', '--fromX': '26px', '--fromY': '-96px', '--fromRot': '-22deg' },
    d: 'M214.09,70.11c-9.86,8.33-32.6,3.23-36-6.82-2.04-6.04,1.06-11.56,4.02-16.77,9.6-16.88,23.01-31.1,39.29-41.7,4.59-2.99,9.87-6.75,15.35-3.66,8.78,4.96-5.78,54.69-22.67,68.96Z',
  },
]

interface PeluLoadingLogoProps {
  /** Rendered height in pixels. The deck uses 184; loading contexts want ~96–120. */
  size?: number
  /** Visible + accessible loading label. Defaults to common:loading. */
  label?: string
  className?: string
}

/**
 * Full-page loading state: the Pelú paw assembles itself from its pieces, then
 * idles with a breathing pulse. Ported from pelu/decks/tesis/index.html.
 */
export function PeluLoadingLogo({ size = 112, label, className }: PeluLoadingLogoProps) {
  const { t } = useTranslation('common')
  const text = label ?? t('loading')

  return (
    <div role="status" className={cn('flex flex-col items-center justify-center gap-4', className)}>
      <svg
        viewBox="0 0 332.83 352.62"
        role="img"
        aria-label={text}
        className={styles.svg}
        style={{ height: size, width: 'auto', overflow: 'visible' }}
      >
        {PIECES.map((piece) => (
          <path key={piece.name} className={styles.piece} style={piece.style} fill={piece.fill} d={piece.d} />
        ))}
      </svg>
      {/*
        aria-hidden is load-bearing, not an oversight. The <svg> above already
        carries the accessible name via role="img" + aria-label, and this <p> is
        that same string rendered visibly. Exposing both would make the
        role="status" region announce the label twice. Removing this attribute
        is a regression, not a cleanup.
      */}
      <p className="text-sm text-muted-foreground" aria-hidden="true">
        {text}
      </p>
    </div>
  )
}
