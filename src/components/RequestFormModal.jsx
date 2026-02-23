import { useState } from 'react';
import { useRequests } from '../context/RequestContext';

const languages = [
    'English',
    'Hindi',
    'Tamil',
    'Telugu',
    'Malayalam',
    'Korean',
    'Japanese',
    'Other',
];

const qualities = ['480p', '720p', '1080p', '2K', '4K'];

function RequestFormModal({ isOpen, onClose, onSuccess }) {
    const { addRequest } = useRequests();
    const [formData, setFormData] = useState({
        requesterName: '',
        name: '',
        year: '',
        language: '',
        quality: '480p',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await addRequest({
                requesterName: formData.requesterName,
                name: formData.name,
                year: formData.year,
                language: formData.language,
                quality: formData.quality,
            });

            setFormData({
                requesterName: '',
                name: '',
                year: '',
                language: '',
                quality: '480p',
            });

            onClose();
            onSuccess('Your movie request has been submitted successfully! 🎬');
        } catch (error) {
            console.error('Submission failed:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="close-modal" onClick={onClose}>
                    &times;
                </button>

                <h2 className="modal-title">
                    <i className="fas fa-film"></i> Request a Movie
                </h2>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="requesterName">
                            <i className="fas fa-user"></i> Your Name
                        </label>
                        <input
                            type="text"
                            id="requesterName"
                            name="requesterName"
                            value={formData.requesterName}
                            onChange={handleChange}
                            placeholder="Enter your name"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="movieName">
                            <i className="fas fa-video"></i> Movie Name
                        </label>
                        <input
                            type="text"
                            id="movieName"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter movie name properly (e.g., The Matrix)"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="movieYear">
                            <i className="fas fa-calendar"></i> Release Year
                        </label>
                        <input
                            type="number"
                            id="movieYear"
                            name="year"
                            value={formData.year}
                            onChange={handleChange}
                            placeholder="e.g., 1999"
                            min="1900"
                            max="2030"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="movieLanguage">
                            <i className="fas fa-language"></i> Language
                        </label>
                        <select
                            id="movieLanguage"
                            name="language"
                            value={formData.language}
                            onChange={handleChange}
                            required
                        >
                            <option value="" disabled>
                                Select language
                            </option>
                            {languages.map((lang) => (
                                <option key={lang} value={lang}>
                                    {lang}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>
                            <i className="fas fa-tv"></i> Quality
                        </label>
                        <div className="quality-options">
                            {qualities.map((q) => (
                                <div key={q} className="quality-option">
                                    <input
                                        type="radio"
                                        id={`quality-${q}`}
                                        name="quality"
                                        value={q}
                                        checked={formData.quality === q}
                                        onChange={handleChange}
                                    />
                                    <label htmlFor={`quality-${q}`}>{q}</label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button type="submit" className="submit-btn" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <i className="fas fa-spinner fa-spin"></i> Submitting...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-paper-plane"></i> Submit Request
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default RequestFormModal;
