import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { useApiCall, useFriendRequests, useFriends } from "../lib/social";
import { useAnswerFriendRequest, useConfirmRemoveFriend } from "../lib/friends";
import { openUser } from "../lib/nav";
import { pluralize } from "../utils/plural";
import { Avatar, Button, COLORS, Field, Icon, Notice, Panel, ScreenHeader, SectionTitle } from "../components/ui";
import FriendRow from "../components/FriendRow";

const CountPill = ({ n, hot }) => (
  <View className={`min-w-[22px] h-[22px] px-2 rounded-full items-center justify-center ${hot ? "bg-accent" : "bg-white/[0.08]"}`}>
    <Text className={`text-xs font-extrabold ${hot ? "text-on-accent" : "text-soft"}`}>{n}</Text>
  </View>
);

// «Друзья»: заявки, список друзей и поиск людей
export default function FriendsScreen() {
  const { token } = useAuth();
  const { data: friends = [], isLoading } = useFriends();
  const { data: requests = [] } = useFriendRequests();
  const answer = useAnswerFriendRequest();
  const confirmRemove = useConfirmRemoveFriend();
  const call = useApiCall();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [sent, setSent] = useState({}); // id -> текст результата заявки

  const search = async () => {
    if (!query.trim()) return;
    setSearchError("");
    try {
      setResults(await api(`/api/users/search?query=${encodeURIComponent(query.trim())}`, { token }));
    } catch (e) {
      setSearchError(e.message);
    }
  };

  const addFriend = async (user) => {
    try {
      const data = await call(`/api/users/${user.id}/friend-request`, { method: "POST" });
      setSent((s) => ({ ...s, [user.id]: data.message || "Заявка отправлена" }));
    } catch (e) {
      setSent((s) => ({ ...s, [user.id]: e.message }));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScreenHeader title="Друзья" onBack={() => router.back()} />
      <ScrollView contentContainerClassName="gap-9 px-4 pb-10" keyboardShouldPersistTaps="handled">
        <View className="gap-3.5">
          <View className="flex-row items-center gap-2.5">
            <SectionTitle>Заявки в друзья</SectionTitle>
            <CountPill n={requests.length} hot={requests.length > 0} />
          </View>
          {requests.length === 0 ? (
            <Panel className="flex-row items-center gap-4 p-5">
              <Icon name="inbox" size={20} color={COLORS.muted} />
              <Text className="text-sm text-muted">Нет новых заявок</Text>
            </Panel>
          ) : (
            <Panel className="p-2">
              {requests.map((r) => (
                <View key={r.id} className="p-3 gap-3">
                  <Pressable onPress={() => openUser(r.id)} className="flex-row items-center gap-3.5">
                    <Avatar name={r.username} uri={r.avatar} size={44} />
                    <View className="flex-1">
                      <Text className="text-[15px] font-extrabold text-white">{r.username}</Text>
                      <Text className="text-xs text-muted mt-0.5">Хочет добавить вас в друзья</Text>
                    </View>
                  </Pressable>
                  <View className="flex-row gap-2">
                    <Button className="flex-1" size="md" icon="check" title="Принять" onPress={() => answer(r.id, "accept")} />
                    <Button className="flex-1" size="md" variant="soft" title="Отклонить" onPress={() => answer(r.id, "reject")} />
                  </View>
                </View>
              ))}
            </Panel>
          )}
        </View>

        <View className="gap-3.5">
          <View className="flex-row items-center gap-2.5">
            <SectionTitle>Мои друзья</SectionTitle>
            <CountPill n={friends.length} />
          </View>
          {friends.length === 0 ? (
            <Panel className="py-8 px-4">
              <Text className="text-center text-sm text-muted">
                {isLoading ? "Загружаю…" : "Пока нет друзей. Найди их через поиск ниже."}
              </Text>
            </Panel>
          ) : (
            <Panel className="p-1.5">
              {friends.map((friend) => (
                <FriendRow
                  key={friend.id}
                  friend={friend}
                  right={
                    <Pressable
                      onPress={() => confirmRemove(friend)}
                      className="w-11 h-11 mr-1 items-center justify-center rounded-xl bg-white/[0.05]"
                    >
                      <Icon name="user-minus" size={18} color={COLORS.muted} />
                    </Pressable>
                  }
                />
              ))}
            </Panel>
          )}
        </View>

        <View className="gap-3.5">
          <SectionTitle>Найти друзей</SectionTitle>
          <View className="flex-row gap-2.5">
            <Field
              className="flex-1"
              icon="search"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={search}
              returnKeyType="search"
              autoCapitalize="none"
              placeholder="Имя пользователя"
              size="md"
            />
            <Button size="md" square icon="search" onPress={search} />
          </View>
          {searchError ? <Notice error>{searchError}</Notice> : null}
          {results && (
            <Panel className="p-2">
              {results.length === 0 ? (
                <Text className="p-3 text-sm text-muted">Никого не нашлось</Text>
              ) : (
                results.map((u) => {
                  const isFriend = friends.some((f) => f.id === u.id);
                  return (
                    <View key={u.id} className="flex-row items-center gap-3.5 p-3">
                      <Pressable onPress={() => openUser(u.id)} className="flex-1 flex-row items-center gap-3.5">
                        <Avatar name={u.username} uri={u.avatar} size={44} />
                        <View className="flex-1">
                          <Text numberOfLines={1} className="text-[15px] font-extrabold text-white">{u.username}</Text>
                          <Text className="text-xs text-muted mt-0.5">
                            {sent[u.id] ||
                              `${u._count?.movies || 0} ${pluralize(u._count?.movies || 0, "фильм", "фильма", "фильмов")} в журнале`}
                          </Text>
                        </View>
                      </Pressable>
                      {!isFriend && !sent[u.id] && (
                        <Button size="md" square variant="soft" icon="user-plus" onPress={() => addFriend(u)} />
                      )}
                    </View>
                  );
                })
              )}
            </Panel>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
