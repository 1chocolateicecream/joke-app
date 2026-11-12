import { useRef, useState } from 'react'
import Avatar from './Avatar.jsx'
import LoadingState from './LoadingState.jsx'
import { useI18n } from '../useI18n.js'
import { API_ROOT, createComment, deleteComment, listComments, listPostLikes } from '../api.js'

function PostForm({ initialPost, submitLabel, onCancel, onSubmit, draftOwnerId }) {
    const { t } = useI18n()
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const draftKey = `vkustah-draft-${draftOwnerId || 'guest'}-${initialPost?.id || 'new'}`
    const [draft] = useState(() => {
        if (initialPost) return null
        try { return JSON.parse(localStorage.getItem(draftKey) || 'null') } catch { return null }
    })
    const [imagePreview, setImagePreview] = useState('')
    const submittingRef = useRef(false)

    async function handleSubmit(event) {
        event.preventDefault()
        if (submittingRef.current) return

        const form = event.currentTarget
        submittingRef.current = true
        setBusy(true)
        setError('')
        setSuccess('')
        const values = new FormData(form)

        try {
            await onSubmit(values)
            if (!initialPost) {
                form.reset()
                localStorage.removeItem(draftKey)
                setImagePreview('')
            }
            setSuccess(initialPost ? t('posts.updated') : t('posts.published'))
        } catch (requestError) {
            setError(requestError.message)
        } finally {
            submittingRef.current = false
            setBusy(false)
        }
    }

    return (
        <form className="post-form" onSubmit={handleSubmit} onInput={(event) => {
            if (initialPost) return
            const values = new FormData(event.currentTarget)
            localStorage.setItem(draftKey, JSON.stringify({ title: values.get('title'), body: values.get('body'), visibility: values.get('visibility') }))
        }}>
            <label>
                {t('posts.titleLabel')} <span className="field-hint">{t('posts.titleOptional')}</span>
                <input name="title" defaultValue={initialPost?.title || draft?.title || ''} maxLength="255" />
            </label>
            <label>
                {t('posts.bodyLabel')}
                <textarea name="body" defaultValue={initialPost?.body || draft?.body || ''} required rows="3" maxLength="10000" />
            </label>
            <label className="post-visibility-field">
                {t('posts.visibility')}
                <select name="visibility" defaultValue={initialPost?.visibility || draft?.visibility || 'public'}>
                    <option value="public">{t('posts.visibilityPublic')}</option>
                    <option value="followers">{t('posts.visibilityFollowers')}</option>
                </select>
            </label>
            <label className="post-image-picker">{t('posts.addImage')}<input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => setImagePreview(event.target.files?.[0] ? URL.createObjectURL(event.target.files[0]) : '')} /></label>
            {imagePreview && <img className="post-image-preview" src={imagePreview} alt={t('posts.imagePreview')} />}
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

function PostComments({ post, currentUser, token, isAdmin, onAuthorClick }) {
    const { t, locale } = useI18n()
    const [open, setOpen] = useState(false)
    const [comments, setComments] = useState(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [content, setContent] = useState('')

    async function toggle() {
        if (open) { setOpen(false); return }
        setOpen(true)
        if (comments) return
        setBusy(true)
        setError('')
        try { setComments(await listComments(post.id)) } catch (requestError) { setError(requestError.message) }
        finally { setBusy(false) }
    }

    async function submit(event) {
        event.preventDefault()
        if (!currentUser || !content.trim()) return
        setBusy(true)
        setError('')
        try {
            const comment = await createComment(token, post.id, content.trim())
            setComments((items) => [...(items || []), comment])
            setContent('')
        } catch (requestError) { setError(requestError.message) }
        finally { setBusy(false) }
    }

    async function remove(comment) {
        try {
            await deleteComment(token, post.id, comment.id)
            setComments((items) => items.filter((item) => item.id !== comment.id))
        } catch (requestError) { setError(requestError.message) }
    }

    const count = comments?.length ?? post.comments_count ?? 0

    return (
        <div className="comments-area">
            <button className="text-button comments-toggle" type="button" aria-expanded={open} onClick={toggle}>
                {open ? t('comments.hide') : t('comments.show')} · {count}
            </button>
            {open && (
                <div className="comments-thread">
                    {busy && !comments && <LoadingState label={t('comments.loading')} />}
                    {error && <p className="form-error" role="alert">{error}</p>}
                    {comments?.map((comment) => (
                        <article className="comment-item" key={comment.id}>
                            <Avatar name={comment.user?.name || t('posts.member')} avatarPath={comment.user?.avatar_path} />
                            <div className="comment-copy">
                                <p><button className="profile-link" type="button" onClick={() => onAuthorClick?.(comment.user_id)}>{comment.user?.name || t('posts.member')}</button><span className="comment-time"> · {new Date(comment.created_at).toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US')}</span></p>
                                <div>{comment.content}</div>
                            </div>
                            {(Number(currentUser?.id) === Number(comment.user_id) || Number(currentUser?.id) === Number(post.user_id) || isAdmin) && <button className="text-button danger-button" type="button" onClick={() => remove(comment)}>{t('comments.delete')}</button>}
                        </article>
                    ))}
                    {currentUser ? (
                        <form className="comment-form" onSubmit={submit}>
                            <textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength="2000" rows="2" placeholder={t('comments.placeholder')} required />
                            <button className="secondary-button" type="submit" disabled={busy || !content.trim()}>{t('comments.reply')}</button>
                        </form>
                    ) : <p className="comment-signin">{t('comments.signIn')}</p>}
                </div>
            )}
        </div>
    )
}

function PostLikes({ postId, count, onAuthorClick }) {
    const { t } = useI18n()
    const [open, setOpen] = useState(false)
    const [members, setMembers] = useState(null)
    const [error, setError] = useState('')

    async function toggle() {
        if (open) { setOpen(false); return }
        setOpen(true)
        if (members) return
        try { setMembers(await listPostLikes(postId)) } catch (requestError) { setError(requestError.message) }
    }

    if (!count) return null
    return <div className="likes-details">
        <button className="text-button likes-toggle" type="button" aria-expanded={open} onClick={toggle}>{t('posts.whoLiked')}</button>
        {open && <div className="likes-list">{error && <span role="alert">{error}</span>}{members?.map((member) => <button className="profile-link" type="button" key={member.id} onClick={() => onAuthorClick?.(member.id)}>{member.name}{member.username && <small> @{member.username}</small>}</button>)}</div>}
    </div>
}

function relativeTime(date, locale) {
    const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000))
    const [amount, unit] = minutes < 60 ? [minutes, 'minute'] : minutes < 1440 ? [Math.round(minutes / 60), 'hour'] : [Math.round(minutes / 1440), 'day']
    return new Intl.RelativeTimeFormat(locale === 'ru' ? 'ru' : 'en', { numeric: 'auto' }).format(-amount, unit)
}

function PostsPanel({ posts, searchQuery, currentUser, token, feedScope, onFeedScopeChange, onDiscoverBirds, canCompose = true, showRepostSource = false, loading, error, onRefresh, onSave, onDelete, onToggleLike, onToggleRepost, onAuthorClick }) {
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
            await onReact(postId, posts.find((post) => post.id === postId))
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
                <div className="feed-heading-actions">
                    {onFeedScopeChange && <div className="feed-tabs" role="tablist" aria-label={t('posts.feedType')}>
                        <button type="button" role="tab" aria-selected={feedScope === 'all'} className={feedScope === 'all' ? 'feed-tab active' : 'feed-tab'} onClick={() => onFeedScopeChange('all')}>{t('posts.allFeed')}</button>
                        <button type="button" role="tab" aria-selected={feedScope === 'following'} className={feedScope === 'following' ? 'feed-tab active' : 'feed-tab'} onClick={() => onFeedScopeChange('following')}>{t('posts.followingFeed')}</button>
                    </div>}
                    <button className="secondary-button" type="button" onClick={onRefresh} disabled={loading}>{t('posts.refresh')}</button>
                </div>
            </div>

            {currentUser && canCompose ? (
                <section className="composer panel">
                    <h2>{t('posts.composer')}</h2>
                    <PostForm submitLabel={t('posts.publish')} draftOwnerId={currentUser?.id} onSubmit={(values) => onSave(values)} />
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
                    feedScope === 'following' && currentUser && !searchQuery ? (
                        <section className="empty-state panel following-empty">
                            <h2>{t('posts.followingEmptyTitle')}</h2>
                            <p>{t('posts.followingEmptyBody')}</p>
                            <button className="primary-button" type="button" onClick={onDiscoverBirds}>{t('posts.discoverBirds')}</button>
                        </section>
                    ) : <p className="empty-state panel">{searchQuery ? t('posts.noMatches', { query: searchQuery }) : t('posts.empty')}</p>
                )}
                {posts.map((post) => {
                    const isOwner = currentUser && Number(currentUser.id) === Number(post.user_id)
                    const createdAt = post.created_at ? new Date(post.created_at) : null
                    const authorName = post.user?.name || `${t('posts.member')} ${post.user_id}`
                    const isAdmin = currentUser?.roles?.some((role) => role.name === 'admin')

                    return (
                        <article className="post panel" id={`post-${post.id}`} key={post.id}>
                            {editingId === post.id ? (
                                <PostForm
                                    initialPost={post}
                                    submitLabel="Save changes"
                                    draftOwnerId={currentUser?.id}
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
                                    <> · {relativeTime(createdAt, locale)}</>
                                                )}
                                                {post.visibility === 'followers' && <span className="post-privacy"> · {t('posts.visibilityFollowers')}</span>}
                                            </p>
                                        </div>
                                    </div>
                                    {showRepostSource && post.reposted_by && (
                                        <p className="repost-source">{t('posts.repostedBy', { name: post.reposted_by.name })}</p>
                                    )}
                                    <p className="post-body">{post.body}</p>
                                    {post.image_path && <img className="post-image" src={`${API_ROOT}/storage/${post.image_path}`} alt={t('posts.attachedImage')} />}
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
                                            <PostLikes postId={post.id} count={post.likes_count || 0} onAuthorClick={onAuthorClick} />
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
                                        {(isOwner || isAdmin) && (
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
                                    <PostComments post={post} currentUser={currentUser} token={token} isAdmin={isAdmin} onAuthorClick={onAuthorClick} />
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
