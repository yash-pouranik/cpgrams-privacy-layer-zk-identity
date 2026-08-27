FROM node:22-alpine

WORKDIR /usr/src/app

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source code and views
COPY src ./src

# Expose port
EXPOSE 4000

# Set production environment
ENV NODE_ENV=production

# Start the application
CMD ["node", "src/app.js"]
