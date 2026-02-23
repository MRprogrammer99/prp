import { useState, useEffect } from 'react';
import { useRequests } from '../context/RequestContext';

const ADMIN_PASSWORD = 'Abd123*';

function AdminPage({ onNotification }) {
    const { requests, updateStatus, deleteRequest } = useRequests();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [links, setLinks] = useState({});
    const [completingId, setCompletingId] = useState(null);
    const [termsText, setTermsText] = useState('');
    const [termsSaving, setTermsSaving] = useState(false);

    // Fetch T&C on mount
    useEffect(() => {
        if (isAuthenticated) {
            fetch('/api/settings/terms')
                .then(r => r.json())
                .then(data => setTermsText(data.text || ''))
                .catch(err => console.error('Failed to load terms:', err));
        }
    }, [isAuthenticated]);

    const handleSaveTerms = async () => {
        setTermsSaving(true);
        try {
            await fetch('/api/settings/terms', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: termsText }),
            });
            onNotification('✅ Terms & Conditions saved!');
        } catch (error) {
            onNotification('❌ Failed to save terms');
        } finally {
            setTermsSaving(false);
        }
    };

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

    const handleComplete = async (request) => {
        const link = links[request.id];
        if (!link) {
            onNotification('⚠️ Please paste a download link first');
            return;
        }

        setCompletingId(request.id);
        try {
            await updateStatus(request.id, { status: 'completed', link: link });
            setLinks({ ...links, [request.id]: '' });
            onNotification(`✅ "${request.name}" marked as completed!`);
        } catch (error) {
            onNotification(`❌ Failed: ${error.message}`);
        } finally {
            setCompletingId(null);
        }
    };

    const handleStatusChange = async (id, status) => {
        await updateStatus(id, { status });
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
    const requestedCount = requests.filter((r) => r.status === 'requested').length;
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
                    <p className="subtitle">Manage movie requests and share download links</p>
                </header>

                {/* Stats */}
                <div className="admin-stats">
                    <div className="stat-card glass-card">
                        <div className="stat-number">{requests.length}</div>
                        <div className="stat-label">Total Requests</div>
                    </div>
                    <div className="stat-card glass-card stat-pending">
                        <div className="stat-number">{requestedCount}</div>
                        <div className="stat-label">Pending</div>
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

                {/* Terms & Conditions Editor */}
                <div className="glass-card" style={{ marginTop: '24px' }}>
                    <h2 className="section-title">
                        <i className="fas fa-file-alt"></i> Terms & Conditions
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', marginBottom: '14px' }}>
                        Edit the terms shown to users before they request a movie. Use line breaks for paragraphs.
                    </p>
                    <textarea
                        className="admin-textarea"
                        value={termsText}
                        onChange={(e) => setTermsText(e.target.value)}
                        placeholder="Enter your terms and conditions text here..."
                        rows={8}
                    />
                    <button
                        className="admin-btn send-link-btn"
                        onClick={handleSaveTerms}
                        disabled={termsSaving}
                        style={{ marginTop: '12px' }}
                    >
                        {termsSaving ? (
                            <><i className="fas fa-spinner fa-spin"></i> Saving...</>
                        ) : (
                            <><i className="fas fa-save"></i> Save Terms</>
                        )}
                    </button>
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
                                    </div>
                                    <span
                                        className={`status-badge ${request.status === 'completed'
                                            ? 'status-completed'
                                            : request.status === 'incomplete'
                                                ? 'status-incomplete'
                                                : 'status-processing'
                                            }`}
                                    >
                                        {request.status === 'completed'
                                            ? 'Completed'
                                            : request.status === 'incomplete'
                                                ? 'Not Available'
                                                : 'Pending'}
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
                                        onClick={() => handleComplete(request)}
                                        disabled={completingId === request.id}
                                    >
                                        {completingId === request.id ? (
                                            <>
                                                <i className="fas fa-spinner fa-spin"></i> Saving...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-check-circle"></i> Complete
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
                                        <option value="requested">Pending</option>
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
