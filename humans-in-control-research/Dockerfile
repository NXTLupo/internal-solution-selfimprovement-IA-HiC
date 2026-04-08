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

# Stage 2: Serve static dist
FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve@14
COPY --from=builder /app/dist ./dist
EXPOSE 5011
CMD ["serve", "-s", "dist", "-l", "5011"]
