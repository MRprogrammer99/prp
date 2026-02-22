import { useState } from 'react';

function DisclaimerModal({ isOpen, onClose, onProceed }) {
    const [accepted, setAccepted] = useState(false);

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
                    {/* Placeholder for disclaimer text — user will provide later */}
                    <p>
                        This is where your disclaimer text will go. Please read and accept
                        the terms before proceeding with your movie request.
                    </p>
                    <br />
                    <p>
                        By using this service, you agree to our terms and conditions. The
                        movie request portal is provided for personal use only.
                    </p>
                    <br />
                    <p>
                        All movie links will be shared via WhatsApp to the number you
                        provide. Please ensure your WhatsApp number is correct and active.
                    </p>
                    <br />
                    <p>
                        We do not guarantee the availability of all requested movies. Some
                        movies may not be available due to various reasons.
                    </p>
                    <br />
                    <p>
                        The administrator reserves the right to deny any request without
                        providing a reason.
                    </p>
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
