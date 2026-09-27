# ---------- To-Do List app image ----------
# Small, official Node.js LTS image based on Alpine Linux
FROM node:20-alpine

# Run in production mode; the app listens on PORT (default 3000)
ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

# Copy only the package files first so Docker can cache the
# "npm ci" layer and skip reinstalling when only source code changes
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy the application source
COPY server.js ./
COPY public ./public

# Do not run as root inside the container
USER node

EXPOSE 3000

# Docker marks the container "healthy" once /health responds
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" > /dev/null || exit 1

CMD ["node", "server.js"]
