/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: {postion: "bottom-right"},
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
