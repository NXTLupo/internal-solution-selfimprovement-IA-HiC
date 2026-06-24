# Multi-stage build for the NXT Agency launchpad - the computer-use "cowork"
# chatbot UI served at :5050. Source-built so a FRESH CLONE needs no host-side
# npm build (the previous setup mounted a host-built dist/ that was gitignored,
# so a clean clone served an empty page). The browser connects to the backend at
# ws://localhost:8201 (the published host port), so no build-time API base var is
# required - the produced dist is environment-agnostic.
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
# Build with vite directly (NOT `tsc -b && vite build`): esbuild strips types, so
# a stray type error in the vendored source can never break the clone-and-run
# image build. Type-checking stays a dev concern, not a deploy gate.
RUN npx vite build

# Serve the static SPA with nginx. SPA-style fallback so client routes resolve to
# index.html instead of 404ing.
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
RUN printf 'server {\n  listen 80;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / {\n    try_files $uri $uri/ /index.html;\n  }\n}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80
