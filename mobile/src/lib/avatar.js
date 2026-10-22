import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

// Сервер принимает аватар как data URL картинки не больше 500 КБ
const MAX_LENGTH = 500_000;

// Выбор фото из галереи, квадратная обрезка и сжатие до 512×512.
// Возвращает data URL или null, если человек ничего не выбрал.
export async function pickAvatar() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (result.canceled || !result.assets?.length) return null;

  const image = await ImageManipulator.manipulate(result.assets[0].uri).resize({ width: 512 }).renderAsync();
  for (const compress of [0.85, 0.7, 0.55, 0.4]) {
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress, base64: true });
    const dataUrl = `data:image/jpeg;base64,${saved.base64}`;
    if (dataUrl.length <= MAX_LENGTH) return dataUrl;
  }
  throw new Error("Изображение не удалось сжать до нужного размера. Выбери другое.");
}
