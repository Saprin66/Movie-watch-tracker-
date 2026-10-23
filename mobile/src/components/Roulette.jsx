import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { Button, Poster } from "./ui";

const TILE = 88; // ширина постера в ленте
const GAP = 10;
const STEP = TILE + GAP;
const REEL_LENGTH = 34; // сколько постеров пролетает за один прокрут
const WINNER_AT = 28; // на каком месте ленты стоит выпавший фильм
const SPIN_MS = 3600;
const IDLE_OFFSET = 16;

const randomOf = (list) => list[Math.floor(Math.random() * list.length)];

// Лента постеров: случайные фильмы из списка, на месте WINNER_AT — победитель
function buildReel(list, winner, first) {
  return Array.from({ length: REEL_LENGTH }, (_, i) =>
    i === WINNER_AT ? winner : i === 0 ? first : randomOf(list),
  );
}

// «Рулетка»: лента постеров из списка прокручивается и останавливается на случайном фильме.
// watchlist — записи журнала, onWinner(movie | null) — выпавший фильм (null, пока крутится),
// renderWinner(spinAgain) — что показать под лентой, когда фильм выпал.
export default function Roulette({ watchlist, winner, onWinner, renderWinner }) {
  const [reel, setReel] = useState({ items: [], listKey: "" });
  const [spin, setSpin] = useState(0); // номер прокрута: запускает анимацию после смены ленты
  const [spinning, setSpinning] = useState(false);
  const [width, setWidth] = useState(0);
  const x = useSharedValue(IDLE_OFFSET);

  const centerOf = (index) => -(index * STEP) + width / 2 - TILE / 2;

  // Список поменялся (отметка «посмотрел») — лента снова в покое
  const listKey = watchlist.map((m) => m.id).join(",");
  useEffect(() => {
    x.set(IDLE_OFFSET);
  }, [listKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Лента уже отрисована: ставим её в начало и крутим чуть мимо центра,
  // затем доводим точно к указателю — так остановка выглядит живее
  useEffect(() => {
    if (!spin) return;
    x.set(centerOf(0));
    x.set(withSequence(
      withTiming(centerOf(WINNER_AT) + (Math.random() - 0.5) * TILE * 0.5, {
        duration: SPIN_MS - 200,
        easing: Easing.bezier(0.12, 0.75, 0.15, 1),
      }),
      withTiming(centerOf(WINNER_AT), { duration: 350, easing: Easing.out(Easing.quad) }),
    ));
    const timer = setTimeout(() => {
      setSpinning(false);
      onWinner(reel.items[WINNER_AT]);
    }, SPIN_MS + 150);
    return () => clearTimeout(timer);
  }, [spin]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => {
    if (spinning || watchlist.length === 0) return;
    const next = randomOf(watchlist);
    // Новая лента начинается с текущего фильма, чтобы не было рывка
    setReel({ items: buildReel(watchlist, next, winner || randomOf(watchlist)), listKey });
    setSpinning(true);
    setSpin((n) => n + 1);
    onWinner(null);
  };

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  // Пока не крутили — показываем постеры из списка, чтобы было видно, из чего выбираем
  const fresh = reel.items.length > 0 && reel.listKey === listKey;
  const tiles = fresh ? reel.items : watchlist.slice(0, 12);

  return (
    <View className="gap-4">
      <View className="-mx-4 py-2.5 overflow-hidden" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <Animated.View style={[{ flexDirection: "row", gap: GAP }, style]}>
          {tiles.map((m, i) => (
            <View
              key={i}
              style={{ width: TILE }}
              className={`aspect-[2/3] overflow-hidden rounded-[14px] border border-white/15 ${
                fresh && winner && i !== WINNER_AT ? "opacity-40" : ""
              }`}
            >
              <Poster uri={m.posterUrl} title={m.title} small />
            </View>
          ))}
        </Animated.View>
        {/* Затемнение по краям и указатель по центру */}
        <LinearGradient
          colors={["#12152a", "rgba(18,21,42,0)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="absolute inset-y-0 left-0 w-12"
          pointerEvents="none"
        />
        <LinearGradient
          colors={["rgba(18,21,42,0)", "#12152a"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="absolute inset-y-0 right-0 w-12"
          pointerEvents="none"
        />
        {fresh && (
          <View
            pointerEvents="none"
            style={{ width: TILE + 8, left: width / 2 - (TILE + 8) / 2 }}
            className="absolute inset-y-0 rounded-[18px] border-2 border-accent"
          />
        )}
      </View>

      {winner ? (
        <>
          <Text className="text-center text-xs font-extrabold uppercase tracking-[2px] text-accent-light">
            Сегодня смотрим
          </Text>
          {renderWinner(start)}
        </>
      ) : (
        <Button
          icon={spinning ? "loader" : "shuffle"}
          title={spinning ? "Крутим…" : "Крутить рулетку"}
          disabled={spinning}
          onPress={start}
        />
      )}
    </View>
  );
}
