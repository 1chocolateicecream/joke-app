import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../useI18n.js'

function MusicPanel({ currentUser, onShare }) {
    const { t } = useI18n()
    const [tracks, setTracks] = useState([])
    const [currentTrackId, setCurrentTrackId] = useState(null)
    const [error, setError] = useState('')
    const [shareMessage, setShareMessage] = useState('')
    const [sharingId, setSharingId] = useState(null)
    const objectUrls = useRef(new Set())
    const currentTrack = tracks.find((track) => track.id === currentTrackId)

    useEffect(() => () => {
        objectUrls.current.forEach((url) => URL.revokeObjectURL(url))
    }, [])

    function addFiles(event) {
        const files = Array.from(event.currentTarget.files || [])
        const audioFiles = files.filter((file) => file.type.startsWith('audio/'))
        const rejectedCount = files.length - audioFiles.length
        const addedTracks = audioFiles.map((file) => {
            const url = URL.createObjectURL(file)
            objectUrls.current.add(url)
            return {
                id: globalThis.crypto.randomUUID(),
                name: file.name,
                size: file.size,
                url,
            }
        })

        setError(rejectedCount ? t('music.audioOnly') : '')
        if (addedTracks.length) {
            setTracks((current) => [...current, ...addedTracks])
            setCurrentTrackId((current) => current || addedTracks[0].id)
        }
        event.currentTarget.value = ''
    }

    function removeTrack(trackId) {
        const track = tracks.find((item) => item.id === trackId)
        if (!track) return

        URL.revokeObjectURL(track.url)
        objectUrls.current.delete(track.url)
        const remaining = tracks.filter((item) => item.id !== trackId)
        setTracks(remaining)
        if (currentTrackId === trackId) setCurrentTrackId(remaining[0]?.id || null)
    }

    function playNext() {
        const currentIndex = tracks.findIndex((track) => track.id === currentTrackId)
        setCurrentTrackId(tracks[currentIndex + 1]?.id || null)
    }

    async function shareTrack(track) {
        if (!currentUser || !onShare || sharingId) return
        setSharingId(track.id)
        setError('')
        setShareMessage('')
        const values = new FormData()
        values.set('title', `🎵 ${track.name}`)
        values.set('body', t('music.shareBody', { name: track.name }))
        values.set('visibility', 'followers')
        try {
            await onShare(values)
            setShareMessage(t('music.shared'))
        } catch (shareError) {
            setError(shareError.message)
        } finally {
            setSharingId(null)
        }
    }

    return (
        <>
            <div className="section-heading">
                <div>
                    <p className="eyebrow">{t('music.eyebrow')}</p>
                    <h1>{t('music.title')}</h1>
                </div>
                <label className="primary-button music-upload">
                    {t('music.add')}
                    <input type="file" accept="audio/*" multiple onChange={addFiles} />
                </label>
            </div>

            <p className="music-note panel">{t('music.note')}</p>
            {error && <p className="notice error-notice" role="alert">{error}</p>}
            {shareMessage && <p className="form-success" role="status">{shareMessage}</p>}
            {!currentUser && tracks.length > 0 && <p className="music-note">{t('music.shareLogin')}</p>}

            {currentTrack ? (
                <section className="music-player panel">
                    <p className="eyebrow">{t('music.nowSelected')}</p>
                    <h2>{currentTrack.name}</h2>
                    <audio key={currentTrack.id} controls autoPlay src={currentTrack.url} onEnded={playNext}>
                        {t('music.unsupported')}
                    </audio>
                </section>
            ) : (
                <p className="empty-state panel">{t('music.empty')}</p>
            )}

            {tracks.length > 0 && (
                <section className="music-library" aria-label="Local music library">
                    <h2>{t('music.playlist')} · {tracks.length}</h2>
                    {tracks.map((track) => (
                        <article className="music-track panel" key={track.id}>
                            <button
                                className={track.id === currentTrackId ? 'music-track-name active' : 'music-track-name'}
                                type="button"
                                onClick={() => setCurrentTrackId(track.id)}
                            >
                                <span className="track-symbol" aria-hidden="true">{track.id === currentTrackId ? '♪' : '♫'}</span>
                                <span>{track.name}</span>
                            </button>
                            <span className="track-size">{(track.size / 1024 / 1024).toFixed(1)} MB</span>
                            {currentUser && <button className="secondary-button" type="button" disabled={sharingId !== null} onClick={() => shareTrack(track)}>
                                {sharingId === track.id ? t('music.sharing') : t('music.share')}
                            </button>}
                            <button className="text-button danger-button" type="button" onClick={() => removeTrack(track.id)}>
                                {t('music.remove')}
                            </button>
                        </article>
                    ))}
                </section>
            )}
        </>
    )
}

export default MusicPanel
