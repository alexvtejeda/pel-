# syntax=docker/dockerfile:1

# ---- Build stage ----------------------------------------------------------
FROM oven/bun:1 AS builder

WORKDIR /app

# electron is a devDependency, and its postinstall downloads a ~150MB binary.
# The build needs devDependencies (next, tailwind, typescript) but never that
# binary — skipping it takes this layer from ~30min to under a minute.
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1

# Dependencies first so this layer caches across source-only changes.
COPY package.json bun.lock ./
# Low network concurrency + one retry: this host's WSL2 mirrored networking drops
# connections intermittently, which fails the large tarballs (next, firebase,
# @next/swc) all at once at bun's default concurrency of 48.
RUN bun install --frozen-lockfile --network-concurrency 8 \
 || bun install --frozen-lockfile --network-concurrency 4

COPY . .

# next.config.js sets output:'export', so NEXT_PUBLIC_* values are inlined into
# the generated HTML/JS at build time. Changing the API URL therefore requires a
# rebuild (--build), not just a container restart.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN bun run build

# ---- Runtime stage --------------------------------------------------------
FROM nginx:alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/out /usr/share/nginx/html

EXPOSE 3000
