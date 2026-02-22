import { useState, useEffect } from 'react';
import { useRequests } from '../context/RequestContext';

const ADMIN_PASSWORD = 'Abd123*';

function AdminPage({ onNotification }) {
    const { requests, updateStatus, deleteRequest } = useRequests();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [links, setLinks] = useState({});
    const [waStatus, setWaStatus] = useState({ connected: false, hasQR: false });
    const [sendingId, setSendingId] = useState(null);

    // Check WhatsApp connection status periodically
    useEffect(() => {
        if (!isAuthenticated) return;

        const checkStatus = async () => {
            try {
                const res = await fetch('/api/whatsapp/status');
                const data = await res.json();
                setWaStatus(data);
            } catch {
                setWaStatus({ connected: false, hasQR: false });
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 5000);
        return () => clearInterval(interval);
    }, [isAuthenticated]);

    const handleLogin = (e) => {
        e.preventDefault();
        if (password === ADMIN_PASSWORD) {
            setIsAuthenticated(true);
            setPasswordError('');
        } else {
            setPasswordError('Incorrect password. Access denied.');
        }
    };

    const handleLinkChange = (id, value) => {
        setLinks({ ...links, [id]: value });
    };

    const handleSendLink = async (request) => {
        const link = links[request.id];
        if (!link) {
            onNotification('⚠️ Please enter a download link first');
            return;
        }

        if (!waStatus.connected) {
            onNotification('❌ WhatsApp is not connected. Please scan the QR code in the server terminal first.');
            return;
        }

        setSendingId(request.id);

        const message = `🎬 Your movie *${request.name} (${request.year})* is ready!\n\n🌐 Language: ${request.language}\n📀 Quality: ${request.quality}\n\n📥 Download Link:\n${link}\n\nEnjoy! 🍿`;

        try {
            const res = await fetch('/api/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: request.whatsapp,
                    message: message,
                }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                updateStatus(request.id, 'completed');
                setLinks({ ...links, [request.id]: '' });
                onNotification(`✅ Link sent via WhatsApp to ${request.whatsapp}`);
            } else {
                onNotification(`❌ Failed: ${data.error}`);
            }
        } catch (error) {
            onNotification(`❌ Network error: ${error.message}`);
        } finally {
            setSendingId(null);
        }
    };

    const handleStatusChange = (id, status) => {
        updateStatus(id, status);
        onNotification('Status updated successfully');
    };

    const handleDelete = (id, name) => {
        if (window.confirm(`Delete request for "${name}"?`)) {
            deleteRequest(id);
            onNotification(`🗑️ Request for "${name}" deleted`);
        }
    };

    // ─── Password Gate ───
    if (!isAuthenticated) {
        return (
            <div className="admin-login-page">
                <div className="admin-login-card glass-card">
                    <div className="admin-login-icon">
                        <i className="fas fa-shield-alt"></i>
                    </div>
                    <h2>Admin Access</h2>
                    <p className="admin-login-subtitle">Enter password to continue</p>
                    <form onSubmit={handleLogin}>
                        <div className="form-group">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter admin password"
                                autoFocus
                                required
                            />
                        </div>
                        {passwordError && (
                            <p className="password-error">
                                <i className="fas fa-exclamation-circle"></i> {passwordError}
                            </p>
                        )}
                        <button type="submit" className="submit-btn">
                            <i className="fas fa-lock-open"></i> Unlock
                        </button>
                    </form>
                    <a href="#/" className="back-link">
                        <i className="fas fa-arrow-left"></i> Back to Portal
                    </a>
                </div>
            </div>
        );
    }

    // ─── Admin Dashboard ───
    const pendingCount = requests.filter((r) => r.status === 'processing').length;
    const completedCount = requests.filter((r) => r.status === 'completed').length;
    const unavailableCount = requests.filter((r) => r.status === 'incomplete').length;

    return (
        <div className="admin-page">
            <div className="container">
                <header className="glass-card header">
                    <div className="admin-header-row">
                        <h1>
                            <i className="fas fa-user-shield"></i> Admin Panel
                        </h1>
                        <a href="#/" className="back-btn">
                            <i className="fas fa-arrow-left"></i> Back to Portal
                        </a>
                    </div>
                    <p className="subtitle">Manage movie requests and send download links</p>

                    {/* WhatsApp Connection Status */}
                    <div className="wa-status-bar">
                        <span className={`wa-status-dot ${waStatus.connected ? 'connected' : 'disconnected'}`}></span>
                        <span>
                            {waStatus.connected
                                ? 'WhatsApp Connected ✅'
                                : 'WhatsApp Disconnected — Scan QR in server terminal'}
                        </span>
                    </div>
                </header>

                {/* Stats */}
                <div className="admin-stats">
                    <div className="stat-card glass-card">
                        <div className="stat-number">{requests.length}</div>
                        <div className="stat-label">Total Requests</div>
                    </div>
                    <div className="stat-card glass-card stat-pending">
                        <div className="stat-number">{pendingCount}</div>
                        <div className="stat-label">Processing</div>
                    </div>
                    <div className="stat-card glass-card stat-done">
                        <div className="stat-number">{completedCount}</div>
                        <div className="stat-label">Completed</div>
                    </div>
                    <div className="stat-card glass-card stat-unavail">
                        <div className="stat-number">{unavailableCount}</div>
                        <div className="stat-label">Not Available</div>
                    </div>
                </div>

                {/* Requests List */}
                <div className="glass-card" style={{ marginTop: '24px' }}>
                    <h2 className="section-title">
                        <i className="fas fa-clipboard-list"></i> All Requests
                    </h2>

                    {requests.length === 0 ? (
                        <div className="empty-state">
                            <i className="fas fa-inbox"></i>
                            <p>No requests yet.</p>
                        </div>
                    ) : (
                        requests.map((request) => (
                            <div key={request.id} className="admin-request-item">
                                <div className="admin-request-header">
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
                                            {request.language} • {request.quality} • {request.date}
                                        </div>
                                        <div className="admin-whatsapp">
                                            <i className="fab fa-whatsapp"></i> {request.whatsapp}
                                        </div>
                                    </div>
                                    <span
                                        className={`status-badge ${request.status === 'completed'
                                            ? 'status-completed'
                                            : request.status === 'processing'
                                                ? 'status-processing'
                                                : 'status-incomplete'
                                            }`}
                                    >
                                        {request.status === 'completed'
                                            ? 'Completed'
                                            : request.status === 'processing'
                                                ? 'Processing'
                                                : 'Not Available'}
                                    </span>
                                </div>

                                <div className="admin-actions">
                                    <input
                                        type="text"
                                        className="admin-input"
                                        placeholder="Paste download link here..."
                                        value={links[request.id] || ''}
                                        onChange={(e) =>
                                            handleLinkChange(request.id, e.target.value)
                                        }
                                    />
                                    <button
                                        className="admin-btn send-link-btn"
                                        onClick={() => handleSendLink(request)}
                                        disabled={sendingId === request.id}
                                    >
                                        {sendingId === request.id ? (
                                            <>
                                                <i className="fas fa-spinner fa-spin"></i> Sending...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fab fa-whatsapp"></i> Send Link
                                            </>
                                        )}
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
                </div>
            </div>
        </div>
    );
}

export default AdminPage;
