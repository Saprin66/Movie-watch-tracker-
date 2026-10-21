import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useApiCall, useLists } from "../lib/social";
import { itemFromTmdb } from "../lib/lists";
import { Button, COLORS } from "./ui";

// Выбор общего списка «Смотрим вместе», куда добавить фильм
export default function AddToList({ movie }) {
  const { data: lists, isLoading, error } = useLists();
  const call = useApiCall();
  // id списка -> "adding" | "added" | "exists" | текст ошибки
  const [status, setStatus] = useState({});

  const add = async (list) => {
    setStatus((s) => ({ ...s, [list.id]: "adding" }));
    try {
      await call(`/api/lists/${list.id}/items`, { method: "POST", body: itemFromTmdb(movie) }, [
        ["lists"],
        ["list", list.id],
      ]);
      setStatus((s) => ({ ...s, [list.id]: "added" }));
    } catch (e) {
      setStatus((s) => ({ ...s, [list.id]: e.status === 409 ? "exists" : e.message }));
    }
  };

  if (isLoading) return <ActivityIndicator color={COLORS.accent} />;
  if (error) return <Text className="text-sm text-red-300">{error.message}</Text>;
  if (!lists?.length) {
    return (
      <Text className="text-sm text-muted">Общих списков пока нет. Создай их во вкладке «Вместе».</Text>
    );
  }

  return (
    <View className="gap-1.5">
      {lists.map((list) => {
        const st = status[list.id];
        const done = st === "added" || st === "exists";
        const failed = st && !done && st !== "adding";
        return (
          <View key={list.id} className="flex-row items-center gap-3 rounded-xl bg-white/[0.03] p-2 pl-3.5">
            <View className="flex-1">
              <Text numberOfLines={1} className="text-sm font-bold text-white">{list.name}</Text>
              <Text className={`text-xs ${failed ? "text-red-300" : "text-muted"}`}>
                {st === "added" ? "Добавлено" : st === "exists" ? "Уже есть в этом списке" : failed ? st : `${list.members.length} участн.`}
              </Text>
            </View>
            <Button
              size="md"
              title={done ? "Готово" : "Добавить"}
              icon={done ? "check" : "plus"}
              variant={done ? "green" : "orange"}
              disabled={done}
              loading={st === "adding"}
              onPress={() => add(list)}
            />
          </View>
        );
      })}
    </View>
  );
}
