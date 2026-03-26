'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, PanInfo, useMotionValue, useTransform } from 'motion/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faQuoteLeft } from '@fortawesome/free-solid-svg-icons'

export interface Testimonial {
  id: number
  quote: string
  name: string
  role: string
}

interface TestimonialCarouselProps {
  items: Testimonial[]
  baseWidth?: number
  autoplay?: boolean
  autoplayDelay?: number
  pauseOnHover?: boolean
}

const DRAG_BUFFER = 0
const VELOCITY_THRESHOLD = 500
const GAP = 16
const SPRING_OPTIONS = { type: 'spring' as const, stiffness: 300, damping: 30 }

const CENTER_HEIGHT = 260
const SIDE_HEIGHT = 210

interface CardProps {
  item: Testimonial
  index: number
  itemWidth: number
  trackItemOffset: number
  centerOffset: number
  x: any
  transition: any
}

function TestimonialCard({ item, index, itemWidth, trackItemOffset, centerOffset, x, transition }: CardProps) {
  // Range accounts for centerOffset so the active card (at its animate position) gets center values
  const range = [
    centerOffset - (index + 1) * trackItemOffset,
    centerOffset - index * trackItemOffset,
    centerOffset - (index - 1) * trackItemOffset,
  ]

  const rotateY = useTransform(x, range, [12, 0, -12], { clamp: true })
  const scale = useTransform(x, range, [0.88, 1, 0.88], { clamp: true })
  const opacity = useTransform(x, range, [0.5, 1, 0.5], { clamp: true })
  const height = useTransform(x, range, [SIDE_HEIGHT, CENTER_HEIGHT, SIDE_HEIGHT], { clamp: true })
  const borderOpacity = useTransform(x, range, [0, 0.05, 0], { clamp: true })
  const shadowOpacity = useTransform(x, range, [0, 0.2, 0], { clamp: true })

  return (
    <motion.div
      className="relative shrink-0 flex flex-col justify-between bg-card border border-border rounded-2xl p-7 cursor-grab active:cursor-grabbing overflow-hidden"
      style={{
        width: itemWidth,
        height,
        rotateY,
        scale,
        opacity,
        // pop-550 raw value — useTransform can't reference CSS vars; sync with --color-pop-550 in globals.css
        borderColor: useTransform(borderOpacity, v => `oklch(0.7328 0.121 208.76 / ${v})`),
        boxShadow: useTransform(shadowOpacity, v => `0 0 30px oklch(0.7328 0.121 208.76 / ${v})`),
      }}
      transition={transition}
    >
      <FontAwesomeIcon icon={faQuoteLeft} className="text-2xl text-pop-550/70" />
      <p className="text-sm text-muted-foreground leading-relaxed mt-3 flex-1">
        {item.quote}
      </p>
      <div className="flex items-center gap-2 mt-4">
        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
          {item.name.charAt(0)}
        </div>
        <div>
          <div className="text-xs font-medium text-foreground">{item.name}</div>
          <div className="text-[10px] text-muted-foreground">{item.role}</div>
        </div>
      </div>
    </motion.div>
  )
}

export function TestimonialCarousel({
  items,
  baseWidth = 600,
  autoplay = true,
  autoplayDelay = 4000,
  pauseOnHover = true,
}: TestimonialCarouselProps) {
  const containerPadding = 16
  const itemWidth = Math.round((baseWidth - containerPadding * 2) / 2.4)
  const trackItemOffset = itemWidth + GAP
  // Offset so the active card sits centered in the container
  const centerOffset = Math.round((baseWidth - itemWidth) / 2)

  // Clone 2 items on each side so 3 visible cards always have neighbors
  const CLONES = 2
  const itemsForRender = useMemo(() => {
    if (items.length === 0) return []
    return [
      items[items.length - 2], items[items.length - 1],
      ...items,
      items[0], items[1],
    ]
  }, [items])

  const [position, setPosition] = useState(CLONES)
  const x = useMotionValue(0)
  const [isHovered, setIsHovered] = useState(false)
  const [isJumping, setIsJumping] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pauseOnHover || !containerRef.current) return
    const container = containerRef.current
    const enter = () => setIsHovered(true)
    const leave = () => setIsHovered(false)
    container.addEventListener('mouseenter', enter)
    container.addEventListener('mouseleave', leave)
    return () => {
      container.removeEventListener('mouseenter', enter)
      container.removeEventListener('mouseleave', leave)
    }
  }, [pauseOnHover])

  useEffect(() => {
    if (!autoplay || itemsForRender.length <= 1) return
    if (pauseOnHover && isHovered) return

    const timer = setInterval(() => {
      setPosition(prev => Math.min(prev + 1, itemsForRender.length - 1))
    }, autoplayDelay)

    return () => clearInterval(timer)
  }, [autoplay, autoplayDelay, isHovered, pauseOnHover, itemsForRender.length])

  useEffect(() => {
    setPosition(CLONES)
    x.set(centerOffset - CLONES * trackItemOffset)
  }, [items.length, trackItemOffset, centerOffset, x])

  const effectiveTransition = isJumping ? { duration: 0 } : SPRING_OPTIONS

  const handleAnimationComplete = () => {
    if (itemsForRender.length <= 1) { setIsAnimating(false); return }

    // Jump when we've scrolled into the clone zone
    const lastReal = CLONES + items.length - 1 // last real item index in itemsForRender
    if (position > lastReal) {
      setIsJumping(true)
      const target = CLONES + (position - lastReal - 1)
      setPosition(target)
      x.set(centerOffset - target * trackItemOffset)
      requestAnimationFrame(() => { setIsJumping(false); setIsAnimating(false) })
      return
    }
    if (position < CLONES) {
      setIsJumping(true)
      const target = lastReal - (CLONES - 1 - position)
      setPosition(target)
      x.set(centerOffset - target * trackItemOffset)
      requestAnimationFrame(() => { setIsJumping(false); setIsAnimating(false) })
      return
    }
    setIsAnimating(false)
  }

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info
    const direction =
      offset.x < -DRAG_BUFFER || velocity.x < -VELOCITY_THRESHOLD ? 1
        : offset.x > DRAG_BUFFER || velocity.x > VELOCITY_THRESHOLD ? -1
          : 0
    if (direction === 0) return
    setPosition(prev => {
      const next = prev + direction
      return Math.max(0, Math.min(next, itemsForRender.length - 1))
    })
  }

  const activeIndex = items.length === 0 ? 0 : (position - CLONES + items.length) % items.length

  return (
    <div className="flex flex-col items-end">
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl"
        style={{ width: `${baseWidth}px`, height: CENTER_HEIGHT, perspective: 1000, perspectiveOrigin: '50% 50%' }}
      >
        <motion.div
          className="flex items-center"
          drag={isAnimating ? false : 'x'}
          style={{
            gap: `${GAP}px`,
            x,
          }}
          onDragEnd={handleDragEnd}
          animate={{ x: centerOffset - (position * trackItemOffset) }}
          transition={effectiveTransition}
          onAnimationStart={() => setIsAnimating(true)}
          onAnimationComplete={handleAnimationComplete}
        >
          {itemsForRender.map((item, index) => (
            <TestimonialCard
              key={`${item.id}-${index}`}
              item={item}
              index={index}
              itemWidth={itemWidth}
              trackItemOffset={trackItemOffset}
              centerOffset={centerOffset}
              x={x}
              transition={effectiveTransition}
            />
          ))}
        </motion.div>
      </div>

      {/* Dot indicators */}
      <div className="flex gap-1.5 mt-4 mr-4">
        {items.map((_, index) => (
          <motion.div
            key={index}
            className={`h-2 w-2 rounded-full cursor-pointer transition-colors duration-550 ${
              activeIndex === index ? 'bg-pop-550' : 'bg-muted-foreground/30'
            }`}
            animate={{ scale: activeIndex === index ? 1.2 : 1 }}
            onClick={() => setPosition(index + CLONES)}
            transition={{ duration: 0.15 }}
          />
        ))}
      </div>
    </div>
  )
}
