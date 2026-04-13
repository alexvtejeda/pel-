'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, useTransform } from 'framer-motion'
import { useHeaderBridge } from './header-bridge-context'

export function AboutHeader() {
  const { progress } = useHeaderBridge()
  const opacity = useTransform(progress, [0.6, 0.95], [0, 1])
  const y = useTransform(progress, [0.6, 0.95], [-24, 0])

  return (
    <motion.header
      style={{ opacity, y }}
      className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between gap-4 px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border"
    >
      <Link href="/" className="flex items-center gap-2">
        <Image src="/assets/logo.svg" alt="Pelú" width={32} height={32} />
        <span className="font-semibold text-lg">Pelú</span>
      </Link>
      <nav className="flex items-center gap-6 text-sm">
        <Link href="/pets" className="hover:text-pop-700 transition-colors">Mascotas</Link>
        <Link href="/about" className="hover:text-pop-700 transition-colors">Sobre Pelú</Link>
      </nav>
    </motion.header>
  )
}
