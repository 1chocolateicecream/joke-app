import { useState } from 'react'
import { login, register } from '../api.js'
import { useI18n } from '../useI18n.js'

function AuthPanel({ session, onAuthenticated, onLogout }) {
    const { t } = useI18n()
    const [isOpen, setIsOpen] = useState(false)
    const [mode, setMode] = useState('login')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    async function handleSubmit(event) {
        event.preventDefault()
        setBusy(true)
        setError('')
        const values = Object.fromEntries(new FormData(event.currentTarget).entries())

        try {
            const result = mode === 'login' ? await login(values) : await register(values)
            onAuthenticated(result)
            setIsOpen(false)
        } catch (requestError) {
            setError(requestError.message)
        } finally {
            setBusy(false)
        }
    }

    if (session) {
        return (
            <div className="account-bar">
                <span className="account-name">
                    {session.user.name}{session.user.username && <small>@{session.user.username}</small>}
                </span>
                <button className="text-button" type="button" onClick={onLogout}>{t('auth.logout')}</button>
            </div>
        )
    }

    return (
        <div className="auth-wrap">
            <button
                className="header-button"
                type="button"
                aria-expanded={isOpen}
                onClick={() => {
                    setIsOpen((open) => !open)
                    setError('')
                }}
            >
                {isOpen ? t('auth.close') : t('auth.open')}
            </button>
            {isOpen && (
                <form className="auth-popover" onSubmit={handleSubmit}>
                    <h2>{mode === 'login' ? t('auth.login') : t('auth.createAccount')}</h2>
                    {mode === 'register' && (
                        <label>
                            {t('auth.name')}
                            <input name="name" autoComplete="name" required maxLength="255" />
                        </label>
                    )}
                    {mode === 'register' && (
                        <label>
                            {t('auth.username')}
                            <input name="username" autoComplete="username" autoCapitalize="none" pattern="[A-Za-z0-9_]{3,24}" minLength="3" maxLength="24" required />
                            <span className="field-hint">{t('auth.usernameHint')}</span>
                        </label>
                    )}
                    <label>
                        {t('auth.email')}
                        <input name="email" type="email" autoComplete="email" required />
                    </label>
                    <label>
                        {t('auth.password')}
                        <input
                            name="password"
                            type="password"
                            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                            required
                        />
                    </label>
                    {mode === 'register' && (
                        <label>
                            {t('auth.confirmPassword')}
                            <input name="password_confirmation" type="password" autoComplete="new-password" required />
                        </label>
                    )}
                    {error && <p className="form-error" role="alert">{error}</p>}
                    <button className="primary-button" type="submit" disabled={busy}>
                        {busy ? t('auth.pleaseWait') : mode === 'login' ? t('auth.login') : t('auth.register')}
                    </button>
                    <button
                        className="text-button auth-switch"
                        type="button"
                        onClick={() => {
                            setMode((currentMode) => currentMode === 'login' ? 'register' : 'login')
                            setError('')
                        }}
                    >
                        {mode === 'login' ? t('auth.createAccount') : t('auth.alreadyAccount')}
                    </button>
                </form>
            )}
        </div>
    )
}

export default AuthPanel