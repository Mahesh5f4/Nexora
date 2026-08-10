# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Set the API URL for the production build
ENV VITE_API_BASE_URL=/api
RUN npm run build

# Serve stage
FROM nginx:1.27-alpine
# Copy built static files
COPY --from=builder /app/dist /usr/share/nginx/html
# Setup Nginx to handle React Router (fallback to index.html)
RUN echo -e 'server {\n    listen 80;\n    location / {\n        root /usr/share/nginx/html;\n        try_files $uri $uri/ /index.html;\n    }\n}' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
