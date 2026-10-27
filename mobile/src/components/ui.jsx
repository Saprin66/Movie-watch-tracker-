import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { cssInterop } from "nativewind";

// Чтобы className работал и у компонентов не из React Native
cssInterop(Image, { className: "style" });
cssInterop(LinearGradient, { className: "style" });

export const COLORS = {
  bg: "#0a0c18",
  panel: "#12152a",
  accent: "#ff7a45",
  muted: "#8b91b5",
  faint: "#6f759e",
  ink: "#e9ebf7",
  onAccent: "#1b0d07",
  green: "#58dcaa",
};

// Иконки Feather: почти те же, что lucide на сайте
export const Icon = ({ name, size = 16, color = COLORS.ink, style }) => (
  <Feather name={name} size={size} color={color} style={style} />
);

const BUTTON = {
  orange: { box: "bg-accent", text: "text-on-accent font-extrabold", icon: COLORS.onAccent },
  soft: { box: "bg-white/[0.07]", text: "text-ink font-bold", icon: COLORS.ink },
  red: { box: "bg-red-400/[0.14]", text: "text-red-300 font-bold", icon: "#fca5a5" },
  green: { box: "bg-emerald-400/[0.16]", text: "text-[#58dcaa] font-extrabold", icon: COLORS.green },
};

export function Button({
  title,
  onPress,
  variant = "orange",
  icon,
  disabled,
  loading,
  className = "",
  size = "lg",
  square = false, // квадратная кнопка с одной иконкой
}) {
  const v = BUTTON[variant];
  const height = size === "lg" ? "h-[52px] rounded-[14px]" : "h-11 rounded-xl";
  const width = square ? (size === "lg" ? "w-[52px]" : "w-11") : "px-4";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`${height} ${width} flex-row items-center justify-center gap-2 active:opacity-80 ${v.box} ${disabled ? "opacity-50" : ""} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={v.icon} />
      ) : (
        <>
          {icon && <Icon name={icon} size={18} color={v.icon} />}
          {title ? <Text className={`text-[15px] ${v.text}`}>{title}</Text> : null}
        </>
      )}
    </Pressable>
  );
}

// Текстовая кнопка-ссылка («Забыли пароль?», «Вернуться ко входу»)
export const LinkButton = ({ title, onPress, tone = "muted", icon, disabled }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    className={`min-h-[44px] flex-row items-center justify-center gap-2 ${disabled ? "opacity-50" : ""}`}
  >
    {icon && <Icon name={icon} size={16} color={tone === "accent" ? "#ff935f" : COLORS.muted} />}
    <Text className={`text-sm font-bold ${tone === "accent" ? "text-accent-light" : "text-muted"}`}>
      {title}
    </Text>
  </Pressable>
);

// Поле ввода с подписью и иконкой слева.
// size: "lg" (52 px, формы входа) или "md" (44 px, поиск и фильтры).
// textClass меняет размер шрифта, например для поля кода.
export function Field({ label, icon, className = "", size = "lg", textClass = "text-base", ...props }) {
  const box = props.multiline
    ? "min-h-[90px] py-3 rounded-[14px]"
    : size === "md"
      ? "h-11 rounded-xl"
      : "h-[52px] rounded-[14px]";
  return (
    <View className={className}>
      {label ? <Text className="text-[13px] font-bold text-soft mb-2">{label}</Text> : null}
      <View className="justify-center">
        {icon && (
          <View className="absolute left-4 z-10">
            <Icon name={icon} size={18} color={COLORS.faint} />
          </View>
        )}
        <TextInput
          placeholderTextColor={COLORS.faint}
          selectionColor={COLORS.accent}
          className={`${box} ${textClass} bg-panel border border-white/10 px-4 font-medium text-white ${icon ? "pl-12" : ""}`}
          {...props}
        />
      </View>
    </View>
  );
}

export const Notice = ({ error, children }) => (
  <View
    className={`flex-row items-center gap-2.5 p-3.5 rounded-xl border ${error ? "bg-red-500/10 border-red-500/30" : "bg-emerald-500/10 border-emerald-500/30"}`}
  >
    <Icon name={error ? "alert-circle" : "check-circle"} size={16} color={error ? "#fca5a5" : "#6ee7b7"} />
    <Text className={`flex-1 text-sm ${error ? "text-red-300" : "text-emerald-300"}`}>{children}</Text>
  </View>
);

const CHIP = {
  soft: "bg-white/[0.07] text-soft",
  orange: "bg-accent/[0.16] text-[#ff9a6c]",
  green: "bg-emerald-400/[0.14] text-[#58dcaa]",
  blue: "bg-sky-400/[0.15] text-[#86b8ff]",
};

export function Chip({ children, tone = "soft", solid = false }) {
  const [bg, color] = CHIP[tone].split(" ");
  return (
    <View className={`px-2.5 py-0.5 rounded-full ${solid ? "bg-[#080a16]/80" : bg}`}>
      <Text className={`text-[11px] font-bold ${color}`}>{children}</Text>
    </View>
  );
}

// Детерминированный оттенок по строке: у каждого фильма свой цвет заглушки
const hueOf = (text = "") => {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) % 360;
  return h;
};

// Постер или цветная заглушка с названием, если картинки нет
export function Poster({ uri, title, small = false }) {
  if (uri) {
    return <Image source={{ uri }} className="w-full h-full" contentFit="cover" transition={150} />;
  }
  const h1 = hueOf(title);
  const h2 = (h1 + 40) % 360;
  return (
    <LinearGradient
      colors={[`hsl(${h1}, 45%, 24%)`, `hsl(${h2}, 55%, 8%)`]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      className="w-full h-full justify-end p-2.5"
    >
      {!small && (
        <Text numberOfLines={3} className="text-[12px] font-bold leading-tight text-white">
          {title}
        </Text>
      )}
    </LinearGradient>
  );
}

// Карточка фильма в сетке: постер, метки сверху, название и подпись снизу
export function MovieCard({ poster, title, chips, footer, onPress }) {
  return (
    <Pressable onPress={onPress} className="flex-1 active:opacity-80">
      <View className="aspect-[2/3] overflow-hidden rounded-[14px] border border-white/[0.08] bg-card">
        <Poster uri={poster} title={title} />
        {chips ? (
          <View className="absolute top-2 left-2 right-2 flex-row flex-wrap gap-1">{chips}</View>
        ) : null}
      </View>
      <View className="pt-2 px-0.5">
        <Text numberOfLines={1} className="text-[13px] font-bold text-white">
          {title}
        </Text>
        {footer ? (
          <Text numberOfLines={1} className="mt-0.5 text-xs text-muted">
            {footer}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export const Empty = ({ text, children }) => (
  <View className="bg-panel border border-white/[0.07] rounded-[20px] items-center py-14 px-6 gap-4">
    <Text className="text-center text-muted">{text}</Text>
    {children}
  </View>
);

export const Eyebrow = ({ children }) => (
  <Text className="text-[11px] font-extrabold uppercase tracking-[2px] text-accent-light mb-2">
    {children}
  </Text>
);

export const PageTitle = ({ children }) => (
  <Text className="text-[26px] font-bold leading-tight text-white">{children}</Text>
);

// Логотип: оранжевый квадрат с «play» и надпись MovieGrade
export const Logo = () => (
  <View className="flex-row items-center gap-3">
    <Image source={require("../../assets/logo-mark.png")} style={{ width: 44, height: 44 }} contentFit="contain" />
    <Text className="text-xl font-bold text-white">
      Movie<Text className="text-accent">Grade</Text>
    </Text>
  </View>
);

// Круглый аватар: картинка или первая буква ника на градиенте
export function Avatar({ name, uri, size = 40, rounded = "rounded-full" }) {
  return (
    <View style={{ width: size, height: size }} className={`${rounded} overflow-hidden`}>
      {uri ? (
        <Image source={{ uri }} className="w-full h-full" contentFit="cover" />
      ) : (
        <LinearGradient
          colors={["#ff7a45", "#8b5cf6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="w-full h-full items-center justify-center"
        >
          <Text style={{ fontSize: size * 0.4 }} className="font-extrabold text-white">
            {name?.[0]?.toUpperCase() || "U"}
          </Text>
        </LinearGradient>
      )}
    </View>
  );
}

export const Panel = ({ children, className = "" }) => (
  <View className={`bg-panel border border-white/[0.07] rounded-[20px] ${className}`}>{children}</View>
);

export const SectionTitle = ({ children, className = "" }) => (
  <Text className={`text-[17px] font-semibold text-white ${className}`}>{children}</Text>
);

// Плашка с оценкой «8/10»
export const RatingBadge = ({ value, big = false }) => (
  <View className="flex-row items-baseline gap-0.5 px-3 py-1.5 rounded-xl bg-accent/15">
    <Text className={`${big ? "text-xl" : "text-base"} font-bold text-accent-light`}>{value}</Text>
    <Text className="text-[11px] text-accent-light opacity-70">/10</Text>
  </View>
);

// Шапка вложенного экрана: кнопка «назад» и заголовок
export function ScreenHeader({ title, onBack, right }) {
  return (
    <View className="flex-row items-center gap-2 px-2 h-14">
      <Pressable onPress={onBack} className="w-11 h-11 items-center justify-center rounded-full active:bg-white/10">
        <Icon name="chevron-left" size={26} />
      </Pressable>
      <Text numberOfLines={1} className="flex-1 text-[17px] font-bold text-white">
        {title}
      </Text>
      {right}
    </View>
  );
}

// Красная точка-счётчик на иконке
export const Badge = ({ count }) =>
  count > 0 ? (
    <View className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent items-center justify-center">
      <Text className="text-[10px] font-extrabold text-on-accent">{count > 99 ? "99+" : count}</Text>
    </View>
  ) : null;
