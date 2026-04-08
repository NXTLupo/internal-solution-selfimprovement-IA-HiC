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
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 5011
CMD ["nginx", "-g", "daemon off;"]
