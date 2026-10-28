import Icon from "./Icon";
import { BTN_ORANGE } from "./styles";

// Итог импорта журнала из файла: сколько добавлено, пропущено и не найдено
export default function ImportResultModal({ result, onClose }) {
  const stats = [
    { n: result.success.length, label: "Добавлено", color: "text-emerald-300" },
    { n: result.skipped.length, label: "Пропущено", color: "text-sky-300" },
    { n: result.failed.length, label: "Не найдено", color: "text-red-300" },
  ];

  return (
    <div className="fixed inset-0 bg-[#04050c]/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#12152a] border border-white/10 rounded-[24px] max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 sm:p-7 shadow-[0_40px_120px_rgba(0,0,0,0.7)]">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-xl font-semibold text-white">Результаты импорта</h3>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="w-11 h-11 flex items-center justify-center bg-white/[0.07] hover:bg-white/[0.12] rounded-full"
          >
            <Icon n="x" className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {stats.map((s) => (
            <div key={s.label} className="bg-[#171b38] rounded-2xl p-4 text-center">
              <div className={`font-display text-3xl font-bold ${s.color}`}>{s.n}</div>
              <div className="text-xs text-[#8b91b5]">{s.label}</div>
            </div>
          ))}
        </div>

        {result.failed.length > 0 && (
          <div className="mb-5">
            <h4 className="text-sm text-red-300 mb-2">Не найдено:</h4>
            <div className="bg-[#0a0c18] rounded-lg p-3 max-h-32 overflow-y-auto space-y-1">
              {result.failed.map((m, i) => (
                <div key={i} className="text-xs truncate">
                  {m.title}
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={onClose} className={`w-full h-12 rounded-xl text-sm ${BTN_ORANGE}`}>
          Понятно
        </button>
      </div>
    </div>
  );
}
