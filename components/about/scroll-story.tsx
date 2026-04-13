'use client'

import { useEffect } from 'react'
import { HeaderBridgeProvider } from './header-bridge-context'
import { AboutHeader } from './about-header'
import { Scene01Pitch } from './scenes/scene-01-pitch'
import { Scene02LogoDraw } from './scenes/scene-02-logo-draw'
import { Scene03Competition } from './scenes/scene-03-competition'
import { Scene04Segments } from './scenes/scene-04-segments'
import { Scene05Plans } from './scenes/scene-05-plans'
import { Scene06LeanCanvas } from './scenes/scene-06-lean-canvas'
import { Scene07Numbers } from './scenes/scene-07-numbers'
import { Scene08Cta } from './scenes/scene-08-cta'

export function ScrollStory() {
  useEffect(() => {
    let cleanup: (() => void) | undefined
    ;(async () => {
      const { registerGsap, killAllScrollTriggers } = await import('@/lib/about/gsap-register')
      registerGsap()
      cleanup = () => killAllScrollTriggers()
    })()
    return () => { cleanup?.() }
  }, [])

  return (
    <HeaderBridgeProvider>
      <AboutHeader />
      <main className="bg-background text-foreground">
        <Scene01Pitch />
        <Scene02LogoDraw />
        <Scene03Competition />
        <Scene04Segments />
        <Scene05Plans />
        <Scene06LeanCanvas />
        <Scene07Numbers />
        <Scene08Cta />
      </main>
    </HeaderBridgeProvider>
  )
}
