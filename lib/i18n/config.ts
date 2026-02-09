export const i18nConfig = {
  defaultLocale: 'es',
  locales: ['es', 'en'],
  namespaces: ['common', 'landing', 'auth', 'pets', 'chat', 'transport'],
} as const

export type Locale = (typeof i18nConfig.locales)[number]
export type Namespace = (typeof i18nConfig.namespaces)[number]
