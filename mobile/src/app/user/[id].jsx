import { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../lib/auth";
import { useProfile, useApiCall, isOnline } from "../../lib/social";
import { useConfirmRemoveFriend } from "../../lib/friends";
import { useProfileStats } from "../../lib/profileStats";
import { openUser } from "../../lib/nav";
import { formatTimeAgo } from "../../utils/time";
import { Avatar, Button, COLORS, Icon, Notice, Panel, SectionTitle } from "../../components/ui";
import {
  AchievementsPanel,
  FranchisesPanel,
  ProfileHeader,
  StatCard,
  StatRow,
  formatHours,
} from "../../components/ProfileParts";
import RecentMovies from "../../components/RecentMovies";

const FRIENDS_PREVIEW = 5;

// «октября 2026 г.»: месяц в родительном падеже получается только вместе с днём
const monthYear = (value) =>
  value
    ? new Date(value).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }).replace(/^\d+\s/, "")
    : "недавно";

// Профиль другого пользователя в том же виде, что и свой.
// Друзьям сервер отдаёт облегчённый журнал — по нему считаем достижения, время и франшизы.
export default function UserScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { data: profile, isLoading, error, refetch, isRefetching } = useProfile(id);
  const confirmRemove = useConfirmRemoveFriend(() => router.back());
  const call = useApiCall();
  const [friendsExpanded, setFriendsExpanded] = useState(false);
  const [requestStatus, setRequestStatus] = useState("");
  const isOwn = user?.id === id;
  // Отзывы скрыты от тех, кто не в друзьях
  const isFriend = profile && !isOwn && !profile.reviewsHidden;
  const journal = profile?.journal || null;
  const friendsCount = profile?.friendsCount ?? profile?.friends?.length ?? 0;
  const stats = useProfileStats(journal || [], friendsCount);
  const friends = profile?.friends || [];
  const visibleFriends = friendsExpanded ? friends : friends.slice(0, FRIENDS_PREVIEW);

  const sendRequest = async () => {
    try {
      const data = await call(`/api/users/${id}/friend-request`, { method: "POST" });
      setRequestStatus(data.message || "Заявка отправлена");
    } catch (e) {
      setRequestStatus(e.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-row items-center justify-between px-3 h-14">
        <Pressable onPress={() => router.back()} className="w-11 h-11 items-center justify-center rounded-full active:bg-white/10">
          <Icon name="chevron-left" size={26} />
        </Pressable>
        {isFriend && (
          <Pressable
            onPress={() => confirmRemove(profile)}
            className="w-11 h-11 items-center justify-center rounded-full active:bg-white/10"
          >
            <Icon name="user-minus" size={20} color={COLORS.muted} />
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.accent} className="mt-10" />
      ) : error || !profile ? (
        <View className="p-6 gap-3">
          <Notice error>{error?.message || "Не удалось загрузить профиль"}</Notice>
          <Button variant="soft" title="Повторить" onPress={() => refetch()} />
        </View>
      ) : (
        <ScrollView
          contentContainerClassName="gap-5 px-4 pb-10"
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.accent} />}
        >
          <ProfileHeader
            user={profile}
            footer={
              <StatRow>
                {journal ? (
                  <>
                    <StatCard value={profile.watchedCount ?? 0} label="Смотрел" color="text-[#58dcaa]" />
                    <StatCard value={stats.loading ? "…" : formatHours(stats.minutes)} label="Время" color="text-white" />
                  </>
                ) : (
                  <>
                    <StatCard value={profile.moviesCount ?? 0} label="В журнале" color="text-white" />
                    <StatCard value={profile.watchedCount ?? 0} label="Смотрел" color="text-[#58dcaa]" />
                  </>
                )}
                <StatCard value={friendsCount} label="Друзей" color="text-[#86b8ff]" />
              </StatRow>
            }
          >
            <Text className="text-xs text-muted mt-1">
              В MovieGrade с {monthYear(profile.createdAt)} ·{" "}
              <Text className={isOnline(profile.lastSeen) ? "text-[#58dcaa] font-bold" : ""}>
                {isOnline(profile.lastSeen) ? "в сети" : profile.lastSeen ? formatTimeAgo(profile.lastSeen) : "не в сети"}
              </Text>
            </Text>
            {profile.bio ? <Text className="text-sm text-[#c4c8e4] mt-2">{profile.bio}</Text> : null}
            {!isOwn && !isFriend ? (
              requestStatus ? (
                <Text className="mt-3 text-sm text-muted">{requestStatus}</Text>
              ) : (
                <Button size="md" icon="user-plus" title="Добавить в друзья" className="self-start mt-3" onPress={sendRequest} />
              )
            ) : null}
          </ProfileHeader>

          {journal ? (
            <>
              <AchievementsPanel achievements={stats.achievements} unlockedFirst />
              <FranchisesPanel franchises={stats.franchises} />
            </>
          ) : !isOwn ? (
            <Panel className="p-4 flex-row items-center gap-2.5">
              <Icon name="lock" size={16} color={COLORS.muted} />
              <Text className="flex-1 text-sm text-soft">Достижения и статистика видны только друзьям</Text>
            </Panel>
          ) : null}

          {profile.recentMovies?.length ? (
            <Panel className="p-5 gap-4">
              <SectionTitle>Недавно</SectionTitle>
              <RecentMovies movies={profile.recentMovies} reviewsHidden={profile.reviewsHidden} />
            </Panel>
          ) : null}

          <Panel className="p-5 gap-2">
            <SectionTitle className="mb-1">
              Друзья <Text className="text-muted">· {friends.length}</Text>
            </SectionTitle>
            {!friends.length ? (
              <Text className="text-sm text-muted">Список друзей пока пуст.</Text>
            ) : (
              visibleFriends.map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() => openUser(f.id)}
                  className="flex-row items-center gap-3 rounded-xl p-2.5 active:bg-white/[0.05]"
                >
                  <Avatar name={f.username} uri={f.avatar} size={40} />
                  <Text numberOfLines={1} className="flex-1 text-sm font-extrabold text-white">
                    {f.id === user?.id ? `${f.username} (вы)` : f.username}
                  </Text>
                  <Icon name="chevron-right" size={18} color={COLORS.muted} />
                </Pressable>
              ))
            )}
            {friends.length > FRIENDS_PREVIEW && (
              <Pressable onPress={() => setFriendsExpanded((v) => !v)} className="min-h-[40px] flex-row items-center justify-center gap-1.5">
                <Text className="text-sm font-bold text-accent-light">
                  {friendsExpanded ? "Свернуть" : `Показать всех (${friends.length})`}
                </Text>
                <Icon name={friendsExpanded ? "chevron-up" : "chevron-down"} size={16} color="#ff935f" />
              </Pressable>
            )}
          </Panel>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
