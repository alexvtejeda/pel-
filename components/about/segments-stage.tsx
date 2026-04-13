'use client'

import Image from 'next/image'
import { EMPATHY_SEGMENTS, QUADRANT_ORDER } from '@/lib/about/empathy-content'
import styles from './segments-stage.module.css'

export function SegmentsStage() {
  return (
    <section data-scene="04-segments" className={styles.scene}>
      <div className={styles.bgStack}>
        {EMPATHY_SEGMENTS.map((seg, i) => (
          <div
            key={seg.id}
            data-bg={seg.id}
            className={styles.bgLayer}
            style={{
              backgroundColor: seg.colorVar,
              // Segment A is the initial full-coverage layer; B and C start hidden.
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
