
# base image with just our source files
FROM node:10-alpine as BASE
WORKDIR /app
COPY package.json .
RUN npm install --production
COPY *.js ./

# final production image
FROM BASE as PROD
EXPOSE 9229
CMD ["node", "--inspect-brk=0.0.0.0", "index.js"]