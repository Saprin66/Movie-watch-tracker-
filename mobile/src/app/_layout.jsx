import "../../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "../lib/auth";
import { usePushNotifications } from "../lib/push";
import { COLORS } from "../components/ui";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30 * 1000 } },
});

function RootNavigator() {
  const { ready, signedIn, token } = useAuth();
  usePushNotifications(token, signedIn);
  // Пока читаем токен из хранилища, показываем заставку
  if (!ready) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.bg },
      }}
    >
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="movie/[type]/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="review/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="person/[id]" options={{ presentation: "modal" }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="auth" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}
