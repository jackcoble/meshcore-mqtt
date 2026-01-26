# -----------------------------
# Builder
# -----------------------------
FROM node:24-alpine AS builder

# Enable pnpm via corepack
RUN corepack enable

WORKDIR /app

# Copy only files needed for dependency resolution
COPY package.json pnpm-lock.yaml ./

# Install deps (frozen for reproducibility)
RUN pnpm install --frozen-lockfile

# Copy source + configs
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN pnpm run build


# -----------------------------
# Runner
# -----------------------------
FROM node:24-alpine AS runner

WORKDIR /app

# Copy runtime deps + compiled output only
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

# Run the app
CMD ["node", "dist/src/index.js"]
