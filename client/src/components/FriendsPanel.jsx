import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from './ConfirmDialog';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const Icon = ({ n, className = 'w-4 h-4' }) => (
  <img src={`https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/${n}.svg`} alt="" className={`${className} invert shrink-0`} />
);

const Avatar = ({ name, avatar, size = 'w-10 h-10', text = 'text-sm' }) => (
  <div className={`${size} ${text} rounded-full bg-gradient-to-br from-[#ff7a45] to-[#8b5cf6] flex items-center justify-center font-bold text-white shrink-0 relative overflow-hidden`}>
    {avatar ? <img src={avatar} alt='' className='w-full h-full object-cover' /> : (name?.[0]?.toUpperCase() || 'U')}
  </div>
);

export default function FriendsPanel({ onUserClick, onRequestsChange, onFriendsChange }) {
  const { searchUsers, getFriends, getFriendRequests, handleFriendRequest, sendFriendRequest, removeFriend, token } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [lastWatchedData, setLastWatchedData] = useState({});
  const [loading, setLoading] = useState(true);
  const [friendToRemove, setFriendToRemove] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');

  useEffect(() => {
    loadFriends();
    loadRequests();
  }, []);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const data = await getFriends();
      const friendsList = Array.isArray(data) ? data : [];
      setFriends(friendsList);

      const lwData = {};
      const promises = friendsList.map(async (friend) => {
        try {
          const res = await fetch(`${API_URL}/api/users/${friend.id}/last-watched`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const movie = await res.json();
            if (movie) lwData[friend.id] = movie;
          }
        } catch (err) {
          console.error(`Ошибка загрузки фильма для ${friend.username}:`, err);
        }
      });
      
      await Promise.all(promises);
      setLastWatchedData(lwData);
    } catch (e) {
      console.error('Ошибка loadFriends:', e);
      setFriends([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async () => {
    try {
      const data = await getFriendRequests();
      const list = Array.isArray(data) ? data : [];
      setRequests(list);
      onRequestsChange?.(list.length);
    } catch (e) {
      setRequests([]);
      onRequestsChange?.(0);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const results = await searchUsers(searchQuery);
    setSearchResults(Array.isArray(results) ? results : []);
  };

  const acceptRequest = async (userId, e) => {
    e.stopPropagation();
    await handleFriendRequest(userId, 'accept');
    loadRequests();
    loadFriends();
  };

  const rejectRequest = async (userId, e) => {
    e.stopPropagation();
    await handleFriendRequest(userId, 'reject');
    loadRequests();
  };

  const handleAddFriend = async (userId, e) => {
    e.stopPropagation();
    const result = await sendFriendRequest(userId);
    if (result.success) {
      alert(result.message || 'Заявка отправлена!');
      setSearchQuery('');
      setSearchResults([]);
    } else {
      alert(result.error || 'Ошибка при отправке');
    }
  };

  const confirmRemove = async () => {
    if (!friendToRemove) return;
    setRemoving(true);
    setRemoveError('');
    const result = await removeFriend(friendToRemove.id);
    setRemoving(false);
    if (!result.success) {
      setRemoveError(result.error);
      return;
    }
    setFriendToRemove(null);
    onFriendsChange?.();
    loadFriends();
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Не в сети';
    const minutesAgo = Math.floor((new Date() - new Date(lastSeen)) / 1000 / 60);
    if (minutesAgo < 1) return 'Только что';
    if (minutesAgo < 60) return `${minutesAgo} мин назад`;
    const hours = Math.floor(minutesAgo / 60);
    if (hours < 24) return `${hours} ч назад`;
    return `${Math.floor(hours / 24)} дн назад`;
  };

  const sectionTitle = 'font-display text-base sm:text-[17px] font-semibold text-white flex items-center gap-2.5';
  const countPill = (n, hot) => (
    <span className={`font-sans text-xs font-extrabold min-w-[22px] h-[22px] px-2 rounded-full inline-flex items-center justify-center ${hot ? 'bg-[#ff7a45] text-[#1b0d07]' : 'bg-white/[0.08] text-[#aeb3d6]'}`}>
      {n}
    </span>
  );

  return (
    <div className="space-y-9">
      {/* Заявки в друзья */}
      <section className="space-y-3.5">
        <h2 className={sectionTitle}>Заявки в друзья {countPill(requests.length, requests.length > 0)}</h2>
        {requests.length === 0 ? (
          <div className="bg-[#12152a] border border-white/[0.07] rounded-[20px] flex items-center gap-4 p-5">
            <div className="w-11 h-11 rounded-[14px] bg-white/[0.05] flex items-center justify-center shrink-0">
              <Icon n="inbox" className="w-5 h-5 opacity-50" />
            </div>
            <p className="text-[#8b91b5] text-sm">Нет новых заявок</p>
          </div>
        ) : (
          <div className="bg-[#12152a] border border-white/[0.07] rounded-[20px] p-2 divide-y divide-white/[0.06]">
            {requests.map(request => (
              <div key={request.id} className="flex flex-wrap items-center gap-3.5 p-3">
                <button type="button" onClick={() => onUserClick(request.id)} className="flex items-center gap-3.5 flex-1 min-w-[180px] text-left">
                  <Avatar name={request.username} avatar={request.avatar} size="w-11 h-11" />
                  <span className="min-w-0">
                    <span className="block text-[15px] font-extrabold text-white truncate">{request.username}</span>
                    <span className="block text-xs text-[#8b91b5] mt-0.5">Хочет добавить вас в друзья</span>
                  </span>
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => acceptRequest(request.id, e)}
                    className="inline-flex items-center gap-2 h-11 px-5 bg-[#ff7a45] hover:bg-[#ff9166] text-[#1b0d07] rounded-xl text-sm font-extrabold transition-colors"
                  >
                    <Icon n="check" className="w-4 h-4 [filter:brightness(0.1)]" /> Принять
                  </button>
                  <button
                    onClick={(e) => rejectRequest(request.id, e)}
                    className="w-11 h-11 flex items-center justify-center bg-white/[0.07] hover:bg-red-500/20 rounded-xl transition-colors"
                    aria-label={`Отклонить заявку от ${request.username}`}
                    title="Отклонить"
                  >
                    <Icon n="x" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Список друзей */}
      <section className="space-y-3.5">
        <h2 className={sectionTitle}>Мои друзья {countPill(friends.length, false)}</h2>
        {loading && friends.length === 0 ? (
          <div className="grid sm:grid-cols-2 gap-3.5">
            {[0, 1].map((i) => <div key={i} className="h-[84px] rounded-[20px] bg-white/[0.04] animate-pulse" />)}
          </div>
        ) : friends.length === 0 ? (
          <p className="bg-[#12152a] border border-white/[0.07] rounded-[20px] text-[#8b91b5] text-sm text-center py-8 px-4">Пока нет друзей. Найди их через поиск ниже.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3.5">
            {friends.map(friend => {
              const lastSeenDate = friend.lastSeen ? new Date(friend.lastSeen) : null;
              const minutesAgo = lastSeenDate ? Math.floor((new Date() - lastSeenDate) / 1000 / 60) : null;
              const isOnline = minutesAgo !== null && minutesAgo < 10;
              const lastMovie = lastWatchedData[friend.id];

              return (
                <div
                  key={friend.id}
                  className="flex items-center gap-2 p-2 pr-2.5 bg-[#12152a] border border-white/[0.07] rounded-[20px] hover:border-[#ff7a45]/40 transition-colors group"
                >
                <button
                  type="button"
                  onClick={() => onUserClick(friend.id)}
                  className="flex-1 min-w-0 flex items-center gap-3.5 p-2 text-left rounded-2xl"
                >
                  <span className="relative shrink-0">
                    <Avatar name={friend.username} avatar={friend.avatar} size="w-12 h-12" />
                    <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#12152a] ${isOnline ? 'bg-[#4fd6a0]' : 'bg-[#565c80]'}`} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-extrabold text-white truncate group-hover:text-[#ff935f] transition-colors">{friend.username}</span>
                    <span className={`block text-xs mt-0.5 ${isOnline ? 'text-[#58dcaa] font-semibold' : 'text-[#7b81a6]'}`}>
                      {isOnline ? 'Онлайн' : formatLastSeen(friend.lastSeen)}
                    </span>
                    {lastMovie && (
                      <span className="block text-xs text-[#8b91b5] mt-1.5 truncate">
                        Последнее: <span className="text-[#c4c8e4] font-semibold">{lastMovie.title}</span>
                        {lastMovie.rating && <span className="text-[#ff935f] font-bold"> · {lastMovie.rating}/10</span>}
                      </span>
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => { setRemoveError(''); setFriendToRemove(friend); }}
                  aria-label={`Удалить ${friend.username} из друзей`}
                  title="Удалить из друзей"
                  className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-white/[0.05] hover:bg-red-500/20 transition-colors"
                >
                  <Icon n="user-minus" className="w-[18px] h-[18px] opacity-70" />
                </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Поиск пользователей */}
      <section className="space-y-3.5">
        <h2 className={sectionTitle}>Найти друзей</h2>

        {/* form нужна для кнопки «Поиск» на клавиатуре телефона */}
        <form onSubmit={handleSearch} className="flex gap-2.5">
          <div className="relative flex-1">
            <Icon n="search" className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50 w-[18px] h-[18px]" />
            <input
              type="search"
              inputMode="search"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Имя пользователя"
              aria-label="Имя пользователя"
              className="w-full h-12 bg-[#12152a] border border-white/[0.09] rounded-2xl pl-11 pr-4 text-base sm:text-sm text-white placeholder:text-[#6f759e] focus:outline-none focus:border-[#ff7a45] focus:ring-[3px] focus:ring-[#ff7a45]/20 transition"
            />
          </div>
          <button
            type="submit"
            aria-label="Найти"
            className="h-12 bg-[#ff7a45] hover:bg-[#ff9166] active:scale-95 text-[#1b0d07] px-4 sm:px-6 rounded-2xl text-sm font-extrabold transition flex items-center gap-2 shrink-0"
          >
            <Icon n="search" className="w-5 h-5 sm:hidden [filter:brightness(0.1)]" />
            <span className="hidden sm:inline">Найти</span>
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="bg-[#12152a] border border-white/[0.07] rounded-[20px] p-2 divide-y divide-white/[0.06] max-h-80 overflow-y-auto">
            {searchResults.map(user => (
              <div key={user.id} className="flex items-center gap-3.5 p-3">
                <Avatar name={user.username} avatar={user.avatar} size="w-11 h-11" />
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-extrabold text-white truncate">{user.username}</div>
                  <div className="text-xs text-[#8b91b5] mt-0.5">
                    {user._count?.movies || 0} фильмов в журнале
                  </div>
                </div>
                <button
                  onClick={(e) => handleAddFriend(user.id, e)}
                  aria-label={`Добавить ${user.username} в друзья`}
                  className="h-11 px-3.5 sm:px-4 bg-white/[0.07] hover:bg-[#ff7a45]/20 text-[#e9ebf7] rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
                >
                  <Icon n="user-plus" className="w-4 h-4" />
                  <span className="hidden sm:inline">Добавить</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {friendToRemove && (
        <ConfirmDialog
          title="Удалить из друзей?"
          message={<>Вы точно хотите удалить <b className="text-white">{friendToRemove.username}</b> из друзей? Вы перестанете видеть отзывы друг друга, а его записи пропадут из вашей ленты. Позже можно снова отправить заявку.</>}
          confirmLabel="Удалить из друзей"
          icon="user-minus"
          busy={removing}
          error={removeError}
          onConfirm={confirmRemove}
          onClose={() => setFriendToRemove(null)}
        />
      )}
    </div>
  );
}
