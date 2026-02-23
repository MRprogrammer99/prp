import { useRequests } from '../context/RequestContext';

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

function getRequestDisplay(request) {
    if (request.status === 'completed' && request.completedAt) {
        const elapsed = Date.now() - request.completedAt;
        if (elapsed < TWENTY_FOUR_HOURS) {
            // Within 24 hours — show Get Link button
            const remaining = TWENTY_FOUR_HOURS - elapsed;
            const hours = Math.floor(remaining / (60 * 60 * 1000));
            const mins = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
            return {
                type: 'link-available',
                timeLeft: `${hours}h ${mins}m remaining`,
                link: request.link,
            };
        } else {
            // Past 24 hours
            return { type: 'satisfied' };
        }
    }

    if (request.status === 'incomplete') {
        return { type: 'unavailable' };
    }

    // Default: requested / pending
    return { type: 'pending' };
}

function PreviousRequests() {
    const { requests, loading } = useRequests();

    return (
        <section className="glass-card previous-requests">
            <h2 className="section-title">
                <i className="fas fa-history"></i> Previous Requests
            </h2>

            {loading ? (
                <div className="empty-state">
                    <i className="fas fa-spinner fa-spin"></i>
                    <p>Loading requests...</p>
                </div>
            ) : requests.length === 0 ? (
                <div className="empty-state">
                    <i className="fas fa-inbox"></i>
                    <p>No requests yet. Click "Request a Movie" to get started!</p>
                </div>
            ) : (
                <div className="request-list">
                    {requests.map((request, index) => {
                        const display = getRequestDisplay(request);
                        return (
                            <div
                                key={request.id}
                                className="request-item"
                                style={{ '--item-index': index }}
                            >
                                <div className="request-info">
                                    <div className="movie-name">
                                        {request.name} ({request.year})
                                    </div>
                                    <div className="movie-details">
                                        {request.requesterName && (
                                            <span className="requester-tag">
                                                <i className="fas fa-user"></i> {request.requesterName} •{' '}
                                            </span>
                                        )}
                                        {request.language} • {request.quality} • Requested on{' '}
                                        {request.date}
                                    </div>
                                </div>

                                {display.type === 'link-available' ? (
                                    <div className="request-link-section">
                                        <a
                                            href={display.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="get-link-btn"
                                        >
                                            <i className="fas fa-download"></i> Get Link
                                        </a>
                                        <span className="time-remaining">
                                            <i className="fas fa-clock"></i> {display.timeLeft}
                                        </span>
                                    </div>
                                ) : display.type === 'satisfied' ? (
                                    <div className="request-satisfied">
                                        <i className="fas fa-check-circle"></i> Request Completed • User Satisfied
                                    </div>
                                ) : display.type === 'unavailable' ? (
                                    <span className="status-badge status-incomplete">
                                        Not Available
                                    </span>
                                ) : (
                                    <span className="status-badge status-processing">
                                        Pending
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

export default PreviousRequests;
