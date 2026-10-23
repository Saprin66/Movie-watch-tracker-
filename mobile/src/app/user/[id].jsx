import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../lib/auth";
import { useProfile, useApiCall, isOnline } from "../../lib/social";
import { useConfirmRemoveFriend } from "../../lib/friends";
import { openUser } from "../../lib/nav";
import { formatTimeAgo } from "../../utils/time";
import { Avatar, Button, COLORS, Icon, Notice, Panel, SectionTitle } from "../../components/ui";
import RecentMovies from "../../components/RecentMovies";

const StatCard = ({ value, label, color }) => (
  <View className="flex-1 bg-[#171b38] border border-white/[0.06] rounded-2xl p-3 items-center">
    <Text className={`text-2xl font-bold mb-1 ${color}`}>{value ?? 0}</Text>
    <Text className="text-[11px] text-muted">{label}</Text>
  </View>
);

const monthYear = (value) =>
  value ? new Date(value).toLocaleDateString("ru-RU", { month: "long", year: "numeric" }) : "недавно";

// Профиль пользователя: статистика, друзья и последние фильмы
export default function UserScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { data: profile, isLoading, error, refetch } = useProfile(id);
  const confirmRemove = useConfirmRemoveFriend(() => router.back());
  const call = useApiCall();
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [requestStatus, setRequestStatus] = useState("");
  const isOwn = user?.id === id;
  // Отзывы скрыты от тех, кто не в друзьях
  const isFriend = profile && !isOwn && !profile.reviewsHidden;

  const sendRequest = async () => {
    try {
      const data = await call(`/api/users/${id}/friend-request`, { method: "POST" });
      setRequestStatus(data.message || "Заявка отправлена");
    } catch (e) {
      setRequestStatus(e.message);
    }
  };

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-panel">
      <ScrollView contentContainerClassName="pb-10">
        <LinearGradient colors={["#ff7a45", "#8b5cf6", "#1a1e3d"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="h-32">
          <SafeAreaView edges={["top"]}>
            <Pressable onPress={() => router.back()} className="ml-3 mt-1 w-11 h-11 items-center justify-center rounded-full bg-[#080a16]/60">
              <Icon name="chevron-left" size={24} />
            </Pressable>
          </SafeAreaView>
        </LinearGradient>

        {isLoading ? (
          <ActivityIndicator color={COLORS.accent} className="mt-10" />
        ) : error ? (
          <View className="p-6 gap-3">
            <Notice error>{error.message}</Notice>
            <Button variant="soft" title="Повторить" onPress={() => refetch()} />
          </View>
        ) : profile ? (
          <View className="px-4 -mt-[52px] gap-[18px]">
            <View className="gap-3">
              <View className="rounded-[28px] border-4 border-panel self-start">
                <Avatar name={profile.username} uri={profile.avatar} size={100} rounded="rounded-[24px]" />
              </View>
              <View>
                <Text className="text-[11px] uppercase tracking-[2px] text-[#ff8f5f] font-extrabold mb-1.5">Кинопрофиль</Text>
                <Text className="text-[26px] font-bold text-white">{profile.username}</Text>
                {profile.bio ? <Text className="text-sm text-[#c4c8e4] mt-2">{profile.bio}</Text> : null}
                <Text className="text-xs text-muted mt-2.5">
                  На сайте с {monthYear(profile.createdAt)} ·{" "}
                  <Text className={isOnline(profile.lastSeen) ? "text-[#58dcaa] font-bold" : ""}>
                    {isOnline(profile.lastSeen) ? "в сети" : profile.lastSeen ? formatTimeAgo(profile.lastSeen) : "не в сети"}
                  </Text>
                </Text>
              </View>
              {isFriend && (
                <Button size="md" variant="soft" icon="user-minus" title="Удалить из друзей" className="self-start" onPress={() => confirmRemove(profile)} />
              )}
              {!isOwn && !isFriend && (
                requestStatus ? (
                  <Text className="text-sm text-muted">{requestStatus}</Text>
                ) : (
                  <Button size="md" icon="user-plus" title="Добавить в друзья" className="self-start" onPress={sendRequest} />
                )
              )}
            </View>

            <View className="flex-row gap-2">
              <StatCard value={profile.moviesCount} label="В журнале" color="text-accent-light" />
              <StatCard value={profile.watchedCount} label="Просмотрено" color="text-[#58dcaa]" />
              <StatCard value={profile.friendsCount} label="Друзей" color="text-[#86b8ff]" />
            </View>

            <Panel className="p-5 bg-[#171b38]">
              <Pressable onPress={() => setFriendsOpen((v) => !v)} className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-sky-400/10 items-center justify-center">
                  <Icon name="users" size={20} color="#86b8ff" />
                </View>
                <View className="flex-1">
                  <SectionTitle>Друзья</SectionTitle>
                  <Text className="text-xs text-muted">{profile.friends?.length ?? 0} в кругу</Text>
                </View>
                <Icon name={friendsOpen ? "chevron-up" : "chevron-down"} size={20} color={COLORS.muted} />
              </Pressable>
              {friendsOpen && (
                <View className="mt-4 pt-4 border-t border-white/5 gap-2">
                  {!profile.friends?.length ? (
                    <Text className="text-sm text-muted">Список друзей пока пуст.</Text>
                  ) : (
                    profile.friends.map((f) => (
                      <Pressable key={f.id} onPress={() => openUser(f.id)} className="flex-row items-center gap-3 rounded-xl p-3 bg-white/[0.03]">
                        <Avatar name={f.username} uri={f.avatar} size={40} rounded="rounded-xl" />
                        <Text className="flex-1 text-sm font-semibold text-white">{f.username}</Text>
                        <Icon name="chevron-right" size={18} color={COLORS.muted} />
                      </Pressable>
                    ))
                  )}
                </View>
              )}
            </Panel>

            {profile.recentMovies?.length ? (
              <Panel className="p-5 gap-4 bg-[#171b38]">
                <SectionTitle>Последние фильмы</SectionTitle>
                <RecentMovies movies={profile.recentMovies} reviewsHidden={profile.reviewsHidden} />
              </Panel>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
