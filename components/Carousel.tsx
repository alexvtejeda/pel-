'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'motion/react';
import React, { JSX } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPause, faPlay, faFileLines, faCircle, faLayerGroup, faTableCellsLarge, faCode } from '@fortawesome/free-solid-svg-icons';
export interface CarouselItem {
  title: string;
  description: string;
  id: number;
  icon: React.ReactNode;
  image?: string;
  /**
   * Alt text for `image`. Separate from `title` because `title` also renders as
   * a visible caption bar over the photo — callers that only want the image
   * named for screen readers set `alt` and leave `title` empty.
   */
  alt?: string;
}

export interface CarouselProps {
  items?: CarouselItem[];
  baseWidth?: number;
  autoplay?: boolean;
  autoplayDelay?: number;
  pauseOnHover?: boolean;
  loop?: boolean;
  round?: boolean;
  className?: string;
  containerPadding?: number;
  dotsOverlay?: boolean;
  showPauseButton?: boolean;
  /**
   * Drops the per-slide `rounded-xl`. Opt-in: the detail sheet is the only
   * caller whose carousel sits flush against a square-cornered panel, where
   * the rounded slide lets the panel's background show through the corners.
   */
  flushItems?: boolean;
  /**
   * Commits a drag to the axis it starts on. Opt-in: only matters inside a
   * vertical scroll container (the mobile feed), where an unlocked `drag="x"`
   * captures diagonal gestures that belong to the page scroll.
   */
  dragDirectionLock?: boolean;
  /**
   * Accessible name for dot `n` of `total` (1-based). Defaults to a locale-free
   * "n / total" — this is a UI primitive and must not depend on an i18n
   * namespace to be usable.
   */
  dotLabel?: (n: number, total: number) => string;
  /**
   * Accessible name for the dot row itself, which is a `role="group"` so a
   * screen-reader user can skip past the dots instead of tabbing every one of
   * them. Same seam as `dotLabel`: the caller owns the wording, because this is
   * a UI primitive with no i18n namespace of its own. An unnamed group is not
   * announced by most screen readers, so callers should pass this.
   */
  dotsGroupLabel?: string;
}

const DEFAULT_ITEMS: CarouselItem[] = [
  {
    title: 'Text Animations',
    description: 'Cool text animations for your projects.',
    id: 1,
    icon: <FontAwesomeIcon icon={faFileLines} className="text-base text-white" />
  },
  {
    title: 'Animations',
    description: 'Smooth animations for your projects.',
    id: 2,
    icon: <FontAwesomeIcon icon={faCircle} className="text-base text-white" />
  },
  {
    title: 'Components',
    description: 'Reusable components for your projects.',
    id: 3,
    icon: <FontAwesomeIcon icon={faLayerGroup} className="text-base text-white" />
  },
  {
    title: 'Backgrounds',
    description: 'Beautiful backgrounds and patterns for your projects.',
    id: 4,
    icon: <FontAwesomeIcon icon={faTableCellsLarge} className="text-base text-white" />
  },
  {
    title: 'Common UI',
    description: 'Common UI components are coming soon!',
    id: 5,
    icon: <FontAwesomeIcon icon={faCode} className="text-base text-white" />
  }
];

const DRAG_BUFFER = 0;
const VELOCITY_THRESHOLD = 500;
const GAP = 16;
const SPRING_OPTIONS = { type: 'spring' as const, stiffness: 300, damping: 30 };

interface CarouselItemProps {
  item: CarouselItem;
  index: number;
  itemWidth: number;
  round: boolean;
  trackItemOffset: number;
  x: any;
  transition: any;
  flushItems: boolean;
}

function CarouselItem({ item, index, itemWidth, round, trackItemOffset, x, transition, flushItems }: CarouselItemProps) {
  const range = [-(index + 1) * trackItemOffset, -index * trackItemOffset, -(index - 1) * trackItemOffset];
  const outputRange = [90, 0, -90];
  const rotateY = useTransform(x, range, outputRange, { clamp: false });

  if (item.image) {
    return (
      <motion.div
        key={`${item?.id ?? index}-${index}`}
        className={`relative shrink-0 overflow-hidden ${flushItems ? '' : 'rounded-xl'} cursor-grab active:cursor-grabbing`}
        style={{ width: itemWidth, height: itemWidth, rotateY }}
        transition={transition}
      >
        <img src={item.image} alt={item.alt ?? item.title} className="w-full h-full object-cover" draggable="false" />
        {item.title && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-3 py-2">
            <p className="text-xs text-white truncate">{item.title}</p>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      key={`${item?.id ?? index}-${index}`}
      className={`relative shrink-0 flex flex-col ${
        round
          ? 'items-center justify-center text-center bg-background border-0'
          : 'items-start justify-between bg-card border border-border rounded-xl'
      } overflow-hidden cursor-grab active:cursor-grabbing`}
      style={{
        width: itemWidth,
        height: round ? itemWidth : '100%',
        rotateY: rotateY,
        ...(round && { borderRadius: '50%' })
      }}
      transition={transition}
    >
      <div className={`${round ? 'p-0 m-0' : 'mb-4 p-5'}`}>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-background">
          {item.icon}
        </span>
      </div>
      <div className="p-5">
        <div className="mb-1 font-black text-lg text-white">{item.title}</div>
        <p className="text-sm text-white">{item.description}</p>
      </div>
    </motion.div>
  );
}

export default function Carousel({
  items = DEFAULT_ITEMS,
  baseWidth = 500,
  autoplay = false,
  autoplayDelay = 3000,
  pauseOnHover = false,
  loop = false,
  round = false,
  className,
  containerPadding = 16,
  dotsOverlay = false,
  showPauseButton = false,
  flushItems = false,
  dragDirectionLock = false,
  dotLabel,
  dotsGroupLabel,
}: CarouselProps): JSX.Element {
  const itemWidth = baseWidth - containerPadding * 2;
  const trackItemOffset = itemWidth + GAP;
  const itemsForRender = useMemo(() => {
    if (!loop) return items;
    if (items.length === 0) return [];
    return [items[items.length - 1], ...items, items[0]];
  }, [items, loop]);

  const [position, setPosition] = useState<number>(loop ? 1 : 0);
  const x = useMotionValue(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isJumping, setIsJumping] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [paused, setPaused] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (pauseOnHover && containerRef.current) {
      const container = containerRef.current;
      const handleMouseEnter = () => setIsHovered(true);
      const handleMouseLeave = () => setIsHovered(false);
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);
      return () => {
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, [pauseOnHover]);

  useEffect(() => {
    if (!autoplay || itemsForRender.length <= 1) return undefined;
    if (paused) return undefined;
    if (pauseOnHover && isHovered) return undefined;

    const timer = setInterval(() => {
      setPosition(prev => Math.min(prev + 1, itemsForRender.length - 1));
    }, autoplayDelay);

    return () => clearInterval(timer);
  }, [autoplay, autoplayDelay, isHovered, pauseOnHover, paused, itemsForRender.length]);

  useEffect(() => {
    const startingPosition = loop ? 1 : 0;
    setPosition(startingPosition);
    x.set(-startingPosition * trackItemOffset);
  }, [items.length, loop, trackItemOffset, x]);

  useEffect(() => {
    if (!loop && position > itemsForRender.length - 1) {
      setPosition(Math.max(0, itemsForRender.length - 1));
    }
  }, [itemsForRender.length, loop, position]);

  const effectiveTransition = isJumping ? { duration: 0 } : SPRING_OPTIONS;

  const handleAnimationStart = () => {
    setIsAnimating(true);
  };

  const handleAnimationComplete = () => {
    if (!loop || itemsForRender.length <= 1) {
      setIsAnimating(false);
      return;
    }
    const lastCloneIndex = itemsForRender.length - 1;

    if (position === lastCloneIndex) {
      setIsJumping(true);
      const target = 1;
      setPosition(target);
      x.set(-target * trackItemOffset);
      requestAnimationFrame(() => {
        setIsJumping(false);
        setIsAnimating(false);
      });
      return;
    }

    if (position === 0) {
      setIsJumping(true);
      const target = items.length;
      setPosition(target);
      x.set(-target * trackItemOffset);
      requestAnimationFrame(() => {
        setIsJumping(false);
        setIsAnimating(false);
      });
      return;
    }

    setIsAnimating(false);
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo): void => {
    const { offset, velocity } = info;
    const direction =
      offset.x < -DRAG_BUFFER || velocity.x < -VELOCITY_THRESHOLD
        ? 1
        : offset.x > DRAG_BUFFER || velocity.x > VELOCITY_THRESHOLD
          ? -1
          : 0;

    if (direction === 0) return;

    setPosition(prev => {
      const next = prev + direction;
      const max = itemsForRender.length - 1;
      return Math.max(0, Math.min(next, max));
    });
  };

  const dragProps = loop
    ? {}
    : {
        dragConstraints: {
          left: -trackItemOffset * Math.max(itemsForRender.length - 1, 0),
          right: 0
        }
      };

  const activeIndex =
    items.length === 0 ? 0 : loop ? (position - 1 + items.length) % items.length : Math.min(position, items.length - 1);

  return (
    <div
      ref={containerRef}
      className={className ?? `relative overflow-hidden p-4 ${
        round ? 'rounded-full border border-background' : 'rounded-3xl border border-foreground'
      }`}
      style={{
        width: `${baseWidth}px`,
        ...(round && { height: `${baseWidth}px` })
      }}
    >
      <motion.div
        className="flex"
        drag={isAnimating ? false : 'x'}
        dragDirectionLock={dragDirectionLock}
        {...dragProps}
        style={{
          width: itemWidth,
          gap: `${GAP}px`,
          perspective: 1000,
          perspectiveOrigin: `${position * trackItemOffset + itemWidth / 2}px 50%`,
          x
        }}
        onDragEnd={handleDragEnd}
        animate={{ x: -(position * trackItemOffset) }}
        transition={effectiveTransition}
        onAnimationStart={handleAnimationStart}
        onAnimationComplete={handleAnimationComplete}
      >
        {itemsForRender.map((item, index) => (
          <CarouselItem
            key={`${item?.id ?? index}-${index}`}
            item={item}
            index={index}
            itemWidth={itemWidth}
            round={round}
            trackItemOffset={trackItemOffset}
            x={x}
            transition={effectiveTransition}
            flushItems={flushItems}
          />
        ))}
      </motion.div>
      {/* One photo needs no dots, and an ungated map would leave a focusable
          "1 / 1" button that moves nothing on every single-photo card. */}
      {items.length > 1 && (
        /* `pointer-events-none` here and on the row, `pointer-events-auto` on
           each button. The row is a sibling of the drag track and spans the full
           width, so once the buttons grew to 44px tall it swallowed `pointerdown`
           across the whole photo from 12px to 56px off the bottom — the band a
           thumb rests on — and Motion's drag never started. Only the 44x44 boxes
           should be deaf to the swipe. */
        <div className={`pointer-events-none flex w-full justify-center ${round || dotsOverlay ? 'absolute z-20 bottom-3 left-1/2 -translate-x-1/2' : ''}`}>
          {/* Sized to its content, not a fixed w-37.5, which cramped at 5+ photos. */}
          <div
            role="group"
            aria-label={dotsGroupLabel}
            className={`pointer-events-none flex items-end justify-center ${dotsOverlay ? '' : 'mt-4'}`}
          >
            {items.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={dotLabel ? dotLabel(index + 1, items.length) : `${index + 1} / ${items.length}`}
                aria-current={activeIndex === index ? 'true' : undefined}
                onClick={() => setPosition(loop ? index + 1 : index)}
                /* 44x44, `shrink-0` so a narrow card cannot compress the target
                   back below the minimum. `items-end` pins the dot to the button's
                   bottom edge, which preserves the old row's vertical placement
                   exactly — the target grows upward rather than moving the dot.
                   The horizontal spread did change, deliberately (spec §5): the old
                   `w-37.5` + `px-8` + `justify-between` held the outer dots at ±39px
                   from centre for every N, so centres sat 78/39/26/19.5px apart at
                   2/3/4/5 photos, while abutting 44px boxes give a constant 44px.
                   The row does not wrap or shrink, so it needs N*44px of width:
                   fine in the 351px feed card up to 7 dots, but it overflows a
                   two-column mobile grid card (~163px) from 4 dots on, and the
                   carousel's own overflow-hidden clips the outer dots. Clients cap
                   uploads at 5; server-side that is enforced only for member pets
                   (userpets.maxPhotosPerPet = 5) — rescue-centre pets allow 20. */
                className="focus-ring pointer-events-auto flex h-11 w-11 shrink-0 items-end justify-center"
              >
                <motion.span
                  className={`block h-2 w-2 rounded-full transition-colors duration-150 ${
                    activeIndex === index
                      ? round || dotsOverlay
                        ? 'bg-background'
                        : 'bg-foreground'
                      : round || dotsOverlay
                        ? 'bg-background/50'
                        : 'bg-foreground/40'
                  }`}
                  animate={{ scale: activeIndex === index ? 1.2 : 1 }}
                  transition={{ duration: 0.15 }}
                />
              </button>
            ))}
          </div>
        </div>
      )}
      {showPauseButton && items.length > 1 && (
        <button
          type="button"
          onClick={() => setPaused(p => !p)}
          className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
        >
          <FontAwesomeIcon
            icon={paused ? faPlay : faPause}
            className="text-white text-xs"
          />
        </button>
      )}
    </div>
  );
}
