import { useEffect, useState } from 'react'
import { getProfile, updateProfile } from '../api.js'
import Avatar from './Avatar.jsx'
import LoadingState from './LoadingState.jsx'
import PostsPanel from './PostsPanel.jsx'
import { useI18n } from '../useI18n.js'

function ProfilePanel({
    userId,
    currentUser,
    token,
    onProfileUpdated,
    onSavePost,
    onDeletePost,
    onToggleLike,
    onToggleRepost,
    onAuthorClick,
}) {
    const { locale, t } = useI18n()
    const [profileData, setProfileData] = useState(null)
    const [profileError, setProfileError] = useState('')
    const [loadedKey, setLoadedKey] = useState('')
    const [editing, setEditing] = useState(false)
    const [wallView, setWallView] = useState('posts')
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState('')
    const [success, setSuccess] = useState('')
    const [refreshKey, setRefreshKey] = useState(0)
    const isOwnProfile = currentUser && Number(currentUser.id) === Number(userId)
    const requestKey = `${userId}:${token || 'guest'}:${refreshKey}`
    const loading = loadedKey !== requestKey
    const profile = loading ? null : profileData
    const error = loading ? '' : profileError

    useEffect(() => {
        const controller = new AbortController()

        getProfile(userId, token, { signal: controller.signal })
            .then((data) => {
                setProfileData(data)
                setProfileError('')
                setLoadedKey(requestKey)
            })
            .catch((requestError) => {
                if (requestError.name !== 'AbortError') {
                    setProfileError(requestError.message)
                    setLoadedKey(requestKey)
                }
            })

        return () => controller.abort()
    }, [requestKey, userId, token])

    async function handleProfileSubmit(event) {
        event.preventDefault()
        const form = event.currentTarget
        const formData = new FormData(form)
        const avatar = formData.get('avatar')
        if (!(avatar instanceof File) || avatar.size === 0) formData.delete('avatar')

        setSaving(true)
        setSaveError('')
        setSuccess('')

        try {
            const response = await updateProfile(token, formData)
            setProfileData((current) => ({
                ...current,
                user: { ...current.user, ...response.user },
                posts: current.posts.map((post) => (
                    Number(post.user_id) === Number(response.user.id)
                        ? { ...post, user: { ...post.user, ...response.user } }
                        : post
                )),
            }))
            onProfileUpdated(response.user)
            form.reset()
            setEditing(false)
            setSuccess(t('profile.saved'))
        } catch (requestError) {
            setSaveError(requestError.message)
        } finally {
            setSaving(false)
        }
    }

    async function handleWallSave(values, postId) {
        const savedPost = await onSavePost(values, postId)
        if (savedPost) {
            setProfileData((current) => ({
                ...current,
                posts: postId
                    ? current.posts.map((post) => post.id === postId ? savedPost : post)
                    : [savedPost, ...current.posts],
            }))
        }
        return savedPost
    }

    async function handleWallDelete(postId) {
        await onDeletePost(postId)
        setProfileData((current) => ({
            ...current,
            posts: current.posts.filter((post) => post.id !== postId),
        }))
    }

    async function handleWallReaction(postId, onReact, reactionType) {
        const result = await onReact(postId)
        setProfileData((current) => ({
            ...current,
            posts: current.posts.map((post) => post.id === postId ? { ...post, ...result } : post),
            reposts: reactionType === 'repost' && isOwnProfile
                ? result.reposted_by_me
                    ? current.reposts.some((post) => post.id === postId)
                        ? current.reposts.map((post) => post.id === postId ? { ...post, ...result } : post)
                        : [{
                            ...current.posts.find((post) => post.id === postId),
                            ...result,
                            reposted_by: {
                                id: current.user.id,
                                name: current.user.name,
                                avatar_path: current.user.avatar_path,
                            },
                        }, ...current.reposts]
                    : current.reposts.filter((post) => post.id !== postId)
                : current.reposts.map((post) => post.id === postId ? { ...post, ...result } : post),
        }))
        return result
    }

    if (loading) return <LoadingState label={t('profile.loading')} />
    if (error) return <p className="notice error-notice" role="alert">{error}</p>
    if (!profile) return null

    const joinedAt = profile.user.created_at ? new Date(profile.user.created_at) : null
    const joinedDate = joinedAt && !Number.isNaN(joinedAt.valueOf())
        ? joinedAt.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US')
        : t('profile.theCommunity')

    return (
        <>
            <section className="profile-card panel">
                <Avatar
                    name={profile.user.name}
                    avatarPath={profile.user.avatar_path}
                    className="profile-avatar"
                />
                <div className="profile-details">
                    <p className="eyebrow">{t('profile.eyebrow')}</p>
                    <h1>{profile.user.name}</h1>
                    {profile.user.username && <p className="profile-username">@{profile.user.username}</p>}
                    {profile.user.email && <p className="profile-email">{profile.user.email}</p>}
                    <p className="profile-bio">
                        {profile.user.bio || (isOwnProfile ? t('profile.addIntro') : t('profile.noDescription'))}
                    </p>
                    {profile.user.relationship_status && (
                        <p className="profile-relationship-status">
                            {t(`relationship.${profile.user.relationship_status}`)}
                        </p>
                    )}
                    <p className="profile-meta">
                        {t('profile.joined', { date: joinedDate })}
                        {' · '}{t('profile.postCount', { count: profile.posts.length })}
                        {' · '}{t('profile.repostCount', { count: profile.reposts.length })}
                    </p>
                </div>
                {isOwnProfile && (
                    <button
                        className="secondary-button profile-edit-button"
                        type="button"
                        onClick={() => {
                            setEditing((value) => !value)
                            setSaveError('')
                            setSuccess('')
                        }}
                    >
                        {editing ? t('profile.closeEditor') : t('profile.edit')}
                    </button>
                )}
            </section>

            {isOwnProfile && editing && (
                <form className="profile-editor panel" onSubmit={handleProfileSubmit}>
                    <label>
                        {t('profile.displayName')}
                        <input name="name" defaultValue={profile.user.name} maxLength="255" required />
                    </label>
                    <label>
                        {t('auth.username')}
                        <input name="username" defaultValue={profile.user.username || ''} autoCapitalize="none" pattern="[A-Za-z0-9_]{3,24}" minLength="3" maxLength="24" required />
                        <span className="field-hint">{t('auth.usernameHint')}</span>
                    </label>
                    <label>
                        {t('profile.about')}
                        <textarea name="bio" defaultValue={profile.user.bio || ''} maxLength="280" rows="3" />
                        <span className="field-hint">{t('profile.bioHint')}</span>
                    </label>
                    <label>
                        {t('profile.relationshipStatus')}
                        <select name="relationship_status" defaultValue={profile.user.relationship_status || ''}>
                            <option value="">{t('relationship.notSpecified')}</option>
                            <option value="single">{t('relationship.single')}</option>
                            <option value="in_relationship">{t('relationship.in_relationship')}</option>
                            <option value="engaged">{t('relationship.engaged')}</option>
                            <option value="married">{t('relationship.married')}</option>
                            <option value="civil_union">{t('relationship.civil_union')}</option>
                            <option value="domestic_partnership">{t('relationship.domestic_partnership')}</option>
                            <option value="open_relationship">{t('relationship.open_relationship')}</option>
                            <option value="complicated">{t('relationship.complicated')}</option>
                            <option value="separated">{t('relationship.separated')}</option>
                            <option value="divorced">{t('relationship.divorced')}</option>
                            <option value="widowed">{t('relationship.widowed')}</option>
                        </select>
                    </label>
                    <label>
                        {t('profile.avatar')}
                        <input name="avatar" type="file" accept="image/jpeg,image/png,image/webp" />
                        <span className="field-hint">{t('profile.avatarHint')}</span>
                    </label>
                    {profile.user.avatar_path && (
                        <label className="avatar-remove-option">
                            <input name="remove_avatar" type="checkbox" value="1" />
                            {t('profile.removeAvatar')}
                        </label>
                    )}
                    {saveError && <p className="form-error" role="alert">{saveError}</p>}
                    <button className="primary-button" type="submit" disabled={saving}>
                        {saving ? t('profile.saving') : t('profile.save')}
                    </button>
                </form>
            )}
            {success && <p className="form-success profile-success" role="status">{success}</p>}

            <section className="profile-wall">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">{t('profile.wallBy', { name: profile.user.name })}</p>
                        <h2>{wallView === 'posts' ? (isOwnProfile ? t('profile.myWall') : t('profile.wall', { name: profile.user.name })) : t('profile.reposts')}</h2>
                    </div>
                    <div className="profile-wall-actions">
                        <div className="wall-tabs" role="tablist" aria-label="Profile wall">
                            <button
                                className={wallView === 'posts' ? 'wall-tab active' : 'wall-tab'}
                                type="button"
                                role="tab"
                                aria-selected={wallView === 'posts'}
                                onClick={() => setWallView('posts')}
                            >
                                {t('profile.posts')} · {profile.posts.length}
                            </button>
                            <button
                                className={wallView === 'reposts' ? 'wall-tab active' : 'wall-tab'}
                                type="button"
                                role="tab"
                                aria-selected={wallView === 'reposts'}
                                onClick={() => setWallView('reposts')}
                            >
                                {t('profile.reposts')} · {profile.reposts.length}
                            </button>
                        </div>
                        <button className="secondary-button" type="button" onClick={() => setRefreshKey((key) => key + 1)}>
                            {t('profile.refreshWall')}
                        </button>
                    </div>
                </div>
                <PostsPanel
                    posts={wallView === 'posts' ? profile.posts : profile.reposts}
                    currentUser={currentUser}
                    canCompose={Boolean(isOwnProfile) && wallView === 'posts'}
                    showRepostSource={wallView === 'reposts'}
                    loading={false}
                    error=""
                    onRefresh={() => setRefreshKey((key) => key + 1)}
                    onSave={handleWallSave}
                    onDelete={handleWallDelete}
                    onToggleLike={(postId) => handleWallReaction(postId, onToggleLike, 'like')}
                    onToggleRepost={(postId) => handleWallReaction(postId, onToggleRepost, 'repost')}
                    onAuthorClick={onAuthorClick}
                />
            </section>
        </>
    )
}

export default ProfilePanel