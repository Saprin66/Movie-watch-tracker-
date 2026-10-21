import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useFriendRequests, useListInvites } from "../lib/social";
import { useAnswerFriendRequest } from "../lib/friends";
import { useAnswerInvite } from "../lib/invites";
import { openList, openUser } from "../lib/nav";
import { formatTimeAgo } from "../utils/time";
import { Avatar, Button, COLORS, Empty, Icon, Panel, ScreenHeader } from "../components/ui";

// Уведомления: заявки в друзья и приглашения в общие списки
export default function NotificationsScreen() {
  const { data: requests = [] } = useFriendRequests();
  const { data: invites = [] } = useListInvites();
  const answerFriend = useAnswerFriendRequest();
  const answerInvite = useAnswerInvite();

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScreenHeader title="Уведомления" onBack={() => router.back()} />
      <ScrollView contentContainerClassName="gap-3 px-4 pb-10">
        {requests.length === 0 && invites.length === 0 && <Empty text="Новых уведомлений нет" />}

        {invites.map((invite) => (
          <Panel key={invite.listId} className="p-4 gap-3">
            <View className="flex-row items-center gap-3">
              <View className="w-11 h-11 rounded-xl bg-accent/15 items-center justify-center">
                <Icon name="film" size={20} color={COLORS.accent} />
              </View>
              <Text className="flex-1 text-sm text-[#c4c8e4]">
                <Text className="font-bold text-white">{invite.owner?.username || "Друг"}</Text> приглашает вас в общий
                список <Text className="font-bold text-white">«{invite.name}»</Text>
              </Text>
            </View>
            <Text className="text-xs text-faint">
              {invite.itemsCount} фильм. · {invite.membersCount} участн. · {formatTimeAgo(invite.invitedAt)}
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

        {requests.map((r) => (
          <Panel key={r.id} className="p-4 gap-3">
            <Pressable onPress={() => openUser(r.id)} className="flex-row items-center gap-3">
              <Avatar name={r.username} uri={r.avatar} size={44} />
              <Text className="flex-1 text-sm text-[#c4c8e4]">
                <Text className="font-bold text-white">{r.username}</Text> хочет добавить вас в друзья
              </Text>
            </Pressable>
            <View className="flex-row gap-2">
              <Button className="flex-1" size="md" icon="check" title="Принять" onPress={() => answerFriend(r.id, "accept")} />
              <Button className="flex-1" size="md" variant="soft" title="Отклонить" onPress={() => answerFriend(r.id, "reject")} />
            </View>
          </Panel>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
