import { ActivityIndicator, FlatList, RefreshControl, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useFeed } from "../lib/social";
import { Button, COLORS, Empty, Notice, ScreenHeader } from "../components/ui";
import { FeedItem } from "../components/FeedList";

// «Лента друзей»: что друзья недавно посмотрели, оценили и добавили
export default function FeedScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useFeed();

  let empty = null;
  if (isLoading) empty = <ActivityIndicator color={COLORS.accent} className="mt-10" />;
  else if (error) empty = <Notice error>{error.message}</Notice>;
  else if (!data?.hasFriends)
    empty = (
      <Empty text="Добавь друзей, и здесь появится то, что они смотрят.">
        <Button size="md" title="Найти друзей" onPress={() => router.push("/friends")} />
      </Empty>
    );
  else empty = <Empty text="Друзья пока ничего не добавили." />;

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScreenHeader title="Лента друзей" onBack={() => router.back()} />
      <FlatList
        data={data?.items || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <FeedItem item={item} />}
        contentContainerClassName="gap-4 px-4 pb-10"
        ListEmptyComponent={<View>{empty}</View>}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.accent} />}
      />
    </SafeAreaView>
  );
}
