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

# Stage 2: Serve with Nginx (proper MIME types, no SPA fallback on assets)
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
RUN printf 'server {\n\
    listen 5011;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    \n\
    # Proper MIME types for JS chunks\n\
    location /assets/ {\n\
        add_header Cache-Control "no-cache";\n\
        try_files $uri =404;\n\
    }\n\
    \n\
    # SPA fallback for routes (NOT for assets)\n\
    location / {\n\
        add_header Cache-Control "no-cache, no-store, must-revalidate";\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 5011
CMD ["nginx", "-g", "daemon off;"]
