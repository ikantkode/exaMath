FROM node:20-bullseye-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY prisma/ ./prisma/
RUN DATABASE_URL="postgresql://localhost:5432/exaMath" npx prisma generate
COPY . .
RUN npm run build

FROM node:20-bullseye-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
RUN DATABASE_URL="postgresql://localhost:5432/exaMath" npx prisma generate
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
