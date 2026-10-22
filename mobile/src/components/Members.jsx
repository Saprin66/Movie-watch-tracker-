import { Text, View } from "react-native";
import { Avatar } from "./ui";

// Аватары участников внахлёст и «+N», если их больше max
export default function Members({ members, max = 5, size = 30 }) {
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  return (
    <View className="flex-row items-center">
      {shown.map((m, i) => (
        <View key={m.id} style={{ marginLeft: i ? -8 : 0 }} className={`rounded-full border-2 border-panel ${m.pending ? "opacity-50" : ""}`}>
          <Avatar name={m.username} uri={m.avatar} size={size} />
        </View>
      ))}
      {extra > 0 && <Text className="ml-1.5 text-xs font-bold text-muted">+{extra}</Text>}
    </View>
  );
}
