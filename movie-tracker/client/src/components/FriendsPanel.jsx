import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function FriendsPanel({ onUserClick }) {
  // Добавили sendFriendRequest в деструктуризацию
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

  // НОВАЯ функция для отправки заявки (использует POST)
  const handleAddFriend = async (userId, e) => {
    e.stopPropagation(); // Чтобы не открывался профиль при клике на кнопку
    const result = await sendFriendRequest(userId);
    if (result.success) {
      alert('✅ ' + (result.message || 'Заявка отправлена!'));
      setSearchQuery('');
      setSearchResults([]);
    } else {
      alert('❌ ' + (result.error || 'Ошибка при отправке'));
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
      <h3 className="text-lg font-bold mb-4">Друзья</h3>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium ${
            activeTab === 'friends' ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-400'
          }`}
        >
          Друзья ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium relative ${
            activeTab === 'requests' ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-400'
          }`}
        >
          Заявки
          {requests.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {requests.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'friends' && (
        <div>
          {friends.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">Пока нет друзей</p>
          ) : (
            <div className="space-y-2">
              {friends.map(friend => (
                <div 
                  key={friend.id} 
                  onClick={() => onUserClick(friend.id)}
                  className="flex items-center gap-3 p-2 hover:bg-slate-700/50 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {friend.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{friend.username}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <div>
          {requests.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">Нет новых заявок</p>
          ) : (
            <div className="space-y-2">
              {requests.map(request => (
                <div 
                  key={request.id} 
                  onClick={() => onUserClick(request.id)}
                  className="flex items-center gap-3 p-2 hover:bg-slate-700/50 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {request.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{request.username}</div>
                  </div>
                  <button 
                    onClick={(e) => acceptRequest(request.id, e)} 
                    className="bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded text-xs flex-shrink-0"
                  >
                    ✓
                  </button>
                  <button 
                    onClick={(e) => rejectRequest(request.id, e)} 
                    className="bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded text-xs flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-slate-700">
        <h4 className="text-sm font-semibold text-slate-400 mb-2">Найти друзей</h4>
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по имени..."
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-orange-500"
          />
        </form>

        {searchResults.length > 0 && (
          <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
            {searchResults.map(user => (
              <div 
                key={user.id} 
                onClick={() => onUserClick(user.id)}
                className="flex items-center gap-3 p-2 hover:bg-slate-700/50 rounded-lg cursor-pointer transition-colors"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {user.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{user.username}</div>
                  <div className="text-xs text-slate-400">{user._count?.movies || 0} фильмов</div>
                </div>
                {/* ИСПРАВЛЕННАЯ КНОПКА: теперь вызывает handleAddFriend */}
                <button 
                  onClick={(e) => handleAddFriend(user.id, e)}
                  className="bg-orange-500 hover:bg-orange-600 px-3 py-1.5 rounded text-xs flex-shrink-0"
                >
                  +
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}