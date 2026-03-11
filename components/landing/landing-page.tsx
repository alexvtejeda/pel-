'use client'

import Link from 'next/link'
import { Header } from './header'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/contexts/auth-context'
import { UserRole } from '@/lib/types/user'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck } from '@fortawesome/free-solid-svg-icons'

const rolePaths: Record<UserRole, string> = {
  rescue_center: '/dashboard/rescue-center',
  adopter: '/',
  member: '/',
  business: '/',
}

export function LandingPage() {
  const { t } = useTranslation('landing')
  const { user } = useAuth()

  const ctaHref = user
    ? user.role ? rolePaths[user.role] : '/auth/role-selection'
    : '/auth/register'

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              {t('hero.title')}
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              {t('hero.subtitle')}
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link
                href={ctaHref}
                className="px-8 py-4 bg-primary text-primary-foreground rounded-xl font-medium text-lg hover:bg-primary/90 transition-colors"
              >
                {t('hero.cta_primary')}
              </Link>
              <button className="px-8 py-4 bg-accent border inset-shadow-[1px_1px_1px_var(--color-input)] text-accent-foreground rounded-xl font-medium text-lg hover:border-input hover:inset-shadow-[4px_4px_4px_var(--color-input)] transition-all">
                {t('hero.cta_secondary')}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="text-center p-6 bg-muted rounded-2xl">
              <div className="text-4xl font-bold text-foreground mb-2">{t('hero.stats.stray_animals')}</div>
              <div className="text-muted-foreground">{t('hero.stats.stray_animals_label')}</div>
            </div>
            <div className="text-center p-6 bg-muted rounded-2xl">
              <div className="text-4xl font-bold text-foreground mb-2">{t('hero.stats.rescue_centers')}</div>
              <div className="text-muted-foreground">{t('hero.stats.rescue_centers_label')}</div>
            </div>
            <div className="text-center p-6 bg-muted rounded-2xl">
              <div className="text-4xl font-bold text-pop-600 mb-2">{t('hero.stats.adoptions')}</div>
              <div className="text-muted-foreground">{t('hero.stats.adoptions_label')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-4 bg-muted">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">{t('problem.title')}</h2>
            <p className="text-xl text-muted-foreground">
              {t('problem.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="p-6 bg-card rounded-2xl">
              <div className="text-foreground font-semibold mb-2">
                {t('problem.stat_1')}
              </div>
            </div>
            <div className="p-6 bg-card rounded-2xl">
              <div className="text-foreground font-semibold mb-2">
                {t('problem.stat_2')}
              </div>
            </div>
            <div className="p-6 bg-card rounded-2xl">
              <div className="text-foreground font-semibold mb-2">
                {t('problem.stat_3')}
              </div>
            </div>
          </div>

          <p className="text-center text-lg text-muted-foreground max-w-4xl mx-auto">
            {t('problem.description')}
          </p>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">{t('solution.title')}</h2>
            <p className="text-xl text-muted-foreground">
              {t('solution.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 bg-muted rounded-2xl">
              <h3 className="text-2xl font-bold mb-3">{t('solution.feature_1.title')}</h3>
              <p className="text-muted-foreground">
                {t('solution.feature_1.description')}
              </p>
            </div>
            <div className="p-8 bg-muted rounded-2xl">
              <h3 className="text-2xl font-bold mb-3">{t('solution.feature_2.title')}</h3>
              <p className="text-muted-foreground">
                {t('solution.feature_2.description')}
              </p>
            </div>
            <div className="p-8 bg-muted rounded-2xl">
              <h3 className="text-2xl font-bold mb-3">{t('solution.feature_3.title')}</h3>
              <p className="text-muted-foreground">
                {t('solution.feature_3.description')}
              </p>
            </div>
            <div className="p-8 bg-muted rounded-2xl">
              <h3 className="text-2xl font-bold mb-3">{t('solution.feature_4.title')}</h3>
              <p className="text-muted-foreground">
                {t('solution.feature_4.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="py-20 px-4 bg-muted">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* For Adopters */}
            <div>
              <h2 className="text-3xl font-bold mb-4">{t('value_adopters.title')}</h2>
              <p className="text-muted-foreground mb-6">{t('value_adopters.subtitle')}</p>
              <ul className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <FontAwesomeIcon icon={faCheck} className="w-3 h-3 text-primary-foreground" />
                    </div>
                    <span className="text-foreground">{t(`value_adopters.benefit_${i}`)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* For Rescue Centers */}
            <div>
              <h2 className="text-3xl font-bold mb-4">{t('value_rescues.title')}</h2>
              <p className="text-muted-foreground mb-6">{t('value_rescues.subtitle')}</p>
              <ul className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <FontAwesomeIcon icon={faCheck} className="w-3 h-3 text-primary-foreground" />
                    </div>
                    <span className="text-foreground">{t(`value_rescues.benefit_${i}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Transparency Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">{t('transparency.title')}</h2>
            <p className="text-xl text-muted-foreground">{t('transparency.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 bg-muted rounded-2xl">
              <h3 className="text-xl font-bold mb-3">{t('transparency.pricing_title')}</h3>
              <p className="text-muted-foreground">
                {t('transparency.pricing_description')}
              </p>
            </div>
            <div className="p-8 bg-muted rounded-2xl">
              <h3 className="text-xl font-bold mb-3">{t('transparency.data_title')}</h3>
              <p className="text-muted-foreground">
                {t('transparency.data_description')}
              </p>
            </div>
            <div className="p-8 bg-muted rounded-2xl">
              <h3 className="text-xl font-bold mb-3">{t('transparency.mission_title')}</h3>
              <p className="text-muted-foreground">
                {t('transparency.mission_description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold mb-4">{t('cta.title')}</h2>
          <p className="text-xl text-primary-foreground/70 mb-8">{t('cta.subtitle')}</p>
          <Link
            href={ctaHref}
            className="inline-block px-8 py-4 bg-background text-primary rounded-xl font-medium text-lg hover:bg-muted transition-colors"
          >
            {t('cta.button')}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-primary text-muted-foreground">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="text-2xl font-bold text-primary-foreground mb-2">Pelú</div>
              <p className="text-sm">{t('footer.tagline')}</p>
            </div>
            <div>
              <h4 className="text-primary-foreground font-semibold mb-3">{t('footer.about')}</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-primary-foreground transition-colors">{t('footer.about')}</Link></li>
                <li><Link href="#" className="hover:text-primary-foreground transition-colors">{t('footer.contact')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-primary-foreground font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-primary-foreground transition-colors">{t('footer.privacy')}</Link></li>
                <li><Link href="#" className="hover:text-primary-foreground transition-colors">{t('footer.terms')}</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border text-center text-sm">
            {t('footer.rights')}
          </div>
        </div>
      </footer>
    </div>
  )
}
