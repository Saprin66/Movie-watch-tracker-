import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth";
import { useApiCall, useFriends, useList } from "../../lib/social";
import { itemFromTmdb } from "../../lib/lists";
import { tmdb } from "../../lib/tmdb";
import { POSTER } from "../../lib/config";
import { openMovie, openUser } from "../../lib/nav";
import { Avatar, Button, Chip, COLORS, Field, Icon, Notice, Panel, Poster, ScreenHeader, SectionTitle } from "../../components/ui";

// Поиск фильма в TMDB, чтобы добавить его в список
function AddMovieSearch({ existingKeys, onAdd }) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isFetching, error } = useQuery({
    queryKey: ["tmdbSearch", "list", debounced],
    queryFn: () => tmdb("/search/multi", { query: debounced }),
    enabled: Boolean(debounced),
  });
  const results = (data?.results || []).filter((r) => r.media_type !== "person").slice(0, 8);

  return (
    <View className="gap-2.5">
      <Field
        icon="search"
        value={query}
        onChangeText={setQuery}
        placeholder="Найти фильм или сериал, чтобы добавить"
        size="md"
      />
      {isFetching && <Text className="text-sm text-muted">Ищу…</Text>}
      {error ? <Text className="text-sm text-red-300">Нет связи с TMDB. Попробуй ещё раз.</Text> : null}
      {!!debounced && results.length > 0 && (
        <Panel className="p-1.5">
          {results.map((item) => {
            const key = `${item.media_type}-${item.id}`;
            const added = existingKeys.has(key);
            const year = (item.release_date || item.first_air_date || "").slice(0, 4);
            return (
              <View key={key} className="flex-row items-center gap-3 p-2">
                <View className="w-10 aspect-[2/3] overflow-hidden rounded-md">
                  <Poster uri={item.poster_path ? `${POSTER}${item.poster_path}` : null} title={item.title || item.name} small />
                </View>
                <View className="flex-1">
                  <Text numberOfLines={1} className="text-sm font-bold text-white">{item.title || item.name}</Text>
                  <Text className="text-xs text-muted">
                    {[item.media_type === "tv" ? "Сериал" : "Фильм", year].filter(Boolean).join(" · ")}
                  </Text>
                </View>
                <Button
                  size="md"
                  square
                  variant={added ? "green" : "orange"}
                  icon={added ? "check" : "plus"}
                  disabled={added}
                  onPress={() => onAdd(item)}
                />
              </View>
            );
          })}
        </Panel>
      )}
    </View>
  );
}

// Общий список: участники, фильмы «хотим посмотреть» и «уже посмотрели»
export default function ListScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { data: list, isLoading, error, refetch, isRefetching } = useList(id);
  const { data: friends = [] } = useFriends();
  const call = useApiCall();
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [actionError, setActionError] = useState("");

  // Запрос, после которого список и перечень списков перезагружаются
  const run = async (path, options) => {
    setActionError("");
    try {
      await call(path, options, [["list", id], ["lists"]]);
      return true;
    } catch (e) {
      setActionError(e.message);
      return false;
    }
  };

  if (!list) {
    return (
      <SafeAreaView className="flex-1 bg-bg">
        <ScreenHeader title="" onBack={() => router.back()} />
        {isLoading ? (
          <ActivityIndicator color={COLORS.accent} className="mt-10" />
        ) : (
          <View className="px-4">
            <Notice error>{error?.message || "Список не найден"}</Notice>
          </View>
        )}
      </SafeAreaView>
    );
  }

  const existingKeys = new Set(list.items.map((i) => `${i.mediaType}-${i.tmdbId}`));
  const toWatch = list.items.filter((i) => !i.watched);
  const watched = list.items.filter((i) => i.watched);
  const memberIds = new Set(list.members.map((m) => m.id));
  const invitable = friends.filter((f) => !memberIds.has(f.id));

  const confirm = (title, message, label, action) =>
    Alert.alert(title, message, [
      { text: "Отмена", style: "cancel" },
      { text: label, style: "destructive", onPress: action },
    ]);

  const removeList = () =>
    confirm("Удалить список?", `«${list.name}» пропадёт у всех участников вместе с фильмами.`, "Удалить", async () => {
      if (await run(`/api/lists/${list.id}`, { method: "DELETE" })) router.back();
    });
  const leaveList = () =>
    confirm("Выйти из списка?", `Вернуться в «${list.name}» можно, если создатель пригласит снова.`, "Выйти", async () => {
      if (await run(`/api/lists/${list.id}/leave`, { method: "POST" })) router.back();
    });
  const removeMember = (member) =>
    confirm(
      member.pending ? "Отменить приглашение?" : "Убрать участника?",
      member.pending
        ? `Отменить приглашение для ${member.username}?`
        : `Убрать ${member.username} из списка? Добавленные им фильмы останутся.`,
      "Да",
      () => run(`/api/lists/${list.id}/members/${member.id}`, { method: "DELETE" }),
    );

  const renderItem = (item) => (
    <Panel key={item.id} className="p-3 flex-row gap-3">
      <Pressable onPress={() => openMovie(item)} className="w-14 aspect-[2/3] overflow-hidden rounded-lg border border-white/[0.08]">
        <Poster uri={item.posterUrl} title={item.title} small />
      </Pressable>
      <View className="flex-1 gap-1.5">
        <Text numberOfLines={2} className="text-[15px] font-extrabold text-white" onPress={() => openMovie(item)}>
          {item.title}
        </Text>
        <View className="flex-row flex-wrap gap-1.5">
          {item.releaseYear ? <Chip>{item.releaseYear}</Chip> : null}
          {item.mediaType === "tv" && <Chip tone="orange">Сериал</Chip>}
          {item.watched && <Chip tone="green">Посмотрели</Chip>}
        </View>
        {item.addedBy && <Text className="text-xs text-faint">Добавил(а) {item.addedBy.username}</Text>}
      </View>
      <View className="gap-1.5">
        <Pressable
          onPress={() => run(`/api/lists/${list.id}/items/${item.id}`, { method: "PUT", body: { watched: !item.watched } })}
          className={`w-10 h-10 rounded-xl items-center justify-center ${item.watched ? "bg-white/[0.07]" : "bg-emerald-400/[0.16]"}`}
        >
          <Icon name={item.watched ? "rotate-ccw" : "check"} size={16} color={item.watched ? COLORS.ink : COLORS.green} />
        </Pressable>
        {item.canRemove && (
          <Pressable
            onPress={() => run(`/api/lists/${list.id}/items/${item.id}`, { method: "DELETE" })}
            className="w-10 h-10 rounded-xl items-center justify-center bg-red-400/[0.14]"
          >
            <Icon name="trash-2" size={16} color="#fca5a5" />
          </Pressable>
        )}
      </View>
    </Panel>
  );

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScreenHeader
        title="Смотрим вместе"
        onBack={() => router.back()}
        right={
          <Pressable onPress={list.isOwner ? removeList : leaveList} className="w-11 h-11 items-center justify-center">
            <Icon name={list.isOwner ? "trash-2" : "log-out"} size={20} color="#fca5a5" />
          </Pressable>
        }
      />
      <ScrollView
        contentContainerClassName="gap-6 px-4 pb-10"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.accent} />}
      >
        {renaming ? (
          <View className="gap-2">
            <Field value={newName} onChangeText={setNewName} maxLength={60} autoFocus />
            <View className="flex-row gap-2">
              <Button
                className="flex-1"
                size="md"
                title="Сохранить"
                onPress={async () => {
                  if (await run(`/api/lists/${list.id}`, { method: "PUT", body: { name: newName.trim() } })) setRenaming(false);
                }}
              />
              <Button className="flex-1" size="md" variant="soft" title="Отмена" onPress={() => setRenaming(false)} />
            </View>
          </View>
        ) : (
          <Pressable
            disabled={!list.isOwner}
            onPress={() => {
              setNewName(list.name);
              setRenaming(true);
            }}
            className="flex-row items-center gap-2"
          >
            <Text className="flex-shrink text-[26px] font-bold text-white">{list.name}</Text>
            {list.isOwner && <Icon name="edit-2" size={16} color={COLORS.muted} />}
          </Pressable>
        )}

        {actionError ? <Notice error>{actionError}</Notice> : null}

        <View className="gap-2">
          <SectionTitle>Участники</SectionTitle>
          <Panel className="p-1.5">
            {list.members.map((m) => (
              <View key={m.id} className="flex-row items-center gap-3 p-2">
                <Pressable onPress={() => openUser(m.id)} className="flex-1 flex-row items-center gap-3">
                  <Avatar name={m.username} uri={m.avatar} size={36} />
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-white">
                      {m.username}
                      {m.id === user?.id ? " (вы)" : ""}
                    </Text>
                    {m.id === list.ownerId ? (
                      <Text className="text-[11px] font-bold text-[#ff9a6c]">создатель</Text>
                    ) : m.pending ? (
                      <Text className="text-[11px] font-semibold text-[#7b81a6]">ждёт ответа</Text>
                    ) : null}
                  </View>
                </Pressable>
                {list.isOwner && m.id !== user?.id && (
                  <Pressable onPress={() => removeMember(m)} className="w-9 h-9 items-center justify-center">
                    <Icon name="x" size={16} color={COLORS.muted} />
                  </Pressable>
                )}
              </View>
            ))}
            {list.isOwner && (
              <Pressable onPress={() => setInviteOpen((v) => !v)} className="flex-row items-center gap-3 p-2">
                <View className="w-9 h-9 rounded-full bg-accent/15 items-center justify-center">
                  <Icon name="user-plus" size={16} color={COLORS.accent} />
                </View>
                <Text className="text-sm font-bold text-accent-light">Пригласить друга</Text>
              </Pressable>
            )}
            {inviteOpen && (
              <View className="border-t border-white/[0.06] mt-1">
                {invitable.length === 0 ? (
                  <Text className="p-3 text-sm text-muted">Все друзья уже в списке или друзей пока нет.</Text>
                ) : (
                  invitable.map((f) => (
                    <Pressable
                      key={f.id}
                      onPress={() => run(`/api/lists/${list.id}/members`, { method: "POST", body: { userId: f.id } })}
                      className="flex-row items-center gap-3 p-2"
                    >
                      <Avatar name={f.username} uri={f.avatar} size={32} />
                      <Text className="flex-1 text-sm text-white">{f.username}</Text>
                      <Icon name="plus" size={16} color={COLORS.accent} />
                    </Pressable>
                  ))
                )}
              </View>
            )}
          </Panel>
        </View>

        <AddMovieSearch
          existingKeys={existingKeys}
          onAdd={(item) => run(`/api/lists/${list.id}/items`, { method: "POST", body: itemFromTmdb(item) })}
        />

        <View className="gap-3">
          <SectionTitle>Хотим посмотреть</SectionTitle>
          {toWatch.length === 0 ? (
            <Panel className="p-6">
              <Text className="text-center text-white font-bold">Список пока пуст</Text>
              <Text className="mt-1.5 text-center text-sm text-muted">
                Найди фильм выше или добавь его из карточки фильма кнопкой с людьми.
              </Text>
            </Panel>
          ) : (
            toWatch.map(renderItem)
          )}
        </View>

        {watched.length > 0 && (
          <View className="gap-3">
            <SectionTitle>Уже посмотрели</SectionTitle>
            {watched.map(renderItem)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
