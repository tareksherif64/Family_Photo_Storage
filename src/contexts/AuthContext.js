import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  setPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
// bcrypt is not needed for client-side - Firebase handles password security

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function signup(email, password, displayName, familyName) {
    try {
      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update profile with display name
      await updateProfile(user, { displayName });

      // Create or get family
      let familyId;
      if (familyName) {
        // Normalize family name to lowercase for case-insensitive comparison
        const normalizedFamilyName = familyName.toLowerCase().trim();
        
        // Check if family already exists (case-insensitive)
        const familyQuery = query(collection(db, 'families'), where('nameLower', '==', normalizedFamilyName));
        const familySnapshot = await getDocs(familyQuery);
        
        if (familySnapshot.empty) {
          // Create new family
          const familyDoc = await addDoc(collection(db, 'families'), {
            name: familyName, // Store original case
            nameLower: normalizedFamilyName, // Store lowercase for searching
            createdBy: user.uid,
            createdAt: new Date().toISOString(),
            members: [user.uid]
          });
          familyId = familyDoc.id;
        } else {
          // Join existing family
          const existingFamily = familySnapshot.docs[0];
          familyId = existingFamily.id;
          
          // Add user to family members
          await updateDoc(doc(db, 'families', familyId), {
            members: arrayUnion(user.uid)
          });
        }
      }

              // Store user data in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: displayName,
          familyName: familyName,
          familyNameLower: familyName ? familyName.toLowerCase().trim() : null,
          createdAt: new Date().toISOString(),
          familyId: familyId
        });

      return user;
    } catch (error) {
      throw error;
    }
  }

  async function login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      throw error;
    }
  }

  function logout() {
    return signOut(auth);
  }

  async function getCurrentUserData() {
    if (currentUser) {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        return userDoc.data();
      }
    }
    return null;
  }

  useEffect(() => {
    // Set Firebase Auth to use session persistence (logs out when browser closes)
    setPersistence(auth, browserSessionPersistence);
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    getCurrentUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
