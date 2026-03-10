# Estágio de Build
FROM node:20-slim AS builder

WORKDIR /app

# Instalar dependências para compilar better-sqlite3 se necessário
RUN apt-get update && apt-get install -y python3 make g++ 

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Estágio de Produção
FROM node:20-slim

WORKDIR /app

# Instalar dependências de runtime
RUN apt-get update && apt-get install -y python3 make g++ 

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/tsconfig.json ./

# O tsx é necessário para rodar o server.ts diretamente ou você pode compilá-lo
RUN npm install -g tsx

EXPOSE 3000

CMD ["tsx", "server.ts"]
