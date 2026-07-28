'use client'

import Link from 'next/link'
import { TransitionLink } from '@/components/transitions/transition-link'
import { useTranslation } from 'react-i18next'

export function Footer() {
  const { t } = useTranslation('landing')

  return (
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
              <li><TransitionLink href="/about" className="focus-ring hover:text-primary-foreground transition-colors">{t('footer.about')}</TransitionLink></li>
              <li><Link href="#" className="focus-ring hover:text-primary-foreground transition-colors">{t('footer.contact')}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-primary-foreground font-semibold mb-3">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="focus-ring hover:text-primary-foreground transition-colors">{t('footer.privacy')}</Link></li>
              <li><Link href="#" className="focus-ring hover:text-primary-foreground transition-colors">{t('footer.terms')}</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-border text-center text-sm">
          {t('footer.rights')}
        </div>
      </div>
    </footer>
  )
}
