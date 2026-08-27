# Stage 1: Build the Next.js app
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Install dependencies including devDependencies (needed for TypeScript compilation)
COPY package*.json ./
RUN npm ci

# Copy configuration and source files
COPY tsconfig.json ./
COPY postcss.config.mjs ./
COPY tailwind.config.js* ./
COPY components.json ./
COPY next-env.d.ts ./
COPY next.config.ts ./
COPY public ./public
COPY app ./app
COPY components ./components
COPY hooks ./hooks
COPY lib ./lib

# Set build-time variables (baked into the frontend bundle at compile-time)
ARG NEXT_PUBLIC_SSO_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_PORTAL_NAME

ENV NEXT_PUBLIC_SSO_URL=$NEXT_PUBLIC_SSO_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_PORTAL_NAME=$NEXT_PUBLIC_PORTAL_NAME

# Run Next.js build
RUN npm run build

# Stage 2: Production runner
FROM node:22-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built files and public assets
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/next.config.ts ./next.config.ts

EXPOSE 3000

# Start Next.js server
CMD ["npm", "start"]
