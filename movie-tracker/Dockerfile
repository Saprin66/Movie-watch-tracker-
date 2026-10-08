FROM node:20-alpine

WORKDIR /app

# Копируем сервер
COPY server/package*.json ./server/
COPY server/prisma ./server/prisma/
COPY server ./server/

# Устанавливаем зависимости сервера
WORKDIR /app/server
RUN npm install
RUN npx prisma generate

# Копируем собранный фронтенд (будем собирать локально)
COPY client/dist /app/client/dist

# Открываем порт
EXPOSE 3001

# Запускаем сервер
CMD ["node", "index.js"]