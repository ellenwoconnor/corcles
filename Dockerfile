# Stage 1: Build React frontend with Vite
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Ensure esbuild is installed for amd64 architecture during the build step
RUN npm install esbuild --platform=linux/amd64
RUN npm run build

# Stage 2: Prepare production Node.js server
FROM node:22-alpine
WORKDIR /app

# Install dependencies (including devDependencies) first
COPY package.json package-lock.json ./
RUN npm install

# Copy built files and server code
COPY --from=builder /app/dist ./dist
# Copy environment variables file
COPY .env /app/.env  

# Expose the port the app runs on
# Note replit config uses port 5000, we are changing to 3000
EXPOSE 3000

ENV NODE_ENV production

# Start the server
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "dist/index.js"]