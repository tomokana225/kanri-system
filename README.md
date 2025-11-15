# Class Reservation System

A comprehensive booking system built with React, TypeScript, and Firebase, designed for educational institutions. It provides distinct portals for students, teachers, and administrators to manage class schedules, bookings, and user interactions seamlessly.

## ✨ Features

-   **Role-Based Access Control**: Three distinct user roles (Student, Teacher, Admin) with tailored dashboards and permissions.
-   **Student Portal**:
    -   View assigned courses.
    -   Book classes from a teacher's available time slots using an interactive calendar.
    -   Cancel upcoming bookings, respecting a 24-hour cancellation policy.
    -   View past and upcoming reservations.
    -   Provide and view feedback on completed classes.
    -   Engage in real-time chat with teachers regarding specific bookings.
-   **Teacher Portal**:
    -   Manage and publish weekly availability.
    -   View upcoming class schedules.
    -   Review and provide feedback on completed student sessions.
    -   Communicate with students via a dedicated chat feature.
-   **Admin Portal**:
    -   **Dashboard Overview**: At-a-glance statistics for users, courses, and upcoming bookings.
    -   **User Management**: Create, view, edit, and delete user profiles and roles.
    -   **Course Management**: Create, edit, and delete courses, assigning teachers and enrolling students.
    -   **Master Schedule View**: A comprehensive calendar view of all bookings across the platform.
    -   **Availability Management**: View and manage all teacher availability slots.
    -   **Manual Booking**: Admins can manually create bookings for any student and course.
-   **Automated Notifications**: A serverless cron job runs periodically to send reminders for classes starting within the next 24 hours.
-   **Real-time Functionality**: Utilizes Firestore's real-time listeners for live chat updates and notifications.
-   **Secure & Scalable**: Built on the Firebase ecosystem with robust security rules to protect user data.

## 🛠️ Technology Stack

-   **Frontend**: React, TypeScript, Vite
-   **Styling**: Tailwind CSS
-   **Backend & Database**: Firebase (Authentication, Firestore)
-   **Deployment**: Cloudflare Pages
-   **Serverless Functions**: Cloudflare Functions (for serving configuration and running cron jobs)

## 🚀 Getting Started

### Prerequisites

-   A Firebase project.
-   A Cloudflare account.

### Configuration

This application is deployed on Cloudflare Pages and requires environment variables to connect to your Firebase project.

1.  **Firebase Setup**:
    -   Create a new project in the [Firebase Console](https://console.firebase.google.com/).
    -   Add a new Web App to your project to get your Firebase configuration credentials.
    -   In the Firestore Database section, create a database and apply the security rules found in `firestore.rules`.
    -   Apply the database indexes defined in `firestore.indexes.json` to ensure efficient querying.

2.  **Cloudflare Pages Setup**:
    -   Connect your repository to a new Cloudflare Pages project.
    -   In your project settings, navigate to **Settings > Environment variables**.
    -   Add the following variables using the credentials from your Firebase project:
        ```
        FIREBASE_API_KEY
        FIREBASE_AUTH_DOMAIN
        FIREBASE_PROJECT_ID
        FIREBASE_STORAGE_BUCKET
        FIREBASE_MESSAGING_SENDER_ID
        FIREBASE_APP_ID
        FIREBASE_MEASUREMENT_ID
        ```

3.  **Cron Job for Reminders** (Optional):
    -   In your Cloudflare Pages project settings, go to **Settings > Functions**.
    -   Under **Cron Triggers**, add a new trigger.
    -   Set the schedule (e.g., `0 * * * *` to run hourly).
    -   The function to trigger is `/api/cron-handler`.

### Demo Credentials

You can use the following credentials to explore the different roles:

-   **Admin**:
    -   **Email**: `admin@test.com`
    -   **Password**: `password`
-   **Student**:
    -   Sign up with any email that does not contain `admin@` (e.g., `student@test.com`).
    -   **Password**: `password`
-   **Teacher**:
    -   Sign up as a new user.
    -   Log in as an Admin and change the new user's role from 'student' to 'teacher' in the User Management panel.

## 📂 File Structure

```
.
├── components/       # Reusable React components
├── functions/        # Cloudflare serverless functions
│   └── api/
├── services/         # Firebase and API communication logic
├── types.ts          # TypeScript type definitions
├── App.tsx           # Main application component
├── index.tsx         # Application entry point
└── index.html        # Main HTML file
```