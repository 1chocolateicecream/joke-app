import { useEffect, useState } from 'react'
import {
  createPost,
  deletePost,
  likePost,
  listPosts,
  listNotifications,
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
import CommunityPanel from './components/CommunityPanel.jsx'
import NotificationsPanel from './components/NotificationsPanel.jsx'
import { useI18n } from './useI18n.js'

function readSession() {
  try {
    return JSON.parse(localStorage.getItem('joke-app-session'))
  } catch {
    return null
  }
}

function readAccounts() {
  try {
    const accounts = JSON.parse(localStorage.getItem('joke-app-accounts') || '[]')
    const active = readSession()
    return active && !accounts.some((account) => Number(account.user.id) === Number(active.user.id))
      ? [...accounts, active]
      : accounts
  } catch { return [] }
}

function loadPosts(setPosts, setLoading, setError, signal, token, scope) {
  setLoading(true)
  setError('')

  return listPosts({ signal, token, scope })
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
  const [accounts, setAccounts] = useState(readAccounts)
  const [feedScope, setFeedScope] = useState('all')
  const [unreadCount, setUnreadCount] = useState(0)
  const [profileUserId, setProfileUserId] = useState(() => readSession()?.user?.id ?? null)
  const sessionToken = session?.token

  useEffect(() => {
    const controller = new AbortController()
    loadPosts(setPosts, setPostsLoading, setPostsError, controller.signal, sessionToken, feedScope)
    return () => controller.abort()
  }, [sessionToken, feedScope])

  useEffect(() => {
    if (!sessionToken) return undefined
    let active = true
    const refresh = () => listNotifications(sessionToken).then((data) => { if (active) setUnreadCount(data.unread_count) }).catch(() => {})
    refresh()
    const timer = window.setInterval(refresh, 30000)
    return () => { active = false; window.clearInterval(timer) }
  }, [sessionToken])

  function handleAuthenticated(authResponse) {
    const nextSession = {
      user: authResponse.user,
      token: authResponse.token,
    }
    localStorage.setItem('joke-app-session', JSON.stringify(nextSession))
    const nextAccounts = [...accounts.filter((account) => Number(account.user.id) !== Number(authResponse.user.id)), nextSession]
    localStorage.setItem('joke-app-accounts', JSON.stringify(nextAccounts))
    setAccounts(nextAccounts)
    setSession(nextSession)
    setUnreadCount(0)
    setProfileUserId(authResponse.user.id)
  }

  function handleSwitchAccount(userId) {
    const nextSession = accounts.find((account) => Number(account.user.id) === Number(userId))
    if (!nextSession) return
    localStorage.setItem('joke-app-session', JSON.stringify(nextSession))
    setSession(nextSession)
    setUnreadCount(0)
    setProfileUserId(nextSession.user.id)
    setActiveTab('posts')
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
      const remaining = accounts.filter((account) => Number(account.user.id) !== Number(session?.user?.id))
      localStorage.setItem('joke-app-accounts', JSON.stringify(remaining))
      setAccounts(remaining)
      setSession(null)
      setUnreadCount(0)
      setActiveTab('posts')
    }
  }

  function handleNotificationOpen(data) {
    if (data.post_id) {
      setFeedScope('all')
      setActiveTab('posts')
      window.setTimeout(() => document.getElementById(`post-${data.post_id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 350)
    } else if (data.actor?.id) handleOpenProfile(data.actor.id)
    listNotifications(sessionToken).then((result) => setUnreadCount(result.unread_count)).catch(() => {})
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

  async function handleReaction(postId, reaction, knownPost = null) {
    if (!session?.token) throw new Error(t('posts.loginToReact'))
    const post = knownPost || posts.find((item) => item.id === postId)
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
            accounts={accounts}
            onAuthenticated={handleAuthenticated}
            onLogout={handleLogout}
            onSwitchAccount={handleSwitchAccount}
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
          <button className={activeTab === 'community' ? 'side-nav-link active' : 'side-nav-link'} onClick={() => setActiveTab('community')} type="button">
            <span className="side-nav-icon" aria-hidden="true">B</span>{t('nav.community')}
          </button>
          {session?.user && <button className={activeTab === 'notifications' ? 'side-nav-link active' : 'side-nav-link'} onClick={() => setActiveTab('notifications')} type="button">
            <span className="side-nav-icon" aria-hidden="true">!</span>{t('nav.notifications')}{unreadCount > 0 && <span className="nav-count">{unreadCount}</span>}
          </button>}
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
              token={sessionToken}
              feedScope={feedScope}
              onDiscoverBirds={() => setActiveTab('community')}
              onFeedScopeChange={setFeedScope}
              loading={postsLoading}
              error={postsError}
              onRefresh={() => loadPosts(setPosts, setPostsLoading, setPostsError, undefined, sessionToken, feedScope)}
              onSave={handleSavePost}
              onDelete={handleDeletePost}
              onToggleLike={(postId, post) => handleReaction(postId, 'like', post)}
              onToggleRepost={(postId, post) => handleReaction(postId, 'repost', post)}
              onAuthorClick={handleOpenProfile}
            />
          ) : activeTab === 'community' ? (
            <CommunityPanel currentUser={session?.user} token={sessionToken} onAuthorClick={handleOpenProfile} />
          ) : activeTab === 'notifications' && session?.user ? (
            <NotificationsPanel token={sessionToken} onNotificationOpen={handleNotificationOpen} onUnreadChange={setUnreadCount} />
          ) : activeTab === 'jokes' ? (
            <JokesPanel />
          ) : activeTab === 'music' ? (
            <MusicPanel currentUser={session?.user} onShare={handleSavePost} />
          ) : (
            <ProfilePanel
              userId={profileUserId}
              currentUser={session?.user}
              token={sessionToken}
              onProfileUpdated={handleProfileUpdated}
              onSavePost={handleSavePost}
              onDeletePost={handleDeletePost}
              onToggleLike={(postId, post) => handleReaction(postId, 'like', post)}
              onToggleRepost={(postId, post) => handleReaction(postId, 'repost', post)}
              onAuthorClick={handleOpenProfile}
            />
          )}
        </section>

        <aside className="sidebar">
          <section className="side-box">
            <h2>{t('sidebar.exploreTitle')}</h2>
            <p>{t('sidebar.exploreBody')}</p>
            <button className="secondary-button sidebar-action" type="button" onClick={() => setActiveTab('community')}>{t('sidebar.exploreAction')}</button>
          </section>
          <section className="side-box">
            <h2>{t('sidebar.followingTitle')}</h2>
            <p>{t('sidebar.followingBody')}</p>
            <button className="secondary-button sidebar-action" type="button" onClick={() => { setActiveTab('posts'); setFeedScope('following') }}>{t('sidebar.followingAction')}</button>
          </section>
        </aside>
      </main>

      <footer className="site-footer">{t('footer')}</footer>
    </div>
  )
}

export default App
