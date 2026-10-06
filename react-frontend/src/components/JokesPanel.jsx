import { useState } from 'react'
import { listJokes } from '../api.js'
import LoadingState from './LoadingState.jsx'
import { useI18n } from '../useI18n.js'

function JokesPanel() {
    const { t } = useI18n()
    const [amount, setAmount] = useState(5)
    const [jokes, setJokes] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    async function handleSubmit(event) {
        event.preventDefault()
        setLoading(true)
        setError('')
        try {
            setJokes(await listJokes(amount))
        } catch (requestError) {
            setError(requestError.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <div className="section-heading">
                <div>
                    <p className="eyebrow">{t('jokes.eyebrow')}</p>
                    <h1>{t('jokes.title')}</h1>
                </div>
            </div>

            <form className="jokes-toolbar panel" onSubmit={handleSubmit}>
                <label htmlFor="joke-amount">{t('jokes.amount')}</label>
                <input
                    id="joke-amount"
                    type="number"
                    min="1"
                    max="10"
                    value={amount}
                    onChange={(event) => setAmount(Math.min(10, Math.max(1, Number(event.target.value))))}
                    required
                />
                <button className="primary-button" type="submit" disabled={loading}>
                    {loading ? t('posts.saving') : t('jokes.get')}
                </button>
            </form>

            {loading && <LoadingState label={t('jokes.loading')} />}
            {error && <p className="notice error-notice" role="alert">{error}</p>}
            {!loading && !error && jokes.length === 0 && (
                <p className="empty-state panel">{t('jokes.empty')}</p>
            )}
            <div className="joke-list">
                {jokes.map((joke) => (
                    <article className="joke panel" key={`${joke.id}-${joke.category}`}>
                        <p className="joke-category">{joke.category} · #{joke.id}</p>
                        <h2>{joke.setup}</h2>
                        {joke.delivery && <p className="joke-delivery">{joke.delivery}</p>}
                    </article>
                ))}
            </div>
        </>
    )
}

export default JokesPanel