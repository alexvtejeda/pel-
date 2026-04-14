'use client'

import { createContext, useContext, useMemo, ReactNode } from 'react'
import { motionValue, MotionValue } from 'framer-motion'

export type HeaderBridge = {
  progress: MotionValue<number>
}

const HeaderBridgeContext = createContext<HeaderBridge | null>(null)

export function HeaderBridgeProvider({ children }: { children: ReactNode }) {
  const value = useMemo<HeaderBridge>(() => ({ progress: motionValue(0) }), [])
  return <HeaderBridgeContext.Provider value={value}>{children}</HeaderBridgeContext.Provider>
}

export function useHeaderBridge(): HeaderBridge {
  const ctx = useContext(HeaderBridgeContext)
  if (!ctx) throw new Error('useHeaderBridge must be used inside HeaderBridgeProvider')
  return ctx
}
