import { useState } from "react";
import { useAuth } from "../context/AuthContext";

// Уменьшает картинку до 512px и сжимает в WebP так, чтобы влезла в лимит сервера
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxSide = 512;
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) return reject(new Error("Не удалось обработать изображение."));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      let quality = 0.86;
      let result = canvas.toDataURL("image/webp", quality);
      while (result.length > 450_000 && quality > 0.4) {
        quality -= 0.1;
        result = canvas.toDataURL("image/webp", quality);
      }
      if (result.length > 500_000) return reject(new Error("Изображение не удалось сжать до нужного размера. Выбери другое."));
      resolve(result);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Не удалось открыть это изображение."));
    };
    image.src = objectUrl;
  });
}

// Смена и удаление аватара с сообщениями для профиля и настроек
export function useAvatarUpload() {
  const { updateAvatar } = useAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const resetMessages = () => {
    setMessage("");
    setError("");
  };

  const save = async (dataUrl, okText, failText) => {
    setSaving(true);
    try {
      const result = await updateAvatar(dataUrl);
      if (!result.success) throw new Error(result.error || failText);
      setMessage(okText);
    } catch (err) {
      setError(err.message || failText);
    } finally {
      setSaving(false);
    }
  };

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    resetMessages();
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Выбери файл изображения.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Файл слишком большой. Максимальный размер исходного изображения — 10 МБ.");
      return;
    }
    let dataUrl;
    try {
      dataUrl = await compressImage(file);
    } catch (err) {
      setError(err.message);
      return;
    }
    await save(dataUrl, "Аватар успешно обновлён.", "Не удалось сохранить аватар.");
  };

  const onRemove = async () => {
    resetMessages();
    await save(null, "Аватар удалён.", "Не удалось удалить аватар.");
  };

  return { saving, message, error, onFile, onRemove, resetMessages };
}
