# Family Photo Database

A secure, family-focused photo storage application built with React and Firebase. Store, organize, and share family photos with date-based grouping similar to iOS Photos app.

## Features

- 🔐 **Secure Authentication** - User registration and login with encrypted passwords
- 📸 **Photo Upload** - Drag & drop photo upload with preview
- 📅 **Date Organization** - Photos automatically grouped by date (Today, Yesterday, This Week, etc.)
- 👨‍👩‍👧‍👦 **Family Access** - Share photos with family members
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🔒 **Firebase Security** - Secure storage and database with authentication

## Tech Stack

- **Frontend**: React 18, React Router
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Styling**: CSS3 with modern design patterns
- **Security**: Firebase Auth with password hashing

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd family-photo-database
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable the following services:
   - Authentication (Email/Password)
   - Firestore Database
   - Storage
4. Get your Firebase configuration from Project Settings
5. Update `src/firebase/config.js` with your Firebase credentials:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id"
};
```

### 4. Firebase Security Rules

#### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Photos can only be accessed by family members
    match /photos/{photoId} {
      allow read, write: if request.auth != null && 
        resource.data.familyId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.familyId;
    }
  }
}
```

#### Storage Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /families/{familyId}/{allPaths=**} {
      allow read, write: if request.auth != null && 
        request.auth.token.familyId == familyId;
    }
  }
}
```

### 5. Start the Development Server

```bash
npm start
```

The app will open at `http://localhost:3000`

## Usage

### First Time Setup
1. Register a new account
2. Enter your family name
3. Start uploading photos

### Adding Family Members
- Family members can register with the same family name
- All photos will be shared within the family

### Photo Management
- **Upload**: Drag & drop photos or click to browse
- **View**: Photos are automatically organized by date
- **Organize**: Photos are grouped by Today, Yesterday, This Week, etc.

## Project Structure

```
src/
├── components/          # React components
│   ├── Login.js        # Login form
│   ├── Register.js     # Registration form
│   ├── PhotoGallery.js # Photo display with date grouping
│   ├── UploadPhoto.js  # Photo upload component
│   └── Navbar.js       # Navigation component
├── contexts/           # React contexts
│   └── AuthContext.js  # Authentication context
├── firebase/           # Firebase configuration
│   └── config.js       # Firebase setup
├── App.js              # Main app component
└── index.js            # App entry point
```

## Security Features

- **Password Hashing**: Passwords are securely hashed using bcrypt
- **Authentication**: Firebase Auth handles user sessions
- **Data Isolation**: Users can only access their family's photos
- **Secure Storage**: Firebase Storage with security rules

## Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Firebase Hosting

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init hosting`
4. Deploy: `firebase deploy`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue in the GitHub repository or contact the development team.

## Future Enhancements

- [ ] Photo sharing with external links
- [ ] Advanced photo editing
- [ ] Album organization
- [ ] Mobile app versions
- [ ] Photo backup and sync
- [ ] Family member invitations
- [ ] Photo comments and reactions
