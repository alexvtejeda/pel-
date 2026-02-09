'use client'

import Link from 'next/link'
import { Header } from './header'
import { LanguageSwitcher } from '@/components/language-switcher'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Dale un hogar a quien más lo necesita
            </h1>
            <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
              Conectamos mascotas rescatadas con familias que las aman.{' '}
              <span className="font-semibold text-slate-900">Adopción 100% gratuita.</span>
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link
                href="/auth/login"
                className="px-8 py-4 bg-slate-800 text-white rounded-xl font-medium text-lg hover:bg-slate-700 transition-colors"
              >
                Comenzar ahora
              </Link>
              <button className="px-8 py-4 bg-white border-2 border-slate-300 text-slate-800 rounded-xl font-medium text-lg hover:border-slate-400 transition-colors">
                Conoce más
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="text-center p-6 bg-slate-50 rounded-2xl">
              <div className="text-4xl font-bold text-slate-900 mb-2">2M+</div>
              <div className="text-slate-600">Animales sin hogar en RD</div>
            </div>
            <div className="text-center p-6 bg-slate-50 rounded-2xl">
              <div className="text-4xl font-bold text-slate-900 mb-2">100+</div>
              <div className="text-slate-600">Centros de rescate</div>
            </div>
            <div className="text-center p-6 bg-slate-50 rounded-2xl">
              <div className="text-4xl font-bold text-red-700 mb-2">Gratis</div>
              <div className="text-slate-600">La adopción es gratuita</div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Una crisis que necesita solución</h2>
            <p className="text-xl text-slate-600">
              República Dominicana enfrenta una sobrepoblación de animales sin hogar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="p-6 bg-white rounded-2xl">
              <div className="text-slate-900 font-semibold mb-2">
                Más de 2 millones de animales callejeros estimados en el país
              </div>
            </div>
            <div className="p-6 bg-white rounded-2xl">
              <div className="text-slate-900 font-semibold mb-2">
                Los centros de rescate operan sin apoyo estatal
              </div>
            </div>
            <div className="p-6 bg-white rounded-2xl">
              <div className="text-slate-900 font-semibold mb-2">
                Procesos de adopción complejos desalientan a adoptantes
              </div>
            </div>
          </div>

          <p className="text-center text-lg text-slate-600 max-w-4xl mx-auto">
            Los refugios de animales luchan con recursos limitados, procesos burocráticos complejos y
            costos veterinarios que impiden las adopciones. Miles de mascotas esperan un hogar mientras
            las familias encuentran barreras para adoptar.
          </p>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Pelú simplifica la adopción</h2>
            <p className="text-xl text-slate-600">
              Una plataforma diseñada para conectar, facilitar y transparentar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 bg-slate-50 rounded-2xl">
              <h3 className="text-2xl font-bold mb-3">Descubre tu compañero</h3>
              <p className="text-slate-600">
                Interfaz estilo Tinder para explorar perfiles de mascotas. Desliza, conecta y conoce a tu
                futuro amigo.
              </p>
            </div>
            <div className="p-8 bg-slate-50 rounded-2xl">
              <h3 className="text-2xl font-bold mb-3">Proceso simplificado</h3>
              <p className="text-slate-600">
                Chatea directamente con centros de rescate. Sin trámites complicados, sin intermediarios
                innecesarios.
              </p>
            </div>
            <div className="p-8 bg-slate-50 rounded-2xl">
              <h3 className="text-2xl font-bold mb-3">Transporte coordinado</h3>
              <p className="text-slate-600">
                Rastreo en tiempo real de tu mascota. Sabemos dónde está en cada momento hasta que llega
                a tu hogar.
              </p>
            </div>
            <div className="p-8 bg-slate-50 rounded-2xl">
              <h3 className="text-2xl font-bold mb-3">Apoyo continuo</h3>
              <p className="text-slate-600">
                Seguimiento post-adopción y acceso a servicios veterinarios con descuento para garantizar
                el bienestar.
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
              <h2 className="text-3xl font-bold mb-4">Para adoptantes</h2>
              <p className="text-slate-600 mb-6">Todo lo que necesitas para adoptar de forma responsable</p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-slate-700">Adopción 100% gratuita</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-slate-700">Transporte con tarifa transparente (solo pagas la logística)</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-slate-700">Opción premium con cuidado veterinario incluido</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-slate-700">Acceso a todas las mascotas de centros de rescate en un solo lugar</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-slate-700">Apoyo para adoptar mascotas con necesidades especiales</span>
                </li>
              </ul>
            </div>

            {/* For Rescue Centers */}
            <div>
              <h2 className="text-3xl font-bold mb-4">Para centros de rescate</h2>
              <p className="text-slate-600 mb-6">Más adopciones, menos carga administrativa</p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-slate-700">Registro completamente gratuito</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-slate-700">Mayor visibilidad para tus animales</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-slate-700">Porcentaje de las tarifas de transporte</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-slate-700">Reducción de carga administrativa</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-slate-700">Servicio premium opcional para gestión completa</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Transparency Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Transparencia total</h2>
            <p className="text-xl text-slate-600">Sabemos que la confianza se construye con claridad</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 bg-slate-50 rounded-2xl">
              <h3 className="text-xl font-bold mb-3">Modelo de precios</h3>
              <p className="text-slate-600">
                La adopción es siempre gratuita. Solo pagas por el transporte si decides usarlo, calculado
                en base a la distancia (9.66 RD$ por kilómetro). Sin tarifas ocultas.
              </p>
            </div>
            <div className="p-8 bg-slate-50 rounded-2xl">
              <h3 className="text-xl font-bold mb-3">Uso de datos</h3>
              <p className="text-slate-600">
                Tus datos se usan únicamente para facilitar adopciones. No compartimos información con
                terceros. Puedes eliminar tu cuenta en cualquier momento.
              </p>
            </div>
            <div className="p-8 bg-slate-50 rounded-2xl">
              <h3 className="text-xl font-bold mb-3">Nuestra misión</h3>
              <p className="text-slate-600">
                Reducir la población de animales sin hogar conectando rescatistas con adoptantes de forma
                simple, transparente y humana.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-slate-800 text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold mb-4">¿Listo para dar el siguiente paso?</h2>
          <p className="text-xl text-slate-300 mb-8">Miles de mascotas esperan un hogar. Comienza hoy.</p>
          <Link
            href="/auth/login"
            className="inline-block px-8 py-4 bg-white text-slate-800 rounded-xl font-medium text-lg hover:bg-slate-100 transition-colors"
          >
            Crear cuenta gratis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-slate-900 text-slate-400">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="text-2xl font-bold text-white mb-2">Pelú</div>
              <p className="text-sm">Conectando mascotas con familias</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Acerca de</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">Acerca de Pelú</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Contacto</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">Privacidad</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Términos</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Idioma</h4>
              <LanguageSwitcher />
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-center text-sm">
            © 2024 Pelú. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  )
}
