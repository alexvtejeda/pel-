export type Plan = {
  id: 'basico' | 'intermedio' | 'premium' | 'flexible'
  name: string
  priceIntro: string
  priceRegular: string
  transports: string
  support: string
  highlight: string
}

export const PLANS: Plan[] = [
  {
    id: 'basico',
    name: 'Básico',
    priceIntro: 'Gratis 6 meses',
    priceRegular: 'luego RD$2,499/mes',
    transports: '1 transporte',
    support: 'Soporte email',
    highlight: 'Cero barrera de entrada',
  },
  {
    id: 'intermedio',
    name: 'Intermedio',
    priceIntro: 'RD$2,999/mes',
    priceRegular: 'regular RD$4,999',
    transports: '3 transportes',
    support: 'Chat prioritario',
    highlight: 'Perfil destacado',
  },
  {
    id: 'premium',
    name: 'Premium',
    priceIntro: 'RD$5,999/mes',
    priceRegular: 'regular RD$8,999',
    transports: '5 transportes',
    support: 'Soporte 24/7',
    highlight: 'Perfil verificado',
  },
  {
    id: 'flexible',
    name: 'Flexible',
    priceIntro: 'Pago por uso',
    priceRegular: 'Sin comisión 3 meses',
    transports: 'Por demanda',
    support: 'Soporte email',
    highlight: 'Sin compromiso',
  },
]
