FROM node:20-alpine

WORKDIR /app

# Copiar package.json primero para aprovechar cache de Docker
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar código fuente
COPY . .

# Exponer puerto
EXPOSE 3000

# Comando por defecto (se puede sobreescribir en docker-compose)
CMD ["node", "src/index.js"]