import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { Avatar } from "./ui";
import { BTN_ORANGE, BTN_SOFT, DARK_ICON } from "./styles";
import { formatTimeAgo } from "../utils/time";

// Кнопки «Принять» / «Отклонить» для одного уведомления
function Actions({ onAccept, onDecline, label }) {
  const [busy, setBusy] = useState(false);
  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-2.5 flex gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => run(onAccept)}
        className={`flex-1 h-10 px-3 rounded-xl text-[13px] inline-flex items-center justify-center gap-1.5 disabled:opacity-50 ${BTN_ORANGE}`}
      >
        <Icon n="check" className={`w-4 h-4 ${DARK_ICON}`} /> Принять
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => run(onDecline)}
        aria-label={`Отклонить: ${label}`}
        className={`flex-1 h-10 px-3 rounded-xl text-[13px] disabled:opacity-50 ${BTN_SOFT}`}
      >
        Отклонить
      </button>
    </div>
  );
}

function InviteText({ invite }) {
  return (
    <>
      <b className="text-white">{invite.owner?.username || "Друг"}</b> приглашает вас в общий список{" "}
      <b className="text-white">«{invite.name}»</b>
    </>
  );
}

// Колокольчик в шапке: приглашения в общие списки и заявки в друзья
export function NotificationsBell({
  invites,
  requests,
  onAcceptInvite,
  onDeclineInvite,
  onAcceptFriend,
  onDeclineFriend,
  onOpenFriend,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const count = invites.length + requests.length;

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={count > 0 ? `Уведомления: ${count} новых` : "Уведомления"}
        className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-colors ${open ? "bg-[#ff7a45]/[0.16]" : "bg-white/[0.07] hover:bg-white/[0.12]"}`}
      >
        <Icon n="bell" className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 rounded-full bg-[#ff7a45] text-[#1b0d07] text-[11px] font-extrabold flex items-center justify-center border-2 border-mg-bg">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Уведомления"
          className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-[calc(72px+env(safe-area-inset-top))] sm:top-[calc(100%+0.75rem)] z-50 sm:w-[360px] max-h-[70dvh] overflow-y-auto scroll-contain rounded-2xl border border-white/10 bg-mg-pop mg-pop-glass p-2 shadow-2xl shadow-black/50"
        >
          <div className="px-3 pt-2.5 pb-2 font-display text-base font-semibold text-white">Уведомления</div>

          {count === 0 && (
            <div className="px-3 pb-5 pt-2 text-sm text-[#8f8d9b]">Новых уведомлений нет.</div>
          )}

          {invites.map((inv) => (
            <div key={`list-${inv.listId}`} className="rounded-xl p-3 hover:bg-white/[0.03]">
              <div className="flex gap-3">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-[#ff7a45]/15 flex items-center justify-center">
                  <Icon n="popcorn" className="w-5 h-5 [filter:invert(1)_sepia(1)_saturate(6)_hue-rotate(335deg)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-[#cfcdd8]"><InviteText invite={inv} /></p>
                  <p className="mt-1 text-xs text-[#7c7a88]">
                    {inv.itemsCount > 0 ? `В списке уже ${inv.itemsCount} · ` : ""}
                    {formatTimeAgo(inv.invitedAt)}
                  </p>
                  <Actions
                    label={`приглашение в «${inv.name}»`}
                    onAccept={() => {
                      setOpen(false);
                      return onAcceptInvite(inv);
                    }}
                    onDecline={() => onDeclineInvite(inv)}
                  />
                </div>
              </div>
            </div>
          ))}

          {requests.map((r) => (
            <div key={`friend-${r.id}`} className="rounded-xl p-3 hover:bg-white/[0.03]">
              <div className="flex gap-3">
                <button type="button" onClick={() => onOpenFriend(r.id)} className="shrink-0" aria-label={`Профиль ${r.username}`}>
                  <Avatar name={r.username} avatar={r.avatar} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-[#cfcdd8]">
                    <b className="text-white">{r.username}</b> хочет добавить вас в друзья
                  </p>
                  <Actions
                    label={`заявка от ${r.username}`}
                    onAccept={() => onAcceptFriend(r)}
                    onDecline={() => onDeclineFriend(r)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Всплывающее уведомление о новом приглашении
export function InviteToast({ invite, onAccept, onDecline, onClose }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed z-[55] left-3 right-3 sm:left-auto sm:right-6 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-6 sm:w-[380px] rounded-2xl border border-[#ff7a45]/30 bg-mg-pop mg-pop-glass/95 backdrop-blur-xl p-4 shadow-[0_24px_60px_rgba(0,0,0,0.55)] animate-[toastIn_.25s_ease-out]"
    >
      <div className="flex gap-3">
        <div className="w-10 h-10 shrink-0 rounded-xl bg-[#ff7a45]/15 flex items-center justify-center">
          <Icon n="popcorn" className="w-5 h-5 [filter:invert(1)_sepia(1)_saturate(6)_hue-rotate(335deg)]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#ff8f5f]">Новое приглашение</p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Скрыть уведомление"
              className="-mt-2 -mr-2 w-9 h-9 shrink-0 flex items-center justify-center rounded-full hover:bg-white/[0.08]"
            >
              <Icon n="x" className="w-4 h-4 opacity-70" />
            </button>
          </div>
          <p className="mt-1 text-sm leading-snug text-[#cfcdd8]"><InviteText invite={invite} /></p>
          <Actions label={`приглашение в «${invite.name}»`} onAccept={onAccept} onDecline={onDecline} />
        </div>
      </div>
    </div>
  );
}
