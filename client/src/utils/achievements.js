// Достижения считаются по журналу на клиенте: сервер для них не нужен.

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

// movies — журнал, minutes — всего минут просмотра, friendsCount — число друзей
export function computeAchievements({ movies, minutes, friendsCount }) {
  const watched = movies.filter((m) => m.status === "WATCHED");
  const films = watched.filter((m) => m.mediaType !== "tv").length;
  const series = watched.filter((m) => m.mediaType === "tv").length;
  const genres = new Set(watched.flatMap((m) => m.genres || [])).size;
  const decades = new Set(
    watched.filter((m) => m.releaseYear).map((m) => Math.floor(m.releaseYear / 10)),
  ).size;
  const reviews = movies.filter((m) => m.comment && m.comment.trim()).length;
  const ratings = movies.filter((m) => m.rating).length;
  const hours = Math.floor(minutes / 60);

  const list = [
    { id: "first", icon: "clapperboard", name: "Первый фильм", desc: "Отметить первый фильм просмотренным", value: watched.length, goal: 1 },
    { id: "ten", icon: "popcorn", name: "Первые 10", desc: "Посмотреть 10 фильмов или сериалов", value: watched.length, goal: 10 },
    { id: "fifty", icon: "film", name: "Киноман", desc: "Посмотреть 50 фильмов или сериалов", value: watched.length, goal: 50 },
    { id: "hundred", icon: "trophy", name: "Сотня", desc: "Посмотреть 100 фильмов или сериалов", value: watched.length, goal: 100 },
    { id: "hours", icon: "hourglass", name: "100 часов", desc: "Провести за просмотром 100 часов", value: hours, goal: 100 },
    { id: "genres", icon: "shapes", name: "Жанровед", desc: "Посмотреть фильмы 5 разных жанров", value: genres, goal: 5 },
    { id: "streak", icon: "flame", name: "Неделя подряд", desc: "Смотреть что-нибудь 7 дней подряд", value: longestStreak(watched), goal: 7 },
    { id: "series", icon: "tv", name: "Сериальщик", desc: "Досмотреть 5 сериалов", value: series, goal: 5 },
    { id: "films", icon: "ticket", name: "Синефил", desc: "Посмотреть 25 полнометражных фильмов", value: films, goal: 25 },
    { id: "decades", icon: "history", name: "Сквозь эпохи", desc: "Фильмы из 5 разных десятилетий", value: decades, goal: 5 },
    { id: "rater", icon: "star", name: "Оценщик", desc: "Поставить 50 оценок", value: ratings, goal: 50 },
    { id: "critic", icon: "message-square-quote", name: "Критик", desc: "Написать 10 отзывов", value: reviews, goal: 10 },
    { id: "friends", icon: "users", name: "Душа компании", desc: "Добавить 5 друзей", value: friendsCount, goal: 5 },
  ];

  return list.map((a) => ({
    ...a,
    value: Math.min(a.value, a.goal),
    unlocked: a.value >= a.goal,
  }));
}
