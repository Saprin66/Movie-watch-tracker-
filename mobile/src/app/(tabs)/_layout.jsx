import { View } from "react-native";
import { Tabs } from "expo-router";
import { useFriendRequests, useListInvites } from "../../lib/social";
import { Badge, COLORS, Icon } from "../../components/ui";

// Нижняя панель: главные разделы сайта. Остальные (друзья, лента, «Что смотреть»)
// открываются с главной и из профиля.
const TABS = [
  { name: "index", title: "Главная", icon: "home" },
  { name: "journal", title: "Список", icon: "layout" },
  { name: "search", title: "Искать", icon: "compass" },
  { name: "together", title: "Вместе", icon: "film" },
  { name: "profile", title: "Профиль", icon: "user" },
];

export default function TabsLayout() {
  const { data: requests = [] } = useFriendRequests();
  const { data: invites = [] } = useListInvites();
  const badges = { together: invites.length, profile: requests.length };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: COLORS.bg },
        tabBarStyle: {
          backgroundColor: "#0d1021",
          borderTopColor: "rgba(255,255,255,0.06)",
        },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => (
              <View>
                <Icon name={tab.icon} size={size} color={color} />
                <Badge count={badges[tab.name] || 0} />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
