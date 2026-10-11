export default function Icon({ n, className = "w-4 h-4" }) {
  return (
    <img
      src={`https://cdn.jsdelivr.net/npm/lucide-static@latest/icons/${n}.svg`}
      alt=""
      className={`${className} invert shrink-0`}
    />
  );
}
