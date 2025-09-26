ARG NODE_VER=20.9.0
FROM node:${NODE_VER}-alpine AS build
WORKDIR /app

# Add build argument for the API URL
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM node:${NODE_VER}-alpine
WORKDIR /app
RUN npm i -g serve
COPY --from=build /app/dist /app
EXPOSE 80
CMD ["serve", "-s", ".", "-l", "80"]