FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json package-lock.json* bun.lock* ./
RUN bun install --frozen-lockfile || bun install
COPY . .
RUN bun run build:web

FROM oven/bun:1
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/sidecar ./sidecar
WORKDIR /app/sidecar
RUN bun install --frozen-lockfile || bun install
ENV SIDECAR_HOST=0.0.0.0
ENV SIDECAR_PORT=3847
ENV BACKSTER_STATIC_DIR=/app/dist
ENV PRODUCT_MODE=linear
EXPOSE 3847
CMD ["bun", "run", "src/server.ts"]
