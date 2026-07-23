# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json ./
COPY pnpm-lock.yaml* ./
RUN pnpm install
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

COPY --from=build /app/dist ./dist

# Run as a non-root user.
USER node

EXPOSE 3001
CMD ["node", "dist/main.js"]
