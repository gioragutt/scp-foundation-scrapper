
# base image with just our source files
FROM node:10-alpine as DEPENDENCIES
WORKDIR /app
COPY package.*json ./
RUN npm install

FROM DEPENDENCIES as BUILD_TS
COPY . .
RUN npm run build

FROM DEPENDENCIES as BASE
COPY --from=BUILD_TS /app/dist ./

# final production image
FROM BASE as PROD
EXPOSE 9229