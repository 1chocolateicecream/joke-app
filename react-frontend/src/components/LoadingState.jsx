function LoadingState({ label }) {
    return (
        <div className="loading-state" role="status" aria-live="polite">
            <span className="spinner" aria-hidden="true" />
            <span>{label}</span>
        </div>
    )
}

export default LoadingState