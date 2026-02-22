function RequestSection({ onRequestClick }) {
    return (
        <section className="glass-card request-section">
            <button className="request-btn" onClick={onRequestClick}>
                <i className="fas fa-plus-circle"></i> Request a Movie
            </button>
        </section>
    );
}

export default RequestSection;
