import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const Icon = ({ n, className = 'w-4 h-4' }) => (
  <img src={`https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/${n}.svg`} alt="" className={`${className} invert shrink-0`} />
);

const Avatar = ({ name, size = 'w-10 h-10', text = 'text-sm' }) => (
  <div className={`${size} ${text} rounded-full bg-gradient-to-br from-[#f47c4f] to-[#8a4fff] flex items-center justify-center font-bold text-white shrink-0 relative`}>
    {name?.[0]?.toUpperCase() || 'U'}
  </div>
);

const Chip = ({ children, tone = 'soft' }) => {
  const tones = {
    soft: 'bg-white/5 text-[#9aa0c8]',
    orange: 'bg-[#f47c4f]/15 text-[#f47c4f]',
    green: 'bg-emerald-500/15 text-emerald-300',
    blue: 'bg-sky-500/15 text-sky-300'
  };
  return <span className={`px-2 py-0.5 rounded text-[11px] ${tones[tone]}`}>{children}</span>;
};

export default function FriendsPanel({ onUserClick }) {
  const { searchUsers, getFriends, getFriendRequests, handleFriendRequest, sendFriendRequest, token } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('friends');
  const [lastWatchedData, setLastWatchedData] = useState({});
  const [loading, setLoading] = useState(true);

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
      setRequests(Array.isArray(data) ? data : []);
    } catch (e) {
      setRequests([]);
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

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Не в сети';
    const minutesAgo = Math.floor((new Date() - new Date(lastSeen)) / 1000 / 60);
    if (minutesAgo < 1) return 'Только что';
    if (minutesAgo < 60) return `${minutesAgo} мин назад`;
    const hours = Math.floor(minutesAgo / 60);
    if (hours < 24) return `${hours} ч назад`;
    return `${Math.floor(hours / 24)} дн назад`;
  };

  const tabs = [
    { id: 'friends', label: 'Друзья', count: friends.length },
    { id: 'requests', label: 'Заявки', count: requests.length, badge: true }
  ];

  return (
    <div className="bg-[#171a33] border border-white/5 rounded-xl p-6">
      {/* Табы */}
      <div className="flex gap-6 border-b border-white/5 mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`pb-3 -mb-px text-sm border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === t.id ? 'text-[#f47c4f] border-[#f47c4f]' : 'text-[#8a90b8] border-transparent hover:text-white'
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={`text-[11px] font-bold min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center ${
                t.badge && t.count > 0 
                  ? 'bg-[#f47c4f] text-[#1a1020]' 
                  : 'bg-white/10 text-[#8a90b8]'
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Список друзей */}

      {activeTab === 'friends' && (
  friends.length === 0 ? (
    <p className="text-[#8a90b8] text-sm text-center py-6">Пока нет друзей. Найди их через поиск ниже.</p>
  ) : (
    <div className="space-y-1">
      
      {friends.map(friend => {
  const lastSeenDate = friend.lastSeen ? new Date(friend.lastSeen) : null;
  const minutesAgo = lastSeenDate ? Math.floor((new Date() - lastSeenDate) / 1000 / 60) : null;
  const isOnline = minutesAgo !== null && minutesAgo < 10;
  const lastMovie = lastWatchedData[friend.id];

  return (
    <div 
      key={friend.id} 
      onClick={() => onUserClick(friend.id)}
      className="flex items-start gap-3 p-3 hover:bg-white/5 rounded-lg cursor-pointer transition-colors group"
    >
      <div className="relative shrink-0 mt-1">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f47c4f] to-[#8a4fff] flex items-center justify-center font-bold text-sm text-white">
          {friend.username?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#171a33] ${
          isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-gray-500'
        }`}></div>
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-semibold text-white truncate">{friend.username}</div>
          <div className={`text-[11px] font-medium ${isOnline ? 'text-emerald-400' : 'text-[#6f759e]'}`}>
            {isOnline ? 'Онлайн' : formatLastSeen(friend.lastSeen)}
          </div>
        </div>
        
        {lastMovie && (
          <div className="flex items-center gap-2 bg-[#1c2040] rounded-md p-2 border border-white/5">
            {lastMovie.posterUrl && (
              <img src={lastMovie.posterUrl} alt="" className="w-8 h-12 object-cover rounded-sm" />
            )}
            <div className="text-xs text-[#8a90b8]">
              Смотрел: <span className="text-[#c9cce6]">{lastMovie.title}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
})}
     


      
    </div>
  )
)}
      

      {/* Заявки в друзья */}
      {activeTab === 'requests' && (
        requests.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3 opacity-30">📬</div>
            <p className="text-[#8a90b8] text-sm">Нет новых заявок</p>
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map(request => (
              <div 
                key={request.id} 
                className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg transition-colors"
              >
                <Avatar name={request.username} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{request.username}</div>
                  <div className="text-xs text-[#8a90b8]">Хочет добавить вас в друзья</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => acceptRequest(request.id, e)}
                    className="p-2 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 rounded-md transition-colors"
                    title="Принять"
                  >
                    <Icon n="check" className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => rejectRequest(request.id, e)}
                    className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-md transition-colors"
                    title="Отклонить"
                  >
                    <Icon n="x" className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Поиск пользователей */}
            {/* Поиск пользователей */}
      <div className="mt-6 pt-6 border-t border-white/5">
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Icon n="search" className="w-4 h-4 opacity-50" />
          Найти друзей
        </h4>
        
        {/* Используем form для корректной работы кнопки "Поиск" на мобильных */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Icon n="search" className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50 w-4 h-4" />
            <input
              type="search" /* Ключевое изменение для мобильных клавиатур! */
              inputMode="search"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Имя пользователя"
              className="w-full bg-[#1c2040] border border-white/5 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-[#6f759e] focus:outline-none focus:border-[#f47c4f]/60 focus:ring-1 focus:ring-[#f47c4f]/30 transition-all"
            />
          </div>
          
          {/* Видимая кнопка для тапа пальцем */}
          <button
            type="submit"
            className="bg-[#f47c4f] hover:bg-[#f47c4f]/90 active:scale-95 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 shrink-0 shadow-lg shadow-[#f47c4f]/20"
          >
            <Icon n="search" className="w-4 h-4 sm:hidden" /> {/* Иконка только на мобильных */}
            <span className="hidden sm:inline">Найти</span> {/* Текст на планшетах/ПК */}
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
            {searchResults.map(user => (
              <div 
                key={user.id} 
                className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg transition-colors"
              >
                <Avatar name={user.username} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{user.username}</div>
                  <div className="text-xs text-[#8a90b8]">
                    {user._count?.movies || 0} фильмов в журнале
                  </div>
                </div>
                <button
                  onClick={(e) => handleAddFriend(user.id, e)}
                  className="px-3 py-1.5 bg-[#f47c4f]/20 hover:bg-[#f47c4f]/40 text-[#f47c4f] rounded-md text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <Icon n="user-plus" className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Добавить</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
    </div>
  );
}