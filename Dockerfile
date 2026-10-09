# Этап 1: Сборка фронтенда
FROM node:20-alpine AS frontend-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client ./
RUN npm run build

# Этап 2: Настройка сервера
FROM node:20-alpine
WORKDIR /app

# Копируем сервер
COPY server/package*.json ./
COPY server/prisma ./prisma/
COPY server ./

# Устанавливаем зависимости
RUN npm install
RUN npx prisma generate

# Копируем собранный фронтенд из первого этапа
COPY --from=frontend-build /app/client/dist ./client/dist

# Открываем порт
EXPOSE 3001

# Запускаем сервер
CMD ["node", "index.js"]
