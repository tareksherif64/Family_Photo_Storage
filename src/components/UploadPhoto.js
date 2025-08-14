import React, { useState, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { storage, db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './UploadPhoto.css';

export default function UploadPhoto() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

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
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file) => {
    if (file.type.startsWith('image/')) {
      setSelectedFile(file);
      setError('');
    } else {
      setError('Please select an image file');
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError('Please select a photo to upload');
      return;
    }

    try {
      setUploading(true);
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
        setError('You need to be part of a family to upload photos');
        return;
      }

      // Create unique filename
      const timestamp = Date.now();
      const fileName = `${currentUser.uid}_${timestamp}_${selectedFile.name}`;
      const imagePath = `families/${familyId}/${fileName}`;

      // Upload to Firebase Storage
      const storageRef = ref(storage, imagePath);
      await uploadBytes(storageRef, selectedFile);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Save metadata to Firestore
      const photoData = {
        fileName: fileName,
        imagePath: imagePath,
        downloadURL: downloadURL,
        description: description,
        uploadDate: new Date().toISOString(),
        uploadedBy: currentUser.uid,
        uploadedByName: currentUser.displayName || currentUser.email,
        familyId: familyId,
        fileSize: selectedFile.size,
        fileType: selectedFile.type
      };

      await addDoc(collection(db, 'photos'), photoData);

      // Reset form and redirect
      setSelectedFile(null);
      setDescription('');
      navigate('/');
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload photo. Please try again.');
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
              className={`drag-drop-zone ${dragActive ? 'drag-active' : ''} ${selectedFile ? 'file-selected' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
            >
              {selectedFile ? (
                <div className="file-preview">
                  <img 
                    src={URL.createObjectURL(selectedFile)} 
                    alt="Preview" 
                    className="preview-image"
                  />
                  <p className="file-name">{selectedFile.name}</p>
                  <p className="file-size">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div className="upload-prompt">
                  <div className="upload-icon">📷</div>
                  <p>Drag and drop your photo here, or click to browse</p>
                  <p className="upload-hint">Supports: JPG, PNG, GIF, WebP</p>
                </div>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              style={{ display: 'none' }}
              aria-label="Select photo file"
              title="Select photo file"
            />
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

          <button 
            type="submit" 
            className="upload-button"
            disabled={!selectedFile || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </button>
        </form>
      </div>
    </div>
  );
}
