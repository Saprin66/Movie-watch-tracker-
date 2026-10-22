import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useMovieActions, useMovies } from "../../lib/movies";
import { openMovie } from "../../lib/nav";
import { Button, Chip, COLORS, Icon, LinkButton, Notice, Poster } from "../../components/ui";

const MAX_COMMENT = 1000;
const SCALE = Array.from({ length: 10 }, (_, i) => i + 1);

// Оценка (1–10) и отзыв к фильму из журнала. Здесь же смена статуса и удаление.
export default function ReviewScreen() {
  const { id } = useLocalSearchParams();
  const { data: movies } = useMovies();
  const actions = useMovieActions();
  const movie = movies?.find((m) => m.id === id);

  const [rating, setRating] = useState(null);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Подставляем сохранённые оценку и отзыв, когда запись загрузилась
  useEffect(() => {
    if (movie) {
      setRating(movie.rating ?? null);
      setComment(movie.comment ?? "");
    }
  }, [movie?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!movie) {
    return (
      <SafeAreaView className="flex-1 bg-panel justify-center px-6 gap-4">
        <Text className="text-center text-muted">Запись не найдена в журнале</Text>
        <Button title="Закрыть" variant="soft" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

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

          <View className="mt-5">
            <Text className="text-[15px] font-extrabold text-white mb-2.5">Отзыв</Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              maxLength={MAX_COMMENT}
              multiline
              textAlignVertical="top"
              placeholder="Что думаете о фильме? Отзыв видите вы и ваши друзья."
              placeholderTextColor={COLORS.faint}
              selectionColor={COLORS.accent}
              className="min-h-[120px] bg-deep border border-white/10 rounded-[14px] px-4 py-3.5 text-base text-white"
            />
            <Text className="mt-1.5 text-right text-xs text-[#7b81a6]">
              {comment.length}/{MAX_COMMENT}
            </Text>
          </View>

          {error ? <Notice error>{error}</Notice> : null}

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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
