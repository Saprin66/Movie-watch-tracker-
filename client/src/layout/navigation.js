// Разделы сайта и вкладки внутри них

// Разделы, которые живут внутри других: «Что смотреть» и «Сериалы» — в списке,
// лента и «Вместе» — в друзьях
const SECTION_OF = { discover: "movies", series: "movies", feed: "friends", together: "friends" };

export const sectionOf = (tab) => (tab.startsWith("profile-") ? "profile" : SECTION_OF[tab] || tab);

// counts: { requests, invites } — цифры на вкладках
export function navItems(counts) {
  return [
    { id: "home", label: "Главная", short: "Главная", icon: "house" },
    { id: "movies", label: "Мой список", short: "Список", icon: "layout-dashboard" },
    { id: "friends", label: "Друзья", icon: "users", badge: counts.requests + counts.invites },
    // «Искать» и «Профиль» на телефоне открываются отдельной кнопкой-лупой и из шапки
    { id: "search", label: "Искать", icon: "compass", desktopOnly: true },
    { id: "profile", label: "Профиль", icon: "user-round", desktopOnly: true },
  ];
}

export function subTabsOf(section, counts) {
  return {
    movies: [
      { id: "movies", label: "Мой журнал", short: "Журнал", icon: "notebook-pen" },
      { id: "series", label: "Сериалы", short: "Сериалы", icon: "tv" },
      { id: "discover", label: "Что смотреть", short: "Подбор", icon: "sparkles" },
    ],
    friends: [
      { id: "friends", label: "Друзья", badge: counts.requests },
      { id: "feed", label: "Лента" },
      { id: "together", label: "Вместе", badge: counts.invites },
    ],
  }[section];
}
