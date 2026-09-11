# Frontend de producción: build de Vite servido por nginx. En el VPS lo publica
# EasyPanel, cuyo Traefik pone el dominio y el HTTPS delante del puerto 80.
FROM node:20-alpine AS build
WORKDIR /app

# Los navegadores de Playwright solo sirven para las pruebas locales.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Vite hornea estas variables en el JS al compilar. No son secretos: la URL de la
# API es pública y el cierre del registro también lo impone el backend.
ARG VITE_API_MODE=http
ARG VITE_API_URL=https://api.conectaempleo.xyz/api/v1
ARG VITE_REGISTRATION_ENABLED=false
ENV VITE_API_MODE=$VITE_API_MODE \
    VITE_API_URL=$VITE_API_URL \
    VITE_REGISTRATION_ENABLED=$VITE_REGISTRATION_ENABLED
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
