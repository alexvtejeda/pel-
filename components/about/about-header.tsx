'use client'

import { motion, useTransform } from 'framer-motion'
import { PetsHeader } from '@/components/pets/pets-header'
import { useHeaderBridge } from './header-bridge-context'

export function AboutHeader() {
  const { progress } = useHeaderBridge()
  const opacity = useTransform(progress, [0.6, 0.95], [0, 1])
  const y = useTransform(progress, [0.6, 0.95], [-24, 0])

  return (
    <motion.div
      style={{ opacity, y }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <PetsHeader />
    </motion.div>
  )
}
