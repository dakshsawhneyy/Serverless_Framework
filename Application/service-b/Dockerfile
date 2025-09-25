FROM node:18 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . . 

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app /app

EXPOSE 9001

CMD ["node", "index.js"]
