FROM node:24-alpine

WORKDIR /app

COPY package.json ./
COPY server.mjs ./
COPY public ./public
COPY data/.gitkeep ./data/.gitkeep

ENV PORT=8787
EXPOSE 8787

CMD ["npm", "start"]
