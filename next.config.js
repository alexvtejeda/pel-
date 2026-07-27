/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: {position: 'bottom-left'},
  output: 'export',
  distDir: 'out',
  // Pin the workspace root: a stray package-lock.json in ~ outranks our bun.lock
  // and makes Next infer the wrong root.
  outputFileTracingRoot: __dirname,
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
