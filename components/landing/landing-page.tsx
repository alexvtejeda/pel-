'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight, faMagnifyingGlass, faPaw, faTruckFast } from '@fortawesome/free-solid-svg-icons'
import { PetsHeader } from '@/components/pets/pets-header'
import { Footer } from '@/components/footer'
import { LogoLoop } from '@/components/LogoLoop'
import { TestimonialCarousel, Testimonial } from '@/components/landing/testimonial-carousel'

const PARTNER_LOGOS = [
  { src: '/assets/logos/partner-1.svg', alt: 'Partner 1' },
  { src: '/assets/logos/partner-2.svg', alt: 'Partner 2' },
  { src: '/assets/logos/partner-3.svg', alt: 'Partner 3' },
  { src: '/assets/logos/partner-4.svg', alt: 'Partner 4' },
  { src: '/assets/logos/partner-5.svg', alt: 'Partner 5' },
  { src: '/assets/logos/partner-6.svg', alt: 'Partner 6'},
]

const HOW_STEPS = [
  { icon: faMagnifyingGlass, titleKey: 'how.search.title', descKey: 'how.search.description' },
  { icon: faPaw, titleKey: 'how.adopt.title', descKey: 'how.adopt.description' },
  { icon: faTruckFast, titleKey: 'how.transport.title', descKey: 'how.transport.description' },
]

export function LandingPage() {
  const { t } = useTranslation('landing')

  const testimonials: Testimonial[] = [1, 2, 3, 4, 5].map(i => ({
    id: i,
    quote: t(`testimonials.placeholder_${i}.quote`),
    name: t(`testimonials.placeholder_${i}.name`),
    role: t(`testimonials.placeholder_${i}.role`),
  }))

  return (
    <div className="min-h-screen bg-background">
      <PetsHeader />

      {/* Hero */}
      <section className="px-4 pt-12 pb-16 overflow-hidden">
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row gap-12 md:gap-8 items-center">
          {/* Left — Copy */}
          <div className="flex-1 flex flex-col items-start">
            <div className="inline-flex items-center gap-2 bg-muted border border-border rounded-full px-3 py-1.5 text-xs text-muted-foreground mb-5">
              <span className="w-2 h-2 rounded-full bg-pop-550" />
              {t('new_hero.badge')}
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4">
              {t('new_hero.title')}
            </h1>
            <p className="text-muted-foreground text-base max-w-md mb-8">
              {t('new_hero.subtitle')}
            </p>
            <div className="flex gap-3">
              <Link
                href="/pets"
                className="group inline-flex items-center gap-2 px-5 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground hover:border-muted-foreground transition-colors"
              >
                {t('new_hero.cta_pets')}
                <FontAwesomeIcon icon={faArrowRight} className="text-xs -rotate-45 group-hover:rotate-0 transition-transform duration-200" />
              </Link>
              <Link
                href="/auth/register"
                className="group inline-flex items-center gap-2 px-5 py-2.5 bg-pop-550 text-white rounded-xl text-sm font-medium hover:bg-pop-500 transition-colors"
              >
                {t('new_hero.cta_register')}
                <FontAwesomeIcon icon={faArrowRight} className="text-xs -rotate-45 group-hover:rotate-0 transition-transform duration-200" />
              </Link>
            </div>
          </div>

          {/* Right — Marquee + Carousel */}
          <div className="flex-1 flex flex-col items-center w-full md:max-w-150 md:bg-muted md:rounded-2xl md:p-8 md:inset-shadow-[0_0_5px_1px_var(--color-input)] gap-4">
            <div className="opacity-48 mb-4 md:-mx-8 md:w-[calc(100%+4rem)]">
              <LogoLoop
                logos={PARTNER_LOGOS}
                logoHeight={24}
                gap={48}
                speed={24}
                pauseOnHover
                className="[&_img]:grayscale [&_img]:brightness-75 dark:[&_img]:brightness-200 dark:[&_img]:invert"
              />
            </div>
            <TestimonialCarousel items={testimonials} />
          </div>
        </div>
      </section>

      {/* Divider */}
      <hr className="text-input"></hr>

      {/* How It Works */}
      <section className="bg-muted px-4 py-16">
        <div className="container mx-auto max-w-6xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">{t('how.title')}</h2>
          <p className="text-muted-foreground text-sm mb-10">{t('how.subtitle')}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_STEPS.map((step, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-7 text-center">
                <div className="w-12 h-12 rounded-xl bg-pop-550/10 flex items-center justify-center mx-auto mb-4">
                  <FontAwesomeIcon icon={step.icon} className="text-lg text-pop-550" />
                </div>
                <h3 className="text-base font-semibold mb-2">{t(step.titleKey)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(step.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
