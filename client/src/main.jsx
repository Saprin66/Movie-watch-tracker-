import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Регистрируем PWA и автоматически применяем доступные обновления.
const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return

    // Периодически проверяем обновления, пока приложение открыто.
    window.setInterval(() => {
      if (navigator.onLine) registration.update().catch(() => {})
    }, 60 * 60 * 1000)

    // При возвращении в приложение сразу проверяем, не вышла ли новая версия.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        registration.update().catch(() => {})
      }
    })
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
