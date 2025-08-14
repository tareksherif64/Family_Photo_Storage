import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { doc, deleteDoc } from 'firebase/firestore';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import './PhotoModal.css';


export default function PhotoModal({ photo, onClose, onDelete }) {
  const { currentUser } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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

  const isUploader = currentUser && photo.uploadedBy === currentUser.uid;

  const handleDelete = async () => {
    if (!isUploader || deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'photos', photo.id));
      // Delete from Storage
      if (photo.imagePath) {
        const imgRef = storageRef(storage, photo.imagePath);
        await deleteObject(imgRef);
      }
      setDeleting(false);
      if (onDelete) onDelete(photo.id);
      onClose();
    } catch (err) {
      setDeleteError('Failed to delete photo. Please try again.');
      setDeleting(false);
    }
  };

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
              {photo.tags && photo.tags.length > 0 && (
                <div className="photo-tags">
                  <strong>Tags:</strong>{' '}
                  {photo.tags.map((tag, idx) => (
                    <span className="photo-tag-item" key={idx}>{tag}</span>
                  ))}
                </div>
              )}
              {isUploader && (
                <div className="photo-delete-section">
                  <button
                    className="photo-delete-btn"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting...' : 'Delete Photo'}
                  </button>
                  {deleteError && <div className="delete-error">{deleteError}</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
