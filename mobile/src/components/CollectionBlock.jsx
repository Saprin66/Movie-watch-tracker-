import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { POSTER } from "../lib/config";
import { useCollection } from "../lib/collections";
import { useMovieActions, useMovies } from "../lib/movies";
import { openMovie } from "../lib/nav";
import { collectionProgress, journalIndex } from "../utils/franchises";
import { Button, COLORS, Icon, Poster } from "./ui";

// «Коллекция» на экране фильма: все части серии по порядку выхода с отметками из журнала
export default function CollectionBlock({ collectionId, currentId }) {
  const { data: collection } = useCollection(collectionId);
  const { data: movies = [] } = useMovies();
  const actions = useMovieActions();
  const [adding, setAdding] = useState(false);

  if (!collection) return null;
  const progress = collectionProgress(collection, journalIndex(movies));
  // Серия из одного фильма — не серия
  if (progress.parts.length < 2) return null;

  const missing = progress.parts.filter((p) => p.released && !p.entry);
  const open = (part) => openMovie({ id: part.id, media_type: "movie" });

  const addMissing = async () => {
    setAdding(true);
    try {
      await actions.addMany(missing, "movie", "WATCHLIST");
    } finally {
      setAdding(false);
    }
  };

  return (
    <View className="bg-white/[0.03] border border-white/[0.08] rounded-[20px] py-4 gap-3">
      <View className="px-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-[11px] font-extrabold uppercase tracking-[1.5px] text-[#7b81a6]">Коллекция</Text>
          {progress.total > 0 && (
            <View
              className={`flex-row items-center gap-1 px-2.5 py-0.5 rounded-full ${progress.done ? "bg-emerald-400/[0.14]" : "bg-white/[0.07]"}`}
            >
              {progress.done && <Icon name="check" size={12} color={COLORS.green} />}
              <Text className={`text-xs font-bold ${progress.done ? "text-[#58dcaa]" : "text-soft"}`}>
                {progress.watched} из {progress.total}
              </Text>
            </View>
          )}
        </View>
        <Text className="mt-1 text-[19px] font-semibold text-white">{progress.name}</Text>
        <Text className="mt-0.5 text-xs text-muted">По порядку выхода</Text>
        {progress.total > 0 && (
          <View className="mt-3 h-2 rounded-full bg-white/[0.08] overflow-hidden">
            <View
              className="h-full rounded-full bg-accent"
              style={{ width: `${(progress.watched / progress.total) * 100}%` }}
            />
          </View>
        )}
      </View>

      {progress.next && progress.next.id !== currentId && (
        <Pressable
          onPress={() => open(progress.next)}
          className="mx-4 flex-row items-center gap-3 rounded-2xl bg-white/[0.06] border border-white/10 p-3 pl-4 active:opacity-80"
        >
          <View className="flex-1">
            <Text className="text-[11px] font-extrabold uppercase tracking-[1.2px] text-accent-light">
              {progress.watched ? "Следующий" : "Начать с"}
            </Text>
            <Text numberOfLines={1} className="text-sm font-bold text-white">
              {progress.next.title}
            </Text>
          </View>
          <Icon name="chevron-right" size={16} color={COLORS.muted} />
        </Pressable>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 px-4">
        {progress.parts.map((part, i) => {
          const watched = part.entry?.status === "WATCHED";
          const current = part.id === currentId;
          return (
            <Pressable
              key={part.id}
              disabled={current}
              onPress={() => open(part)}
              className="w-[96px] active:opacity-80"
            >
              <View
                className={`aspect-[2/3] overflow-hidden rounded-[14px] ${current ? "border-2 border-accent" : "border border-white/15"} ${part.released ? "" : "opacity-60"}`}
              >
                <Poster uri={part.poster_path ? `${POSTER}${part.poster_path}` : null} title={part.title} small />
                <Text className="absolute top-1.5 left-1.5 rounded-full bg-[#080a16]/80 px-2 py-0.5 text-[11px] font-extrabold text-white overflow-hidden">
                  {i + 1}
                </Text>
                {watched && (
                  <Text className="absolute top-1.5 right-1.5 rounded-full bg-emerald-400/90 px-1.5 py-0.5 text-[11px] font-extrabold text-[#0b1a14] overflow-hidden">
                    ✓{part.entry.rating ? ` ${part.entry.rating}` : ""}
                  </Text>
                )}
                {part.entry?.status === "WATCHLIST" && (
                  <Text className="absolute bottom-1.5 left-1.5 rounded-full bg-sky-400/90 px-2 py-0.5 text-[10px] font-extrabold text-[#06121f] overflow-hidden">
                    В списке
                  </Text>
                )}
              </View>
              <Text numberOfLines={2} className="mt-1.5 text-xs font-bold leading-tight text-white">
                {part.title}
              </Text>
              <Text className="text-[11px] text-muted">
                {part.released ? part.release_date.slice(0, 4) : "Скоро"}
                {current ? " · этот" : ""}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {missing.length > 0 && (
        <View className="px-4">
          <Button
            size="md"
            variant="soft"
            icon="bookmark"
            loading={adding}
            title={missing.length === 1 ? "Недостающую часть в «Буду смотреть»" : `Остальные (${missing.length}) в «Буду смотреть»`}
            onPress={addMissing}
          />
        </View>
      )}
    </View>
  );
}
