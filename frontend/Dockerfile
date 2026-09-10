FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Vite substitutes import.meta.env.VITE_* with literals at build time, so these
# cannot be passed as container environment variables — the values are already
# compiled into the bundle by the time the container starts.
ARG VITE_API_MODE=live
ARG VITE_API_BASE_URL=/api
ENV VITE_API_MODE=$VITE_API_MODE
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY . .
RUN npm run build


FROM nginx:1.27-alpine AS runtime

# The official image runs envsubst over /etc/nginx/templates/*.template at
# startup, so one image can point at different backends without a rebuild.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
