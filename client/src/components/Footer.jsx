import { CONTACT_EMAIL, POLICY_HASH } from "../legal";

// Футер: ссылка на политику, контакты и обязательная отметка TMDB
export default function Footer({ className = "" }) {
  return (
    <footer
      className={`border-t border-white/5 pt-6 text-xs text-[#8a90b8] ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="text-[#c9cce6]">
          Movie<span className="text-[#f47c4f]">Grade</span>{" "}
          <span className="text-[#8a90b8]">
            © {new Date().getFullYear()}
          </span>
        </div>

        <nav
          aria-label="Документы и контакты"
          className="flex flex-wrap gap-x-5 gap-y-1"
        >
          <a
            href={POLICY_HASH}
            className="hover:text-[#f47c4f] transition-colors"
          >
            Политика конфиденциальности
          </a>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="hover:text-[#f47c4f] transition-colors"
          >
            {CONTACT_EMAIL}
          </a>
        </nav>
      </div>

      <p className="mt-3 leading-relaxed text-[#6f759e]">
        Данные о фильмах и сериалах предоставлены{" "}
        <a
          href="https://www.themoviedb.org"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-[#f47c4f]"
        >
          TMDB
        </a>
        . Сервис использует API TMDB, но не одобрен и не сертифицирован TMDB.
      </p>
    </footer>
  );
}
