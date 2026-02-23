function RequestSection({ onRequestClick, onTrackClick }) {
    return (
        <section className="glass-card request-section">
            <button className="request-btn" onClick={onRequestClick}>
                <i className="fas fa-plus-circle"></i> Request a Movie
            </button>
            <button className="track-btn-secondary" onClick={onTrackClick}>
                <i className="fas fa-search"></i> Track My Request
            </button>
        </section>
    );
}

export default RequestSection;
