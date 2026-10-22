import { Pressable, Text, View } from "react-native";
import { openMovie, openUser } from "../lib/nav";
import { formatTimeAgo } from "../utils/time";
import { pluralize } from "../utils/plural";
import { Avatar, Chip, Panel, Poster, RatingBadge } from "./ui";

const StatusChip = ({ status }) =>
  status === "WATCHED" ? <Chip tone="green">Просмотрено</Chip> : <Chip tone="blue">Хочет посмотреть</Chip>;

function EntryHeader({ item }) {
  return (
    <Pressable onPress={() => openUser(item.user.id)} className="flex-row items-center gap-2.5">
      <Avatar name={item.user.username} uri={item.user.avatar} size={34} />
      <Text numberOfLines={1} className="flex-shrink text-sm font-extrabold text-white">
        {item.user.username}
      </Text>
      <Text className="text-xs text-[#7b81a6]">{formatTimeAgo(item.at)}</Text>
    </Pressable>
  );
}

const SmallPoster = ({ movie, width }) => (
  <Pressable onPress={() => openMovie(movie)} style={{ width }} className="aspect-[2/3] overflow-hidden rounded-xl border border-white/[0.08]">
    <Poster uri={movie.posterUrl} title={movie.title} small />
  </Pressable>
);

function MovieEntry({ item }) {
  return (
    <Panel className="p-4 flex-row gap-4">
      <SmallPoster movie={item.movie} width={72} />
      <View className="flex-1">
        <EntryHeader item={item} />
        <View className="mt-3 flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text numberOfLines={2} className="text-base font-extrabold text-white" onPress={() => openMovie(item.movie)}>
              {item.movie.title}
            </Text>
            <View className="mt-1 flex-row flex-wrap gap-2">
              <StatusChip status={item.status} />
              {item.movie.mediaType === "tv" && <Chip tone="orange">Сериал</Chip>}
            </View>
          </View>
          {item.rating ? <RatingBadge value={item.rating} big /> : null}
        </View>
        {item.comment ? (
          <Text numberOfLines={6} className="mt-3 text-sm leading-[22px] text-[#c4c8e4]">
            {item.comment}
          </Text>
        ) : null}
      </View>
    </Panel>
  );
}

function BulkEntry({ item }) {
  const hidden = item.count - item.movies.length;
  return (
    <Panel className="p-4">
      <EntryHeader item={item} />
      <View className="mt-3 flex-row flex-wrap items-center gap-2">
        <StatusChip status={item.status} />
        <Text className="text-sm text-[#c9cce6]">
          Добавлено {item.count} {pluralize(item.count, "запись", "записи", "записей")}
        </Text>
      </View>
      <View className="mt-3 flex-row gap-2">
        {item.movies.map((movie) => (
          <SmallPoster key={`${movie.mediaType}-${movie.tmdbId}`} movie={movie} width={48} />
        ))}
        {hidden > 0 && (
          <View style={{ width: 48 }} className="aspect-[2/3] rounded-xl bg-white/5 items-center justify-center">
            <Text className="text-xs text-muted">+{hidden}</Text>
          </View>
        )}
      </View>
    </Panel>
  );
}

// Записи ленты друзей: отдельные фильмы и «пачки» после импорта
export const FeedItem = ({ item }) => (item.type === "bulk" ? <BulkEntry item={item} /> : <MovieEntry item={item} />);
