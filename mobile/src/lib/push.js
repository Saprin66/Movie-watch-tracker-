import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { storage } from "./storage";
import Constants from "expo-constants";
import { router } from "expo-router";
import { api } from "./api";

// Push-уведомления: заявки в друзья, приглашения и новые фильмы в общих списках.
// Сервер отправляет их через Expo Push (server/push.js).

const PUSH_TOKEN_KEY = "pushToken";

// Уведомление показывается, даже когда приложение открыто
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// id проекта Expo появляется в app.json после `npx eas-cli init` (см. mobile/README.md)
const projectId = () => Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

// Включает уведомления на этом телефоне и сообщает токен серверу.
// ask: показать системный запрос разрешения, если его ещё не было.
// Возвращает "enabled" | "denied" | "unsupported".
export async function registerForPush(authToken, { ask = true } = {}) {
  if (Platform.OS === "web" || !Device.isDevice || !projectId()) return "unsupported";

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Уведомления",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted" && ask) ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== "granted") return "denied";

  const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
  await api("/api/push", { token: authToken, method: "POST", body: { token: pushToken, platform: Platform.OS } });
  await storage.set(PUSH_TOKEN_KEY, pushToken);
  return "enabled";
}

// Отключает уведомления для этого телефона (при выходе из аккаунта)
export async function unregisterPush(authToken) {
  const pushToken = await storage.get(PUSH_TOKEN_KEY);
  if (!pushToken) return;
  await storage.remove(PUSH_TOKEN_KEY);
  await api("/api/push", { token: authToken, method: "DELETE", body: { token: pushToken } });
}

// После входа регистрирует телефон и открывает нужный экран по нажатию на уведомление
export function usePushNotifications(authToken, signedIn) {
  useEffect(() => {
    if (!signedIn || !authToken) return;
    registerForPush(authToken).catch((error) => console.warn("Push не включились:", error.message));
  }, [authToken, signedIn]);

  useEffect(() => {
    // В браузере уведомлений нет (сборка для браузера нужна только для проверки)
    if (!signedIn || Platform.OS === "web") return undefined;
    const open = (response) => {
      const url = response?.notification.request.content.data?.url;
      if (typeof url === "string" && url.startsWith("/")) router.push(url);
      // Чтобы то же уведомление не открылось снова после следующего входа
      Notifications.clearLastNotificationResponse();
    };
    // Приложение было закрыто, и его открыли нажатием на уведомление
    Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, [signedIn]);
}
