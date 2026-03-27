'use client'

interface LogoMarqueeProps {
  logos: { src: string; alt: string }[]
  logoHeight?: number
  gap?: number
  className?: string
}

export function LogoMarquee({ logos, logoHeight = 24, gap = 48, className }: LogoMarqueeProps) {
  return (
    <div className="overflow-hidden" role="region" aria-label="Partner logos">
      <div
        className="flex w-max animate-marquee"
        style={{ gap: `${gap}px` }}
      >
        {/* Two copies for seamless loop */}
        {[0, 1].map(copy => (
          <div key={copy} className="flex shrink-0" style={{ gap: `${gap}px` }} aria-hidden={copy > 0}>
            {logos.map((logo, i) => (
              <img
                key={`${copy}-${i}`}
                src={logo.src}
                alt={copy === 0 ? logo.alt : ''}
                className={className}
                style={{ height: `${logoHeight}px`, width: 'auto' }}
                loading="lazy"
                draggable={false}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
