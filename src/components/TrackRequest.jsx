import { useState } from 'react';
import { useRequests } from '../context/RequestContext';

function TrackRequest({ isOpen, onClose }) {
    const { trackRequest } = useRequests();
    const [phone, setPhone] = useState('');
    const [results, setResults] = useState(null);
    const [isSearching, setIsSearching] = useState(false);

    if (!isOpen) return null;

    const handleTrack = async (e) => {
        e.preventDefault();
        if (!phone) return;

        setIsSearching(true);
        try {
            const data = await trackRequest(phone);
            setResults(data);
        } catch (e) {
            console.error(e);
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content track-modal" onClick={(e) => e.stopPropagation()}>
                <button className="close-modal" onClick={onClose}>&times;</button>

                <h2 className="modal-title">
                    <i className="fas fa-search-location"></i> Track Your Request
                </h2>

                <p className="track-subtitle">Enter the WhatsApp number used for the request</p>

                <form onSubmit={handleTrack} className="track-form">
                    <div className="form-group">
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+91 98765 43210"
                            autoFocus
                            required
                        />
                    </div>
                    <button type="submit" className="submit-btn" disabled={isSearching}>
                        {isSearching ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>} Track
                    </button>
                </form>

                <div className="track-results">
                    {results === null ? (
                        <div className="track-info-tip">
                            <i className="fas fa-info-circle"></i> Result will show status and download link.
                        </div>
                    ) : results.length === 0 ? (
                        <div className="track-no-results">
                            <i className="fas fa-exclamation-triangle"></i> No requests found for this number.
                        </div>
                    ) : (
                        <div className="track-list">
                            {results.map((req) => (
                                <div key={req.id} className="track-item glass-card">
                                    <div className="track-item-header">
                                        <span className="movie-name">{req.name} ({req.year})</span>
                                        <span className={`status-badge status-${req.status}`}>
                                            {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                                        </span>
                                    </div>

                                    {req.link ? (
                                        <div className="track-link-box">
                                            <p>Your download link is ready!</p>
                                            <a href={req.link} target="_blank" rel="noopener noreferrer" className="track-download-btn">
                                                <i className="fas fa-download"></i> Download Movie
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="track-pending-msg">
                                            <i className="fas fa-clock"></i> Our team is working on it. Check back later!
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TrackRequest;
