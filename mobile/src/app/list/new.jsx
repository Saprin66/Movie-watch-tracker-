import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useApiCall, useFriends } from "../../lib/social";
import { Avatar, Button, COLORS, Field, Icon, Notice, ScreenHeader } from "../../components/ui";

// Новый общий список: название и друзья, которых пригласить
export default function NewListScreen() {
  const { data: friends = [] } = useFriends();
  const call = useApiCall();
  const [name, setName] = useState("");
  const [memberIds, setMemberIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id) => setMemberIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const create = async () => {
    setSaving(true);
    setError("");
    try {
      const list = await call("/api/lists", { method: "POST", body: { name: name.trim(), memberIds } }, [["lists"]]);
      router.replace(`/list/${list.id}`);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScreenHeader title="Новый общий список" onBack={() => router.back()} />
      <ScrollView contentContainerClassName="gap-5 px-4 pb-10" keyboardShouldPersistTaps="handled">
        <Text className="text-sm text-muted">Друзья смогут добавлять сюда фильмы, которые хотят посмотреть вместе.</Text>
        <Field label="Название" value={name} onChangeText={setName} maxLength={60} placeholder="Например, Пятничное кино" />
        <View className="gap-2">
          <Text className="text-[13px] font-bold text-soft">
            Кого пригласить <Text className="font-medium text-faint">друзья получат приглашение</Text>
          </Text>
          {friends.length === 0 ? (
            <Text className="text-sm text-muted">Друзей пока нет. Список можно создать и пригласить их позже.</Text>
          ) : (
            friends.map((f) => {
              const selected = memberIds.includes(f.id);
              return (
                <Pressable
                  key={f.id}
                  onPress={() => toggle(f.id)}
                  className={`flex-row items-center gap-3 p-2.5 rounded-xl border ${selected ? "border-accent bg-accent/10" : "border-white/[0.08] bg-panel"}`}
                >
                  <Avatar name={f.username} uri={f.avatar} size={36} />
                  <Text className="flex-1 text-sm font-bold text-white">{f.username}</Text>
                  <View className={`w-[22px] h-[22px] rounded-md border items-center justify-center ${selected ? "bg-accent border-accent" : "border-white/30"}`}>
                    {selected && <Icon name="check" size={14} color={COLORS.onAccent} />}
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
        {error ? <Notice error>{error}</Notice> : null}
        <Button title="Создать список" loading={saving} disabled={!name.trim()} onPress={create} />
      </ScrollView>
    </SafeAreaView>
  );
}
