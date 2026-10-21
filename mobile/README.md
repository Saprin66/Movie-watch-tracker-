# MovieGrade — мобильное приложение (iOS и Android)

Приложение повторяет сайт: вход и регистрация, журнал фильмов, поиск и подборки TMDB,
карточка фильма, оценки и отзывы, друзья, лента, совместные списки, профиль и настройки.
Плюс push-уведомления. Работает с тем же сервером (`server/`), что и сайт.

## Из чего сделано

| Что | Зачем |
| --- | --- |
| [Expo](https://expo.dev) (SDK 58) + React Native | одно приложение на JavaScript для iOS и Android |
| Expo Router | экраны = файлы в `src/app` (как страницы на сайте) |
| NativeWind | те же классы Tailwind, что и на сайте (`className="bg-panel rounded-2xl"`) |
| TanStack Query | загрузка данных с сервера и кэш |
| expo-secure-store | токен входа хранится в защищённом хранилище телефона |
| expo-notifications | push-уведомления через Expo Push Service |
| EAS | сборка в облаке и отправка в App Store / Google Play |

## Структура

```
mobile/
  app.json            название, иконки, bundle id, плагины
  eas.json            профили сборки (development / preview / production)
  tailwind.config.js  цвета сайта (bg, panel, card, accent и т.д.)
  src/
    app/              экраны
      _layout.jsx     корень: вход/выход, модальные окна
      auth.jsx        вход, регистрация, код из письма, сброс пароля
      (tabs)/         нижние вкладки: Главная, Список, Искать, Вместе, Профиль
      movie/[type]/[id].jsx  карточка фильма
      review/[id].jsx оценка и отзыв
      list/           совместные списки
      user/[id].jsx   профиль друга
      settings.jsx    настройки профиля, уведомления, выход, удаление аккаунта
      ...             discover, feed, friends, notifications
    components/       общие кусочки интерфейса (ui.jsx — кнопки, поля, постеры)
    lib/              работа с сервером, TMDB, входом, push
    utils/            фильтры, сортировка, рекомендации (скопированы с сайта)
```

Цвета задаются в `tailwind.config.js`. Если на сайте поменяется цвет, поменяйте его там.

## Запуск на своём телефоне (без аккаунтов разработчика)

1. Установите [Node.js 20+](https://nodejs.org) на Mac.
2. В папке `mobile`:
   ```bash
   cp .env.example .env      # и впишите ключ TMDB (тот же, что VITE_TMDB_API_KEY на сайте)
   npm install
   npx expo start
   ```
3. Установите на телефон приложение **Expo Go** (App Store / Google Play) и отсканируйте QR-код из терминала.
   Телефон и Mac должны быть в одной Wi‑Fi сети.

В Expo Go работает всё, кроме push-уведомлений: для них нужна своя сборка (см. ниже).
Также можно нажать `i` в терминале, чтобы открыть приложение в симуляторе iPhone (нужен Xcode).

## Сервер: что нужно задеплоить

В этой же ветке изменён сервер:

- новая таблица `PushToken` (токены устройств) — создастся сама, потому что `npm start`
  на Render сначала делает `prisma db push`;
- новый маршрут `POST/DELETE /api/push` — телефон сообщает серверу свой push-токен;
- уведомления отправляются, когда: пришла заявка в друзья, заявку приняли,
  пригласили в совместный список, в общий список добавили фильм.

Нужно просто смержить PR, Render передеплоит сервер сам.
Необязательно: переменная `EXPO_ACCESS_TOKEN` на Render, если в настройках Expo
включите «Enhanced push security». Без неё всё работает.

## Push-уведомления и сборка

1. Зарегистрируйтесь на [expo.dev](https://expo.dev) (бесплатно) и выполните в `mobile`:
   ```bash
   npm install -g eas-cli
   eas login
   eas init        # создаст проект и запишет projectId в app.json — он нужен для push
   ```
2. **Android:** создайте проект в [Firebase](https://console.firebase.google.com), добавьте
   Android-приложение с пакетом `app.moviegrade`, скачайте ключ сервисного аккаунта
   и загрузите его командой `eas credentials` (раздел FCM V1). Подробно:
   https://docs.expo.dev/push-notifications/fcm-credentials/
3. **iOS:** ключ APNs EAS создаст сам при первой сборке (нужен Apple Developer аккаунт).
4. Тестовая сборка для Android (APK, можно поставить на телефон без Google Play):
   ```bash
   eas build -p android --profile preview
   ```

## Публикация в магазины

Нужны аккаунты:

- **Apple Developer Program** — $99 в год, https://developer.apple.com/programs/
- **Google Play Console** — $25 один раз, https://play.google.com/console

Дальше:

```bash
eas build -p ios --profile production
eas build -p android --profile production
eas submit -p ios        # отправит в App Store Connect / TestFlight
eas submit -p android    # отправит в Google Play
```

Для магазинов понадобятся скриншоты, описание и ссылка на политику конфиденциальности
(в приложении она открывается из настроек: `https://movie-watch-tracker.vercel.app/#/privacy`).
Удаление аккаунта уже есть в настройках — Apple это требует.

Bundle id / package: `app.moviegrade`. Если хотите другой, поменяйте в `app.json` до первой публикации.

## Чего нет по сравнению с сайтом

- Импорт списка фильмов из .txt / .docx — на телефоне это неудобно, оставлен на сайте.

## Как добавлять новое

- Новый экран: создайте файл в `src/app`, например `src/app/stats.jsx`, и откройте его
  через `router.push("/stats")`.
- Новый запрос к серверу: `api("/api/...", { token })` из `src/lib/api.js`.
- Стили: обычные классы Tailwind в `className`.
- Перед добавлением пакета используйте `npx expo install <пакет>` — он подберёт версию под Expo.
