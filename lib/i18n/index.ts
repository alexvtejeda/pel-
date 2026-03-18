import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import esCommon from '@/public/locales/es/common.json'
import esLanding from '@/public/locales/es/landing.json'
import esAuth from '@/public/locales/es/auth.json'
import esPets from '@/public/locales/es/pets.json'
import esTransport from '@/public/locales/es/transport.json'
import enCommon from '@/public/locales/en/common.json'
import enLanding from '@/public/locales/en/landing.json'
import enAuth from '@/public/locales/en/auth.json'
import enPets from '@/public/locales/en/pets.json'
import enTransport from '@/public/locales/en/transport.json'

i18n
  .use(initReactI18next)
  .init({
    lng: 'es', // fixed SSR language — I18nProvider detects and switches after mount
    fallbackLng: 'es',
    supportedLngs: ['es', 'en'],
    defaultNS: 'common',
    resources: {
      es: { common: esCommon, landing: esLanding, auth: esAuth, pets: esPets, transport: esTransport },
      en: { common: enCommon, landing: enLanding, auth: enAuth, pets: enPets, transport: enTransport },
    },
    interpolation: { escapeValue: false },
  })

export default i18n
