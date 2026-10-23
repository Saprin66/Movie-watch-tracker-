import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useMovieActions, useMovies } from "../../lib/movies";
import { useFriendReviews } from "../../lib/social";
import { openMovie, openUser } from "../../lib/nav";
import { Avatar, Button, Chip, COLORS, Icon, LinkButton, Notice, Panel, Poster } from "../../components/ui";

const MAX_COMMENT = 1000;
const SCALE = Array.from({ length: 10 }, (_, i) => i + 1);

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });

// Оценки и отзывы друзей к этому же фильму
function FriendsReviews({ movie }) {
  const { data: items = [], isLoading, error } = useFriendReviews(movie.tmdbId, movie.mediaType);
  if (!movie.tmdbId) return null;

  return (
    <Panel className="mt-8 p-4">
      <Text className="mb-4 text-[17px] font-semibold text-white">
        Отзывы друзей {items.length > 0 ? <Text className="text-muted">· {items.length}</Text> : null}
      </Text>
      {isLoading ? (
        <ActivityIndicator color={COLORS.accent} />
      ) : error ? (
        <Text className="text-sm text-red-300">{error.message || "Не удалось загрузить отзывы друзей"}</Text>
      ) : items.length === 0 ? (
        <Text className="text-sm text-soft">Друзья ещё не оценили этот фильм.</Text>
      ) : (
        <View className="gap-4">
          {items.map((r) => (
            <View key={r.id} className="flex-row gap-3">
              <Pressable onPress={() => openUser(r.user.id)}>
                <Avatar name={r.user.username} uri={r.user.avatar} size={40} />
              </Pressable>
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text numberOfLines={1} className="shrink text-sm font-extrabold text-white" onPress={() => openUser(r.user.id)}>
                    {r.user.username}
                  </Text>
                  {r.rating ? <Chip tone="orange">★ {r.rating}</Chip> : null}
                  <Text className="ml-auto text-[11px] text-muted">{formatDate(r.updatedAt)}</Text>
                </View>
                {r.comment ? <Text className="mt-1.5 text-sm leading-5 text-[#e2e4f3]">{r.comment}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      )}
    </Panel>
  );
}

// Оценка (1–10) и отзыв к фильму из журнала. Здесь же смена статуса и удаление.
export default function ReviewScreen() {
  const { id } = useLocalSearchParams();
  const { data: movies } = useMovies();
  const movie = movies?.find((m) => m.id === id);

  if (!movie) {
    return (
      <SafeAreaView className="flex-1 bg-panel justify-center px-6 gap-4">
        <Text className="text-center text-muted">Запись не найдена в журнале</Text>
        <Button title="Закрыть" variant="soft" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }
  // key: оценка и отзыв берутся из записи заново, если открыли другую
  return <ReviewForm key={movie.id} movie={movie} />;
}

function ReviewForm({ movie }) {
  const actions = useMovieActions();
  const [rating, setRating] = useState(movie.rating ?? null);
  const [comment, setComment] = useState(movie.comment ?? "");
  // Поле отзыва раскрывается только по нажатию
  const [commentOpen, setCommentOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isWatched = movie.status === "WATCHED";
  const changed = rating !== (movie.rating ?? null) || comment.trim() !== (movie.comment ?? "");

  // Выполняет действие с журналом и показывает ошибку, если не вышло
  const run = async (action, closeAfter = false) => {
    setSaving(true);
    setError("");
    try {
      await action();
      if (closeAfter) router.back();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const save = () =>
    run(() => actions.saveReview(movie.id, { rating, comment: comment.trim() || null }), true);

  const confirmDelete = () =>
    Alert.alert("Удалить из журнала?", `«${movie.title}» пропадёт из журнала вместе с оценкой и отзывом.`, [
      { text: "Отмена", style: "cancel" },
      { text: "Удалить", style: "destructive", onPress: () => run(() => actions.remove(movie.id), true) },
    ]);

  return (
    <SafeAreaView className="flex-1 bg-panel">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerClassName="p-5 pb-10" keyboardShouldPersistTaps="handled">
          <View className="flex-row gap-4">
            <Pressable onPress={() => openMovie(movie)} className="w-24 aspect-[2/3] overflow-hidden rounded-[14px] border border-white/[0.12]">
              <Poster uri={movie.posterUrl} title={movie.title} />
            </Pressable>
            <View className="flex-1">
              <View className="flex-row justify-between gap-2">
                <View className="flex-row flex-wrap gap-1.5 flex-1">
                  <Chip tone={isWatched ? "green" : "blue"}>{isWatched ? "Просмотрено" : "Буду смотреть"}</Chip>
                  {movie.mediaType === "tv" && <Chip tone="orange">Сериал</Chip>}
                </View>
                <Pressable onPress={() => router.back()} className="w-10 h-10 -mt-1 items-center justify-center rounded-full bg-white/[0.07]">
                  <Icon name="x" size={16} />
                </Pressable>
              </View>
              <Text className="mt-2 text-[22px] font-bold leading-tight text-white">{movie.title}</Text>
              <LinkButton title="Подробнее о фильме" tone="accent" onPress={() => openMovie(movie)} />
            </View>
          </View>

          <View className="mt-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[15px] font-extrabold text-white">
                {rating ? (
                  <>
                    Оценка: <Text className="text-accent-light">{rating}</Text> из 10
                  </>
                ) : (
                  "Оценка не поставлена"
                )}
              </Text>
              {rating ? (
                <Pressable onPress={() => setRating(null)} className="min-h-[36px] px-2 justify-center">
                  <Text className="text-[13px] font-bold text-muted">Сбросить</Text>
                </Pressable>
              ) : null}
            </View>
            <View className="flex-row flex-wrap gap-1.5">
              {SCALE.map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setRating(rating === n ? null : n)}
                  className={`w-[18.4%] h-[46px] rounded-xl items-center justify-center ${rating !== null && n <= rating ? "bg-accent" : "bg-white/[0.06]"}`}
                >
                  <Text className={`text-[15px] font-extrabold ${rating !== null && n <= rating ? "text-on-accent" : "text-[#9aa0c6]"}`}>
                    {n}
                  </Text>
                </Pressable>
              ))}
            </View>
            {!isWatched && rating ? (
              <Text className="mt-2 text-xs text-muted">С оценкой фильм перейдёт в «Просмотрено».</Text>
            ) : null}
          </View>

          {/* Отзыв: поле раскрывается только по нажатию */}
          <View className="mt-6">
            {commentOpen ? (
              <>
                <View className="flex-row items-center justify-between mb-2.5">
                  <Text className="text-[15px] font-extrabold text-white">Ваш отзыв</Text>
                  <Pressable onPress={() => setCommentOpen(false)} className="w-9 h-9 items-center justify-center rounded-full active:bg-white/10">
                    <Icon name="chevron-up" size={18} color={COLORS.muted} />
                  </Pressable>
                </View>
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  maxLength={MAX_COMMENT}
                  multiline
                  autoFocus
                  textAlignVertical="top"
                  placeholder="Что думаете о фильме? Отзыв видите вы и ваши друзья."
                  placeholderTextColor={COLORS.faint}
                  selectionColor={COLORS.accent}
                  className="min-h-[120px] bg-deep border border-white/10 rounded-[14px] px-4 py-3.5 text-base text-white"
                />
                <Text className="mt-1.5 text-right text-xs text-[#7b81a6]">
                  {comment.length}/{MAX_COMMENT}
                </Text>
              </>
            ) : comment.trim() ? (
              <Pressable
                onPress={() => setCommentOpen(true)}
                className="bg-deep border border-white/10 rounded-[14px] p-4 active:opacity-80"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-[15px] font-extrabold text-white">Ваш отзыв</Text>
                  <View className="flex-row items-center gap-1.5">
                    <Icon name="edit-2" size={13} color="#ff935f" />
                    <Text className="text-sm font-bold text-accent-light">Изменить</Text>
                  </View>
                </View>
                <Text numberOfLines={4} className="text-sm leading-5 text-[#e2e4f3]">
                  {comment}
                </Text>
              </Pressable>
            ) : (
              <Button variant="soft" icon="edit-3" title="Написать отзыв" onPress={() => setCommentOpen(true)} />
            )}
          </View>

          {error ? (
            <View className="mt-4">
              <Notice error>{error}</Notice>
            </View>
          ) : null}

          <View className="mt-6 gap-2.5">
            <Button title="Сохранить" loading={saving} disabled={!changed} onPress={save} />
            <Button
              variant="soft"
              icon={isWatched ? "bookmark" : "check"}
              title={isWatched ? "Вернуть в «Буду смотреть»" : "Отметить просмотренным"}
              disabled={saving}
              onPress={() => run(() => actions.setStatus(movie.id, isWatched ? "WATCHLIST" : "WATCHED"))}
            />
            <Button variant="red" icon="trash-2" title="Удалить из журнала" disabled={saving} onPress={confirmDelete} />
          </View>

          <FriendsReviews movie={movie} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
