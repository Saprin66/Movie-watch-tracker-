import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './hooks/useUiStyle'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Регистрируем PWA и автоматически применяем доступные обновления.
const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return

    const checkForUpdate = () => {
      if (navigator.onLine) registration.update().catch(() => {})
    }

    // Периодически проверяем обновления, пока сайт открыт: на компьютере
    // вкладка может висеть открытой днями.
    window.setInterval(checkForUpdate, 10 * 60 * 1000)

    // При возвращении на сайт сразу проверяем, не вышла ли новая версия.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate()
    })
    window.addEventListener('focus', checkForUpdate)
    window.addEventListener('online', checkForUpdate)
  },
  onRegisterError(error) {
    console.error('Не удалось зарегистрировать PWA service worker:', error)
  },
})

// Оставляем обработчик доступным для диагностики в браузере.
void updateSW

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
