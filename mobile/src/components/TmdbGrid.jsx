import { FlatList, View } from "react-native";
import { POSTER } from "../lib/config";
import { useMovies } from "../lib/movies";
import { openMovie } from "../lib/nav";
import { Chip, MovieCard } from "./ui";

// Сетка фильмов из TMDB в 3 колонки. Отмечает те, что уже есть в журнале.
// Остальные свойства (заголовок, пустой список, подгрузка) уходят в FlatList.
export default function TmdbGrid({ items, ...listProps }) {
  const { data: movies = [] } = useMovies();
  const inJournal = new Set(movies.map((m) => `${m.mediaType === "tv" ? "tv" : "movie"}-${m.tmdbId}`));
  const fillers = (3 - (items.length % 3)) % 3;

  return (
    <FlatList
      data={items}
      keyExtractor={(m) => `${m.media_type || "movie"}-${m.id}`}
      numColumns={3}
      columnWrapperClassName="gap-3 px-4"
      contentContainerClassName="gap-5 pb-8"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      renderItem={({ item, index }) => {
        const type = item.media_type === "tv" ? "tv" : "movie";
        const year = (item.release_date || item.first_air_date || "").slice(0, 4);
        return (
          <>
            <MovieCard
              poster={item.poster_path ? `${POSTER}${item.poster_path}` : null}
              title={item.title || item.name}
              footer={item.vote_average ? `★ ${item.vote_average.toFixed(1)}` : null}
              onPress={() => openMovie({ ...item, media_type: type })}
              chips={
                <>
                  {year ? <Chip solid>{year}</Chip> : null}
                  {inJournal.has(`${type}-${item.id}`) && (
                    <Chip solid tone="green">
                      В журнале
                    </Chip>
                  )}
                </>
              }
            />
            {index === items.length - 1 && Array.from({ length: fillers }, (_, i) => <View key={i} className="flex-1" />)}
          </>
        );
      }}
      {...listProps}
    />
  );
}
