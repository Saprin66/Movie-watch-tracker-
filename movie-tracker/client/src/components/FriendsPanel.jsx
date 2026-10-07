import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Icon = ({ n, className = 'w-4 h-4' }) => (
  <img src={`https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/${n}.svg`} alt="" className={`${className} invert shrink-0`} />
);

const Avatar = ({ name }) => (
  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f47c4f] to-[#8a4fff] flex items-center justify-center font-bold text-sm text-white shrink-0">
    {name?.[0]?.toUpperCase() || 'U'}
  </div>
);

function Row({ name, sub, onClick, children }) {
  return (
    <div onClick={onClick} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
      <Avatar name={name} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-white truncate">{name}</div>
        {sub && <div className="text-xs text-[#8a90b8]">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

const IconBtn = ({ icon, tone, onClick, title }) => (
  <button
    onClick={onClick}
    title={title}
    className={`p-2 rounded-md shrink-0 transition-colors ${tone}`}
  >
    <Icon n={icon} className="w-4 h-4" />
  </button>
);

export default function FriendsPanel({ onUserClick }) {
  const { searchUsers, getFriends, getFriendRequests, handleFriendRequest, sendFriendRequest } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('friends');

  useEffect(() => {
    loadFriends();
    loadRequests();
  }, []);

  const loadFriends = async () => {
    try {
      const data = await getFriends();
      setFriends(Array.isArray(data) ? data : []);
    } catch (e) {
      setFriends([]);
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

  // Отправка заявки (POST)
  const handleAddFriend = async (userId, e) => {
    e.stopPropagation(); // Чтобы не открывался профиль при клике на кнопку
    const result = await sendFriendRequest(userId);
    if (result.success) {
      alert(result.message || 'Заявка отправлена!');
      setSearchQuery('');
      setSearchResults([]);
    } else {
      alert(result.error || 'Ошибка при отправке');
    }
  };

  const tabs = [
    { id: 'friends', label: `Друзья (${friends.length})` },
    { id: 'requests', label: 'Заявки', badge: requests.length }
  ];

  return (
    <div className="bg-[#171a33] border border-white/5 rounded-xl p-6">
      <div className="flex gap-6 border-b border-white/5 mb-4">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`pb-3 -mb-px text-sm border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === t.id ? 'text-[#f47c4f] border-[#f47c4f]' : 'text-[#8a90b8] border-transparent hover:text-white'
            }`}
          >
            {t.label}
            {t.badge > 0 && (
              <span className="bg-[#f47c4f] text-[#1a1020] text-[11px] font-bold min-w-5 h-5 px-1 rounded-full flex items-center justify-center">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'friends' && (
        friends.length === 0 ? (
          <p className="text-[#8a90b8] text-sm text-center py-6">Пока нет друзей. Найди их через поиск ниже.</p>
        ) : (
          <div className="space-y-1">
            {friends.map(friend => (
              <Row key={friend.id} name={friend.username} onClick={() => onUserClick(friend.id)} />
            ))}
          </div>
        )
      )}

      {activeTab === 'requests' && (
        requests.length === 0 ? (
          <p className="text-[#8a90b8] text-sm text-center py-6">Нет новых заявок</p>
        ) : (
          <div className="space-y-1">
            {requests.map(request => (
              <Row key={request.id} name={request.username} onClick={() => onUserClick(request.id)}>
                <IconBtn icon="check" title="Принять" tone="bg-emerald-500/20 hover:bg-emerald-500/40" onClick={(e) => acceptRequest(request.id, e)} />
                <IconBtn icon="x" title="Отклонить" tone="bg-red-500/20 hover:bg-red-500/40" onClick={(e) => rejectRequest(request.id, e)} />
              </Row>
            ))}
          </div>
        )
      )}

      <div className="mt-6 pt-6 border-t border-white/5">
        <h4 className="text-sm font-semibold text-white mb-3">Найти друзей</h4>
        <form onSubmit={handleSearch} className="relative">
          <Icon n="search" className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по имени"
            className="w-full bg-[#1c2040] border border-white/5 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-[#6f759e] focus:outline-none focus:border-[#f47c4f]/60"
          />
        </form>

        {searchResults.length > 0 && (
          <div className="mt-3 space-y-1 max-h-56 overflow-y-auto">
            {searchResults.map(user => (
              <Row key={user.id} name={user.username} sub={`${user._count?.movies || 0} фильмов`} onClick={() => onUserClick(user.id)}>
                <IconBtn icon="user-plus" title="Добавить в друзья" tone="bg-[#f47c4f]/20 hover:bg-[#f47c4f]/40" onClick={(e) => handleAddFriend(user.id, e)} />
              </Row>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
