import { useRef, useState } from 'react'
import Avatar from './Avatar.jsx'
import LoadingState from './LoadingState.jsx'
import { useI18n } from '../useI18n.js'

function PostForm({ initialPost, submitLabel, onCancel, onSubmit }) {
    const { t } = useI18n()
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const submittingRef = useRef(false)

    async function handleSubmit(event) {
        event.preventDefault()
        if (submittingRef.current) return

        const form = event.currentTarget
        submittingRef.current = true
        setBusy(true)
        setError('')
        setSuccess('')
        const values = Object.fromEntries(new FormData(form).entries())

        try {
            await onSubmit(values)
            if (!initialPost) form.reset()
            setSuccess(initialPost ? t('posts.updated') : t('posts.published'))
        } catch (requestError) {
            setError(requestError.message)
        } finally {
            submittingRef.current = false
            setBusy(false)
        }
    }

    return (
        <form className="post-form" onSubmit={handleSubmit}>
            <label>
                {t('posts.titleLabel')}
                <input name="title" defaultValue={initialPost?.title || ''} required maxLength="255" />
            </label>
            <label>
                {t('posts.bodyLabel')}
                <textarea name="body" defaultValue={initialPost?.body || ''} required rows="3" />
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            {success && <p className="form-success" role="status">{success}</p>}
            <div className="form-actions">
                <button className="primary-button" type="submit" disabled={busy}>
                    {busy ? t('posts.saving') : submitLabel}
                </button>
                {onCancel && <button className="secondary-button" type="button" onClick={onCancel}>{t('posts.cancel')}</button>}
            </div>
        </form>
    )
}

function PostsPanel({ posts, searchQuery, currentUser, canCompose = true, showRepostSource = false, loading, error, onRefresh, onSave, onDelete, onToggleLike, onToggleRepost, onAuthorClick }) {
    const { t, locale } = useI18n()
    const [editingId, setEditingId] = useState(null)
    const [deleteError, setDeleteError] = useState('')
    const [deletingId, setDeletingId] = useState(null)
    const [reactionBusyIds, setReactionBusyIds] = useState(new Set())
    const [reactionError, setReactionError] = useState('')
    const reactionBusyRef = useRef(new Set())

    async function handleReaction(postId, onReact) {
        if (!currentUser || reactionBusyRef.current.has(postId)) return

        reactionBusyRef.current.add(postId)
        setReactionBusyIds((current) => new Set(current).add(postId))
        setReactionError('')
        try {
            await onReact(postId)
        } catch (requestError) {
            setReactionError(requestError.message)
        } finally {
            reactionBusyRef.current.delete(postId)
            setReactionBusyIds((current) => {
                const next = new Set(current)
                next.delete(postId)
                return next
            })
        }
    }

    async function handleDelete(postId) {
        if (!window.confirm(t('posts.confirmDelete'))) return
        setDeletingId(postId)
        setDeleteError('')
        try {
            await onDelete(postId)
        } catch (requestError) {
            setDeleteError(requestError.message)
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <>
            <div className="section-heading">
                <div>
                    <p className="eyebrow">{t('posts.eyebrow')}</p>
                    <h1>{t('posts.title')}</h1>
                </div>
                <button className="secondary-button" type="button" onClick={onRefresh} disabled={loading}>
                    {t('posts.refresh')}
                </button>
            </div>

            {currentUser && canCompose ? (
                <section className="composer panel">
                    <h2>{t('posts.composer')}</h2>
                    <PostForm submitLabel={t('posts.publish')} onSubmit={(values) => onSave(values)} />
                </section>
            ) : !currentUser ? (
                <p className="sign-in-note panel">{t('posts.loginToPublish')}</p>
            ) : null}

            <section className="feed" aria-label="Posts">
                {loading && <LoadingState label={t('posts.loading')} />}
                {error && <p className="notice error-notice" role="alert">{error}</p>}
                {deleteError && <p className="notice error-notice" role="alert">{deleteError}</p>}
                {reactionError && <p className="notice error-notice" role="alert">{reactionError}</p>}
                {!loading && !error && posts.length === 0 && (
                    <p className="empty-state panel">
                        {searchQuery ? t('posts.noMatches', { query: searchQuery }) : t('posts.empty')}
                    </p>
                )}
                {posts.map((post) => {
                    const isOwner = currentUser && Number(currentUser.id) === Number(post.user_id)
                    const createdAt = post.created_at ? new Date(post.created_at) : null
                    const authorName = post.user?.name || `${t('posts.member')} ${post.user_id}`
                    const dateLocale = locale === 'ru' ? 'ru-RU' : 'en-US'

                    return (
                        <article className="post panel" key={post.id}>
                            {editingId === post.id ? (
                                <PostForm
                                    initialPost={post}
                                    submitLabel="Save changes"
                                    onCancel={() => setEditingId(null)}
                                    onSubmit={async (values) => {
                                        await onSave(values, post.id)
                                        setEditingId(null)
                                    }}
                                />
                            ) : (
                                <>
                                    <div className="post-heading">
                                        <Avatar name={authorName} avatarPath={post.user?.avatar_path} />
                                        <div>
                                            <h2>{post.title}</h2>
                                            <p className="post-meta">
                                                <button className="profile-link" type="button" onClick={() => onAuthorClick?.(post.user_id)}>
                                                    <>
                                                        {authorName}
                                                        {post.user?.username && <span className="post-username"> @{post.user.username}</span>}
                                                    </>
                                                </button>
                                                {createdAt && !Number.isNaN(createdAt.valueOf()) && (
                                                    <> · {createdAt.toLocaleDateString(dateLocale)}</>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    {showRepostSource && post.reposted_by && (
                                        <p className="repost-source">{t('posts.repostedBy', { name: post.reposted_by.name })}</p>
                                    )}
                                    <p className="post-body">{post.body}</p>
                                    <div className="post-actions">
                                        <div className="reaction-actions">
                                            <button
                                                className={post.liked_by_me ? 'text-button reaction-button active' : 'text-button reaction-button'}
                                                type="button"
                                                aria-pressed={Boolean(post.liked_by_me)}
                                                disabled={!currentUser || reactionBusyIds.has(post.id)}
                                                title={currentUser ? t('posts.like') : t('posts.loginToLike')}
                                                onClick={() => handleReaction(post.id, onToggleLike, 'like')}
                                            >
                                                {post.liked_by_me ? t('posts.liked') : t('posts.like')} · {post.likes_count || 0}
                                            </button>
                                            <button
                                                className={post.reposted_by_me ? 'text-button reaction-button active' : 'text-button reaction-button'}
                                                type="button"
                                                aria-pressed={Boolean(post.reposted_by_me)}
                                                disabled={!currentUser || reactionBusyIds.has(post.id)}
                                                title={currentUser ? t('posts.repost') : t('posts.loginToRepost')}
                                                onClick={() => handleReaction(post.id, onToggleRepost, 'repost')}
                                            >
                                                {post.reposted_by_me ? t('posts.reposted') : t('posts.repost')} · {post.reposts_count || 0}
                                            </button>
                                        </div>
                                        {isOwner && (
                                            <div className="owner-actions">
                                                <button className="text-button" type="button" onClick={() => setEditingId(post.id)}>
                                                    {t('posts.edit')}
                                                </button>
                                                <button
                                                    className="text-button danger-button"
                                                    type="button"
                                                    disabled={deletingId === post.id}
                                                    onClick={() => handleDelete(post.id)}
                                                >
                                                    {deletingId === post.id ? t('posts.deleting') : t('posts.delete')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </article>
                    )
                })}
            </section>
        </>
    )
}

export default PostsPanel