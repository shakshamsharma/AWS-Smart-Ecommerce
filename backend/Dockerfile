FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodeapp -u 1001
COPY --from=deps --chown=nodeapp:nodejs /app/node_modules ./node_modules
COPY --chown=nodeapp:nodejs src ./src
COPY --chown=nodeapp:nodejs package.json ./

USER nodeapp
EXPOSE 3000
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/server.js"]
