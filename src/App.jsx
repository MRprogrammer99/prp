import { useState, useCallback, useEffect } from 'react';
import { RequestProvider } from './context/RequestContext';
import Header from './components/Header';
import RequestSection from './components/RequestSection';
import PreviousRequests from './components/PreviousRequests';
import DisclaimerModal from './components/DisclaimerModal';
import TrackRequest from './components/TrackRequest';
import AdminPage from './components/AdminPage';
import Notification from './components/Notification';

function App() {
    const [currentPage, setCurrentPage] = useState('home');
    const [showDisclaimer, setShowDisclaimer] = useState(false);
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [showTrack, setShowTrack] = useState(false);
    const [notification, setNotification] = useState({ message: '', visible: false });

    // Simple hash-based routing
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash;
            if (hash === '#/admin') {
                setCurrentPage('admin');
            } else {
                setCurrentPage('home');
            }
        };

        handleHashChange();
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const showNotification = useCallback((message) => {
        setNotification({ message, visible: true });
    }, []);

    const hideNotification = useCallback(() => {
        setNotification((prev) => ({ ...prev, visible: false }));
    }, []);

    const handleRequestClick = () => {
        setShowDisclaimer(true);
    };

    return (
        <RequestProvider>
            {currentPage === 'admin' ? (
                <AdminPage onNotification={showNotification} />
            ) : (
                <>
                    <div className="container">
                        <Header />
                        <div className="main-content">
                            <RequestSection
                                onRequestClick={handleRequestClick}
                                onTrackClick={() => setShowTrack(true)}
                            />
                            <PreviousRequests />
                        </div>
                    </div>

                    {/* Modals */}
                    <DisclaimerModal
                        isOpen={showDisclaimer}
                        onClose={() => setShowDisclaimer(false)}
                        onProceed={() => {
                            setShowDisclaimer(false);
                            setShowRequestForm(true);
                        }}
                    />

                    <RequestFormModal
                        isOpen={showRequestForm}
                        onClose={() => setShowRequestForm(false)}
                        onSuccess={showNotification}
                    />

                    <TrackRequest
                        isOpen={showTrack}
                        onClose={() => setShowTrack(false)}
                    />

                    {/* Admin link — fixed bottom left */}
                    <a href="#/admin" className="admin-link-btn">
                        <i className="fas fa-user-shield"></i> Admin
                    </a>
                </>
            )}

            <Notification
                message={notification.message}
                isVisible={notification.visible}
                onHide={hideNotification}
            />
        </RequestProvider>
    );
}

export default App;
