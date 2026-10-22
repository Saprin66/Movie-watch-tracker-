import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useFriendRequests, useListInvites } from "../lib/social";
import { Badge, Icon } from "./ui";

// Колокольчик: заявки в друзья и приглашения в общие списки
export default function NotificationsBell() {
  const { data: requests = [] } = useFriendRequests();
  const { data: invites = [] } = useListInvites();
  const count = requests.length + invites.length;
  return (
    <Pressable
      onPress={() => router.push("/notifications")}
      className="w-11 h-11 rounded-xl bg-white/[0.07] items-center justify-center"
    >
      <View>
        <Icon name="bell" size={20} />
        <Badge count={count} />
      </View>
    </Pressable>
  );
}
