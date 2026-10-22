<div align="center">

# 🎬 Movie Watch Tracker

### Персональный кинотрекер с социальными функциями

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)

[🚀 Демо](https://movie-watch-tracker.vercel.app) • [📝 Отчёт об ошибках](https://github.com/Saprin66/Movie-watch-tracker-/issues) • [💡 Предложить идею](https://github.com/Saprin66/Movie-watch-tracker-/issues)

</div>

> 📱 **Мобильное приложение** для iOS и Android находится в папке [`mobile/`](mobile/README.md).

---

## 📖 О проекте

**Movie Watch Tracker** — это современное веб-приложение для ведения личного киножурнала с социальными функциями. Добавляйте фильмы, отслеживайте, что уже посмотрели, делитесь впечатлениями с друзьями и находите единомышленников.

Проект разработан с использованием современного стека технологий и полностью готов к продакшну: с аутентификацией, адаптивным дизайном и деплоем на облачные платформы.

### ✨ Возможности

- 🔐 **Регистрация и вход** по email с JWT-аутентификацией
- 🎥 **Каталог фильмов** с поиском и фильтрацией
- ✅ **Статусы просмотра**: "Просмотрено" / "Планирую посмотреть"
- 👥 **Социальная система**: добавление друзей, просмотр их профилей
- 🟢 **Онлайн-статус** — видно, кто из друзей сейчас на сайте
- 📊 **Статистика профиля**: количество фильмов, друзей, активность
- ✏️ **Редактирование профиля**: смена никнейма
- 📱 **Адаптивный дизайн**: отлично работает на мобильных и десктопах
- 🎨 **Современный UI**: тёмная тема, плавные анимации, градиенты

---

## 🖼️ Скриншоты

<div align="center">

### Главная страница

![Главная страница](https://via.placeholder.com/800x450/171a33/f47c4f?text=Главная+страница)

### Профиль пользователя

![Профиль](https://via.placeholder.com/800x450/171a33/8a4fff?text=Профиль+пользователя)

### Поиск фильмов

![Поиск](https://via.placeholder.com/800x450/171a33/10b981?text=Поиск+фильмов)

</div>

> 💡 _Замените ссылки на реальные скриншоты: загрузите их в папку `screenshots/` и обновите пути_

---

## 🛠️ Стек технологий

### Frontend

- **React 18** — библиотека для построения UI
- **Vite** — быстрый сборщик и dev-сервер
- **Tailwind CSS** — utility-first CSS фреймворк
- **React Router** — клиентская маршрутизация
- **Context API** — управление глобальным состоянием

### Backend

- **Node.js + Express** — серверная часть
- **Prisma ORM** — работа с базой данных
- **PostgreSQL** — реляционная база данных
- **JWT** — аутентификация и авторизация
- **bcrypt** — хеширование паролей

### Инструменты и деплой

- **Git + GitHub** — контроль версий
- **Vercel** — хостинг фронтенда
- **Render** — хостинг бэкенда и БД
- **TMDB API** — данные о фильмах

---

## 🚀 Установка и запуск

### Требования

- Node.js 18+
- PostgreSQL 14+
- npm или yarn

### Локальный запуск

1. **Клонируйте репозиторий**

```bash
git clone https://github.com/Saprin66/Movie-watch-tracker-.git
cd movie-tracker
```

2. **Установите зависимости для бэкенда**

```bash
cd server
npm install
```

3. **Настройте переменные окружения**

Создайте файл `server/.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/movietracker"
JWT_SECRET="your-super-secret-key"
PORT=3001
```

4. **Примените миграции базы данных**

```bash
npx prisma generate
npx prisma db push
```

5. **Запустите сервер**

```bash
npm run dev
```

6. **В новом терминале — установите и запустите фронтенд**

```bash
cd client
npm install
npm run dev
```

Приложение будет доступно по адресу: **http://localhost:5173**

---

## 📁 Структура проекта

```
movie-tracker/
├── client/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/     # UI-компоненты
│   │   ├── context/        # React Context (AuthContext)
│   │   ├── pages/          # Страницы приложения
│   │   ├── App.jsx         # Главный компонент
│   │   └── main.jsx        # Точка входа
│   ├── public/             # Статические файлы
│   └── package.json
│
├── server/                 # Backend (Node.js + Express)
│   ├── prisma/
│   │   └── schema.prisma   # Схема базы данных
│   ├── routes/             # API маршруты
│   │   ├── auth.js         # Аутентификация
│   │   └── users.js        # Пользователи
│   ├── middleware/         # Middleware (auth, и т.д.)
│   ├── index.js            # Точка входа сервера
│   └── package.json
│
└── README.md
```

---

## 🔌 API Endpoints

### Аутентификация

| Метод | Эндпоинт             | Описание                               |
| ----- | -------------------- | -------------------------------------- |
| POST  | `/api/auth/register` | Регистрация нового пользователя        |
| POST  | `/api/auth/login`    | Вход в систему                         |
| GET   | `/api/auth/me`       | Получение данных текущего пользователя |

### Пользователи

| Метод | Эндпоинт             | Описание                       |
| ----- | -------------------- | ------------------------------ |
| GET   | `/api/users/:id`     | Получение профиля пользователя |
| GET   | `/api/users/search`  | Поиск пользователей            |
| GET   | `/api/friends/list`  | Список друзей                  |
| PUT   | `/api/users/profile` | Обновление профиля             |

### Фильмы

| Метод  | Эндпоинт                 | Описание                         |
| ------ | ------------------------ | -------------------------------- |
| GET    | `/api/movies`            | Получить все фильмы пользователя |
| POST   | `/api/movies`            | Добавить фильм                   |
| PUT    | `/api/movies/:id/status` | Изменить статус фильма           |
| DELETE | `/api/movies/:id`        | Удалить фильм                    |

---

## 🎯 Планы по развитию

- [ ] 📸 Загрузка аватарок пользователей (через Cloudinary)
- [ ] ⭐ Система оценок и рецензий к фильмам
- [ ] 📰 Лента активности друзей
- [ ] 🎲 Рандомайзер "Что посмотреть сегодня"
- [ ] 🌍 Интеграция с Letterboxd для импорта
- [ ] 📧 Email-уведомления о новых друзьях
- [ ] 🏆 Система достижений и бейджей

---

## 🤝 Вклад в проект

Проект открыт для предложений и улучшений! Если у вас есть идеи:

1. Форкните репозиторий
2. Создайте ветку для своей фичи (`git checkout -b feature/AmazingFeature`)
3. Закоммитьте изменения (`git commit -m 'Add some AmazingFeature'`)
4. Запушьте в ветку (`git push origin feature/AmazingFeature`)
5. Откройте Pull Request

---

## 📬 Контакты

**Автор:** [Алексей]  
**Email:** [zopo1234@list.ru]  
**Telegram:** [@fuf4ny]

Проект создан в рамках обучения Fullstack-разработке.

---

## 📄 Лицензия

Этот проект создан в образовательных целях.

<div align="center">

**Если проект вам понравился — поставьте ⭐ на GitHub!**

Сделано с ❤️ и ☕

</div>
