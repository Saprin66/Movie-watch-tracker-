import { Pressable, Text, View } from "react-native";
import { openMovie } from "../lib/nav";
import { Chip, Poster, RatingBadge } from "./ui";

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" }) : "";

// Последние фильмы в профиле: статус, оценка и отзыв
export default function RecentMovies({ movies, reviewsHidden }) {
  return (
    <View className="gap-2.5">
      {reviewsHidden && <Text className="text-xs text-faint">Отзывы видны только друзьям</Text>}
      {movies.map((movie) => {
        const watched = movie.status === "WATCHED";
        return (
          <View key={movie.id} className="flex-row gap-3.5 bg-white/[0.03] border border-white/[0.05] rounded-2xl p-3">
            <Pressable onPress={() => openMovie(movie)} className="w-14 aspect-[2/3] overflow-hidden rounded-[10px] border border-white/[0.08]">
              <Poster uri={movie.posterUrl} title={movie.title || "Фильм"} small />
            </Pressable>
            <View className="flex-1">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text numberOfLines={1} className="text-sm font-extrabold text-white">{movie.title || "Без названия"}</Text>
                  <View className="mt-1 flex-row flex-wrap items-center gap-2">
                    <Chip tone={watched ? "green" : "blue"}>{watched ? "Просмотрено" : "Буду смотреть"}</Chip>
                    <Text className="text-[11px] text-faint">{formatDate(watched && movie.watchedAt ? movie.watchedAt : movie.updatedAt)}</Text>
                  </View>
                </View>
                {movie.rating ? <RatingBadge value={movie.rating} /> : null}
              </View>
              {movie.comment ? (
                <Text numberOfLines={6} className="mt-2 text-sm leading-[21px] text-[#c4c8e4]">{movie.comment}</Text>
              ) : watched && !reviewsHidden ? (
                <Text className="mt-2 text-xs text-faint">Отзыв не написан</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
