/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: { position: 'top-right' },
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
