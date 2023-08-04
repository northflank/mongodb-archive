FROM node:14-alpine as build

WORKDIR /app

COPY . .

RUN npm i && npm run build

FROM node:14-alpine

WORKDIR /app

COPY --from=build /app/dist ./dist/
COPY --from=build /app/package.json /app/package-lock.json ./

RUN yarn install --production

ENTRYPOINT [ "node", "dist/index.js" ]