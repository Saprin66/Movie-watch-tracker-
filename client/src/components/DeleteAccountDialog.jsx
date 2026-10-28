import { useState } from "react";
import ConfirmDialog from "./ConfirmDialog";
import { INPUT } from "./styles";
import { useAuth } from "../context/AuthContext";

// Удаление аккаунта: подтверждение паролем
export default function DeleteAccountDialog({ onClose }) {
  const { user, deleteAccount } = useAuth();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <ConfirmDialog
      title="Удалить аккаунт?"
      message={<>Вы точно хотите удалить аккаунт <b className="text-white">{user?.username}</b>? Журнал, оценки, отзывы, друзья и ваши общие списки удалятся навсегда. Это нельзя отменить.</>}
      confirmLabel="Удалить навсегда"
      icon="trash-2"
      busy={busy}
      error={error}
      confirmDisabled={!password}
      onClose={onClose}
      onConfirm={async () => {
        setBusy(true);
        setError("");
        const result = await deleteAccount(password);
        setBusy(false);
        if (!result.success) setError(result.error);
      }}
    >
      <label className="block">
        <span className="block text-[13px] font-bold text-[#aeb3d6] mb-2">Введите пароль для подтверждения</span>
        <input
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={INPUT}
          placeholder="Пароль"
        />
      </label>
    </ConfirmDialog>
  );
}
