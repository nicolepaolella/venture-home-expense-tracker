# Venture Home Solar — Expense Tracker
# Multi-stage build: bundle with Vite, serve the static build via `vite preview` on port 8080 (Cloud Run).

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Bring over the built app + the vite preview dependency tree.
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/vite.config.js ./

EXPOSE 8080
CMD ["npm", "run", "start"]
