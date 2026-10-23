import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useAuth } from "../../lib/auth";
import { useMovies } from "../../lib/movies";
import { useFriendRequests, useFriends, useProfile } from "../../lib/social";
import { Avatar, Badge, Button, COLORS, Eyebrow, Icon, Panel } from "../../components/ui";

const StatCard = ({ value, label, color }) => (
  <View className="flex-1 rounded-2xl bg-[#080a16]/50 border border-white/[0.06] p-4">
    <Text className={`text-2xl font-bold ${color}`}>{value}</Text>
    <Text className="text-xs text-muted mt-1">{label}</Text>
  </View>
);

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

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-bg">
      <ScrollView
        contentContainerClassName="gap-5 px-4 pt-2 pb-10"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.accent} />}
      >
        <Panel className="overflow-hidden">
          <LinearGradient colors={["#ff7a45", "#8b5cf6", "#161a35"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="h-28" />
          <View className="px-5 -mt-12 gap-3">
            <View className="self-start rounded-[28px] p-1 bg-panel">
              <Avatar name={user?.username} uri={user?.avatar} size={96} rounded="rounded-[24px]" />
            </View>
            <View>
              <Eyebrow>Кинопрофиль</Eyebrow>
              <Text numberOfLines={1} className="text-[28px] font-bold text-white">{user?.username || "Киноман"}</Text>
              <Text className="text-sm text-muted mt-1">{user?.email}</Text>
              {profile?.bio ? <Text className="text-sm text-[#c4c8e4] mt-2">{profile.bio}</Text> : null}
            </View>
            <Button size="md" variant="soft" icon="settings" title="Настройки профиля" className="self-start" onPress={() => router.push("/settings")} />
          </View>
          <View className="flex-row gap-2.5 p-5">
            <StatCard value={movies.length} label="В журнале" color="text-white" />
            <StatCard value={watched} label="Смотрел" color="text-[#58dcaa]" />
            <StatCard value={friends.length} label="Друзей" color="text-[#86b8ff]" />
          </View>
        </Panel>

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
          <MenuRow icon="star" title="Что смотреть" subtitle="Случайный выбор и рекомендации" onPress={() => router.push("/discover")} />
        </Panel>
      </ScrollView>
    </SafeAreaView>
  );
}
