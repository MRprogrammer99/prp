import { useRequests } from '../context/RequestContext';

function getStatusBadge(status) {
    switch (status) {
        case 'completed':
            return { className: 'status-completed', label: 'Completed' };
        case 'processing':
            return { className: 'status-processing', label: 'Processing' };
        case 'incomplete':
        default:
            return { className: 'status-incomplete', label: 'Not Available' };
    }
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
                        const badge = getStatusBadge(request.status);
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
                                <span className={`status-badge ${badge.className}`}>
                                    {badge.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

export default PreviousRequests;
