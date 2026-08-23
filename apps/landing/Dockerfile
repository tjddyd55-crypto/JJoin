# JJOIN public landing — isolated from API nixpacks at repo root
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @jjoin/landing build

FROM node:22-alpine AS run
WORKDIR /app
RUN npm install -g serve@14.2.4
COPY --from=build /app/apps/landing/dist ./dist
ENV PORT=3000
EXPOSE 3000
CMD ["sh", "-c", "serve dist -s -l ${PORT}"]
