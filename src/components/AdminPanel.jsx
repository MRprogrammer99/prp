import { useState } from 'react';
import { useRequests } from '../context/RequestContext';

function AdminPanel({ isVisible, onNotification }) {
    const { requests, updateStatus, deleteRequest } = useRequests();
    const [links, setLinks] = useState({});

    if (!isVisible) return null;

    const handleLinkChange = (id, value) => {
        setLinks({ ...links, [id]: value });
    };

    const handleSendLink = (request) => {
        const link = links[request.id];
        if (!link) {
            onNotification('⚠️ Please enter a download link first');
            return;
        }

        // Clean the WhatsApp number (remove spaces, dashes, etc.)
        const cleanNumber = request.whatsapp.replace(/[^0-9+]/g, '');
        // Remove the leading + if present for wa.me
        const waNumber = cleanNumber.startsWith('+')
            ? cleanNumber.substring(1)
            : cleanNumber;

        const message = encodeURIComponent(
            `🎬 Your movie "${request.name} (${request.year})" is ready!\n\n📥 Download Link: ${link}\n\nQuality: ${request.quality}\nLanguage: ${request.language}\n\nEnjoy! 🍿`
        );

        const waUrl = `https://wa.me/${waNumber}?text=${message}`;
        window.open(waUrl, '_blank');

        // Update status to completed
        updateStatus(request.id, 'completed');

        // Clear the link input
        setLinks({ ...links, [request.id]: '' });

        onNotification(`✅ Link sent to WhatsApp for "${request.name}"`);
    };

    const handleStatusChange = (id, status) => {
        updateStatus(id, status);
        onNotification(`Status updated successfully`);
    };

    const handleDelete = (id, name) => {
        if (window.confirm(`Delete request for "${name}"?`)) {
            deleteRequest(id);
            onNotification(`🗑️ Request for "${name}" deleted`);
        }
    };

    return (
        <section className="glass-card admin-panel">
            <h2 className="section-title">
                <i className="fas fa-user-shield"></i> Admin Panel
            </h2>

            {requests.length === 0 ? (
                <div className="empty-state">
                    <i className="fas fa-clipboard-list"></i>
                    <p>No requests to manage.</p>
                </div>
            ) : (
                requests.map((request) => (
                    <div key={request.id} className="admin-request-item">
                        <div className="request-info">
                            <div className="movie-name">
                                {request.name} ({request.year})
                            </div>
                            <div className="movie-details">
                                {request.language} • {request.quality} • Requested on{' '}
                                {request.date}
                            </div>
                            <div className="admin-whatsapp">
                                <i className="fab fa-whatsapp"></i> {request.whatsapp}
                            </div>
                        </div>

                        <div className="admin-actions">
                            <input
                                type="text"
                                className="admin-input"
                                placeholder="Paste download link here..."
                                value={links[request.id] || ''}
                                onChange={(e) => handleLinkChange(request.id, e.target.value)}
                            />
                            <button
                                className="admin-btn send-link-btn"
                                onClick={() => handleSendLink(request)}
                            >
                                <i className="fab fa-whatsapp"></i> Send Link
                            </button>
                            <select
                                className="status-select"
                                value={request.status}
                                onChange={(e) =>
                                    handleStatusChange(request.id, e.target.value)
                                }
                            >
                                <option value="processing">Processing</option>
                                <option value="completed">Completed</option>
                                <option value="incomplete">Not Available</option>
                            </select>
                            <button
                                className="admin-btn delete-btn"
                                onClick={() => handleDelete(request.id, request.name)}
                            >
                                <i className="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                ))
            )}
        </section>
    );
}

export default AdminPanel;
