ARG NODE_VER=20.9.0
FROM node:${NODE_VER}-alpine AS build
WORKDIR /app
COPY package.json .
RUN npm install
RUN npm i -g serve
COPY . .
CMD [ "npm", "run", "build" ]