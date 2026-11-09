# Stage 1: Build the Vite app
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
# 2026-10-30 (WS-0 S1) - no provider key enters this image. The browser reaches every
# provider through research-proxy; the proxy token is runtime config (/config.json).
RUN npm run build && npm run check:bundle-secrets

# Stage 2: Serve with Nginx (proper MIME types, zero caching)
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy DESIGN.md so designMdLoader can fetch it at /DESIGN.md in production
COPY DESIGN.md /usr/share/nginx/html/DESIGN.md
# Copy the masthead logo to the served root. The app references it at /logo.png
# (App.tsx header + hero, slideTemplates/web.tsx). Vite's publicDir copy is
# unreliable in this image (same reason documentation.html is copied below), so
# copy it explicitly to guarantee /logo.png resolves instead of 404-ing to the
# SPA HTML fallback (which renders as a broken image).
COPY public/logo.png /usr/share/nginx/html/logo.png
# 2026-10-30 (WS-0 S8) - the wiki is NOT baked into the image any more: it holds
# client uploads and derived client synthesis. docker-compose-all.yml mounts
# hic-workspace read-only at runtime, and nginx.conf refuses the sensitive paths.
# Copy manifest JSONs (skill routing, institution registry, YouTube channels).
# Previously only wiki/ was exposed; these loaders silently fell back to empty
# results in prod. Now served as application/json via the nginx block below.
COPY hic-workspace/skill-manifest.json /usr/share/nginx/html/hic-workspace/skill-manifest.json
COPY hic-workspace/institution-manifest.json /usr/share/nginx/html/hic-workspace/institution-manifest.json
COPY hic-workspace/youtube-channels.json /usr/share/nginx/html/hic-workspace/youtube-channels.json
# Copy documentation page (public/ may not be included in Vite build if .dockerignore excludes it)
COPY public/documentation.html /usr/share/nginx/html/documentation.html
# Copy NU design gallery (handoff bundle from claude.ai/design — 13 artifact
# templates + style guide + GUIDE.md + Spectral fonts). Vite SHOULD pick this
# up via publicDir, but copy explicitly as a defensive measure matching the
# documentation.html pattern above.
COPY public/nu-design-gallery /usr/share/nginx/html/nu-design-gallery
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 5011
CMD ["nginx", "-g", "daemon off;"]
