import { useEffect } from 'react';

function Notification({ message, isVisible, onHide }) {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onHide();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onHide]);

    return (
        <div className={`notification ${isVisible ? 'show' : ''}`}>
            <i className="fas fa-check-circle"></i> {message}
        </div>
    );
}

export default Notification;
