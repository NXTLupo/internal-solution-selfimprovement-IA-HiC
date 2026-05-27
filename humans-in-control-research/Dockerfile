# Stage 1: Build the Vite app
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
ARG GEMINI_API_KEY=""
ARG ANTHROPIC_API_KEY=""
ARG OPENAI_API_KEY=""
ENV GEMINI_API_KEY=${GEMINI_API_KEY}
ENV ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
ENV OPENAI_API_KEY=${OPENAI_API_KEY}
RUN npm run build

# Stage 2: Serve with Nginx (proper MIME types, zero caching)
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy DESIGN.md so designMdLoader can fetch it at /DESIGN.md in production
COPY DESIGN.md /usr/share/nginx/html/DESIGN.md
# Copy wiki knowledge layer so wikiService can fetch pages at runtime
COPY hic-workspace/wiki /usr/share/nginx/html/hic-workspace/wiki
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
