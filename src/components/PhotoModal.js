import React, { useEffect } from 'react';
import { format } from 'date-fns';
import './PhotoModal.css';

export default function PhotoModal({ photo, onClose }) {
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  // Early return must come AFTER all hooks
  if (!photo) return null;

  return (
    <div className="photo-modal-overlay" onClick={handleBackdropClick}>
      <div className="photo-modal">
        <button className="close-button" onClick={onClose} aria-label="Close photo">
          ×
        </button>
        
        <div className="photo-modal-content">
          <div className="photo-container">
            <img 
              src={photo.downloadURL} 
              alt={photo.description || 'Family photo'}
              className="modal-photo"
            />
          </div>
          
          <div className="photo-details">
                         <div className="photo-info">
               <h3>Photo Details</h3>
               <p><strong>Uploaded:</strong> {format(new Date(photo.uploadDate), 'MMMM d, yyyy')}</p>
               <p><strong>Time:</strong> {format(new Date(photo.uploadDate), 'h:mm a')}</p>
               {photo.description && (
                 <p><strong>Description:</strong> {photo.description}</p>
               )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
