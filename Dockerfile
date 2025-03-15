# Stage 1: Build React frontend with Vite
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .

# If PG_CA_CERT is available as a secret (Fly.io), use it; otherwise, use a normal ENV variable
ARG PG_CA_CERT
RUN echo "The value of PG_CA_CERT is: $PG_CA_CERT"
RUN rm -rf /app/ca-certificate.crt && \
    if [ -f /run/secrets/PG_CA_CERT ]; then \
        cat /run/secrets/PG_CA_CERT > /app/ca-certificate.crt; \
    elif [ ! -z "$PG_CA_CERT" ]; then \
        echo "$PG_CA_CERT" | tr -d '\r' > /app/ca-certificate.crt; \
    else \
        echo "PG_CA_CERT is empty or missing!" && exit 1; \
    fi && \
    chmod 600 /app/ca-certificate.crt

RUN echo "Checking if ca-certificate.crt exists:" && ls -al /app && \
    echo "Verifying file contents:" && cat /app/ca-certificate.crt

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

# Copy the ca-certificate.crt from the builder stage to production image**
COPY --from=builder /app/ca-certificate.crt /app/ca-certificate.crt


# Expose the port the app runs on
# Note replit config uses port 5000, we are changing to 3000
EXPOSE 3000

ENV NODE_ENV production

# Start the server
CMD ["node", "dist/index.js"]