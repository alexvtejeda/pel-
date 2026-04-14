import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

let registered = false

export function registerGsap() {
  if (registered || typeof window === 'undefined') return
  gsap.registerPlugin(ScrollTrigger)
  registered = true
}

// Auto-register on first import in a browser context. Safe for static export
// because this module is only reached via dynamic `await import(...)` from
// client-side useEffect code — never during prerender.
if (typeof window !== 'undefined') {
  registerGsap()
}

export function killAllScrollTriggers() {
  ScrollTrigger.getAll().forEach((t) => t.kill())
}

export { gsap, ScrollTrigger }
