'use client'

import { TransitionLink } from '@/components/transitions/transition-link'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/language-switcher'

export function Footer() {
  const { t } = useTranslation('landing')

  return (
    <footer className="pt-12 pb-24 sm:pb-12 px-4 bg-primary text-muted-foreground">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="text-2xl font-bold text-primary-foreground mb-2">Pelú</div>
            <p className="text-sm">{t('footer.tagline')}</p>
          </div>
          <div>
            <h4 className="text-primary-foreground font-semibold mb-3">{t('footer.about')}</h4>
            {/*
              The contact row is gone rather than pointing at a mailto nobody
              has confirmed receives mail. Add it back — as a real mailto or a
              /contacto route — once an inbox exists.
            */}
            <ul className="space-y-2 text-sm">
              <li>
                <TransitionLink href="/about" className="focus-ring rounded-xl transition-colors hover:text-primary-foreground">
                  {t('footer.about')}
                </TransitionLink>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-primary-foreground font-semibold mb-3">{t('legal', { ns: 'common' })}</h4>
            {/*
              No privacy or terms page exists yet. These render as plain text
              rather than href="#" links that go nowhere; turn them back into
              TransitionLinks when the pages ship.
            */}
            <ul className="space-y-2 text-sm text-muted-foreground/70">
              <li>{t('footer.privacy')}</li>
              <li>{t('footer.terms')}</li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <span>{t('footer.rights')}</span>
          <LanguageSwitcher />
        </div>
      </div>
    </footer>
  )
}
