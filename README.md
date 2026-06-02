FROM node:24-alpine

WORKDIR /app

COPY package.json ./
COPY server.mjs ./
COPY public ./public

RUN mkdir -p data

ENV PORT=8787
EXPOSE 8787

CMD ["node", "server.mjs"]
