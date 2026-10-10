# One image for api + agent; also builds the static web bundle that Caddy serves.
FROM oven/bun:1.4.3 AS build
WORKDIR /app
COPY package.json bun.lock* ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY db/package.json db/
RUN bun install --frozen-lockfile || bun install
COPY . .
RUN bun run fetch-models && bun --cwd apps/web run build

FROM oven/bun:1.4.3
WORKDIR /app
COPY --from=build /app /app
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["bun", "apps/api/src/index.ts"]
