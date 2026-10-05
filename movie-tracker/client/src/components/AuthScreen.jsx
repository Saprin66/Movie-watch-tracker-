import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    const result = isLogin 
      ? await login(username, password)
      : await register(username, email, password);
      
    setIsLoading(false);
    
    if (!result.success) {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 flex items-center justify-center p-4">
      {/* Декоративные пятна на фоне */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative w-full max-w-md bg-slate-900/60 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 shadow-2xl shadow-black/50">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3 drop-shadow-lg">🎬</div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
            Movie Grade
          </h1>
          <p className="text-slate-300 mt-2 text-sm">Твой личный дневник киномана</p>
        </div>

        {/* Переключатель Вход / Регистрация */}
        <div className="flex bg-slate-950/50 rounded-xl p-1.5 mb-8 border border-slate-800">
          <button
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
              isLogin 
                ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/25' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Вход
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
              !isLogin 
                ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/25' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Поле Имя пользователя */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Имя пользователя</label>
            <div className="relative">
              <svg className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 pl-11 text-white placeholder:text-white/60 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                placeholder="Введите имя пользователя"
              />
            </div>
          </div>

          {/* Поле Email (только для регистрации) */}
          {!isLogin && (
            <div className="animate-fade-in">
              <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Email</label>
              <div className="relative">
                <svg className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 pl-11 text-white placeholder:text-white/60 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                  placeholder="Введите email"
                />
              </div>
            </div>
          )}

          {/* Поле Пароль */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Пароль</label>
            <div className="relative">
              <svg className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isLogin ? "current-password" : "new-password"}
                className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-4 py-3 pl-11 text-white placeholder:text-white/60 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                placeholder="Введите пароль"
              />
            </div>
          </div>

          {/* Сообщение об ошибке */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm p-3 rounded-xl flex items-center gap-2 animate-pulse">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Кнопка отправки */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 mt-6"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Загрузка...
              </>
            ) : (
              isLogin ? 'Войти в аккаунт' : 'Создать аккаунт'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}