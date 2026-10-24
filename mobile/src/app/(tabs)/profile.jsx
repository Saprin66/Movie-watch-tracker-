import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "../../lib/auth";
import { useMovies } from "../../lib/movies";
import { useFriendRequests, useFriends, useProfile } from "../../lib/social";
import { useProfileStats } from "../../lib/profileStats";
import { Badge, Button, COLORS, Icon, Panel } from "../../components/ui";
import {
  AchievementsPanel,
  FranchisesPanel,
  ProfileHeader,
  StatCard,
  StatRow,
  formatHours,
} from "../../components/ProfileParts";

const MenuRow = ({ icon, title, subtitle, badge, onPress }) => (
  <Pressable onPress={onPress} className="flex-row items-center gap-3 p-4 active:bg-white/[0.03]">
    <View className="w-10 h-10 rounded-xl bg-accent/[0.14] items-center justify-center">
      <Icon name={icon} size={18} color={COLORS.accent} />
      <Badge count={badge} />
    </View>
    <View className="flex-1">
      <Text className="text-[15px] font-bold text-white">{title}</Text>
      {subtitle ? <Text className="text-xs text-muted mt-0.5">{subtitle}</Text> : null}
    </View>
    <Icon name="chevron-right" size={18} color={COLORS.muted} />
  </Pressable>
);

// «Профиль»: статистика и переходы к друзьям и настройкам
export default function ProfileScreen() {
  const { user } = useAuth();
  const { data: movies = [] } = useMovies();
  const { data: friends = [] } = useFriends();
  const { data: requests = [] } = useFriendRequests();
  const { data: profile, refetch, isRefetching } = useProfile(user?.id);
  const watched = movies.filter((m) => m.status === "WATCHED").length;
  const stats = useProfileStats(movies, friends.length);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-bg">
      <ScrollView
        contentContainerClassName="gap-5 px-4 pt-2 pb-10"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.accent} />}
      >
        <ProfileHeader
          user={user}
          footer={
            <StatRow>
              <StatCard value={watched} label="Смотрел" color="text-[#58dcaa]" />
              <StatCard value={stats.loading ? "…" : formatHours(stats.minutes)} label="Время" color="text-white" />
              <StatCard value={friends.length} label="Друзей" color="text-[#86b8ff]" />
            </StatRow>
          }
        >
          <Text className="text-sm text-muted mt-1">{user?.email}</Text>
          {profile?.bio ? <Text className="text-sm text-[#c4c8e4] mt-2">{profile.bio}</Text> : null}
          <Button size="md" variant="soft" icon="settings" title="Настройки профиля" className="self-start mt-3" onPress={() => router.push("/settings")} />
        </ProfileHeader>

        <AchievementsPanel achievements={stats.achievements} />

        <FranchisesPanel franchises={stats.franchises} />

        <Panel>
          <MenuRow
            icon="users"
            title="Друзья"
            subtitle={requests.length ? `Новых заявок: ${requests.length}` : `${friends.length} в твоём круге`}
            badge={requests.length}
            onPress={() => router.push("/friends")}
          />
          <View className="h-px bg-white/[0.06] mx-4" />
          <MenuRow icon="activity" title="Лента друзей" subtitle="Что друзья смотрят и как оценивают" onPress={() => router.push("/feed")} />
          <View className="h-px bg-white/[0.06] mx-4" />
          <MenuRow icon="star" title="Что смотреть" subtitle="Рулетка и рекомендации" onPress={() => router.push("/discover")} />
        </Panel>
      </ScrollView>
    </SafeAreaView>
  );
}
