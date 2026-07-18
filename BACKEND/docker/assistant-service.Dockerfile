# Dockerfile de deploy para assistant-service (Railway) — build aislado, solo este servicio.
# Generado a partir del Dockerfile multi-stage combinado (../Dockerfile, sigue
# sirviendo para desarrollo local vía docker-compose); ver docs/DECISIONS.md
# para por qué se separó: portabilidad de --target de Docker multi-stage entre
# hosts, y evita compilar los otros 9 servicios en cada build de Railway.
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json tsconfig.build.json nest-cli.json prisma.config.ts ./
COPY prisma ./prisma
COPY libs ./libs
COPY apps ./apps

RUN npx prisma generate
RUN npx nest build assistant-service

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist/apps/assistant-service ./dist
COPY --from=build /app/package.json ./
CMD ["node", "dist/main.js"]
