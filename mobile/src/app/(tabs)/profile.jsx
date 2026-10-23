import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useAuth } from "../../lib/auth";
import { useMovies } from "../../lib/movies";
import { useFriendRequests, useFriends, useProfile } from "../../lib/social";
import { useWatchMinutes } from "../../lib/watchTime";
import { computeAchievements } from "../../utils/achievements";
import { Avatar, Badge, Button, Chip, COLORS, Eyebrow, Icon, Panel } from "../../components/ui";

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

// Значок достижения: открытые — оранжевые, закрытые — серые с замком и полоской прогресса
const AchievementBadge = ({ a, selected, onPress }) => (
  <Pressable onPress={onPress} className="w-[78px] items-center active:opacity-80">
    <View
      className={`w-16 h-16 rounded-full items-center justify-center border-2 ${
        a.unlocked ? "bg-accent" : "bg-white/[0.06]"
      } ${selected ? "border-white" : a.unlocked ? "border-[#ffb08c]" : "border-white/[0.12]"}`}
    >
      <Icon name={a.icon} size={24} color={a.unlocked ? COLORS.onAccent : "rgba(233,235,247,0.35)"} />
      {!a.unlocked && (
        <View className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-panel border border-white/15 items-center justify-center">
          <Icon name="lock" size={11} color={COLORS.muted} />
        </View>
      )}
    </View>
    <Text className={`mt-2 text-[11px] font-bold text-center leading-tight ${a.unlocked ? "text-white" : "text-[#9aa0c4]"}`}>
      {a.name}
    </Text>
    {!a.unlocked && (
      <View className="mt-1.5 h-1 w-12 rounded-full bg-white/10 overflow-hidden">
        <View className="h-full rounded-full bg-accent" style={{ width: `${(a.value / a.goal) * 100}%` }} />
      </View>
    )}
  </Pressable>
);

function Achievements({ movies, friendsCount }) {
  const { minutes } = useWatchMinutes(movies);
  const [selectedId, setSelectedId] = useState(null);
  const achievements = computeAchievements({ movies, minutes, friendsCount });
  const unlocked = achievements.filter((a) => a.unlocked).length;
  const selected = achievements.find((a) => a.id === selectedId);

  return (
    <Panel className="py-5 gap-4">
      <View className="px-5 flex-row items-center justify-between">
        <Text className="text-[17px] font-semibold text-white">Достижения</Text>
        <Chip tone="orange">
          {unlocked} из {achievements.length}
        </Chip>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 px-5">
        {achievements.map((a) => (
          <AchievementBadge
            key={a.id}
            a={a}
            selected={selected?.id === a.id}
            onPress={() => setSelectedId((id) => (id === a.id ? null : a.id))}
          />
        ))}
      </ScrollView>
      {selected && (
        <Text className="px-5 text-center text-sm text-[#c4c8e4]">
          <Text className="font-bold text-white">{selected.name}.</Text> {selected.desc}
          {selected.unlocked ? " — получено!" : ` — ${selected.value} из ${selected.goal}.`}
        </Text>
      )}
    </Panel>
  );
}

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

        <Achievements movies={movies} friendsCount={friends.length} />

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
