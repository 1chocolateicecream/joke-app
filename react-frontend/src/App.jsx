import { useEffect, useState } from 'react'
import {
  createPost,
  deletePost,
  likePost,
  listPosts,
  logout,
  repostPost,
  unlikePost,
  unrepostPost,
  updatePost,
} from './api.js'
import AuthPanel from './components/AuthPanel.jsx'
import JokesPanel from './components/JokesPanel.jsx'
import MusicPanel from './components/MusicPanel.jsx'
import ProfilePanel from './components/ProfilePanel.jsx'
import PostsPanel from './components/PostsPanel.jsx'
import { useI18n } from './useI18n.js'

function readSession() {
  try {
    return JSON.parse(localStorage.getItem('joke-app-session'))
  } catch {
    return null
  }
}

function loadPosts(setPosts, setLoading, setError, signal, token) {
  setLoading(true)
  setError('')

  return listPosts({ signal, token })
    .then(setPosts)
    .catch((error) => {
      if (error.name !== 'AbortError') setError(error.message)
    })
    .finally(() => {
      if (!signal?.aborted) setLoading(false)
    })
}

function App() {
  const { locale, setLocale, t } = useI18n()
  const [activeTab, setActiveTab] = useState('posts')
  const [searchQuery, setSearchQuery] = useState('')
  const [posts, setPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [postsError, setPostsError] = useState('')
  const [session, setSession] = useState(readSession)
  const [profileUserId, setProfileUserId] = useState(() => readSession()?.user?.id ?? null)
  const sessionToken = session?.token

  useEffect(() => {
    const controller = new AbortController()
    loadPosts(setPosts, setPostsLoading, setPostsError, controller.signal, sessionToken)
    return () => controller.abort()
  }, [sessionToken])

  function handleAuthenticated(authResponse) {
    const nextSession = {
      user: authResponse.user,
      token: authResponse.token,
    }
    localStorage.setItem('joke-app-session', JSON.stringify(nextSession))
    setSession(nextSession)
    setProfileUserId(authResponse.user.id)
  }

  function handleOpenProfile(userId) {
    setProfileUserId(userId)
    setActiveTab('profile')
  }

  function handleProfileUpdated(updatedUser) {
    setSession((current) => {
      if (!current || Number(current.user.id) !== Number(updatedUser.id)) return current
      const nextSession = { ...current, user: { ...current.user, ...updatedUser } }
      localStorage.setItem('joke-app-session', JSON.stringify(nextSession))
      return nextSession
    })
    setPosts((currentPosts) => currentPosts.map((post) => (
      Number(post.user_id) === Number(updatedUser.id)
        ? { ...post, user: { ...post.user, ...updatedUser } }
        : post
    )))
  }

  async function handleLogout() {
    try {
      if (session?.token) await logout(session.token)
    } catch (error) {
      console.warn('Could not revoke the API token:', error)
    } finally {
      localStorage.removeItem('joke-app-session')
      setSession(null)
    }
  }

  async function handleSavePost(values, postId) {
    if (!session?.token) throw new Error(t('posts.loginToPublish'))

    const savedPost = postId
      ? await updatePost(session.token, postId, values)
      : await createPost(session.token, values)

    setPosts((currentPosts) =>
      postId
        ? currentPosts.map((post) => (post.id === postId ? savedPost : post))
        : [savedPost, ...currentPosts],
    )
    return savedPost
  }

  async function handleDeletePost(postId) {
    if (!session?.token) throw new Error(t('posts.loginToDelete'))

    await deletePost(session.token, postId)
    setPosts((currentPosts) => currentPosts.filter((post) => post.id !== postId))
  }

  async function handleReaction(postId, reaction) {
    if (!session?.token) throw new Error(t('posts.loginToReact'))
    const post = posts.find((item) => item.id === postId)
    if (!post) return

    let result
    if (reaction === 'like') {
      result = post.liked_by_me
        ? await unlikePost(session.token, postId)
        : await likePost(session.token, postId)
    } else {
      result = post.reposted_by_me
        ? await unrepostPost(session.token, postId)
        : await repostPost(session.token, postId)
    }

    setPosts((currentPosts) =>
      currentPosts.map((item) => item.id === postId ? { ...item, ...result } : item),
    )
    return result
  }

  const visiblePosts = posts.filter((post) =>
    `${post.user?.name || ''} ${post.user?.username || ''} ${post.title} ${post.body}`.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  )

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#posts" onClick={() => setActiveTab('posts')}>
          <span className="brand-mark" aria-hidden="true">𓅃</span>
          <span>ВКустах</span>
        </a>
        <label className="header-search">
          <span className="visually-hidden">{t('search.posts')}</span>
          <input
            type="search"
            placeholder={t('search.posts')}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </label>
        <div className="header-account">
          <button
            className="locale-toggle"
            type="button"
            aria-label={locale === 'en' ? 'Switch language to Russian' : 'Переключить язык на английский'}
            onClick={() => setLocale(locale === 'en' ? 'ru' : 'en')}
          >
            {t('language.switch')}
          </button>
          <AuthPanel
            session={session}
            onAuthenticated={handleAuthenticated}
            onLogout={handleLogout}
          />
        </div>
      </header>

      <main className="page-layout">
        <nav className="side-nav" aria-label="Main navigation">
          <button
            className={activeTab === 'posts' ? 'side-nav-link active' : 'side-nav-link'}
            onClick={() => setActiveTab('posts')}
            type="button"
          >
            <span className="side-nav-icon" aria-hidden="true">N</span>{t('nav.feed')}
          </button>
          <button
            className={activeTab === 'jokes' ? 'side-nav-link active' : 'side-nav-link'}
            onClick={() => setActiveTab('jokes')}
            type="button"
          >
            <span className="side-nav-icon" aria-hidden="true">J</span>{t('nav.jokes')}
          </button>
          <button
            className={activeTab === 'music' ? 'side-nav-link active' : 'side-nav-link'}
            onClick={() => setActiveTab('music')}
            type="button"
          >
            <span className="side-nav-icon" aria-hidden="true">M</span>{t('nav.music')}
          </button>
          {session?.user && (
            <button
              className={activeTab === 'profile' ? 'side-nav-link active' : 'side-nav-link'}
              onClick={() => handleOpenProfile(session.user.id)}
              type="button"
            >
              <span className="side-nav-icon" aria-hidden="true">P</span>{t('nav.profile')}
            </button>
          )}
        </nav>
        <section className="main-column" aria-live="polite">
          {activeTab === 'posts' ? (
            <PostsPanel
              posts={visiblePosts}
              searchQuery={searchQuery}
              currentUser={session?.user}
              loading={postsLoading}
              error={postsError}
              onRefresh={() => loadPosts(setPosts, setPostsLoading, setPostsError, undefined, sessionToken)}
              onSave={handleSavePost}
              onDelete={handleDeletePost}
              onToggleLike={(postId) => handleReaction(postId, 'like')}
              onToggleRepost={(postId) => handleReaction(postId, 'repost')}
              onAuthorClick={handleOpenProfile}
            />
          ) : activeTab === 'jokes' ? (
            <JokesPanel />
          ) : activeTab === 'music' ? (
            <MusicPanel />
          ) : (
            <ProfilePanel
              userId={profileUserId}
              currentUser={session?.user}
              token={sessionToken}
              onProfileUpdated={handleProfileUpdated}
              onSavePost={handleSavePost}
              onDeletePost={handleDeletePost}
              onToggleLike={(postId) => handleReaction(postId, 'like')}
              onToggleRepost={(postId) => handleReaction(postId, 'repost')}
              onAuthorClick={handleOpenProfile}
            />
          )}
        </section>

        <aside className="sidebar">
          <section className="side-box">
            <h2>{t('sidebar.apiStatus')}</h2>
            <dl className="status-list">
              <div>
                <dt>{t('sidebar.laravel')}</dt>
                <dd className={postsError ? 'status status-error' : 'status'}>
                  <span className="status-dot" />{postsLoading ? t('sidebar.checking') : postsError ? t('sidebar.unavailable') : t('sidebar.connected')}
                </dd>
              </div>
              <div>
                <dt>{t('sidebar.postsInFeed')}</dt>
                <dd>{posts.length}</dd>
              </div>
            </dl>
          </section>
          <section className="side-box endpoint-box">
            <h2>{t('sidebar.endpoints')}</h2>
            <p><code>GET /api/posts</code></p>
            <p><code>POST /api/login</code></p>
            <p><code>POST /api/register</code></p>
            <p><code>PUT /api/posts/{'{post}'}/like</code></p>
            <p><code>JokeAPI ?amount=N</code></p>
          </section>
          <p className="sidebar-note">{t('sidebar.note')}</p>
        </aside>
      </main>

      <footer className="site-footer">{t('footer')}</footer>
    </div>
  )
}

export default App
