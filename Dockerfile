FROM node:22-alpine
WORKDIR /app

COPY server/package.json server/pnpm-lock.yaml server/tsconfig.json ./server/
COPY shared/ ./shared/
RUN cd server && npm install

COPY server/ ./server/

EXPOSE 3001
CMD ["npm", "--prefix", "server", "start"]