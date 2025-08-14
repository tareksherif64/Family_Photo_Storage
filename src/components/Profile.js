import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import './Profile.css';

export default function Profile() {
  const { currentUser } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function fetchProfile() {
      if (!currentUser) return;
      setLoading(true);
      setError('');
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setDisplayName(data.displayName || '');
          setBio(data.bio || '');
        }
      } catch (err) {
        setError('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        displayName,
        bio,
      });
      setSuccess('Profile updated!');
    } catch (err) {
      setError('Failed to update profile.');
    }
  };

  if (loading) return <div className="profile-container"><div>Loading...</div></div>;

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h1>Your Profile</h1>
        {error && <div className="error-alert">{error}</div>}
        {success && <div className="success-alert">{success}</div>}
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label htmlFor="displayName">Display Name</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows="3"
            />
          </div>
          <button type="submit" className="profile-save-btn">Save Changes</button>
        </form>
      </div>
    </div>
  );
}
