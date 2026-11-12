import { useEffect, useState } from 'react'
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../api.js'
import Avatar from './Avatar.jsx'
import LoadingState from './LoadingState.jsx'
import { useI18n } from '../useI18n.js'

function NotificationsPanel({ token, onNotificationOpen, onUnreadChange }) {
    const { t, locale } = useI18n()
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let active = true
        listNotifications(token).then((result) => { if (active) setItems(result.notifications) })
            .catch((requestError) => { if (active) setError(requestError.message) })
            .finally(() => { if (active) setLoading(false) })
        return () => { active = false }
    }, [token])

    async function markAllRead() {
        await markAllNotificationsRead(token)
        setItems((current) => current.map((item) => ({ ...item, read_at: new Date().toISOString() })))
        onUnreadChange?.(0)
    }

    async function open(item) {
        if (!item.read_at) {
            await markNotificationRead(token, item.id)
            setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read_at: new Date().toISOString() } : entry))
            onUnreadChange?.((count) => Math.max(0, count - 1))
        }
        onNotificationOpen(item.data)
    }

    function describe(data) {
        const actor = data.actor?.name || t('posts.member')
        if (data.action === 'like') return t('notifications.like', { actor, post: data.post_title || '' })
        if (data.action === 'repost') return t('notifications.repost', { actor, post: data.post_title || '' })
        if (data.action === 'comment') return t('notifications.comment', { actor, post: data.post_title || '', comment: data.comment || '' })
        return t('notifications.follow', { actor })
    }

    return (
        <>
            <div className="section-heading"><div><p className="eyebrow">{t('notifications.eyebrow')}</p><h1>{t('notifications.title')}</h1></div><button className="secondary-button" type="button" onClick={markAllRead}>{t('notifications.markAll')}</button></div>
            {error && <p className="notice error-notice" role="alert">{error}</p>}
            {loading ? <LoadingState label={t('notifications.loading')} /> : items.length === 0
                ? <p className="empty-state panel">{t('notifications.empty')}</p>
                : <div className="notification-list">{items.map((item) => (
                    <button className={item.read_at ? 'notification-item panel' : 'notification-item panel unread'} type="button" key={item.id} onClick={() => open(item)}>
                        <Avatar name={item.data.actor?.name || '?'} avatarPath={item.data.actor?.avatar_path} />
                        <span className="notification-copy"><span>{describe(item.data)}</span><small>{new Date(item.created_at).toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US')}</small></span>
                        {!item.read_at && <span className="notification-dot" aria-label={t('notifications.unread')} />}
                    </button>
                ))}</div>}
        </>
    )
}

export default NotificationsPanel
