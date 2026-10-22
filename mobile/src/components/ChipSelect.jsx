import { Pressable, ScrollView, Text } from "react-native";

// Горизонтальный ряд переключателей: выбран один вариант из options [{ id, label }]
export default function ChipSelect({ options, value, onChange }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-4">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            className={`min-h-[36px] px-4 rounded-full border justify-center ${active ? "border-accent bg-accent/15" : "border-white/10 bg-deep"}`}
          >
            <Text className={`text-[13px] font-bold ${active ? "text-[#ffa27d]" : "text-soft"}`}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
