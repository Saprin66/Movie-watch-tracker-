import { Linking, Text, View } from "react-native";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { tmdb } from "../lib/tmdb";
import { useSetting } from "../lib/settings";
import ChipSelect from "./ChipSelect";

const REGIONS = [
  { id: "RU", label: "Россия" },
  { id: "BY", label: "Беларусь" },
  { id: "KZ", label: "Казахстан" },
  { id: "UA", label: "Украина" },
  { id: "US", label: "США" },
  { id: "GB", label: "Великобритания" },
  { id: "DE", label: "Германия" },
];

const GROUPS = [
  { key: "flatrate", label: "По подписке" },
  { key: "free", label: "Бесплатно" },
  { key: "ads", label: "Бесплатно с рекламой" },
  { key: "rent", label: "Аренда" },
  { key: "buy", label: "Покупка" },
];

// «Где смотреть»: онлайн-кинотеатры из TMDB (данные JustWatch) по выбранному региону
export default function WatchProviders({ type, tmdbId }) {
  const [region, setRegion] = useSetting("watchRegion", "RU");
  const { data, isLoading, error } = useQuery({
    queryKey: ["providers", type, tmdbId],
    queryFn: () => tmdb(`/${type}/${tmdbId}/watch/providers`),
  });
  const providers = data?.results?.[region];
  const groups = providers ? GROUPS.filter((g) => providers[g.key]?.length > 0) : [];
  const regionLabel = REGIONS.find((r) => r.id === region)?.label;

  return (
    <View className="gap-3">
      <Text className="px-4 text-[11px] font-extrabold uppercase tracking-[1.5px] text-[#7b81a6]">Где смотреть</Text>
      <ChipSelect options={REGIONS} value={region} onChange={setRegion} />
      <View className="px-4 gap-3">
        {isLoading ? (
          <Text className="text-sm text-muted">Ищу, где можно посмотреть...</Text>
        ) : error ? (
          <Text className="text-sm text-muted">Не удалось получить данные о сервисах: нет связи с TMDB.</Text>
        ) : groups.length === 0 ? (
          <Text className="text-sm text-muted">
            Для региона «{regionLabel}» нет данных о сервисах. Попробуйте другой регион.
          </Text>
        ) : (
          <>
            {groups.map((group) => (
              <View key={group.key}>
                <Text className="text-[11px] text-faint mb-1.5">{group.label}</Text>
                <View className="flex-row flex-wrap gap-2">
                  {providers[group.key].map((p) => (
                    <View
                      key={p.provider_id}
                      className="flex-row items-center gap-2.5 bg-deep border border-white/[0.08] rounded-xl pl-2 pr-3.5 py-2"
                    >
                      {p.logo_path && (
                        <Image
                          source={{ uri: `https://image.tmdb.org/t/p/w45${p.logo_path}` }}
                          style={{ width: 28, height: 28, borderRadius: 8 }}
                        />
                      )}
                      <Text className="text-[13px] font-bold text-ink">{p.provider_name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
            <Text className="text-[11px] text-faint">
              Данные предоставлены JustWatch через TMDB.
              {providers.link ? (
                <Text className="text-accent" onPress={() => Linking.openURL(providers.link)}>
                  {" "}Открыть страницу
                </Text>
              ) : null}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}
