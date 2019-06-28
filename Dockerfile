
# base image with just our source files
FROM node:10-alpine as BUILD_TS
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

FROM node:10-alpine as BASE
WORKDIR /app
COPY package.*json ./
RUN npm install --production
COPY --from=BUILD_TS /app/dist ./

# final production image
FROM BASE as PROD
EXPOSE 9229