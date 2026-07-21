FROM node:24.18.0-alpine
WORKDIR /app
COPY package.json ./
COPY package-lock.json ./
RUN npm i
COPY ./src ./src
EXPOSE 8080
CMD ["npm", "run","start"]