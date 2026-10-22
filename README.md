<div align="center">

# 🎬 MovieGrade

### Киножурнал с друзьями: сайт, iOS и Android

Отмечайте фильмы и сериалы, ставьте оценки, пишите отзывы,<br/>
смотрите, что смотрят друзья, и собирайте общие списки на вечер.

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Expo](https://img.shields.io/badge/Expo-SDK_58-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
<br/>
[![Express](https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
[![TMDB](https://img.shields.io/badge/Данные-TMDB-01B4E4?style=for-the-badge&logo=themoviedatabase&logoColor=white)](https://www.themoviedb.org/)

[🌐 Открыть сайт](https://movie-watch-tracker.vercel.app) •
[📱 Мобильное приложение](mobile/README.md) •
[🐞 Сообщить об ошибке](https://github.com/Saprin66/Movie-watch-tracker-/issues)

</div>

---

## 📱 Как выглядит

<div align="center">
<table>
  <tr>
    <td align="center"><img src="docs/screenshots/login.jpg" width="180" alt="Вход"/><br/><sub>Вход</sub></td>
    <td align="center"><img src="docs/screenshots/journal.jpg" width="180" alt="Журнал"/><br/><sub>Мой журнал</sub></td>
    <td align="center"><img src="docs/screenshots/review.jpg" width="180" alt="Оценка"/><br/><sub>Оценка и отзыв</sub></td>
    <td align="center"><img src="docs/screenshots/shared-list.jpg" width="180" alt="Общий список"/><br/><sub>Смотрим вместе</sub></td>
    <td align="center"><img src="docs/screenshots/profile.jpg" width="180" alt="Профиль друга"/><br/><sub>Профиль друга</sub></td>
  </tr>
</table>
</div>

---

## ✨ Возможности

| | |
| --- | --- |
| 🔐 **Аккаунт** | регистрация по email с кодом подтверждения, вход, сброс пароля, удаление аккаунта |
| 🎥 **Журнал** | статусы «Смотрел» и «Буду смотреть», поиск, сортировка, фильтры по жанру, году, рейтингу и типу |
| ⭐ **Оценки и отзывы** | оценка от 1 до 10 и текстовый отзыв к каждому фильму |
| 🔎 **Каталог TMDB** | поиск фильмов и сериалов, подборки, трейлеры, актёры, где посмотреть онлайн |
| 🎲 **Что посмотреть** | рекомендации на основе вашего журнала |
| 👥 **Друзья** | заявки в друзья, профили, онлайн-статус, последние просмотренные фильмы |
| 📰 **Лента** | что друзья посмотрели и как оценили |
| 🍿 **Смотрим вместе** | общие списки с друзьями: приглашения, добавление фильмов, отметка «посмотрели» |
| 🖼️ **Профиль** | аватар, никнейм, «о себе», витрина из трёх любимых фильмов, статистика |
| 🔔 **Push-уведомления** | в приложении: заявки в друзья, приглашения и новые фильмы в общих списках |
| 📲 **PWA** | сайт можно установить на телефон как приложение |

---

## 🧩 Из чего состоит проект

```
Movie-watch-tracker-/
├── client/     🌐 сайт — React + Vite + Tailwind (Vercel)
├── server/     ⚙️  API — Express + Prisma + PostgreSQL (Render + Neon)
├── mobile/     📱 приложение iOS/Android — Expo + React Native + NativeWind
└── docs/       🖼️ скриншоты для README
```

```mermaid
flowchart LR
    W["🌐 Сайт<br/>client/"] -->|REST + JWT| S["⚙️ API<br/>server/"]
    M["📱 Приложение<br/>mobile/"] -->|REST + JWT| S
    S --> DB[("🐘 PostgreSQL")]
    S -->|push| E["Expo Push Service"] --> M
    W --> T["🎬 TMDB API"]
    M --> T
```

Сайт и приложение работают с одним сервером и одной базой, поэтому аккаунт, журнал и друзья у них общие.
Данные о фильмах (постеры, описания, актёры) берутся напрямую из TMDB.

---

## 🛠️ Стек

| Часть | Технологии |
| --- | --- |
| **Сайт** | React 19, Vite 8, Tailwind CSS 3, vite-plugin-pwa, mammoth (импорт .docx) |
| **Сервер** | Node.js, Express 5, Prisma 5, PostgreSQL, JWT, bcrypt, Resend (письма), Expo Push |
| **Приложение** | Expo SDK 58, React Native, Expo Router, NativeWind, TanStack Query, expo-secure-store, expo-notifications |
| **Хостинг** | Vercel (сайт), Render (сервер), Neon (база), EAS (сборка приложения) |

---

## 🚀 Локальный запуск

> Нужен **Node.js 20+**. Для сервера ещё нужна база PostgreSQL: локальная или бесплатная на [Neon](https://neon.tech).

### 1. Клонировать репозиторий

```bash
git clone https://github.com/Saprin66/Movie-watch-tracker-.git
cd Movie-watch-tracker-
```

### 2. Сервер

```bash
cd server
npm install
```

Создайте `server/.env`:

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname"
JWT_SECRET="длинная-случайная-строка"
RESEND_API_KEY="re_..."        # для писем с кодом подтверждения
PORT=3001
# необязательно:
# CORS_ORIGINS="http://localhost:5173"
# EXPO_ACCESS_TOKEN="..."      # если в Expo включена защита push
```

```bash
npx prisma db push   # создать таблицы
npm run dev          # http://localhost:3001
```

### 3. Сайт

```bash
cd client
npm install
```

Создайте `client/.env`:

```env
VITE_API_URL=http://localhost:3001
VITE_TMDB_API_KEY=ваш_ключ_tmdb
```

```bash
npm run dev          # http://localhost:5173
```

Ключ TMDB бесплатный: [themoviedb.org → Настройки → API](https://www.themoviedb.org/settings/api).

### 4. Мобильное приложение

```bash
cd mobile
npm install
cp .env.example .env   # впишите EXPO_PUBLIC_TMDB_API_KEY
npx expo start
```

Отсканируйте QR-код приложением **Expo Go** на телефоне.
Сборка, push-уведомления и публикация в App Store и Google Play описаны в [mobile/README.md](mobile/README.md).

---

## 🔌 API

Все запросы, кроме входа и регистрации, требуют заголовок `Authorization: Bearer <token>`.

<details>
<summary><b>Аккаунт</b> — <code>/api/auth</code></summary>

| Метод | Путь | Что делает |
| --- | --- | --- |
| POST | `/api/auth/register` | регистрация, отправляет код на почту |
| POST | `/api/auth/verify-email` | подтверждение почты кодом |
| POST | `/api/auth/resend-code` | отправить код ещё раз |
| POST | `/api/auth/login` | вход, возвращает JWT |
| POST | `/api/auth/forgot-password` | код для сброса пароля |
| POST | `/api/auth/reset-password` | новый пароль по коду |
| GET | `/api/auth/me` | текущий пользователь |
| PUT | `/api/auth/me` | сменить никнейм |
| DELETE | `/api/auth/me` | удалить аккаунт |

</details>

<details>
<summary><b>Фильмы и лента</b> — <code>/api/movies</code>, <code>/api/feed</code></summary>

| Метод | Путь | Что делает |
| --- | --- | --- |
| GET | `/api/movies` | мой журнал |
| POST | `/api/movies` | добавить фильм |
| PUT | `/api/movies/:id/status` | сменить статус |
| PUT | `/api/movies/:id/review` | оценка и отзыв |
| GET / PUT | `/api/movies/:id/meta` | данные фильма (жанры, год и т.д.) |
| DELETE | `/api/movies/:id` | удалить из журнала |
| GET | `/api/feed` | лента друзей |

</details>

<details>
<summary><b>Пользователи и друзья</b> — <code>/api/users</code>, <code>/api/friends</code></summary>

| Метод | Путь | Что делает |
| --- | --- | --- |
| GET | `/api/users/search` | поиск людей |
| GET | `/api/users/:userId` | профиль |
| GET | `/api/users/:userId/last-watched` | последние просмотренные |
| PUT | `/api/users/profile` | аватар, «о себе», витрина |
| POST | `/api/users/:userId/friend-request` | отправить заявку |
| PUT | `/api/users/:userId/friend-request` | принять или отклонить заявку |
| GET | `/api/users/friends/requests` | входящие заявки |
| GET | `/api/friends/list` | мои друзья |
| DELETE | `/api/friends/:friendId` | удалить из друзей |

</details>

<details>
<summary><b>Общие списки</b> — <code>/api/lists</code></summary>

| Метод | Путь | Что делает |
| --- | --- | --- |
| GET / POST | `/api/lists` | мои списки / создать список |
| GET | `/api/lists/invites` | приглашения |
| POST | `/api/lists/:id/accept` · `/decline` · `/leave` | принять, отклонить, выйти |
| GET / PUT / DELETE | `/api/lists/:id` | открыть, переименовать, удалить |
| POST / DELETE | `/api/lists/:id/members[/:userId]` | пригласить или убрать участника |
| POST / PUT / DELETE | `/api/lists/:id/items[/:itemId]` | добавить, отметить, удалить фильм |

</details>

<details>
<summary><b>Push-уведомления</b> — <code>/api/push</code></summary>

| Метод | Путь | Что делает |
| --- | --- | --- |
| POST | `/api/push` | сохранить push-токен устройства |
| DELETE | `/api/push` | удалить токен (при выходе) |

</details>

---

## ☁️ Деплой

| Что | Где | Как обновляется |
| --- | --- | --- |
| Сайт | Vercel | автоматически после пуша в `main` |
| Сервер | Render | автоматически после пуша в `main`; при старте `prisma db push` обновляет таблицы |
| База | Neon | — |
| Приложение | EAS → App Store / Google Play | `eas build` и `eas submit`, см. [mobile/README.md](mobile/README.md) |

---

## 🗺️ Планы

- [x] Аватарки пользователей
- [x] Оценки и отзывы
- [x] Лента активности друзей
- [x] «Что посмотреть сегодня»
- [x] Общие списки с друзьями
- [x] Мобильное приложение для iOS и Android
- [x] Push-уведомления
- [ ] Публикация в App Store и Google Play
- [ ] Импорт из Letterboxd
- [ ] Достижения и бейджи

---

## 📬 Контакты

**Автор:** Алексей
**Email:** zopo1234@list.ru
**Telegram:** [@fuf4ny](https://t.me/fuf4ny)

Проект создан в рамках обучения fullstack-разработке.

<div align="center">

**Если проект понравился, поставьте ⭐**

Данные о фильмах предоставлены [TMDB](https://www.themoviedb.org/). Этот продукт использует TMDB API, но не одобрен и не сертифицирован TMDB.

</div>
