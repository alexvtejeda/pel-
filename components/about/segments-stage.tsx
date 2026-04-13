'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { EMPATHY_SEGMENTS, QUADRANT_ORDER } from '@/lib/about/empathy-content'
import { useIsDesktop } from '@/lib/about/use-breakpoint'
import { useReducedMotion } from '@/lib/about/use-reduced-motion'
import styles from './segments-stage.module.css'

const BEATS_PER_SEGMENT = 6

export function SegmentsStage() {
  const sceneRef = useRef<HTMLElement>(null)
  const isDesktop = useIsDesktop()
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!isDesktop || reduced) return
    const sceneEl = sceneRef.current
    if (!sceneEl) return

    let cancelled = false
    let cleanup: (() => void) | undefined

    ;(async () => {
      const { gsap } = await import('@/lib/about/gsap-register')
      if (cancelled) return

      const segmentEls = Array.from(sceneEl.querySelectorAll('[data-segment]')) as HTMLElement[]
      const bgEls = Array.from(sceneEl.querySelectorAll('[data-bg]')) as HTMLElement[]

      // Compute char-center as "X% Y%" string relative to the scene root.
      const getCharCenter = (segmentEl: HTMLElement) => {
        const charEl = segmentEl.querySelector('[data-character-col]') as HTMLElement | null
        if (!charEl) return '50% 50%'
        const rect = charEl.getBoundingClientRect()
        const parentRect = sceneEl.getBoundingClientRect()
        const x = ((rect.left + rect.width / 2 - parentRect.left) / parentRect.width) * 100
        const y = ((rect.top + rect.height / 2 - parentRect.top) / parentRect.height) * 100
        return `${x}% ${y}%`
      }

      // Seed mask origins for each bg layer from its matching segment's char-center.
      segmentEls.forEach((seg, i) => {
        bgEls[i].style.setProperty('--mask-origin', getCharCenter(seg))
      })

      // Seed character positions: A visible at center, B and C off-stage right.
      gsap.set(segmentEls[0].querySelector('[data-character-col]'), { xPercent: 0 })
      gsap.set(segmentEls[1].querySelector('[data-character-col]'), { xPercent: 120 })
      gsap.set(segmentEls[2].querySelector('[data-character-col]'), { xPercent: 120 })

      // Seed segment opacity: A visible, B/C hidden until their transition.
      gsap.set(segmentEls[0], { autoAlpha: 1 })
      gsap.set(segmentEls[1], { autoAlpha: 0 })
      gsap.set(segmentEls[2], { autoAlpha: 0 })

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sceneEl,
          start: 'top top',
          end: '+=600%',
          pin: true,
          scrub: 1,
        },
      })

      // Build each segment's quadrant beats: each beat shifts by one quadrant height
      // (100 / BEATS_PER_SEGMENT % of the stack's own height).
      const addQuadrantBeats = (segIndex: number, startLabel: number) => {
        const stackEl = segmentEls[segIndex].querySelector('[data-quadrant-stack]')
        const stepPct = 100 / BEATS_PER_SEGMENT
        for (let i = 1; i < BEATS_PER_SEGMENT; i++) {
          tl.to(
            stackEl,
            { yPercent: -stepPct * i, duration: 0.6, ease: 'power2.inOut' },
            startLabel + i - 1 + 0.2,
          )
        }
      }

      // Build a segment→next transition starting at the given label.
      const addTransition = (outIndex: number, inIndex: number, startLabel: number) => {
        const outChar = segmentEls[outIndex].querySelector('[data-character-col]')
        const inChar = segmentEls[inIndex].querySelector('[data-character-col]')
        const inBg = bgEls[inIndex]

        tl.to(outChar, { xPercent: -120, duration: 0.6, ease: 'power2.in' }, startLabel)
        tl.to(segmentEls[outIndex], { autoAlpha: 0, duration: 0.3 }, startLabel + 0.3)
        tl.set(segmentEls[inIndex], { autoAlpha: 1 }, startLabel + 0.1)
        tl.fromTo(
          inChar,
          { xPercent: 120 },
          { xPercent: 0, duration: 0.6, ease: 'power2.out' },
          startLabel + 0.1,
        )
        // Custom-property tween: GSAP CSSPlugin interpolates the --mask-radius
        // string as a plain percentage. Do NOT use calc() or any non-percentage
        // value here — CSSPlugin cannot interpolate those.
        tl.to(
          inBg,
          { ['--mask-radius' as string]: '200%', duration: 1.6, ease: 'power2.out' },
          startLabel + 0.15,
        )
      }

      // Segment A beats: labels 0..5 (piensa is the starting state; beats 1..5 slide)
      addQuadrantBeats(0, 0)
      // A → B transition at label 6
      addTransition(0, 1, 6)
      // Segment B beats: labels 6..11
      addQuadrantBeats(1, 6)
      // B → C transition at label 12
      addTransition(1, 2, 12)
      // Segment C beats: labels 12..17
      addQuadrantBeats(2, 12)

      // Debounced resize: refresh char-centers and ScrollTrigger if changed.
      const prevCenters = segmentEls.map((seg) => getCharCenter(seg))
      let resizeTimer: ReturnType<typeof setTimeout> | undefined
      const onResize = () => {
        if (resizeTimer) clearTimeout(resizeTimer)
        resizeTimer = setTimeout(() => {
          let changed = false
          segmentEls.forEach((seg, i) => {
            const next = getCharCenter(seg)
            if (next !== prevCenters[i]) {
              bgEls[i].style.setProperty('--mask-origin', next)
              prevCenters[i] = next
              changed = true
            }
          })
          if (changed) tl.scrollTrigger?.refresh()
        }, 200)
      }
      window.addEventListener('resize', onResize)

      cleanup = () => {
        window.removeEventListener('resize', onResize)
        if (resizeTimer) clearTimeout(resizeTimer)
        tl.scrollTrigger?.kill()
        tl.kill()
      }
    })()

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [isDesktop, reduced])

  return (
    <section ref={sceneRef} data-scene="04-segments" className={styles.scene}>
      <div className={styles.bgStack}>
        {EMPATHY_SEGMENTS.map((seg, i) => (
          <div
            key={seg.id}
            data-bg={seg.id}
            className={styles.bgLayer}
            style={{
              backgroundColor: seg.colorVar,
              ['--mask-radius' as string]: i === 0 ? '200%' : '0%',
              ['--mask-origin' as string]: '50% 50%',
            }}
          />
        ))}
      </div>

      <header className={styles.header}>
        <p className={styles.overline}>A quién servimos</p>
        <h2 className={styles.title}>Tres segmentos, tres historias</h2>
      </header>

      {EMPATHY_SEGMENTS.map((seg) => (
        <div key={seg.id} data-segment={seg.id} className={styles.segment}>
          <div className={styles.segmentInner}>
            <div data-character-col className={styles.characterCol}>
              <p className={styles.marker}>{seg.id.toUpperCase()}</p>
              <Image
                src={seg.character}
                alt={seg.personaName}
                width={320}
                height={320}
                className={styles.character}
              />
              <p className={styles.personaName}>
                {seg.personaName}, {seg.age}
              </p>
            </div>
            <div className={styles.quadrantViewport}>
              <div data-quadrant-stack className={styles.quadrantStack}>
                {QUADRANT_ORDER.map((key) => {
                  const q = seg.quadrants[key]
                  return (
                    <div key={key} data-quadrant={key} className={styles.quadrant}>
                      <p className={styles.quadrantLabel}>{q.label}</p>
                      <p className={styles.quadrantBody}>{q.body}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  )
}
