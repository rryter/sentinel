# Build stage
FROM node:20-slim AS builder

# Install Java for OpenAPI generator
RUN apt-get update -qq && apt-get install -y \
    openjdk-17-jdk \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Development stage
FROM node:20-slim AS development

# Install Java for OpenAPI generator
RUN apt-get update -qq && apt-get install -y \
    openjdk-17-jdk \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
COPY nx.json ./
COPY tsconfig*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Expose port
EXPOSE 4200

# Start the development server with host 0.0.0.0 for Docker
CMD ["npx", "nx", "run", "sentinel:serve", "--", "--host", "0.0.0.0", "--poll", "1000"]

# Production stage
FROM nginx:alpine AS production

# Copy built assets from builder stage
COPY --from=builder /app/dist/sentinel-frontend /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 