FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY turbo.json ./

# Copy only the packages and app we need
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-utils/package.json packages/shared-utils/
COPY apps/bff/package.json apps/bff/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared-types/ packages/shared-types/
COPY packages/shared-utils/ packages/shared-utils/
COPY apps/bff/ apps/bff/

# Build shared packages and BFF
RUN pnpm --filter @loyalty/shared-types build && \
    pnpm --filter @loyalty/shared-utils build && \
    pnpm --filter bff exec prisma generate && \
    pnpm --filter bff build

# Production stage
FROM node:20-alpine AS production
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

COPY --from=base /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/.npmrc ./
COPY --from=base /app/turbo.json ./
COPY --from=base /app/packages/shared-types/package.json packages/shared-types/
COPY --from=base /app/packages/shared-utils/package.json packages/shared-utils/
COPY --from=base /app/apps/bff/package.json apps/bff/

RUN pnpm install --frozen-lockfile --prod

COPY --from=base /app/packages/shared-types/dist/ packages/shared-types/dist/
COPY --from=base /app/packages/shared-utils/dist/ packages/shared-utils/dist/
COPY --from=base /app/apps/bff/dist/ apps/bff/dist/
COPY --from=base /app/apps/bff/prisma/ apps/bff/prisma/
COPY --from=base /app/node_modules/.pnpm/@prisma+client*/node_modules/.prisma/ node_modules/.pnpm/@prisma+client*/node_modules/.prisma/

WORKDIR /app/apps/bff

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/main.js"]
