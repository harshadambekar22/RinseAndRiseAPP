# Build: compile the Vite app to static assets.
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Vite inlines VITE_* vars into the bundle at build time, so they must be
# passed as build args (Railway: set them as the service's build-time
# variables). VITE_GOOGLE_CLIENT_ID is optional — once deployed, an admin
# can set it from Admin → API Keys instead, no rebuild needed.
# VITE_API_BASE_URL is not dynamic and should always be set here, pointing
# at the deployed API's public URL. The pickup-location map (OpenStreetMap
# tiles + Nominatim) needs no key at all.
ARG VITE_API_BASE_URL
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN npm run build

# Serve: static files via `serve`, which respects Railway's $PORT.
FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
EXPOSE 8080
CMD ["sh", "-c", "serve -s dist -l ${PORT:-8080}"]
