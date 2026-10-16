import { useEffect } from "react";
import Icon from "./Icon";
import Footer from "./Footer";
import { EYEBROW, PANEL } from "./styles";
import { Logo } from "./ui";
import { leaveHashRoute } from "../hooks/useHashRoute";
import { CONTACT_EMAIL, OPERATOR_NAME, POLICY_DATE_LABEL } from "../legal";

const Email = () => (
  <a
    href={`mailto:${CONTACT_EMAIL}`}
    className="text-[#ff7a45] hover:underline"
  >
    {CONTACT_EMAIL}
  </a>
);

const SECTIONS = [
  {
    id: "general",
    title: "1. Общие положения",
    body: (
      <>
        <p>
          Эта политика описывает, какие данные собирает сайт Movie Grade (далее
          — «Сервис»), зачем они нужны, как хранятся и как вы можете ими
          управлять. Оператором персональных данных является {OPERATOR_NAME}{" "}
          (далее — «Оператор»). Связаться с Оператором можно по адресу <Email />.
        </p>
        <p>
          Регистрируясь в Сервисе и отмечая соответствующую галочку, вы
          подтверждаете, что прочитали эту политику, и даёте согласие на
          обработку персональных данных на описанных ниже условиях.
        </p>
      </>
    ),
  },
  {
    id: "data",
    title: "2. Какие данные мы обрабатываем",
    body: (
      <>
        <p>Данные, которые вы указываете сами:</p>
        <ul>
          <li>адрес электронной почты и имя пользователя (ник);</li>
          <li>
            пароль. Мы храним только его необратимый хеш, сам пароль Оператору
            неизвестен;
          </li>
          <li>аватар и текст «о себе», если вы их добавили;</li>
          <li>
            ваш список фильмов и сериалов: статус («буду смотреть» или
            «просмотрено»), оценки, тексты отзывов, даты добавления и просмотра;
          </li>
          <li>
            связи с друзьями: отправленные и полученные заявки, список друзей.
          </li>
        </ul>
        <p>Данные, которые возникают при работе Сервиса:</p>
        <ul>
          <li>время вашей последней активности;</li>
          <li>
            IP-адрес. Он используется для ограничения числа попыток входа и
            запросов и может попадать в технические журналы сервера
            (хостинга);
          </li>
          <li>
            в браузере на вашем устройстве хранятся токен входа и настройки
            интерфейса (сортировка списка, регион для подбора сервисов
            просмотра). Рекламных и аналитических cookie Сервис не использует.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "purposes",
    title: "3. Для чего мы используем данные",
    body: (
      <ul>
        <li>создание и защита вашего аккаунта, подтверждение email;</li>
        <li>
          отправка служебных писем: код подтверждения и код сброса пароля.
          Рекламных рассылок Сервис не делает;
        </li>
        <li>
          ведение вашего списка, работа ленты друзей, профилей, рекомендаций и
          статистики;
        </li>
        <li>защита Сервиса от злоупотреблений и подбора паролей;</li>
        <li>ответы на ваши обращения.</li>
      </ul>
    ),
  },
  {
    id: "visibility",
    title: "4. Что видят другие пользователи",
    body: (
      <ul>
        <li>
          ваш ник, аватар, «о себе», последний просмотренный фильм и оценки
          видны другим зарегистрированным пользователям;
        </li>
        <li>
          тексты ваших отзывов видны только вам и подтверждённым друзьям;
        </li>
        <li>
          ваша активность (добавления, просмотры, оценки, отзывы) показывается в
          ленте ваших друзей;
        </li>
        <li>адрес электронной почты другим пользователям не показывается.</li>
      </ul>
    ),
  },
  {
    id: "third",
    title: "5. Передача данных третьим лицам",
    body: (
      <>
        <p>
          Мы не продаём данные и не передаём их для рекламы. Для работы Сервиса
          используются сторонние сервисы:
        </p>
        <ul>
          <li>
            <strong>Resend</strong> — отправка писем. Получает ваш email и текст
            письма с кодом;
          </li>
          <li>
            <strong>TMDB</strong> — поиск и описания фильмов. Запросы к нему
            отправляет ваш браузер напрямую, поэтому TMDB видит ваш IP-адрес и
            то, что вы ищете. Данные о том, где смотреть фильм, предоставляет
            JustWatch через TMDB;
          </li>
          <li>
            <strong>jsDelivr</strong> — сеть доставки, с которой загружаются
            иконки интерфейса (получает ваш IP-адрес);
          </li>
          <li>хостинг-провайдер, на серверах которого работает Сервис.</li>
        </ul>
        <p>
          Часть этих сервисов находится за пределами России, поэтому данные
          могут обрабатываться за границей. Также данные могут быть раскрыты
          по законному требованию государственных органов.
        </p>
      </>
    ),
  },
  {
    id: "storage",
    title: "6. Срок хранения и безопасность",
    body: (
      <>
        <p>
          Данные хранятся, пока существует ваш аккаунт. После удаления аккаунта
          его данные удаляются из базы Сервиса, за исключением того, что
          Оператор обязан хранить по закону.
        </p>
        <p>
          Мы принимаем разумные меры защиты: пароли хранятся в виде хеша,
          соединение защищено HTTPS, на вход и коды подтверждения действуют
          ограничения по числу попыток. Но ни один сервис в интернете не может
          гарантировать абсолютную безопасность.
        </p>
      </>
    ),
  },
  {
    id: "rights",
    title: "7. Ваши права",
    body: (
      <>
        <p>Вы вправе:</p>
        <ul>
          <li>узнать, какие ваши данные обрабатываются, и получить их копию;</li>
          <li>
            изменить свои данные (ник, аватар, «о себе» и список можно менять в
            самом Сервисе);
          </li>
          <li>
            отозвать согласие на обработку данных и потребовать удалить аккаунт
            и все связанные с ним данные.
          </li>
        </ul>
        <p>
          Для этого напишите на <Email /> с адреса, указанного при регистрации.
          Мы ответим в срок, установленный законом. Отзыв согласия означает
          удаление аккаунта: без данных, нужных для входа, Сервис работать не
          может.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "8. Возраст",
    body: (
      <p>
        Сервис не предназначен для детей младше 14 лет. Если вы считаете, что
        ребёнок младше этого возраста зарегистрировался в Сервисе, сообщите нам,
        и мы удалим аккаунт.
      </p>
    ),
  },
  {
    id: "changes",
    title: "9. Изменения политики",
    body: (
      <p>
        Мы можем обновлять эту политику. Действующая редакция всегда доступна
        на этой странице, дата последнего обновления указана вверху. О
        существенных изменениях мы сообщим в Сервисе или по почте.
      </p>
    ),
  },
];

export default function PrivacyPolicy() {
  useEffect(() => {
    const prev = document.title;
    document.title = "Политика конфиденциальности — MovieGrade";
    return () => {
      document.title = prev;
    };
  }, []);

  return (
    <div className="min-h-app bg-[#0a0c18] text-[#c4c8e4] safe-x">
      <header className="sticky top-0 z-40 bg-[#0a0c18]/90 backdrop-blur-xl border-b border-white/[0.06] safe-top">
        <div className="max-w-[1240px] mx-auto flex items-center justify-between gap-3 px-4 sm:px-10 h-[72px]">
          <Logo />
          <button
            type="button"
            onClick={leaveHashRoute}
            className="inline-flex items-center gap-2 h-11 px-4 rounded-xl text-sm font-bold bg-white/[0.07] hover:bg-white/[0.12] text-[#e9ebf7]"
          >
            <Icon n="arrow-left" className="w-4 h-4 opacity-70" />
            Назад на сайт
          </button>
        </div>
      </header>

      <div className="max-w-[1240px] mx-auto px-4 sm:px-10 py-8 sm:py-12 pb-[calc(2rem+env(safe-area-inset-bottom))] flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
        <nav aria-label="Содержание" className="hidden lg:block w-[280px] shrink-0 sticky top-24">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#7b81a6] px-3.5 pb-3">Содержание</div>
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#policy-${s.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(`policy-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="block px-3.5 py-2.5 rounded-[10px] text-sm font-semibold leading-snug text-[#8b91b5] hover:bg-white/5 hover:text-white"
            >
              {s.title}
            </a>
          ))}
        </nav>

        <main className="flex-1 min-w-0 max-w-[780px] w-full">
          <div className={EYEBROW}>Документ</div>
          <h1 className="mt-3 font-display text-[28px] sm:text-[36px] font-bold leading-tight text-white">
            Политика конфиденциальности
          </h1>
          <p className="mt-3.5 text-sm text-[#8b91b5]">
            Редакция от {POLICY_DATE_LABEL}
          </p>

          <div className="mt-8 space-y-[18px]">
            {SECTIONS.map((s) => (
              <section
                key={s.id}
                aria-labelledby={`policy-${s.id}`}
                className={`${PANEL} p-5 sm:p-7 scroll-mt-24`}
              >
                <h2
                  id={`policy-${s.id}`}
                  className="font-display text-[17px] sm:text-[19px] font-semibold text-white mb-4 scroll-mt-24"
                >
                  {s.title}
                </h2>
                <div className="space-y-3 text-[15px] leading-[1.75] text-[#c4c8e4] [&_ul]:space-y-2.5 [&_li]:relative [&_li]:pl-[22px] [&_li]:before:content-[''] [&_li]:before:absolute [&_li]:before:left-0.5 [&_li]:before:top-[11px] [&_li]:before:w-[7px] [&_li]:before:h-[7px] [&_li]:before:rounded-full [&_li]:before:bg-[#ff7a45] [&_strong]:text-white">
                  {s.body}
                </div>
              </section>
            ))}
          </div>

          <Footer className="mt-12" />
        </main>
      </div>
    </div>
  );
}
