rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // --- Helper Functions ---
    function isSignedIn() {
      return request.auth != null;
    }

    // Checks if the requesting user has a specific role.
    function isRole(role) {
      // This requires the user to have permission to read their own user document first.
      return isSignedIn() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == role;
    }

    function isAdmin() {
      return isRole('admin');
    }

    // --- Global Admin Rule ---
    // Admins have full read/write access to all data.
    match /{document=**} {
      allow read, write: if isAdmin();
    }

    // --- Users Collection ---
    match /users/{userId} {
      // Unauthenticated access is allowed for server-side functions (e.g., sending notifications)
      // to retrieve necessary user data like FCM tokens.
      // NOTE: This makes user data publicly readable. Secure this in a production environment,
      // for example by using the Admin SDK in a trusted backend.
      allow read: if true;

      // A user can update their OWN profile, as long as they are not changing their 'role'.
      // This more robust check compares the role value before and after the update.
      allow update: if isSignedIn() && request.auth.uid == userId &&
                     request.resource.data.role == resource.data.role;
      
      // A user can create their own profile. Deleting users is an admin-only task.
      allow create: if isSignedIn() && request.auth.uid == userId;
      allow delete: if isAdmin();
    }
    
    // --- Courses Collection ---
    match /courses/{courseId} {
      // Anyone signed in can read course data.
      allow read: if isSignedIn();
      // Only admins can modify courses.
      allow write: if isAdmin();
    }

    // --- Availabilities Collection ---
    match /availabilities/{availabilityId} {
      allow read: if isSignedIn();
      allow create: if isRole('teacher') || isAdmin();
      allow update: if isSignedIn(); // For booking transactions
      allow delete: if (isRole('teacher') && resource.data.teacherId == request.auth.uid && resource.data.status != 'booked') || isAdmin();
    }

    // --- Bookings Collection ---
    match /bookings/{bookingId} {
      // A user can read bookings if they are the student or the teacher involved.
      allow read: if isSignedIn() && (request.auth.uid == resource.data.studentId || request.auth.uid == resource.data.teacherId);
      allow create: if isRole('student') || isAdmin();
      allow update: if isSignedIn() && (request.auth.uid == resource.data.studentId || request.auth.uid == resource.data.teacherId);
    }
    
    // --- Notifications Collection ---
    match /notifications/{notificationId} {
      // A user can only read their own notifications.
      allow read: if isSignedIn() && request.auth.uid == resource.data.userId;
      
      // A user can update their own notifications (e.g., to mark as read).
      allow update: if isSignedIn() && request.auth.uid == resource.data.userId;
      
      // Allow creation by signed-in users OR by an unauthenticated server process (cron job)
      allow create: if isSignedIn() || (
        request.resource.data.keys().hasAll(['userId', 'message', 'read', 'createdAt']) 
        && request.resource.data.read == false
      );
    }
    
    // --- Chats & Messages ---
    match /chats/{chatId} {
      // Allow a user to CREATE a chat if their UID is in the `participants` list of the NEW document.
      allow create: if isSignedIn() && request.auth.uid in request.resource.data.participants;

      // Allow a user to READ or UPDATE a chat if their UID is in the `participants` list of the EXISTING document.
      allow read, update: if isSignedIn() && request.auth.uid in resource.data.participants;

      match /messages/{messageId} {
        // To read or write a message, the user must be a participant in the parent chat document.
        allow read, write: if isSignedIn() && request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
      }
    }
  }
}