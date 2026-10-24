// Достижения считаются по журналу на клиенте: сервер для них не нужен.
// Копия client/src/utils/achievements.js, только иконки из Feather.

const dayKey = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

// Самая длинная серия дней подряд, в которые что-то посмотрели
export function longestStreak(watched) {
  const days = new Set(
    watched.filter((m) => m.watchedAt).map((m) => dayKey(new Date(m.watchedAt))),
  );
  let best = 0;
  for (const key of days) {
    const [y, mo, d] = key.split("-").map(Number);
    const prev = new Date(y, mo, d - 1);
    if (days.has(dayKey(prev))) continue; // считаем только от начала серии
    let length = 1;
    let next = new Date(y, mo, d + 1);
    while (days.has(dayKey(next))) {
      length += 1;
      next = new Date(next.getFullYear(), next.getMonth(), next.getDate() + 1);
    }
    best = Math.max(best, length);
  }
  return best;
}

// Больше всего просмотров за один календарный месяц
function bestMonth(watched) {
  const counts = new Map();
  for (const m of watched) {
    if (!m.watchedAt) continue;
    const d = new Date(m.watchedAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Math.max(0, ...counts.values());
}

// Отметка «посмотрел» глубокой ночью, с полуночи до пяти утра
const isNight = (m) => {
  if (!m.watchedAt) return false;
  const hour = new Date(m.watchedAt).getHours();
  return hour < 5;
};

// movies — журнал, minutes — всего минут просмотра, friendsCount — число друзей,
// franchisesDone — сколько франшиз (коллекций TMDB) досмотрено целиком
export function computeAchievements({ movies, minutes, friendsCount, franchisesDone = 0 }) {
  const watched = movies.filter((m) => m.status === "WATCHED");
  const films = watched.filter((m) => m.mediaType !== "tv").length;
  const series = watched.filter((m) => m.mediaType === "tv").length;
  const genres = new Set(watched.flatMap((m) => m.genres || [])).size;
  const decades = new Set(
    watched.filter((m) => m.releaseYear).map((m) => Math.floor(m.releaseYear / 10)),
  ).size;
  // У журнала друга текстов отзывов нет, только отметка hasComment
  const reviews = movies.filter((m) => m.hasComment ?? Boolean(m.comment && m.comment.trim())).length;
  const ratings = movies.filter((m) => m.rating).length;
  const hours = Math.floor(minutes / 60);
  const retro = watched.filter((m) => m.mediaType !== "tv" && m.releaseYear && m.releaseYear < 1980).length;
  const perfect = movies.filter((m) => m.rating === 10).length;
  const episodes = movies.reduce((sum, m) => sum + (m.episodesWatched || 0), 0);
  const planned = movies.filter((m) => m.status === "WATCHLIST").length;

  const list = [
    { id: "first", icon: "play-circle", name: "Первый фильм", desc: "Отметить первый фильм просмотренным", value: watched.length, goal: 1 },
    { id: "ten", icon: "film", name: "Первые 10", desc: "Посмотреть 10 фильмов или сериалов", value: watched.length, goal: 10 },
    { id: "fifty", icon: "video", name: "Киноман", desc: "Посмотреть 50 фильмов или сериалов", value: watched.length, goal: 50 },
    { id: "hundred", icon: "award", name: "Сотня", desc: "Посмотреть 100 фильмов или сериалов", value: watched.length, goal: 100 },
    { id: "hours", icon: "clock", name: "100 часов", desc: "Провести за просмотром 100 часов", value: hours, goal: 100 },
    { id: "genres", icon: "grid", name: "Жанровед", desc: "Посмотреть фильмы 5 разных жанров", value: genres, goal: 5 },
    { id: "streak", icon: "zap", name: "Неделя подряд", desc: "Смотреть что-нибудь 7 дней подряд", value: longestStreak(watched), goal: 7 },
    { id: "series", icon: "tv", name: "Сериальщик", desc: "Досмотреть 5 сериалов", value: series, goal: 5 },
    { id: "films", icon: "aperture", name: "Синефил", desc: "Посмотреть 25 полнометражных фильмов", value: films, goal: 25 },
    { id: "decades", icon: "rotate-ccw", name: "Сквозь эпохи", desc: "Фильмы из 5 разных десятилетий", value: decades, goal: 5 },
    { id: "rater", icon: "star", name: "Оценщик", desc: "Поставить 50 оценок", value: ratings, goal: 50 },
    { id: "critic", icon: "message-square", name: "Критик", desc: "Написать 10 отзывов", value: reviews, goal: 10 },
    { id: "friends", icon: "users", name: "Душа компании", desc: "Добавить 5 друзей", value: friendsCount, goal: 5 },
    { id: "franchise", icon: "layers", name: "Вся серия", desc: "Досмотреть все вышедшие части одной франшизы", value: franchisesDone, goal: 1 },
    { id: "franchises", icon: "book-open", name: "Франшизоман", desc: "Досмотреть 3 франшизы целиком", value: franchisesDone, goal: 3 },
    { id: "episodes", icon: "list", name: "Серийный зритель", desc: "Отметить 100 серий сериалов", value: episodes, goal: 100 },
    { id: "retro", icon: "camera", name: "Ретро", desc: "Посмотреть 5 фильмов, снятых до 1980 года", value: retro, goal: 5 },
    { id: "perfect", icon: "heart", name: "Шедевр", desc: "Поставить фильму 10 из 10", value: perfect, goal: 1 },
    { id: "month", icon: "calendar", name: "Месяц кино", desc: "Посмотреть 15 фильмов или сериалов за один месяц", value: bestMonth(watched), goal: 15 },
    { id: "night", icon: "moon", name: "Ночной сеанс", desc: "Отметить просмотр между полуночью и пятью утра", value: watched.filter(isNight).length, goal: 1 },
    { id: "planner", icon: "bookmark", name: "Планировщик", desc: "Набрать 20 фильмов в «Буду смотреть»", value: planned, goal: 20 },
  ];

  return list.map((a) => ({
    ...a,
    value: Math.min(a.value, a.goal),
    unlocked: a.value >= a.goal,
  }));
}
