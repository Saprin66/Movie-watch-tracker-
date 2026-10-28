import { CONTACT_EMAIL, POLICY_HASH } from "../legal";

// Футер: ссылка на политику, контакты и обязательная отметка TMDB
export default function Footer({ className = "" }) {
  return (
    <footer
      className={`border-t border-white/[0.06] pt-6 text-xs text-[#7b81a6] ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="font-bold text-[#c4c8e4]">
          Movie<span className="text-[#ff7a45]">Grade</span>{" "}
          <span className="text-[#8b91b5]">
            © {new Date().getFullYear()}
          </span>{" "}
          <span className="font-semibold text-[#6f759e]">
            v{import.meta.env.VITE_APP_VERSION}
          </span>
        </div>

        <nav
          aria-label="Документы и контакты"
          className="flex flex-wrap gap-x-5 gap-y-1"
        >
          <a
            href={POLICY_HASH}
            className="text-[#9aa0c6] hover:text-[#ff935f] transition-colors"
          >
            Политика конфиденциальности
          </a>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-[#9aa0c6] hover:text-[#ff935f] transition-colors"
          >
            {CONTACT_EMAIL}
          </a>
        </nav>
      </div>

      <p className="mt-3 leading-relaxed text-[#7b81a6]">
        Данные о фильмах и сериалах предоставлены{" "}
        <a
          href="https://www.themoviedb.org"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-[#ff7a45]"
        >
          TMDB
        </a>
        . Сервис использует API TMDB, но не одобрен и не сертифицирован TMDB.
      </p>
    </footer>
  );
}
