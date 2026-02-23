import { useState, useEffect } from 'react';

function DisclaimerModal({ isOpen, onClose, onProceed }) {
    const [accepted, setAccepted] = useState(false);
    const [termsText, setTermsText] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            fetch('/api/settings/terms')
                .then(r => r.json())
                .then(data => {
                    setTermsText(data.text || 'Terms and conditions will be updated shortly.');
                })
                .catch(() => {
                    setTermsText('Terms and conditions will be updated shortly.');
                })
                .finally(() => setLoading(false));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleProceed = () => {
        if (accepted) {
            setAccepted(false);
            onProceed();
        }
    };

    const handleClose = () => {
        setAccepted(false);
        onClose();
    };

    // Split text by newlines into paragraphs
    const paragraphs = termsText.split('\n').filter(line => line.trim() !== '');

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="close-modal" onClick={handleClose}>
                    &times;
                </button>

                <h2 className="modal-title">
                    <i className="fas fa-shield-alt"></i> Terms & Conditions
                </h2>

                <div className="disclaimer-box">
                    {loading ? (
                        <p style={{ textAlign: 'center', padding: '20px' }}>
                            <i className="fas fa-spinner fa-spin"></i> Loading...
                        </p>
                    ) : (
                        paragraphs.map((para, i) => (
                            <p key={i} style={{ marginBottom: i < paragraphs.length - 1 ? '12px' : 0 }}>
                                {para}
                            </p>
                        ))
                    )}
                </div>

                <div className="checkbox-group" onClick={() => setAccepted(!accepted)}>
                    <input
                        type="checkbox"
                        checked={accepted}
                        onChange={(e) => setAccepted(e.target.checked)}
                    />
                    <label>I accept the terms and conditions</label>
                </div>

                <button
                    className="submit-btn"
                    onClick={handleProceed}
                    disabled={!accepted}
                >
                    <i className="fas fa-arrow-right"></i> Proceed to Request
                </button>
            </div>
        </div>
    );
}

export default DisclaimerModal;
