import { useEffect, useState } from 'react'
import { followUser, listMembers, unfollowUser } from '../api.js'
import Avatar from './Avatar.jsx'
import LoadingState from './LoadingState.jsx'
import { useI18n } from '../useI18n.js'

function CommunityPanel({ currentUser, token, onAuthorClick }) {
    const { t } = useI18n()
    const [query, setQuery] = useState('')
    const [members, setMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const controller = new AbortController()
        listMembers(query, { signal: controller.signal, token })
            .then(setMembers)
            .catch((requestError) => { if (requestError.name !== 'AbortError') setError(requestError.message) })
            .finally(() => { if (!controller.signal.aborted) setLoading(false) })
        return () => controller.abort()
    }, [query, token])

    async function toggleFollow(member) {
        if (!token) return
        try {
            const result = member.is_following
                ? await unfollowUser(token, member.id)
                : await followUser(token, member.id)
            setMembers((items) => items.map((item) => item.id === member.id
                ? { ...item, is_following: result.following, followers_count: result.followers_count }
                : item))
        } catch (requestError) { setError(requestError.message) }
    }

    return (
        <>
            <div className="section-heading"><div><p className="eyebrow">{t('community.eyebrow')}</p><h1>{t('community.title')}</h1></div></div>
            <label className="member-search"><span className="visually-hidden">{t('community.search')}</span><input type="search" value={query} onChange={(event) => { setLoading(true); setError(''); setQuery(event.target.value) }} placeholder={t('community.search')} /></label>
            {error && <p className="notice error-notice" role="alert">{error}</p>}
            {loading ? <LoadingState label={t('community.loading')} /> : (
                <div className="member-grid">
                    {members.map((member) => (
                        <article className="member-card panel" key={member.id}>
                            <Avatar name={member.name} avatarPath={member.avatar_path} className="member-avatar" />
                            <div className="member-info">
                                <button className="profile-link member-name" type="button" onClick={() => onAuthorClick(member.id)}>{member.name}</button>{member.is_admin && <span className="admin-badge member-admin-badge">ADMIN</span>}
                                {member.username && <p>@{member.username}</p>}
                                {member.bio && <p className="member-bio">{member.bio}</p>}
                                <small>{t('community.memberStats', { posts: member.posts_count, followers: member.followers_count })}</small>
                            </div>
                            {currentUser && Number(currentUser.id) !== Number(member.id) && (
                                <button className={member.is_following ? 'secondary-button' : 'primary-button'} type="button" onClick={() => toggleFollow(member)}>
                                    {member.is_following ? t('community.following') : t('community.follow')}
                                </button>
                            )}
                        </article>
                    ))}
                    {members.length === 0 && <p className="empty-state panel">{t('community.empty')}</p>}
                </div>
            )}
        </>
    )
}

export default CommunityPanel
