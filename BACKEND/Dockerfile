# Dockerfile para microservicios TalentBridge
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json tsconfig.build.json nest-cli.json prisma.config.ts ./
COPY prisma ./prisma
COPY libs ./libs
COPY apps ./apps

RUN npx prisma generate
RUN npx nest build api-gateway
RUN npx nest build auth-service
RUN npx nest build candidate-service
RUN npx nest build portfolio-service
RUN npx nest build company-service
RUN npx nest build jobs-service
RUN npx nest build applications-service
RUN npx nest build chat-service
RUN npx nest build assistant-service
RUN npx nest build dashboard-service

FROM node:22-alpine AS api-gateway
WORKDIR /app
COPY --from=0 /app/node_modules ./node_modules
COPY --from=0 /app/dist/apps/api-gateway ./dist
COPY --from=0 /app/package.json ./
CMD ["node", "dist/main.js"]

FROM node:22-alpine AS auth-service
WORKDIR /app
COPY --from=0 /app/node_modules ./node_modules
COPY --from=0 /app/dist/apps/auth-service ./dist
COPY --from=0 /app/package.json ./
CMD ["node", "dist/main.js"]

FROM node:22-alpine AS candidate-service
WORKDIR /app
COPY --from=0 /app/node_modules ./node_modules
COPY --from=0 /app/dist/apps/candidate-service ./dist
COPY --from=0 /app/package.json ./
CMD ["node", "dist/main.js"]

FROM node:22-alpine AS portfolio-service
WORKDIR /app
COPY --from=0 /app/node_modules ./node_modules
COPY --from=0 /app/dist/apps/portfolio-service ./dist
COPY --from=0 /app/package.json ./
CMD ["node", "dist/main.js"]

FROM node:22-alpine AS company-service
WORKDIR /app
COPY --from=0 /app/node_modules ./node_modules
COPY --from=0 /app/dist/apps/company-service ./dist
COPY --from=0 /app/package.json ./
CMD ["node", "dist/main.js"]

FROM node:22-alpine AS jobs-service
WORKDIR /app
COPY --from=0 /app/node_modules ./node_modules
COPY --from=0 /app/dist/apps/jobs-service ./dist
COPY --from=0 /app/package.json ./
CMD ["node", "dist/main.js"]

FROM node:22-alpine AS applications-service
WORKDIR /app
COPY --from=0 /app/node_modules ./node_modules
COPY --from=0 /app/dist/apps/applications-service ./dist
COPY --from=0 /app/package.json ./
CMD ["node", "dist/main.js"]

FROM node:22-alpine AS chat-service
WORKDIR /app
COPY --from=0 /app/node_modules ./node_modules
COPY --from=0 /app/dist/apps/chat-service ./dist
COPY --from=0 /app/package.json ./
CMD ["node", "dist/main.js"]

FROM node:22-alpine AS assistant-service
WORKDIR /app
COPY --from=0 /app/node_modules ./node_modules
COPY --from=0 /app/dist/apps/assistant-service ./dist
COPY --from=0 /app/package.json ./
CMD ["node", "dist/main.js"]

FROM node:22-alpine AS dashboard-service
WORKDIR /app
COPY --from=0 /app/node_modules ./node_modules
COPY --from=0 /app/dist/apps/dashboard-service ./dist
COPY --from=0 /app/package.json ./
CMD ["node", "dist/main.js"]
