import { Pressable, Text, View } from "react-native";
import { isOnline, useLastWatched } from "../lib/social";
import { openUser } from "../lib/nav";
import { formatTimeAgo } from "../utils/time";
import { Avatar } from "./ui";

// Друг: аватар с точкой «в сети», когда заходил и последний просмотренный фильм
export default function FriendRow({ friend, right, showLastMovie = true }) {
  const online = isOnline(friend.lastSeen);
  const { data: lastMovie } = useLastWatched(friend.id, showLastMovie);
  return (
    <View className="flex-row items-center gap-2">
      <Pressable onPress={() => openUser(friend.id)} className="flex-1 flex-row items-center gap-3.5 p-2">
        <View>
          <Avatar name={friend.username} uri={friend.avatar} size={48} />
          <View
            className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-panel ${online ? "bg-[#4fd6a0]" : "bg-[#565c80]"}`}
          />
        </View>
        <View className="flex-1">
          <Text numberOfLines={1} className="text-[15px] font-extrabold text-white">{friend.username}</Text>
          <Text className={`text-xs mt-0.5 ${online ? "text-[#58dcaa] font-semibold" : "text-[#7b81a6]"}`}>
            {online ? "Онлайн" : friend.lastSeen ? formatTimeAgo(friend.lastSeen) : "Не в сети"}
          </Text>
          {showLastMovie && lastMovie ? (
            <Text numberOfLines={1} className="text-xs text-muted mt-1">
              Последнее: <Text className="text-[#c4c8e4] font-semibold">{lastMovie.title}</Text>
              {lastMovie.rating ? <Text className="text-accent-light font-bold"> · {lastMovie.rating}/10</Text> : null}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {right}
    </View>
  );
}
