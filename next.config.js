/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: {position: 'bottom-left'},
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
