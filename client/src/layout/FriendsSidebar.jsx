import Icon from "../components/Icon";
import { Avatar, Poster } from "../components/ui";
import { BTN_SOFT, PANEL } from "../components/styles";

function lastSeenText(lastSeen) {
  if (!lastSeen) return { online: false, text: "Не в сети" };
  const minutesAgo = Math.floor((Date.now() - new Date(lastSeen)) / 1000 / 60);
  if (minutesAgo < 5) return { online: true, text: "Онлайн" };
  if (minutesAgo < 60) return { online: false, text: `${minutesAgo} мин назад` };
  const hours = Math.floor(minutesAgo / 60);
  if (hours < 24) return { online: false, text: `${hours} ч назад` };
  return { online: false, text: `${Math.floor(hours / 24)} дн назад` };
}

// Правая колонка на широком экране: друзья, кто в сети и что смотрел последним
export default function FriendsSidebar({ friends, lastWatched, onOpenFriend, onOpenFriends }) {
  return (
    <aside className="hidden xl:flex w-[300px] shrink-0 sticky top-[72px] h-[calc(100dvh-72px)] flex-col gap-4 overflow-y-auto py-8 pr-8">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-white">Друзья</h3>
        <button onClick={onOpenFriends} className="text-[13px] font-bold text-[#ff935f] hover:text-[#ffb08a]">
          Все
        </button>
      </div>

      {friends.length === 0 ? (
        <p className={`${PANEL} text-sm text-[#8b91b5] text-center py-6 px-4`}>
          Пока никого. Найди друзей во вкладке «Друзья».
        </p>
      ) : (
        friends.map((f) => {
          const { online, text } = lastSeenText(f.lastSeen);
          const lastMovie = lastWatched[f.id];
          return (
            <button
              key={f.id}
              onClick={() => f.id && onOpenFriend(f.id)}
              className={`${PANEL} w-full flex items-start gap-3 p-3.5 text-left transition-colors hover:border-[#ff7a45]/40 group`}
            >
              <div className="relative shrink-0">
                <Avatar name={f.username} avatar={f.avatar} />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#12152a] ${
                    online ? "bg-[#4fd6a0]" : "bg-[#565c80]"
                  }`}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-extrabold text-white truncate group-hover:text-[#ff935f] transition-colors">
                  {f.username}
                </div>
                <div className={`text-xs mt-0.5 ${online ? "text-[#58dcaa] font-semibold" : "text-[#7b81a6]"}`}>{text}</div>

                {lastMovie && (
                  <div className="mt-2.5 flex items-center gap-2.5 rounded-xl bg-white/[0.04] p-2">
                    <div className="w-7 h-[42px] rounded-[5px] overflow-hidden shrink-0">
                      <Poster src={lastMovie.posterUrl} title={lastMovie.title} small />
                    </div>
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="text-[11px] text-[#8b91b5]">Смотрел</div>
                      <div className="text-xs font-bold text-[#e9ebf7] truncate" title={lastMovie.title}>
                        {lastMovie.title}
                      </div>
                      {lastMovie.rating && (
                        <div className="text-xs font-extrabold text-[#ff935f]">{lastMovie.rating}/10</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </button>
          );
        })
      )}

      <button
        onClick={onOpenFriends}
        className={`w-full min-h-[44px] flex items-center gap-2 rounded-xl px-4 text-sm ${BTN_SOFT} !text-[#8b91b5] hover:!text-white`}
      >
        <Icon n="search" className="w-4 h-4 opacity-60" />
        Поиск и добавление
      </button>
    </aside>
  );
}
