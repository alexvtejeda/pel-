import Image from 'next/image'
import Link from 'next/link'

interface LogoProps {
  width?: number
  height?: number
  showText?: boolean
  className?: string
}

export function Logo({ width = 40, height = 40, showText = true, className = '' }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/assets/logo.svg"
        alt="Pelú"
        width={width}
        height={height}
        priority
      />
      {showText && (
        <span className="text-2xl font-bold">Pelú</span>
      )}
    </Link>
  )
}
