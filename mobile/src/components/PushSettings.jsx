import { useEffect, useState } from "react";
import { Linking, Text, View } from "react-native";
import * as Notifications from "expo-notifications";
import { useAuth } from "../lib/auth";
import { registerForPush } from "../lib/push";
import { Button, COLORS, Icon, Notice } from "./ui";

const TEXT = {
  enabled: "Уведомления включены: заявки в друзья, приглашения и новые фильмы в общих списках.",
  denied: "Уведомления выключены в настройках телефона.",
  unsupported: "Уведомления заработают в установленной версии приложения (в Expo Go и симуляторе их нет).",
};

// Блок настроек: включены ли push-уведомления, и кнопка, чтобы включить
export default function PushSettings() {
  const { token } = useAuth();
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    registerForPush(token, { ask: false })
      .then(setStatus)
      .catch(() => setStatus("denied"));
  }, [token]);

  const enable = async () => {
    setError("");
    try {
      const { canAskAgain } = await Notifications.getPermissionsAsync();
      if (status === "denied" && !canAskAgain) {
        Linking.openSettings();
        return;
      }
      setStatus(await registerForPush(token));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <View className="rounded-[20px] border border-white/[0.07] bg-panel p-5 gap-4">
      <View className="flex-row items-center gap-3">
        <View className="w-[38px] h-[38px] rounded-xl bg-accent/[0.14] items-center justify-center">
          <Icon name="bell" size={18} color={COLORS.accent} />
        </View>
        <Text className="flex-1 text-[17px] font-semibold text-white">Уведомления</Text>
      </View>
      {status && <Text className="text-sm leading-5 text-muted">{TEXT[status]}</Text>}
      {status === "denied" && <Button size="md" title="Включить уведомления" onPress={enable} />}
      {error ? <Notice error>{error}</Notice> : null}
    </View>
  );
}
