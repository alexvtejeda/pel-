'use client'

import Link from 'next/link'
import { Header } from './header'
import { useTranslation } from 'react-i18next'

export function LandingPage() {
  const { t } = useTranslation('landing')

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              {t('hero.title')}
            </h1>
            <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
              {t('hero.subtitle')}
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link
                href="/auth/login"
                className="px-8 py-4 bg-slate-800 text-white rounded-xl font-medium text-lg hover:bg-slate-700 transition-colors"
              >
                {t('hero.cta_primary')}
              </Link>
              <button className="px-8 py-4 bg-white border-2 border-slate-300 text-slate-800 rounded-xl font-medium text-lg hover:border-slate-400 transition-colors">
                {t('hero.cta_secondary')}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="text-center p-6 bg-slate-50 rounded-2xl">
              <div className="text-4xl font-bold text-slate-900 mb-2">{t('hero.stats.stray_animals')}</div>
              <div className="text-slate-600">{t('hero.stats.stray_animals_label')}</div>
            </div>
            <div className="text-center p-6 bg-slate-50 rounded-2xl">
              <div className="text-4xl font-bold text-slate-900 mb-2">{t('hero.stats.rescue_centers')}</div>
              <div className="text-slate-600">{t('hero.stats.rescue_centers_label')}</div>
            </div>
            <div className="text-center p-6 bg-slate-50 rounded-2xl">
              <div className="text-4xl font-bold text-red-700 mb-2">{t('hero.stats.adoptions')}</div>
              <div className="text-slate-600">{t('hero.stats.adoptions_label')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">{t('problem.title')}</h2>
            <p className="text-xl text-slate-600">
              {t('problem.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="p-6 bg-white rounded-2xl">
              <div className="text-slate-900 font-semibold mb-2">
                {t('problem.stat_1')}
              </div>
            </div>
            <div className="p-6 bg-white rounded-2xl">
              <div className="text-slate-900 font-semibold mb-2">
                {t('problem.stat_2')}
              </div>
            </div>
            <div className="p-6 bg-white rounded-2xl">
              <div className="text-slate-900 font-semibold mb-2">
                {t('problem.stat_3')}
              </div>
            </div>
          </div>

          <p className="text-center text-lg text-slate-600 max-w-4xl mx-auto">
            {t('problem.description')}
          </p>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">{t('solution.title')}</h2>
            <p className="text-xl text-slate-600">
              {t('solution.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 bg-slate-50 rounded-2xl">
              <h3 className="text-2xl font-bold mb-3">{t('solution.feature_1.title')}</h3>
              <p className="text-slate-600">
                {t('solution.feature_1.description')}
              </p>
            </div>
            <div className="p-8 bg-slate-50 rounded-2xl">
              <h3 className="text-2xl font-bold mb-3">{t('solution.feature_2.title')}</h3>
              <p className="text-slate-600">
                {t('solution.feature_2.description')}
              </p>
            </div>
            <div className="p-8 bg-slate-50 rounded-2xl">
              <h3 className="text-2xl font-bold mb-3">{t('solution.feature_3.title')}</h3>
              <p className="text-slate-600">
                {t('solution.feature_3.description')}
              </p>
            </div>
            <div className="p-8 bg-slate-50 rounded-2xl">
              <h3 className="text-2xl font-bold mb-3">{t('solution.feature_4.title')}</h3>
              <p className="text-slate-600">
                {t('solution.feature_4.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* For Adopters */}
            <div>
              <h2 className="text-3xl font-bold mb-4">{t('value_adopters.title')}</h2>
              <p className="text-slate-600 mb-6">{t('value_adopters.subtitle')}</p>
              <ul className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-slate-700">{t(`value_adopters.benefit_${i}`)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* For Rescue Centers */}
            <div>
              <h2 className="text-3xl font-bold mb-4">{t('value_rescues.title')}</h2>
              <p className="text-slate-600 mb-6">{t('value_rescues.subtitle')}</p>
              <ul className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-slate-700">{t(`value_rescues.benefit_${i}`)}</span>
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
            <p className="text-xl text-slate-600">{t('transparency.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 bg-slate-50 rounded-2xl">
              <h3 className="text-xl font-bold mb-3">{t('transparency.pricing_title')}</h3>
              <p className="text-slate-600">
                {t('transparency.pricing_description')}
              </p>
            </div>
            <div className="p-8 bg-slate-50 rounded-2xl">
              <h3 className="text-xl font-bold mb-3">{t('transparency.data_title')}</h3>
              <p className="text-slate-600">
                {t('transparency.data_description')}
              </p>
            </div>
            <div className="p-8 bg-slate-50 rounded-2xl">
              <h3 className="text-xl font-bold mb-3">{t('transparency.mission_title')}</h3>
              <p className="text-slate-600">
                {t('transparency.mission_description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-slate-800 text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold mb-4">{t('cta.title')}</h2>
          <p className="text-xl text-slate-300 mb-8">{t('cta.subtitle')}</p>
          <Link
            href="/auth/login"
            className="inline-block px-8 py-4 bg-white text-slate-800 rounded-xl font-medium text-lg hover:bg-slate-100 transition-colors"
          >
            {t('cta.button')}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-slate-900 text-slate-400">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="text-2xl font-bold text-white mb-2">Pelú</div>
              <p className="text-sm">{t('footer.tagline')}</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">{t('footer.about')}</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">{t('footer.about')}</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">{t('footer.contact')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">{t('footer.privacy')}</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">{t('footer.terms')}</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-center text-sm">
            {t('footer.rights')}
          </div>
        </div>
      </footer>
    </div>
  )
}
