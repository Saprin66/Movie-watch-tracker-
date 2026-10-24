import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { POSTER } from "../lib/config";
import { openMovie } from "../lib/nav";
import { Avatar, Chip, COLORS, Eyebrow, Icon, Panel, Poster } from "./ui";

// Общие блоки своего и чужого профиля

// Шапка: градиент, аватар, ник; children — под ником, footer — цифры внизу карточки
export function ProfileHeader({ user, children, footer }) {
  return (
    <Panel className="overflow-hidden">
      <LinearGradient colors={["#ff7a45", "#8b5cf6", "#161a35"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="h-28" />
      <View className="px-5 -mt-12 gap-3">
        <View className="self-start rounded-[28px] p-1 bg-panel">
          <Avatar name={user?.username} uri={user?.avatar} size={96} rounded="rounded-[24px]" />
        </View>
        <View>
          <Eyebrow>Кинопрофиль</Eyebrow>
          <Text numberOfLines={1} className="text-[28px] font-bold text-white">
            {user?.username || "Киноман"}
          </Text>
          {children}
        </View>
      </View>
      {footer}
    </Panel>
  );
}

export const StatCard = ({ value, label, color }) => (
  <View className="flex-1 rounded-2xl bg-[#080a16]/50 border border-white/[0.06] p-4">
    <Text className={`text-2xl font-bold ${color}`}>{value}</Text>
    <Text className="text-xs text-muted mt-1">{label}</Text>
  </View>
);

export const StatRow = ({ children }) => <View className="flex-row gap-2.5 p-5">{children}</View>;

// Часы просмотра: «12 ч» или «45 мин»
export const formatHours = (minutes) => (minutes < 60 ? `${minutes} мин` : `${Math.round(minutes / 60)} ч`);

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

// unlockedFirst: полученные первыми — в чужом профиле сразу видно, чем он гордится
export function AchievementsPanel({ achievements, unlockedFirst = false }) {
  const [selectedId, setSelectedId] = useState(null);
  const list = unlockedFirst
    ? [...achievements].sort((a, b) => Number(b.unlocked) - Number(a.unlocked))
    : achievements;
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
        {list.map((a) => (
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

const PREVIEW = 4;

// «Франшизы»: начатые серии фильмов с прогрессом (результат startedFranchises)
export function FranchisesPanel({ franchises }) {
  const [expanded, setExpanded] = useState(false);
  if (!franchises.length) return null;
  const done = franchises.filter((f) => f.done).length;
  const visible = expanded ? franchises : franchises.slice(0, PREVIEW);

  return (
    <Panel className="p-5 gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-[17px] font-semibold text-white">
          Франшизы <Text className="text-muted">· {franchises.length}</Text>
        </Text>
        {done > 0 && <Chip tone="green">досмотрено {done}</Chip>}
      </View>
      {visible.map((f) => {
        const cover = f.parts.find((p) => p.poster_path);
        const target = f.next || f.parts.find((p) => p.released);
        return (
          <Pressable
            key={f.id}
            disabled={!target}
            onPress={() => openMovie({ id: target.id, media_type: "movie" })}
            className="flex-row items-center gap-3 rounded-2xl active:bg-white/[0.04]"
          >
            <View className="w-12 aspect-[2/3] overflow-hidden rounded-[10px] border border-white/15">
              <Poster uri={cover ? `${POSTER}${cover.poster_path}` : null} title={f.name} small />
            </View>
            <View className="flex-1">
              <Text numberOfLines={1} className="text-sm font-extrabold text-white">
                {f.name}
              </Text>
              <View className="mt-1.5 flex-row items-center gap-2">
                <View className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <View
                    className={`h-full rounded-full ${f.done ? "bg-[#58dcaa]" : "bg-accent"}`}
                    style={{ width: `${(f.watched / f.total) * 100}%` }}
                  />
                </View>
                <Text className="text-xs font-bold text-[#c4c8e4]">
                  {f.watched}/{f.total}
                </Text>
              </View>
              <Text numberOfLines={1} className="mt-1 text-xs text-muted">
                {f.done ? "Досмотрено целиком" : f.next ? `Следующий: ${f.next.title}` : ""}
              </Text>
            </View>
          </Pressable>
        );
      })}
      {franchises.length > PREVIEW && (
        <Pressable onPress={() => setExpanded((v) => !v)} className="min-h-[40px] flex-row items-center justify-center gap-1.5">
          <Text className="text-sm font-bold text-accent-light">
            {expanded ? "Свернуть" : `Показать все (${franchises.length})`}
          </Text>
          <Icon name={expanded ? "chevron-up" : "chevron-down"} size={16} color="#ff935f" />
        </Pressable>
      )}
    </Panel>
  );
}
