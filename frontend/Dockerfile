# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json ./
COPY pnpm-lock.yaml* ./
RUN pnpm install

# NEXT_PUBLIC_API_URL is baked into the build.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY . .
RUN pnpm build

# --- Production stage ---
FROM node:20-alpine AS production
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production

COPY package.json ./
COPY pnpm-lock.yaml* ./
RUN pnpm install --prod

COPY --from=build /app/.next ./.next
COPY --from=build /app/next.config.js ./next.config.js
COPY --from=build /app/public ./public

# Run as a non-root user.
USER node

EXPOSE 3000
CMD ["pnpm", "start"]
