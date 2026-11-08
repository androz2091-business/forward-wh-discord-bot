FROM node:22-alpine
RUN mkdir -p /opt/app
WORKDIR /opt/app
COPY package.json yarn.lock /opt/app/
RUN yarn install
COPY . .
CMD [ "npm", "start"]
