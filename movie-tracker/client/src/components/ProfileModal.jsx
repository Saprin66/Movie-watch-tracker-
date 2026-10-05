import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function ProfileModal({ userId, onClose }) {
  const { token, user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setProfile(data);
      setBio(data.bio || '');
    } catch (error) {
      console.error('Ошибка:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async () => {
    try {
      await fetch(`${API_URL}/api/users/${userId}/friend-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      fetchProfile();
    } catch (error) {
      console.error('Ошибка:', error);
    }
  };

  const updateProfile = async () => {
    try {
      await fetch(`${API_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bio })
      });
      setIsEditing(false);
      fetchProfile();
    } catch (error) {
      console.error('Ошибка:', error);
    }
  };

  if (!userId) return null;

  const isOwnProfile = currentUser?.id === userId;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto border border-slate-700">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center text-2xl font-bold">
                {profile?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{profile?.username}</h2>
                <p className="text-slate-400 text-sm">На сайте с {new Date(profile?.createdAt).toLocaleDateString('ru-RU')}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">Загрузка...</div>
          ) : (
            <>
              {/* Биография */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-400 mb-2">О себе</h3>
                {isEditing ? (
                  <div>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-orange-500"
                      rows="3"
                      placeholder="Расскажи о себе..."
                    />
                    <div className="flex gap-2 mt-2">
                      <button onClick={updateProfile} className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-lg text-sm">
                        Сохранить
                      </button>
                      <button onClick={() => setIsEditing(false)} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm">
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-slate-300">{profile?.bio || 'Биография не заполнена'}</p>
                    {isOwnProfile && (
                      <button onClick={() => setIsEditing(true)} className="text-orange-400 hover:text-orange-300 text-sm">
                        Редактировать
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Статистика */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-800 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-orange-400">{profile?._count?.movies || 0}</div>
                  <div className="text-xs text-slate-400">Фильмов</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-400">0</div>
                  <div className="text-xs text-slate-400">Друзей</div>
                </div>
              </div>

              {/* Кнопки действий */}
              {!isOwnProfile && (
                <div className="space-y-2">
                  {profile?.friendshipStatus === 'none' && (
                    <button onClick={sendFriendRequest} className="w-full bg-orange-500 hover:bg-orange-600 py-3 rounded-lg font-medium">
                      Добавить в друзья
                    </button>
                  )}
                  {profile?.friendshipStatus === 'pending' && (
                    <div className="text-center text-slate-400 py-3">Заявка отправлена</div>
                  )}
                  {profile?.friendshipStatus === 'accepted' && (
                    <div className="text-center text-green-400 py-3">✓ Вы друзья</div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}