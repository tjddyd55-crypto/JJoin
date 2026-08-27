# Build from monorepo root: docker build -f apps/landing/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/config packages/config
COPY packages/types packages/types
COPY packages/domain packages/domain
COPY apps/landing apps/landing
RUN pnpm install --frozen-lockfile
ARG VITE_API_URL=https://api-production-2d67e.up.railway.app
ARG VITE_ANDROID_DOWNLOAD_URL=
ARG VITE_ANDROID_DOWNLOAD_VERSION=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_ANDROID_DOWNLOAD_URL=$VITE_ANDROID_DOWNLOAD_URL
ENV VITE_ANDROID_DOWNLOAD_VERSION=$VITE_ANDROID_DOWNLOAD_VERSION
RUN pnpm --filter @jjoin/types build \
  && pnpm --filter @jjoin/domain build \
  && pnpm --filter @jjoin/landing build

FROM node:22-alpine AS run
WORKDIR /app
RUN npm install -g serve@14.2.4
COPY --from=build /app/apps/landing/dist ./dist
ENV PORT=3000
EXPOSE 3000
CMD ["sh", "-c", "serve dist -s -l ${PORT}"]
