import { API_ROOT } from '../api.js'
import { useI18n } from '../useI18n.js'

function Avatar({ name, avatarPath, className = '' }) {
    const { t } = useI18n()
    const avatarUrl = avatarPath
        ? `${API_ROOT}/storage/${avatarPath.split('/').map(encodeURIComponent).join('/')}`
        : null

    if (avatarUrl) {
        return <img className={`avatar avatar-photo ${className}`} src={avatarUrl} alt={t('profile.avatarFor', { name })} />
    }

    return (
        <span className={`avatar ${className}`} role="img" aria-label={t('profile.avatarFor', { name })}>
            {name?.trim().charAt(0).toUpperCase() || '?'}
        </span>
    )
}

export default Avatar