import { useState, useEffect, useRef } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthScreen from "./components/AuthScreen";
import Landing from "./components/Landing";
import Footer from "./components/Footer";
import PrivacyPolicy from "./components/PrivacyPolicy";
import { useHashRoute, leaveHashRoute } from "./hooks/useHashRoute";
import { POLICY_HASH, LOGIN_HASH, REGISTER_HASH } from "./legal";
import FriendsPanel from "./components/FriendsPanel";
import ProfileModal from "./components/ProfileModal";
import ReviewModal from "./components/ReviewModal";
import ConfirmDialog from "./components/ConfirmDialog";
import DeleteAccountDialog from "./components/DeleteAccountDialog";
import ImportResultModal from "./components/ImportResultModal";
import MovieDetailsModal from "./components/MovieDetailsModal";
import PersonPage from "./components/PersonPage";
import ProfilePage from "./components/ProfilePage";
import StatsPage from "./components/StatsPage";
import FriendsFeed from "./components/FriendsFeed";
import HomeFeed from "./components/HomeFeed";
import WhatToWatch from "./components/WhatToWatch";
import SharedLists from "./components/SharedLists";
import { InviteToast } from "./components/Notifications";
import { ChangelogModal, UpdatedToast } from "./components/Changelog";
import AdBanner from "./components/AdBanner";
import SettingsPage from "./components/SettingsPage";
import SubscriptionPage from "./components/SubscriptionPage";
import { SubTabs } from "./components/ui";
import { EYEBROW, PAGE_TITLE } from "./components/styles";
import JournalPage from "./pages/JournalPage";
import SearchPage from "./pages/SearchPage";
import SeriesPage from "./pages/SeriesPage";
import TopBar from "./layout/TopBar";
import MobileDock from "./layout/MobileDock";
import FriendsSidebar from "./layout/FriendsSidebar";
import { navItems, sectionOf, subTabsOf } from "./layout/navigation";
import { useJournal } from "./hooks/useJournal";
import { useJournalView } from "./hooks/useJournalView";
import { useFriends } from "./hooks/useFriends";
import { useNotifications } from "./hooks/useNotifications";
import { useCatalog } from "./hooks/useCatalog";
import { useImport } from "./hooks/useImport";
import { useAvatarUpload } from "./hooks/useAvatarUpload";
import { useMetaBackfill } from "./hooks/useMetaBackfill";
import { useUiStyle } from "./hooks/useUiStyle";
import { hasUnseenChanges, markChangesSeen, takeUpdatedFrom } from "./changelog";
import { metaFromTmdb } from "./utils/genres";
import { fetchTmdb } from "./utils/tmdb";
import { entryKey, entryToMovie, findEntry, mediaTypeOf, tmdbToEntry } from "./utils/journal";
import { planOf } from "./utils/plans";
import { POSTER } from "./config";

function MovieTracker() {
  const { user, token, logout, updatePrivacy, redeemPromo, updateProfileTheme } = useAuth();
  const plan = planOf(user);
  const [activeTab, setActiveTab] = useState("movies");
  const openPremium = () => setActiveTab("profile-premium");
  const { styles: uiStyles, setStyle: setUiStyle } = useUiStyle();

  const journal = useJournal(token);
  const { movies, fetchMovies, addMovie, deleteMovie, updateMovieStatus } = journal;
  const journalView = useJournalView();
  const { friends, lastWatched, loadFriends } = useFriends();
  const [openListId, setOpenListId] = useState(null);
  const notifications = useNotifications({
    onFriendsChanged: loadFriends,
    onInviteAccepted: (listId) => {
      setOpenListId(listId);
      setActiveTab("together");
    },
  });
  const catalog = useCatalog({ active: activeTab === "search" });
  const importer = useImport({ token, movies, setMovies: journal.setMovies, fetchMovies });
  const avatar = useAvatarUpload();
  const avatarInputRef = useRef(null);

  const [themeError, setThemeError] = useState("");
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacyError, setPrivacyError] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [pageStack, setPageStack] = useState([]);
  const [reviewMovieId, setReviewMovieId] = useState(null);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  // Запись журнала, которую собираются удалить со страницы фильма
  const [movieToDelete, setMovieToDelete] = useState(null);
  const [movieDeleting, setMovieDeleting] = useState(false);

  // «Что нового»: подсказка после обновления сайта и точка на аватарке до открытия списка
  const [updatedToast, setUpdatedToast] = useState(() => Boolean(takeUpdatedFrom()));
  const [hasNews, setHasNews] = useState(hasUnseenChanges);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const openChangelog = () => {
    setUpdatedToast(false);
    setChangelogOpen(true);
    markChangesSeen();
    setHasNews(false);
  };

  useEffect(() => {
    const openProfileSettings = () => setActiveTab("profile-settings");
    window.addEventListener("moviegrade:open-profile-settings", openProfileSettings);
    return () => window.removeEventListener("moviegrade:open-profile-settings", openProfileSettings);
  }, []);

  // Старым записям дозаполняем год и жанры, чтобы работали фильтры
  useMetaBackfill({ movies, token, onUpdated: journal.patchMovie });

  useEffect(() => {
    if (token && ["movies", "series", "search", "discover"].includes(activeTab)) fetchMovies();
  }, [token, activeTab, fetchMovies]);

  // Кнопка-лупа: открыть поиск и сразу поставить курсор в поле
  const openSearch = () => {
    setActiveTab("search");
    requestAnimationFrame(() => catalog.inputRef.current?.focus());
  };

  // Запись журнала открывает страницу фильма, а старая запись без TMDB — сразу отзыв
  const openEntry = (entry) => (entry.tmdbId ? setSelectedMovie(entryToMovie(entry)) : setReviewMovieId(entry.id));

  const cardKey = (movie, existing) => (existing ? entryKey(existing) : `${mediaTypeOf(movie)}-${movie.id}`);

  // Кнопка «Посмотреть» на карточке: добавить в список / убрать из него
  const toggleWatchlist = (movie, existing) =>
    journal.once(cardKey(movie, existing), async () => {
      if (!existing) await addMovie(tmdbToEntry(movie, "WATCHLIST"));
      else if (existing.status === "WATCHLIST") await deleteMovie(existing.id);
      else await updateMovieStatus(existing.id, "WATCHLIST");
    });

  // Кнопка «Просмотрено»: отметить и сразу открыть оценку
  const markWatchedAndRate = (movie, existing) =>
    journal.once(cardKey(movie, existing), async () => {
      const entry = existing || (await addMovie(tmdbToEntry(movie, "WATCHED")));
      if (!entry?.id) return;
      if (entry.status !== "WATCHED") await updateMovieStatus(entry.id, "WATCHED");
      setReviewMovieId(entry.id);
    });

  const reviewMovie = movies.find((m) => m.id === reviewMovieId) || null;

  const openPerson = (person) => setPageStack((stack) => [...stack, { kind: "person", person }]);
  const pushMovie = (movie) => setPageStack((stack) => [...stack, { kind: "movie", movie }]);

  // Страница фильма из TMDB: основная (historyKey «details») или открытая поверх других
  const renderMovieDetails = (movie, historyKey, onClose) => (
    <MovieDetailsModal
      key={`${historyKey}-${movie.media_type || "movie"}-${movie.id}`}
      movie={movie}
      historyKey={historyKey}
      existing={findEntry(movies, movie)}
      onClose={onClose}
      onOpenReview={setReviewMovieId}
      onDelete={setMovieToDelete}
      onOpenPerson={openPerson}
      onEpisodesChanged={fetchMovies}
      movies={movies}
      onOpenMovie={pushMovie}
      onAddToWatchlist={journal.addToWatchlist}
      onAdd={async (status, details, foundType) => {
        // Фильм могли открыть из журнала друга, франшизы или рулетки: там нет
        // poster_path, а только готовый posterUrl. Если детали ещё не успели
        // загрузиться, догружаем их, чтобы не сохранить пустую карточку.
        let info = details;
        let type = foundType || mediaTypeOf(movie);
        if (!info) {
          const found = await fetchTmdb(type, movie.id, "", "&language=ru-RU").catch(() => null);
          if (found) {
            info = found.data;
            type = found.type;
          }
        }
        const posterPath = info?.poster_path || movie.poster_path;
        const created = await addMovie({
          tmdbId: movie.id,
          title: info?.title || info?.name || movie.title || movie.name,
          posterUrl: posterPath ? `${POSTER}${posterPath}` : movie.posterUrl || null,
          status,
          mediaType: type,
          ...metaFromTmdb(info || movie),
        });
        // «Смотрел» сразу открывает оценку, как и кнопка на карточке
        if (status === "WATCHED" && created?.id) setReviewMovieId(created.id);
      }}
    />
  );

  const counts = { requests: notifications.requestsCount, invites: notifications.listInvites.length };
  const items = navItems(counts);
  const activeSection = sectionOf(activeTab);
  const subTabs = subTabsOf(activeSection, counts);

  return (
    <div className="min-h-app bg-[#0a0c18] text-[#c4c8e4]">
      <div className="flex flex-col">
        <TopBar
          items={items}
          activeSection={activeSection}
          onNavigate={setActiveTab}
          notifications={{
            invites: notifications.listInvites,
            requests: notifications.friendRequests,
            onAcceptInvite: notifications.acceptInvite,
            onDeclineInvite: notifications.declineInvite,
            onAcceptFriend: (r) => notifications.answerFriendRequest(r, "accept"),
            onDeclineFriend: (r) => notifications.answerFriendRequest(r, "reject"),
            onOpenFriend: setSelectedUserId,
          }}
          account={{
            user,
            requestsCount: notifications.requestsCount,
            hasNews,
            onOpenChangelog: openChangelog,
            onLogout: logout,
          }}
        />

        <div className="flex flex-1 w-full max-w-[1680px] mx-auto">
          <main className="flex-1 min-w-0 px-4 lg:px-8 py-6 lg:py-8 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-10">
            {/* На компьютере переключатель разделов журнала живёт в его боковой панели */}
            {subTabs && (
              <SubTabs
                // На телефоне три вкладки «Моего списка» не влезают полными названиями
                items={subTabs.map((t) =>
                  t.short
                    ? { ...t, label: <><span className="sm:hidden">{t.short}</span><span className="hidden sm:inline">{t.label}</span></> }
                    : t,
                )}
                active={activeTab}
                onChange={setActiveTab}
                className={`mb-6 flex justify-center ${activeTab === "movies" ? "lg:hidden" : ""}`}
              />
            )}
            {/* key пересоздаёт обёртку при смене вкладки, чтобы проиграть анимацию входа */}
            <div key={activeTab} className="mg-tab-enter">
              {plan === "free" && ["home", "search"].includes(activeTab) && (
                <AdBanner onOpenPremium={openPremium} className="mb-6" />
              )}
              {activeTab === "home" && (
                <HomeFeed onOpenMovie={setSelectedMovie} onBrowse={() => setActiveTab("search")} />
              )}
              {activeTab === "movies" && (
                <JournalPage
                  user={user}
                  movies={movies}
                  view={journalView}
                  subTabs={subTabs}
                  activeTab={activeTab}
                  onTab={setActiveTab}
                  importState={{ importing: importer.importing, ...importer.progress }}
                  plan={plan}
                  onOpenPremium={openPremium}
                  onOpenEntry={openEntry}
                  onToggleWatchlist={(entry) => toggleWatchlist(null, entry)}
                  onMarkWatched={(entry) => markWatchedAndRate(null, entry)}
                />
              )}

              {activeTab === "series" && (
                <SeriesPage
                  movies={movies}
                  onOpenEntry={openEntry}
                  onMarkEpisode={(entry, episode) => journal.markEpisodes(entry.id, [episode])}
                  onMarkWatched={(entry) => updateMovieStatus(entry.id, "WATCHED")}
                />
              )}

              {activeTab === "search" && (
                <SearchPage
                  catalog={catalog}
                  movies={movies}
                  onOpenMovie={setSelectedMovie}
                  onToggleWatchlist={toggleWatchlist}
                  onMarkWatched={markWatchedAndRate}
                />
              )}

              {activeTab === "discover" && (
                <WhatToWatch
                  plan={plan}
                  onOpenPremium={openPremium}
                  movies={movies}
                  onOpenMovie={setSelectedMovie}
                  onMarkWatched={(id) => updateMovieStatus(id, "WATCHED")}
                  // Из «Что посмотреть сегодня?»: фильм из своего списка уже там, новый — добавляем
                  onWant={(item) => (item.journalId ? null : addMovie(tmdbToEntry(item, "WATCHLIST")))}
                  onSeen={(item) =>
                    item.journalId
                      ? updateMovieStatus(item.journalId, "WATCHED")
                      : addMovie(tmdbToEntry(item, "WATCHED"))
                  }
                />
              )}

              {activeTab === "feed" && (
                <FriendsFeed
                  token={token}
                  onUserClick={setSelectedUserId}
                  onOpenFriends={() => setActiveTab("friends")}
                />
              )}

              {activeTab === "together" && (
                <SharedLists
                  plan={plan}
                  onOpenPremium={openPremium}
                  token={token}
                  friends={friends}
                  onOpenMovie={setSelectedMovie}
                  openListId={openListId}
                  onOpenList={setOpenListId}
                  invites={notifications.listInvites}
                  onAcceptInvite={notifications.acceptInvite}
                  onDeclineInvite={notifications.declineInvite}
                  refreshKey={notifications.listsRefreshKey}
                />
              )}

              {activeTab === "friends" && (
                <div className="max-w-3xl mx-auto">
                  <div className={`${EYEBROW} mb-2.5`}>Люди</div>
                  <h1 className={`${PAGE_TITLE} mb-7`}>Сообщество</h1>
                  <FriendsPanel
                    onUserClick={setSelectedUserId}
                    onRequestsChange={(n) => {
                      notifications.setRequestsCount(n);
                      notifications.refresh();
                    }}
                    onFriendsChange={loadFriends}
                  />
                </div>
              )}

              {activeTab === "profile" && (
                <>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={avatar.onFile}
                    className="hidden"
                    aria-label="Выбрать фотографию профиля"
                  />
                  <ProfilePage
                    user={user}
                    movies={movies}
                    friends={friends}
                    avatarSaving={avatar.saving}
                    avatarMessage={avatar.message}
                    avatarError={avatar.error}
                    onPickAvatar={() => {
                      avatar.resetMessages();
                      avatarInputRef.current?.click();
                    }}
                    onOpenSettings={() => setActiveTab("profile-settings")}
                    onOpenStats={() => setActiveTab("profile-stats")}
                    onOpenPremium={openPremium}
                    onOpenFriend={setSelectedUserId}
                    onManageFriends={() => setActiveTab("friends")}
                    onOpenMovie={setSelectedMovie}
                  />
                </>
              )}

              {activeTab === "profile-stats" && (
                <StatsPage
                  plan={plan}
                  onOpenPremium={openPremium}
                  movies={movies}
                  onBack={() => setActiveTab("profile")}
                  onOpenMovie={openEntry}
                />
              )}

              {activeTab === "profile-premium" && (
                <SubscriptionPage
                  onBack={() => setActiveTab("profile")}
                  currentPlan={plan}
                  planUntil={user?.planUntil}
                  onRedeemPromo={redeemPromo}
                />
              )}

              {activeTab === "profile-settings" && (
                <SettingsPage
                  user={user}
                  onBack={() => setActiveTab("profile")}
                  uiStyles={uiStyles}
                  onUiStyleChange={setUiStyle}
                  privacy={{
                    isPrivate: Boolean(user?.isPrivate),
                    saving: privacySaving,
                    error: privacyError,
                    onChange: async (next) => {
                      setPrivacySaving(true);
                      setPrivacyError("");
                      const result = await updatePrivacy(next);
                      if (!result.success) setPrivacyError(result.error);
                      setPrivacySaving(false);
                    },
                  }}
                  avatar={{
                    saving: avatar.saving,
                    message: avatar.message,
                    error: avatar.error,
                    onFile: avatar.onFile,
                    onRemove: avatar.onRemove,
                  }}
                  onEditProfile={() => setSelectedUserId(user?.id)}
                  onOpenPremium={openPremium}
                  plan={plan}
                  planUntil={user?.planUntil}
                  theme={{
                    value: user?.profileTheme || null,
                    error: themeError,
                    onChange: async (next) => {
                      setThemeError("");
                      const result = await updateProfileTheme(next);
                      if (!result.success) setThemeError(result.error);
                    },
                  }}
                  onLetterboxdFile={importer.importLetterboxd}
                  importState={{ importing: importer.importing, ...importer.progress }}
                  onImportFile={importer.importTextFile}
                  onLogout={logout}
                  onDeleteAccount={() => setDeleteAccountOpen(true)}
                />
              )}
              {activeTab === "profile-settings" && <Footer className="mt-12" />}
            </div>
          </main>

          {["home", "feed"].includes(activeTab) && (
            <FriendsSidebar
              friends={friends}
              lastWatched={lastWatched}
              onOpenFriend={setSelectedUserId}
              onOpenFriends={() => setActiveTab("friends")}
            />
          )}
        </div>
      </div>

      <MobileDock
        items={items.filter((item) => !item.desktopOnly)}
        activeSection={activeSection}
        searchActive={activeTab === "search"}
        onNavigate={setActiveTab}
        onSearch={openSearch}
      />

      {selectedUserId && (
        <ProfileModal
          key={selectedUserId}
          userId={selectedUserId}
          token={token}
          onClose={() => setSelectedUserId(null)}
          onUserClick={(id) => setSelectedUserId(id)}
          onFriendRemoved={loadFriends}
          onOpenMovie={setSelectedMovie}
        />
      )}

      {selectedMovie &&
        renderMovieDetails(selectedMovie, "details", () => {
          setSelectedMovie(null);
          setPageStack([]);
        })}

      {/* Страницы, открытые поверх фильма: актёр, затем его фильм и так далее.
          «Назад» снимает только верхнюю */}
      {pageStack.map((page, index) => {
        const historyKey = `stack-${index}`;
        const closePage = () => setPageStack((stack) => stack.slice(0, index));
        return page.kind === "person" ? (
          <PersonPage
            key={`${historyKey}-person-${page.person.id}`}
            person={page.person}
            movies={movies}
            historyKey={historyKey}
            onClose={closePage}
            onOpenMovie={pushMovie}
          />
        ) : (
          renderMovieDetails(page.movie, historyKey, closePage)
        );
      })}

      {notifications.toastInvite && (
        <InviteToast
          invite={notifications.toastInvite}
          onAccept={() => notifications.acceptInvite(notifications.toastInvite)}
          onDecline={() => notifications.declineInvite(notifications.toastInvite)}
          onClose={notifications.closeToast}
        />
      )}

      {updatedToast && !notifications.toastInvite && (
        <UpdatedToast onOpen={openChangelog} onClose={() => setUpdatedToast(false)} />
      )}
      {changelogOpen && <ChangelogModal onClose={() => setChangelogOpen(false)} />}

      {movieToDelete && (
        <ConfirmDialog
          title="Удалить из списка?"
          message={
            <>
              <b className="text-white">{movieToDelete.title}</b> пропадёт из журнала
              {movieToDelete.rating || movieToDelete.comment ? " вместе с оценкой и отзывом" : ""}. Это нельзя отменить.
            </>
          }
          confirmLabel="Удалить"
          icon="trash-2"
          busy={movieDeleting}
          onClose={() => setMovieToDelete(null)}
          onConfirm={async () => {
            setMovieDeleting(true);
            await deleteMovie(movieToDelete.id);
            setMovieDeleting(false);
            setMovieToDelete(null);
          }}
        />
      )}

      {deleteAccountOpen && <DeleteAccountDialog onClose={() => setDeleteAccountOpen(false)} />}

      {reviewMovie && (
        <ReviewModal
          key={reviewMovie.id}
          movie={reviewMovie}
          onClose={() => setReviewMovieId(null)}
          onSave={(review) => journal.saveReview(reviewMovie.id, review)}
          onToggleStatus={() =>
            updateMovieStatus(reviewMovie.id, reviewMovie.status === "WATCHED" ? "WATCHLIST" : "WATCHED")
          }
          onDelete={async () => {
            await deleteMovie(reviewMovie.id);
            setReviewMovieId(null);
          }}
        />
      )}

      {importer.result && <ImportResultModal result={importer.result} onClose={importer.closeResult} />}
    </div>
  );
}

function App() {
  const { token, user } = useAuth();
  const hash = useHashRoute();
  const isAuthRoute = hash === LOGIN_HASH || hash === REGISTER_HASH;
  const needsVerification = Boolean(token && user && !user.isVerified);

  // После входа убираем #/login из адреса, чтобы он не остался в истории
  useEffect(() => {
    if (token && !needsVerification && isAuthRoute) leaveHashRoute();
  }, [token, needsVerification, isAuthRoute]);

  // Политика открывается и без входа, и по прямой ссылке
  if (hash === POLICY_HASH) return <PrivacyPolicy />;
  // Один и тот же экран для входа и подтверждения email: после регистрации
  // он не перемонтируется и не теряет шаг ввода кода
  if (needsVerification || (!token && isAuthRoute)) {
    return <AuthScreen initialLogin={hash !== REGISTER_HASH} />;
  }
  if (token) return <MovieTracker />;
  // Гость без хэша видит лендинг
  return <Landing />;
}

export default function Root() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
