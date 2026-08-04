'use client'

import Link from '@/components/locale-link'
import { TransitionLink } from '@/components/transitions/transition-link'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRight, faMagnifyingGlass, faPaw, faTruckFast } from '@fortawesome/free-solid-svg-icons'
import { Footer } from '@/components/footer'
import { FeaturedPets } from '@/components/landing/featured-pets'
import { LogoMarquee } from '@/components/landing/logo-marquee'
import { TestimonialCarousel, Testimonial } from '@/components/landing/testimonial-carousel'

/** Flip to true once real partner logos replace the placeholders. */
const SHOW_PARTNER_LOGOS = false

const HOW_STEPS = [
  { icon: faMagnifyingGlass, titleKey: 'how.search.title', descKey: 'how.search.description' },
  { icon: faPaw, titleKey: 'how.adopt.title', descKey: 'how.adopt.description' },
  { icon: faTruckFast, titleKey: 'how.transport.title', descKey: 'how.transport.description' },
]

export function LandingPage() {
  const { t } = useTranslation('landing')

  const partnerLogos = [1, 2, 3, 4, 5, 6].map((n) => ({
    src: `/assets/logos/partner-${n}.svg`,
    alt: t('partners.logo_alt', { n }),
  }))

  // Three, not five: the other two were filler. TestimonialCarousel clones two
  // items on each side for its coverflow effect, so three is the practical
  // minimum for a smooth loop.
  const testimonials: Testimonial[] = [1, 2, 3].map(i => ({
    id: i,
    quote: t(`testimonials.placeholder_${i}.quote`),
    name: t(`testimonials.placeholder_${i}.name`),
    role: t(`testimonials.placeholder_${i}.role`),
  }))

  return (
    <div data-route="home" className="min-h-screen bg-background">
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
              <TransitionLink
                href="/pets"
                className="focus-ring group inline-flex items-center gap-2 px-5 py-2.5 border border-border rounded-xl text-sm font-medium text-foreground transition-[border-color,transform] hover:border-muted-foreground active:scale-[0.98]"
              >
                {t('new_hero.cta_pets')}
                <FontAwesomeIcon icon={faArrowRight} className="text-xs -rotate-45 group-hover:rotate-0 transition-transform duration-200" />
              </TransitionLink>
              <Link
                href="/auth/register"
                className="focus-ring group inline-flex items-center gap-2 px-5 py-2.5 bg-pop-solid text-white rounded-xl text-sm font-medium transition-[background-color,transform] hover:bg-pop-850 active:scale-[0.98]"
              >
                {t('new_hero.cta_register')}
                <FontAwesomeIcon icon={faArrowRight} className="text-xs -rotate-45 group-hover:rotate-0 transition-transform duration-200" />
              </Link>
            </div>
          </div>

          {/* Right — Carousel */}
          <div className="flex w-full flex-1 flex-col items-center gap-4 md:max-w-150 md:justify-center md:rounded-2xl md:bg-muted md:p-6 md:inset-shadow-[0_0_5px_1px_var(--color-input)]">
            {/*
              Hidden until real partner logos exist (spec §4, Q2). Flip
              SHOW_PARTNER_LOGOS to true and restore the real filenames in
              partnerLogos when they do. The component and the assets are
              intentionally kept — LogoMarquee's CSS animation is the mobile
              Safari-safe replacement for LogoLoop and must not be deleted.
            */}
            {SHOW_PARTNER_LOGOS && (
              <div className="opacity-48 mb-4 md:-mx-6 md:w-[calc(100%+3rem)]">
                <LogoMarquee
                  logos={partnerLogos}
                  logoHeight={24}
                  gap={48}
                  className="grayscale brightness-75 dark:brightness-200 dark:invert"
                />
              </div>
            )}
            <div className="w-full md:-mx-6 md:w-[calc(100%+3rem)]">
              <TestimonialCarousel items={testimonials} />
            </div>
          </div>
        </div>
      </section>

      {/* Divider — an <hr> takes its colour from border-color, not text-color. */}
      <hr className="border-input" />

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

      <FeaturedPets />

      <Footer />
    </div>
  )
}
