# Stage 1 - builder
FROM node:20-alpine AS builder

ARG VITE_GITLAB_URL=https://git2u.fiuu.com
ARG VITE_GITLAB_TOKEN=
ARG VITE_TEAM_ALLOWED_USERS=

ENV VITE_GITLAB_URL=$VITE_GITLAB_URL
ENV VITE_GITLAB_TOKEN=$VITE_GITLAB_TOKEN
ENV VITE_TEAM_ALLOWED_USERS=$VITE_TEAM_ALLOWED_USERS

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2 - serve
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]
