import React, { useState, useRef, useEffect } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, doc, getDoc, getDocs } from 'firebase/firestore';
import { storage, db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './UploadPhoto.css';

export default function UploadPhoto() {
  // Array of { file, progress, error }
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [tags, setTags] = useState([]); // Array of tags
  const [tagInput, setTagInput] = useState('');
  const [album, setAlbum] = useState('');
  const [albums, setAlbums] = useState([]);
  const [newAlbum, setNewAlbum] = useState('');
  const fileInputRef = useRef(null);
  const { currentUser } = useAuth();
  // Fetch albums for this family
  useEffect(() => {
    async function fetchAlbums() {
      if (!currentUser) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (!userDoc.exists()) return;
        const userData = userDoc.data();
        const familyId = userData.familyId;
        if (!familyId) return;
        // Query all photos for this family and collect unique album names
        const photosSnap = await getDocs(collection(db, 'photos'));
        const albumSet = new Set();
        photosSnap.forEach(docSnap => {
          const data = docSnap.data();
          if (data.familyId === familyId && data.album) {
            albumSet.add(data.album);
          }
        });
        setAlbums(Array.from(albumSet));
      } catch (err) {
        // ignore
      }
    }
    fetchAlbums();
  }, [currentUser]);
  const navigate = useNavigate();
  // Handle tag input
  const handleTagInputChange = (e) => {
    setTagInput(e.target.value);
  };

  const handleTagInputKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ',' || e.key === ' ') && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput('');
    } else if (e.key === 'Backspace' && !tagInput && tags.length) {
      setTags(tags.slice(0, -1));
    }
  };

  const handleRemoveTag = (removeIdx) => {
    setTags(tags.filter((_, idx) => idx !== removeIdx));
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelect(Array.from(e.dataTransfer.files));
    }
  };

  const handleFilesSelect = (files) => {
    // Only accept image files, filter out non-images
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    if (validFiles.length === 0) {
      setError('Please select image files');
      return;
    }
    setSelectedFiles(validFiles.map(file => ({ file, progress: 0, error: null })));
    setError('');
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelect(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFiles.length) {
      setError('Please select photo(s) to upload');
      return;
    }
    if (!album && !newAlbum) {
      setError('Please select or create an album');
      return;
    }
    setUploading(true);
    setError('');
    try {
      // Get user data to find family ID
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (!userDoc.exists()) {
        setError('User data not found');
        setUploading(false);
        return;
      }
      const userData = userDoc.data();
      const familyId = userData.familyId;
      if (!familyId) {
        setError('You need to be part of a family to upload photos');
        setUploading(false);
        return;
      }
      const albumName = newAlbum.trim() ? newAlbum.trim() : album;
      // Upload each file with progress
      const updatedFiles = [...selectedFiles];
      const uploadPromises = updatedFiles.map((item, idx) => {
        return new Promise((resolve, reject) => {
          const file = item.file;
          const timestamp = Date.now() + idx;
          const fileName = `${currentUser.uid}_${timestamp}_${file.name}`;
          const imagePath = `families/${familyId}/${fileName}`;
          const storageRef = ref(storage, imagePath);
          const uploadTask = uploadBytesResumable(storageRef, file);
          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              setSelectedFiles(prevFiles => {
                const newFiles = [...prevFiles];
                newFiles[idx] = { ...newFiles[idx], progress };
                return newFiles;
              });
            },
            (error) => {
              setSelectedFiles(prevFiles => {
                const newFiles = [...prevFiles];
                newFiles[idx] = { ...newFiles[idx], error: 'Upload failed' };
                return newFiles;
              });
              reject(error);
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                const photoData = {
                  fileName: fileName,
                  imagePath: imagePath,
                  downloadURL: downloadURL,
                  description: description,
                  tags: tags,
                  album: albumName,
                  uploadDate: new Date().toISOString(),
                  uploadedBy: currentUser.uid,
                  uploadedByName: currentUser.displayName || currentUser.email,
                  familyId: familyId,
                  fileSize: file.size,
                  fileType: file.type
                };
                await addDoc(collection(db, 'photos'), photoData);
                resolve();
              } catch (err) {
                setSelectedFiles(prevFiles => {
                  const newFiles = [...prevFiles];
                  newFiles[idx] = { ...newFiles[idx], error: 'Upload failed' };
                  return newFiles;
                });
                reject(err);
              }
            }
          );
        });
      });
      await Promise.all(uploadPromises);
      setSelectedFiles([]);
      setDescription('');
      setTags([]);
      setTagInput('');
      setAlbum('');
      setNewAlbum('');
      navigate('/');
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload photo(s). Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-container">
      <div className="upload-card">
        <div className="upload-header">
          <h1>Upload Photo</h1>
          <p>Add a new photo to your family's collection</p>
        </div>

        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="upload-form">
          <div className="file-upload-area">
            <div
              className={`drag-drop-zone ${dragActive ? 'drag-active' : ''} ${selectedFiles.length ? 'file-selected' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
            >
              {selectedFiles.length ? (
                <div className="file-preview-multi">
                  {selectedFiles.map((item, idx) => (
                    <div className="file-preview" key={idx}>
                      <img 
                        src={URL.createObjectURL(item.file)} 
                        alt="Preview" 
                        className="preview-image"
                      />
                      <p className="file-name">{item.file.name}</p>
                      <p className="file-size">{(item.file.size / 1024 / 1024).toFixed(2)} MB</p>
                      {uploading && (
                        <div className="progress-bar-container">
                          <div className="progress-bar" style={{ width: `${item.progress || 0}%` }}></div>
                          <span className="progress-label">{item.progress ? `${item.progress}%` : '0%'}</span>
                        </div>
                      )}
                      {item.error && <div className="error-alert">{item.error}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="upload-prompt">
                  <div className="upload-icon">📷</div>
                  <p>Drag and drop your photos here, or click to browse</p>
                  <p className="upload-hint">Supports: JPG, PNG, GIF, WebP. You can select multiple files.</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileInput}
              style={{ display: 'none' }}
              aria-label="Select photo files"
              title="Select photo files"
            />
          </div>

          <div className="form-group">
            <label htmlFor="album">Album</label>
            <select
              id="album"
              value={album}
              onChange={e => { setAlbum(e.target.value); setNewAlbum(''); }}
              disabled={uploading}
            >
              <option value="">Select an album</option>
              {albums.map((a, idx) => (
                <option value={a} key={idx}>{a}</option>
              ))}
            </select>
            <div className="new-album-input">
              <input
                type="text"
                placeholder="Or create new album"
                value={newAlbum}
                onChange={e => { setNewAlbum(e.target.value); setAlbum(''); }}
                disabled={uploading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description (Optional)</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for this photo..."
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="tags">Tags (Optional)</label>
            <div className="tags-input-container">
              <div className="tags-list">
                {tags.map((tag, idx) => (
                  <span className="tag-item" key={idx}>
                    {tag}
                    <button type="button" className="remove-tag-btn" onClick={() => handleRemoveTag(idx)} aria-label={`Remove tag ${tag}`}>×</button>
                  </span>
                ))}
              </div>
              <input
                id="tags"
                type="text"
                value={tagInput}
                onChange={handleTagInputChange}
                onKeyDown={handleTagInputKeyDown}
                placeholder="Type a tag and press Enter"
                className="tags-input"
                autoComplete="off"
                disabled={uploading}
              />
            </div>
            <small className="tags-hint">Press Enter, comma, or space to add a tag. Click × to remove.</small>
          </div>

          <button 
            type="submit" 
            className="upload-button"
            disabled={!selectedFiles.length || uploading}
          >
            {uploading ? 'Uploading...' : `Upload ${selectedFiles.length > 1 ? 'Photos' : 'Photo'}`}
          </button>
        </form>
      </div>
    </div>
  );
}
