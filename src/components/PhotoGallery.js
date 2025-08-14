import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
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
  const [groupBy, setGroupBy] = useState('date'); // 'date' or 'album'
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterAlbum, setFilterAlbum] = useState('');
  const [favorites, setFavorites] = useState([]); // array of photo IDs
  const [favLoading, setFavLoading] = useState(false);
  const { currentUser } = useAuth();

  // Fetch user favorites
  useEffect(() => {
    async function fetchFavorites() {
      if (!currentUser) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setFavorites(Array.isArray(data.favorites) ? data.favorites : []);
        }
      } catch (err) {
        // ignore
      }
    }
    fetchFavorites();
  }, [currentUser]);

  // Toggle favorite for a photo
  const toggleFavorite = async (photoId) => {
    if (!currentUser) return;
    setFavLoading(true);
    const userRef = doc(db, 'users', currentUser.uid);
    try {
      if (favorites.includes(photoId)) {
        await updateDoc(userRef, { favorites: arrayRemove(photoId) });
        setFavorites(favorites.filter(id => id !== photoId));
      } else {
        await updateDoc(userRef, { favorites: arrayUnion(photoId) });
        setFavorites([...favorites, photoId]);
      }
    } catch (err) {
      // ignore
    } finally {
      setFavLoading(false);
    }
  };
  // Get all unique tags and albums for filter dropdowns
  const allTags = Array.from(new Set(photos.flatMap(p => Array.isArray(p.tags) ? p.tags : [])));
  // Add 'Favorites' as a virtual album always present in the dropdown
  const allAlbums = ['Favorites', ...Array.from(new Set(photos.map(p => p.album && p.album.trim() ? p.album : 'Default Album'))).filter(a => a !== 'Favorites')];
  function groupPhotosByAlbum(photos) {
    const groups = {};
    photos.forEach(photo => {
      const albumKey = photo.album && photo.album.trim() ? photo.album : 'Default Album';
      if (!groups[albumKey]) {
        groups[albumKey] = [];
      }
      groups[albumKey].push(photo);
    });
    return groups;
  }

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


  // Filter photos based on search and filters
  const filteredPhotos = photos.filter(photo => {
    // If filtering by 'Favorites', only show favorited photos
    if (filterAlbum === 'Favorites') {
      return favorites.includes(photo.id);
    }
    // Search by description, tags, or album
    const searchLower = search.trim().toLowerCase();
    const matchesSearch =
      !searchLower ||
      (photo.description && photo.description.toLowerCase().includes(searchLower)) ||
      (Array.isArray(photo.tags) && photo.tags.some(tag => tag.toLowerCase().includes(searchLower))) ||
      (photo.album && photo.album.toLowerCase().includes(searchLower));
    const matchesTag = !filterTag || (Array.isArray(photo.tags) && photo.tags.includes(filterTag));
    const matchesAlbum = !filterAlbum || (photo.album ? photo.album === filterAlbum : filterAlbum === 'Default Album');
    return matchesSearch && matchesTag && matchesAlbum;
  });

  // When grouping by album, add a 'Favorites' group at the top
  let photoGroups;
  if (groupBy === 'album') {
    const favoritesGroup = filteredPhotos.filter(photo => favorites.includes(photo.id));
    const albumGroups = groupPhotosByAlbum(filteredPhotos);
    photoGroups = { Favorites: favoritesGroup, ...albumGroups };
  } else {
    photoGroups = groupPhotosByDate(filteredPhotos);
  }

  return (
    <div className="gallery-container">
      <div className="gallery-header">
        <h1>Family Photos</h1>
        <p>{photos.length} photos in your collection</p>
        <div className="gallery-controls">
          <input
            type="text"
            className="gallery-search"
            placeholder="Search by description, tag, or album..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="gallery-filter"
            value={filterTag}
            onChange={e => setFilterTag(e.target.value)}
          >
            <option value="">All Tags</option>
            {allTags.map((tag, idx) => (
              <option value={tag} key={idx}>{tag}</option>
            ))}
          </select>
          <select
            className="gallery-filter"
            value={filterAlbum}
            onChange={e => setFilterAlbum(e.target.value)}
          >
            <option value="">All Albums</option>
            {allAlbums.map((album, idx) => (
              <option value={album} key={idx}>{album}</option>
            ))}
          </select>
          <div className="gallery-toggle-group">
            <button
              className={`gallery-toggle-btn${groupBy === 'date' ? ' active' : ''}`}
              onClick={() => setGroupBy('date')}
              aria-pressed={groupBy === 'date'}
            >
              Group by Date
            </button>
            <button
              className={`gallery-toggle-btn${groupBy === 'album' ? ' active' : ''}`}
              onClick={() => setGroupBy('album')}
              aria-pressed={groupBy === 'album'}
            >
              Group by Album
            </button>
          </div>
        </div>
      </div>

      <div className="photo-groups">
        {Object.entries(photoGroups).map(([groupKey, groupPhotos]) => (
          <div key={groupKey} className="photo-group">
            <h2 className="date-header">{groupBy === 'date' ? getDateGroupTitle(groupKey) : groupKey}</h2>
            <div className="photo-grid">
              {groupPhotos.map(photo => (
                <div 
                  key={photo.id} 
                  className={`photo-item${favorites.includes(photo.id) ? ' favorited' : ''}`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handlePhotoClick(photo);
                    }
                  }}
                >
                  <div className="photo-fav-btn-container">
                    <button
                      type="button"
                      className={`photo-fav-btn${favorites.includes(photo.id) ? ' active' : ''}`}
                      onClick={e => { e.stopPropagation(); toggleFavorite(photo.id); }}
                      aria-label={favorites.includes(photo.id) ? 'Remove from favorites' : 'Add to favorites'}
                      disabled={favLoading}
                    >
                      {favorites.includes(photo.id) ? '★' : '☆'}
                    </button>
                  </div>
                  <div onClick={() => handlePhotoClick(photo)} role="button">
                    <img 
                      src={photo.downloadURL} 
                      alt={photo.description || 'Family photo'}
                      loading="lazy"
                    />
                    {photo.description && (
                      <div className="photo-description">{photo.description}</div>
                    )}
                    {groupBy === 'date' && photo.album && (
                      <div className="photo-album-label">{photo.album}</div>
                    )}
                  </div>
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
          onDelete={(deletedId) => {
            // Remove deleted photo from gallery
            setPhotos(prev => prev.filter(p => p.id !== deletedId));
            setSelectedPhoto(null);
          }}
        />
      )}
    </div>
  );
}
