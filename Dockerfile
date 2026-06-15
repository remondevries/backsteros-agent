FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json package-lock.json* bun.lock* ./
RUN bun install --ignore-scripts --frozen-lockfile || bun install --ignore-scripts
COPY . .
RUN BUILD_SHA=$(git rev-parse HEAD 2>/dev/null || echo unknown) && \
    echo "$BUILD_SHA" > /app/.app-build-sha && \
    VITE_APP_BUILD_SHA=$BUILD_SHA bun run build:web

WORKDIR /app/sidecar
# @briangaoo/totem is installed from GitHub (not on the public npm registry).
# postinstall compiles totem via bun; native deps (sqlite3, onnxruntime) need install scripts.
RUN bun install --frozen-lockfile --trust-all

FROM oven/bun:1
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/.app-build-sha ./.app-build-sha
COPY --from=build /app/sidecar ./sidecar
WORKDIR /app/sidecar
ENV SIDECAR_HOST=0.0.0.0
ENV SIDECAR_PORT=3847
ENV BACKSTER_STATIC_DIR=/app/dist
ENV PRODUCT_MODE=linear
EXPOSE 3847
CMD ["bun", "run", "src/server.ts"]
