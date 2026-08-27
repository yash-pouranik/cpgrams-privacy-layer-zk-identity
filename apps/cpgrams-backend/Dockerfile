FROM node:22-alpine

WORKDIR /usr/src/app

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy source files
COPY src ./src

# Create the uploads directory for attachments
RUN mkdir -p uploads

# Expose port
EXPOSE 5000

# Set production environment
ENV NODE_ENV=production

# Start the application
CMD ["node", "src/app.js"]
