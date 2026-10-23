import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "../lib/auth";
import { useApiCall, useProfile } from "../lib/social";
import { pickAvatar } from "../lib/avatar";
import { POLICY_URL } from "../lib/config";
import { Avatar, Button, COLORS, Field, Icon, Notice, Panel, ScreenHeader, SectionTitle } from "../components/ui";
import PushSettings from "../components/PushSettings";

// Блок настроек: иконка, заголовок, пояснение и содержимое
function Section({ icon, title, text, children, danger }) {
  return (
    <View className={`rounded-[20px] border p-5 gap-4 ${danger ? "border-red-400/25 bg-red-500/[0.06]" : "border-white/[0.07] bg-panel"}`}>
      <View className="flex-row items-center gap-3">
        <View className={`w-[38px] h-[38px] rounded-xl items-center justify-center ${danger ? "bg-red-400/[0.14]" : "bg-accent/[0.14]"}`}>
          <Icon name={icon} size={18} color={danger ? "#fca5a5" : COLORS.accent} />
        </View>
        <SectionTitle className="flex-1">{title}</SectionTitle>
      </View>
      {text ? <Text className="text-sm leading-5 text-muted">{text}</Text> : null}
      {children}
    </View>
  );
}

// Сообщение об успехе или ошибке под действием
const Result = ({ value }) => (value ? <Notice error={value.error}>{value.text}</Notice> : null);

// «Настройки профиля»: аватар, ник, о себе, уведомления, выход и удаление аккаунта
export default function SettingsScreen() {
  const { user, refreshUser, logout, deleteAccount } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const call = useApiCall();

  const [busy, setBusy] = useState(null);
  const [results, setResults] = useState({});
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (profile) {
      setBio(profile.bio || "");
    }
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Выполняет действие и пишет результат под нужным блоком
  const run = async (key, action, successText) => {
    setBusy(key);
    setResults((r) => ({ ...r, [key]: null }));
    try {
      await action();
      if (successText) setResults((r) => ({ ...r, [key]: { text: successText } }));
    } catch (e) {
      setResults((r) => ({ ...r, [key]: { error: true, text: e.message } }));
    } finally {
      setBusy(null);
    }
  };

  const changeAvatar = () =>
    run("avatar", async () => {
      const avatar = await pickAvatar();
      if (!avatar) return;
      await call("/api/users/profile", { method: "PUT", body: { avatar } }, [["profile"]]);
      await refreshUser();
    });

  const removeAvatar = () =>
    run(
      "avatar",
      async () => {
        await call("/api/users/profile", { method: "PUT", body: { avatar: null } }, [["profile"]]);
        await refreshUser();
      },
      "Аватар удалён.",
    );

  const confirmDelete = () =>
    Alert.alert(
      "Удалить аккаунт навсегда?",
      "Журнал, оценки, отзывы, друзья и созданные тобой общие списки удалятся без возможности восстановления.",
      [
        { text: "Отмена", style: "cancel" },
        { text: "Удалить", style: "destructive", onPress: () => run("delete", () => deleteAccount(password)) },
      ],
    );

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScreenHeader title="Настройки профиля" onBack={() => router.back()} />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerClassName="gap-5 px-4 pb-12" keyboardShouldPersistTaps="handled">
          <Section icon="image" title="Фото профиля" text="Выбери изображение из галереи. Оно будет обрезано по размеру и сжато.">
            <View className="flex-row items-center gap-4">
              <Avatar name={user?.username} uri={user?.avatar} size={80} rounded="rounded-3xl" />
              <View className="flex-1 gap-2">
                <Button size="md" title="Выбрать фото" loading={busy === "avatar"} onPress={changeAvatar} />
                {user?.avatar && (
                  <Button size="md" variant="soft" title="Удалить фото" disabled={busy === "avatar"} onPress={removeAvatar} />
                )}
              </View>
            </View>
            <Result value={results.avatar} />
          </Section>

          <Section icon="user" title="Никнейм и о себе">
            <Field label="Никнейм" value={username} onChangeText={setUsername} maxLength={20} autoCapitalize="none" />
            <Button
              size="md"
              variant="soft"
              title="Сменить ник"
              loading={busy === "username"}
              disabled={username.trim().length < 3 || username.trim() === user?.username}
              onPress={() =>
                run(
                  "username",
                  async () => {
                    await call("/api/auth/me", { method: "PUT", body: { username: username.trim() } }, [["profile"]]);
                    await refreshUser();
                  },
                  "Ник успешно изменён",
                )
              }
            />
            <Result value={results.username} />
            <Field
              label="О себе"
              value={bio}
              onChangeText={setBio}
              maxLength={300}
              multiline
              textAlignVertical="top"
              placeholder="Пара слов о том, что любишь смотреть"
            />
            <Button
              size="md"
              variant="soft"
              title="Сохранить описание"
              loading={busy === "bio"}
              disabled={bio.trim() === (profile?.bio || "")}
              onPress={() =>
                run("bio", () => call("/api/users/profile", { method: "PUT", body: { bio: bio.trim() || null } }, [["profile"]]), "Описание сохранено")
              }
            />
            <Result value={results.bio} />
          </Section>

          <PushSettings />

          <Section icon="log-out" title="Сессия" text="Выйти из аккаунта на этом телефоне.">
            <Button size="md" variant="red" icon="log-out" title="Выйти из аккаунта" onPress={logout} />
          </Section>

          <Section
            danger
            icon="trash-2"
            title="Удаление аккаунта"
            text="Аккаунт удалится навсегда вместе с журналом, оценками, отзывами, друзьями и созданными тобой общими списками."
          >
            <Field
              label="Пароль для подтверждения"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
            />
            <Button size="md" variant="red" title="Удалить аккаунт" disabled={!password} loading={busy === "delete"} onPress={confirmDelete} />
            <Result value={results.delete} />
          </Section>

          <Pressable onPress={() => Linking.openURL(POLICY_URL)} className="items-center py-2">
            <Text className="text-[13px] font-bold text-muted">Политика конфиденциальности</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
