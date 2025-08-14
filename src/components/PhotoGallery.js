import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { format, isToday, isYesterday, isThisWeek, isThisYear } from 'date-fns';
import PhotoModal from './PhotoModal';
import './PhotoGallery.css';

export default function PhotoGallery() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchPhotos();
  }, [currentUser]);

  const handlePhotoClick = (photo) => {
    setSelectedPhoto(photo);
  };

  const closeModal = () => {
    setSelectedPhoto(null);
  };

  async function fetchPhotos() {
    try {
      setLoading(true);
      setError('');
      
      // Get user data to find family ID
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      
      if (!userDoc.exists()) {
        setError('User data not found');
        return;
      }

      const userData = userDoc.data();
      const familyId = userData.familyId;

      if (!familyId) {
        setError('You need to be part of a family to view photos. Please contact an administrator.');
        setLoading(false);
        return;
      }

      console.log('Fetching photos for familyId:', familyId);
      
      // Fetch photos for the family
      const photosQuery = query(
        collection(db, 'photos'),
        where('familyId', '==', familyId)
        // Note: orderBy removed temporarily - will add back after index is created
      );

      const photosSnapshot = await getDocs(photosQuery);
      console.log('Found photos:', photosSnapshot.docs.length);
      
      const photosData = [];

      for (const doc of photosSnapshot.docs) {
        const photoData = doc.data();
        console.log('Processing photo:', photoData);
        
        try {
          // Get download URL for the image
          const imageRef = ref(storage, photoData.imagePath);
          const downloadURL = await getDownloadURL(imageRef);
          photosData.push({
            id: doc.id,
            ...photoData,
            downloadURL
          });
        } catch (error) {
          console.error('Error getting download URL for photo:', doc.id, error);
        }
      }

      console.log('Final photos data:', photosData);
      
      // Sort photos by upload date (newest first)
      const sortedPhotos = photosData.sort((a, b) => 
        new Date(b.uploadDate) - new Date(a.uploadDate)
      );
      
      setPhotos(sortedPhotos);
    } catch (error) {
      console.error('Error fetching photos:', error);
      setError('Failed to load photos');
    } finally {
      setLoading(false);
    }
  }

  function groupPhotosByDate(photos) {
    const groups = {};
    
    photos.forEach(photo => {
      const date = new Date(photo.uploadDate);
      let dateKey;
      
      if (isToday(date)) {
        dateKey = 'Today';
      } else if (isYesterday(date)) {
        dateKey = 'Yesterday';
      } else if (isThisWeek(date)) {
        dateKey = format(date, 'EEEE'); // Day name
      } else if (isThisYear(date)) {
        dateKey = format(date, 'MMMM d'); // Month and day
      } else {
        dateKey = format(date, 'MMMM d, yyyy'); // Full date
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(photo);
    });
    
    return groups;
  }

  function getDateGroupTitle(dateKey) {
    if (dateKey === 'Today' || dateKey === 'Yesterday') {
      return dateKey;
    }
    
    // For other dates, add the year if it's not this year
    const photo = photos.find(p => {
      const date = new Date(p.uploadDate);
      if (dateKey === format(date, 'EEEE')) return true;
      if (dateKey === format(date, 'MMMM d')) return true;
      return false;
    });
    
    if (photo) {
      const date = new Date(photo.uploadDate);
      if (!isThisYear(date)) {
        return `${dateKey}, ${format(date, 'yyyy')}`;
      }
    }
    
    return dateKey;
  }

  if (loading) {
    return (
      <div className="gallery-container">
        <div className="loading">Loading photos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gallery-container">
        <div className="error-message">{error}</div>
        <button onClick={fetchPhotos} className="retry-button">Retry</button>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="gallery-container">
        <div className="empty-state">
          <h2>No photos yet</h2>
          <p>Start by uploading some photos to your family's collection!</p>
        </div>
      </div>
    );
  }

  const photoGroups = groupPhotosByDate(photos);

  return (
    <div className="gallery-container">
      <div className="gallery-header">
        <h1>Family Photos</h1>
        <p>{photos.length} photos in your collection</p>
      </div>
      
      <div className="photo-groups">
        {Object.entries(photoGroups).map(([dateKey, groupPhotos]) => (
          <div key={dateKey} className="photo-group">
            <h2 className="date-header">{getDateGroupTitle(dateKey)}</h2>
            <div className="photo-grid">
                             {groupPhotos.map(photo => (
                 <div 
                   key={photo.id} 
                   className="photo-item"
                   onClick={() => handlePhotoClick(photo)}
                   role="button"
                   tabIndex={0}
                   onKeyDown={(e) => {
                     if (e.key === 'Enter' || e.key === ' ') {
                       e.preventDefault();
                       handlePhotoClick(photo);
                     }
                   }}
                 >
                   <img 
                     src={photo.downloadURL} 
                     alt={photo.description || 'Family photo'}
                     loading="lazy"
                   />
                   {photo.description && (
                     <div className="photo-description">{photo.description}</div>
                   )}
                 </div>
               ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* Photo Modal */}
      {selectedPhoto && (
        <PhotoModal 
          photo={selectedPhoto} 
          onClose={closeModal} 
        />
      )}
    </div>
  );
}
