FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json package-lock.json* bun.lock* ./
RUN bun install --ignore-scripts --frozen-lockfile || bun install --ignore-scripts
COPY . .
RUN bun run build:web

WORKDIR /app/sidecar
# @briangaoo/totem is installed from GitHub (not on the public npm registry).
RUN bun install --frozen-lockfile --trust-all

FROM oven/bun:1
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/sidecar ./sidecar
WORKDIR /app/sidecar
ENV SIDECAR_HOST=0.0.0.0
ENV SIDECAR_PORT=3847
ENV BACKSTER_STATIC_DIR=/app/dist
ENV PRODUCT_MODE=linear
EXPOSE 3847
CMD ["bun", "run", "src/server.ts"]
