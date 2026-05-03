# Multi-stage build: Node builder → nginx static serve.
# Mirrors the pattern used by research-generator (HiC) and social-research-frontend.

FROM node:20-alpine AS builder
WORKDIR /app

# Layer-cache deps install
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# Copy source + build
COPY . .
RUN npm run build

# Runtime: nginx serving the static dist with SPA fallback for /p/{slug} routes
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 4500
CMD ["nginx", "-g", "daemon off;"]
