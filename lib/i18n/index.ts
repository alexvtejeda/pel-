import { createInstance, type i18n as I18nInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from './language'

import esCommon from '@/public/locales/es/common.json'
import esLanding from '@/public/locales/es/landing.json'
import esAuth from '@/public/locales/es/auth.json'
import esPets from '@/public/locales/es/pets.json'
import esTransport from '@/public/locales/es/transport.json'
import esBusiness from '@/public/locales/es/business.json'
import enCommon from '@/public/locales/en/common.json'
import enLanding from '@/public/locales/en/landing.json'
import enAuth from '@/public/locales/en/auth.json'
import enPets from '@/public/locales/en/pets.json'
import enTransport from '@/public/locales/en/transport.json'
import enBusiness from '@/public/locales/en/business.json'

const resources = {
  es: { common: esCommon, landing: esLanding, auth: esAuth, pets: esPets, transport: esTransport, business: esBusiness },
  en: { common: enCommon, landing: enLanding, auth: enAuth, pets: enPets, transport: enTransport, business: enBusiness },
}

const instances = new Map<SupportedLanguage, I18nInstance>()

/**
 * One immutable i18n instance per locale, memoised.
 *
 * WHY A FACTORY AND NOT A SINGLETON — read before changing this.
 * The old singleton was pinned to `lng: 'es'` and switched at runtime with
 * `changeLanguage()` from an effect. Under `output: 'export'` the HTML is built
 * in exactly one language, so that switch made the client disagree with the
 * markup — and inside a `<Suspense>` boundary, which React hydrates *after*
 * root effects have already run, the disagreement landed mid-hydration and
 * surfaced as a hydration mismatch.
 *
 * The locale now comes from the `[lang]` route segment, so the server and the
 * client read it from the same source and cannot drift. Each instance is
 * created at a fixed language and is never mutated: there is no
 * `changeLanguage()` anywhere in the render path, by design. Switching language
 * is a *navigation* (see `LanguageSwitcher`), not a mutation.
 *
 * Both instances coexist during the build so `es` and `en` can be prerendered
 * in the same pass without racing a shared global.
 */
export function getI18n(lang: SupportedLanguage): I18nInstance {
  const cached = instances.get(lang)
  if (cached) return cached

  const instance = createInstance()
  // Synchronous: resources are bundled, there is no backend to await, so the
  // instance is usable on the line after this one. Callers rely on that.
  instance.use(initReactI18next).init({
    lng: lang,
    fallbackLng: 'es',
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    defaultNS: 'common',
    resources,
    interpolation: { escapeValue: false },
  })

  instances.set(lang, instance)
  return instance
}
