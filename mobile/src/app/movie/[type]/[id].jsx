import { useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchDetails } from "../../../lib/tmdb";
import { BACKDROP, POSTER_LARGE, PROFILE } from "../../../lib/config";
import { findInJournal, useMovieActions, useMovies } from "../../../lib/movies";
import { openPerson, openReview } from "../../../lib/nav";
import { pluralize } from "../../../utils/plural";
import { Avatar, Button, Chip, COLORS, Icon, Notice, Poster } from "../../../components/ui";
import WatchProviders from "../../../components/WatchProviders";
import AddToList from "../../../components/AddToList";
import SeasonsTracker from "../../../components/SeasonsTracker";
import CollectionBlock from "../../../components/CollectionBlock";

function formatRuntime(details) {
  const minutes = details?.runtime || details?.episode_run_time?.[0] || details?.last_episode_to_air?.runtime;
  if (!minutes) return null;
  if (details?.runtime && minutes >= 60) return `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`;
  return details?.runtime ? `${minutes} мин` : `${minutes} мин / серия`;
}

const Label = ({ children }) => (
  <Text className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-[#7b81a6] mb-2">{children}</Text>
);

// Карточка фильма или сериала из TMDB
export default function MovieScreen() {
  const { type: rawType, id } = useLocalSearchParams();
  const { data: found, isLoading, error, refetch } = useQuery({
    queryKey: ["tmdb", rawType, id],
    queryFn: () => fetchDetails(rawType, id),
  });
  const { data: movies } = useMovies();
  const actions = useMovieActions();
  const [listsOpen, setListsOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const [actionError, setActionError] = useState("");

  const details = found?.data;
  const type = found?.type || rawType;
  const isTv = type === "tv";
  const existing = findInJournal(movies, id, type);

  const add = async (status) => {
    setBusy(status);
    setActionError("");
    try {
      await actions.add(details, type, status);
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(null);
    }
  };

  const close = (
    <Pressable
      onPress={() => router.back()}
      className="absolute top-3 right-3 z-20 w-11 h-11 items-center justify-center rounded-full bg-[#080a16]/70"
    >
      <Icon name="x" size={20} />
    </Pressable>
  );

  if (!details) {
    return (
      <SafeAreaView className="flex-1 bg-panel">
        {close}
        <View className="flex-1 justify-center px-6 gap-4">
          {isLoading ? (
            <Text className="text-center text-muted">Загружаю…</Text>
          ) : (
            <>
              <Notice error>{error?.message || "Фильм не найден в TMDB"}</Notice>
              <Button title="Повторить" variant="soft" onPress={() => refetch()} />
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const title = details.title || details.name;
  const originalTitle = details.original_title || details.original_name;
  const year = (details.release_date || details.first_air_date || "").slice(0, 4);
  const rating = details.vote_average ? Number(details.vote_average).toFixed(1) : null;
  const runtime = formatRuntime(details);
  const crew = details.credits?.crew || [];
  const directors = isTv
    ? details.created_by || []
    : crew.filter((c) => c.job === "Director");
  const cast = (details.credits?.cast || []).slice(0, 12);
  const trailer = (details.videos?.results || []).find((v) => v.site === "YouTube" && v.type === "Trailer");

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-panel">
      {close}
      <ScrollView contentContainerClassName="pb-8">
        {/* Верхняя картинка */}
        <View className={backdropHeight(details)}>
          {details.backdrop_path ? (
            <Image source={{ uri: `${BACKDROP}${details.backdrop_path}` }} className="w-full h-full" contentFit="cover" />
          ) : (
            <LinearGradient colors={["#2a1d2b", "#0e1024"]} className="w-full h-full" />
          )}
          <LinearGradient
            colors={["transparent", "rgba(18,21,42,0.45)", "#12152a"]}
            className="absolute inset-0"
          />
        </View>

        <View className="px-[18px] -mt-20">
          {/* Постер и заголовок */}
          <View className="flex-row items-end gap-4">
            <View className="w-[118px] aspect-[2/3] overflow-hidden rounded-[14px] border border-white/[0.14]">
              <Poster uri={details.poster_path ? `${POSTER_LARGE}${details.poster_path}` : null} title={title} />
            </View>
            <View className="flex-1 pb-1">
              <View className="flex-row flex-wrap gap-1.5 mb-3">
                {isTv && <Chip tone="orange">Сериал</Chip>}
                {year ? <Chip>{year}</Chip> : null}
                {runtime && <Chip>{runtime}</Chip>}
                {isTv && details.number_of_seasons > 0 && (
                  <Chip>
                    {details.number_of_seasons} {pluralize(details.number_of_seasons, "сезон", "сезона", "сезонов")}
                  </Chip>
                )}
              </View>
              <Text className="text-[21px] font-bold text-white leading-tight">{title}</Text>
              {originalTitle && originalTitle !== title ? (
                <Text className="mt-1.5 text-xs text-muted">{originalTitle}</Text>
              ) : null}
              {rating && (
                <View className="mt-3.5 self-start flex-row items-center gap-2 px-3.5 py-2 rounded-xl bg-accent/[0.16]">
                  <Icon name="star" size={18} color={COLORS.accent} />
                  <Text className="text-lg font-bold text-accent-light">{rating}</Text>
                  <Text className="text-[11px] font-bold text-accent-light opacity-75">TMDB</Text>
                </View>
              )}
            </View>
          </View>

          {existing && (
            <View className="mt-6 flex-row flex-wrap items-center gap-2.5">
              <Chip tone={existing.status === "WATCHED" ? "green" : "blue"}>
                {existing.status === "WATCHED" ? "В журнале: просмотрено" : "В журнале: буду смотреть"}
              </Chip>
              {existing.rating ? (
                <Text className="font-bold text-accent-light">Ваша оценка: {existing.rating}/10</Text>
              ) : null}
            </View>
          )}

          {details.tagline ? <Text className="mt-6 text-sm italic text-muted">«{details.tagline}»</Text> : null}

          {details.genres?.length > 0 && (
            <View className="mt-4 flex-row flex-wrap gap-1.5">
              {details.genres.map((g) => (
                <Text key={g.id} className="text-xs font-bold text-[#c4c8e4] bg-white/[0.08] px-3.5 py-1.5 rounded-full overflow-hidden">
                  {g.name}
                </Text>
              ))}
            </View>
          )}

          <View className="mt-7">
            <Label>Описание</Label>
            <Text className="text-sm text-[#d0d3ea] leading-6">{details.overview || "Описание отсутствует"}</Text>
          </View>

          {directors.length > 0 && (
            <View className="mt-6">
              <Label>{isTv ? "Создатели" : "Режиссёр"}</Label>
              <View className="flex-row flex-wrap gap-2">
                {directors.map((p) => (
                  <Pressable
                    key={p.credit_id || p.id}
                    onPress={() => openPerson(p.id)}
                    className="flex-row items-center gap-1 pl-3.5 pr-2.5 py-2 rounded-full bg-white/[0.08] active:opacity-70"
                  >
                    <Text className="text-[15px] font-bold text-white">{p.name}</Text>
                    <Icon name="chevron-right" size={15} color={COLORS.muted} />
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {trailer && (
            <Button
              className="mt-6"
              variant="soft"
              icon="play"
              title="Трейлер на YouTube"
              onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${trailer.key}`)}
            />
          )}

          {isTv && details.seasons?.length > 0 && (
            <View className="mt-7">
              {existing ? (
                <SeasonsTracker entry={existing} details={details} />
              ) : (
                <View className="flex-row items-center gap-2.5 rounded-[20px] bg-white/[0.03] border border-white/[0.08] px-4 py-3.5">
                  <Icon name="list" size={16} color={COLORS.muted} />
                  <Text className="flex-1 text-sm text-[#c4c8e4]">
                    Добавьте сериал в «Буду смотреть», чтобы отмечать просмотренные серии.
                  </Text>
                </View>
              )}
            </View>
          )}

          {details.belongs_to_collection && (
            <View className="mt-7">
              <CollectionBlock collectionId={details.belongs_to_collection.id} currentId={details.id} />
            </View>
          )}
        </View>

        {cast.length > 0 && (
          <View className="mt-8">
            <View className="px-[18px]">
              <Label>В ролях</Label>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3.5 px-[18px]">
              {cast.map((person) => (
                <Pressable
                  key={person.credit_id || person.id}
                  onPress={() => openPerson(person.id)}
                  className="w-[84px] items-center active:opacity-70"
                >
                  <Avatar
                    name={person.name}
                    uri={person.profile_path ? `${PROFILE}${person.profile_path}` : null}
                    size={68}
                  />
                  <Text numberOfLines={2} className="mt-2.5 text-xs font-bold text-center text-ink">
                    {person.name}
                  </Text>
                  {person.character ? (
                    <Text numberOfLines={2} className="mt-0.5 text-[11px] text-center text-[#7b81a6]">
                      {person.character}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <View className="mt-8">
          <WatchProviders type={type} tmdbId={details.id} />
        </View>
      </ScrollView>

      {listsOpen && (
        <View className="border-t border-white/[0.07] bg-[#171b38] px-4 py-4 max-h-[40%]">
          <View className="flex-row items-center justify-between mb-3">
            <Label>Добавить в общий список</Label>
            <Pressable onPress={() => setListsOpen(false)} className="w-9 h-9 items-center justify-center">
              <Icon name="x" size={16} color={COLORS.muted} />
            </Pressable>
          </View>
          <ScrollView>
            <AddToList movie={{ ...details, media_type: type }} />
          </ScrollView>
        </View>
      )}

      {/* Кнопки всегда под рукой, даже когда описание длинное */}
      <View className="border-t border-white/[0.07] px-4 pt-3 gap-2">
        {actionError ? <Notice error>{actionError}</Notice> : null}
        <View className="flex-row gap-2.5">
          {existing ? (
            <Button
              className="flex-1"
              icon="message-square"
              title="Оценка и отзыв"
              onPress={() => {
                router.back();
                openReview(existing.id);
              }}
            />
          ) : (
            <>
              <Button
                className="flex-1"
                variant="green"
                icon="check"
                title="Смотрел"
                loading={busy === "WATCHED"}
                disabled={Boolean(busy)}
                onPress={() => add("WATCHED")}
              />
              <Button
                className="flex-1"
                icon="bookmark"
                title="В список"
                loading={busy === "WATCHLIST"}
                disabled={Boolean(busy)}
                onPress={() => add("WATCHLIST")}
              />
            </>
          )}
          <Button
            square
            variant={listsOpen ? "orange" : "soft"}
            icon="users"
            onPress={() => setListsOpen((v) => !v)}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const backdropHeight = (details) => (details.backdrop_path ? "h-56" : "h-32");
