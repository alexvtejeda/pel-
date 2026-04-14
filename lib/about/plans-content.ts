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
    priceIntro: 'Gratis 2 meses',
    priceRegular: 'luego RD$2,499/mes',
    transports: '1 transporte / mes',
    support: 'Soporte email',
    highlight: 'Cero barrera de entrada',
  },
  {
    id: 'intermedio',
    name: 'Intermedio',
    priceIntro: 'RD$2,999/mes',
    priceRegular: 'regular RD$4,999',
    transports: '3 transportes / mes',
    support: 'Chat prioritario',
    highlight: 'Perfil destacado',
  },
  {
    id: 'premium',
    name: 'Premium',
    priceIntro: 'RD$5,999/mes',
    priceRegular: 'regular RD$8,999',
    transports: '5 transportes / mes',
    support: 'Soporte 24/7',
    highlight: 'Perfil verificado',
  },
  {
    id: 'flexible',
    name: 'Flexible',
    priceIntro: 'Pago por uso',
    priceRegular: '%10 de descuento por reserva',
    transports: 'Por demanda',
    support: 'Soporte email',
    highlight: 'Sin compromiso',
  },
]
