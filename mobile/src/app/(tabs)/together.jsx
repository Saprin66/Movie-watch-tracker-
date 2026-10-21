import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useListInvites, useLists } from "../../lib/social";
import { useAnswerInvite } from "../../lib/invites";
import { openList } from "../../lib/nav";
import { pluralize } from "../../utils/plural";
import { Button, COLORS, Empty, Eyebrow, Notice, PageTitle, Panel, Poster, SectionTitle } from "../../components/ui";
import Members from "../../components/Members";

// «Смотрим вместе»: общие списки фильмов с друзьями и приглашения в них
export default function TogetherScreen() {
  const { data: lists = [], isLoading, error, refetch, isRefetching } = useLists();
  const { data: invites = [] } = useListInvites();
  const answerInvite = useAnswerInvite();

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-bg">
      <ScrollView
        contentContainerClassName="gap-6 px-4 pb-10"
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.accent} />}
      >
        <View className="pt-2 flex-row items-end justify-between gap-3">
          <View className="flex-1">
            <Eyebrow>С друзьями</Eyebrow>
            <PageTitle>Смотрим вместе</PageTitle>
          </View>
          <Button size="md" icon="plus" square onPress={() => router.push("/list/new")} />
        </View>

        {invites.length > 0 && (
          <View className="gap-3">
            <SectionTitle>Приглашения</SectionTitle>
            {invites.map((invite) => (
              <Panel key={invite.listId} className="p-4 gap-3 border-accent/30">
                <Text className="text-sm text-[#c4c8e4]">
                  <Text className="font-bold text-white">{invite.owner?.username || "Друг"}</Text> приглашает в список{" "}
                  <Text className="font-bold text-white">«{invite.name}»</Text>
                </Text>
                <View className="flex-row gap-2">
                  <Button
                    className="flex-1"
                    size="md"
                    icon="check"
                    title="Принять"
                    onPress={async () => {
                      await answerInvite(invite.listId, "accept");
                      openList(invite.listId);
                    }}
                  />
                  <Button className="flex-1" size="md" variant="soft" title="Отклонить" onPress={() => answerInvite(invite.listId, "decline")} />
                </View>
              </Panel>
            ))}
          </View>
        )}

        {error ? <Notice error>{error.message}</Notice> : null}
        {isLoading ? (
          <ActivityIndicator color={COLORS.accent} />
        ) : lists.length === 0 ? (
          <Empty text="Пока нет общих списков. Создай список, пригласи друзей, и добавляйте туда фильмы на совместный вечер.">
            <Button size="md" title="Создать первый список" onPress={() => router.push("/list/new")} />
          </Empty>
        ) : (
          <View className="gap-3">
            {lists.map((list) => (
              <Pressable key={list.id} onPress={() => openList(list.id)} className="active:opacity-80">
                <Panel className="p-4 gap-3">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text numberOfLines={1} className="text-[17px] font-bold text-white">{list.name}</Text>
                      <Text className="text-xs text-muted mt-1">
                        {list.itemsCount} {pluralize(list.itemsCount, "фильм", "фильма", "фильмов")}
                        {list.isOwner ? " · вы создатель" : ""}
                      </Text>
                    </View>
                    <Members members={list.members} />
                  </View>
                  {list.preview.length > 0 && (
                    <View className="flex-row gap-2">
                      {list.preview.map((item) => (
                        <View key={item.id} className="w-14 aspect-[2/3] overflow-hidden rounded-lg border border-white/[0.08]">
                          <Poster uri={item.posterUrl} title={item.title} small />
                        </View>
                      ))}
                    </View>
                  )}
                </Panel>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
