import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

export type Timestamp = firebase.firestore.Timestamp;

export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  courseIds?: string[];
}

export interface Course {
  id:string;
  title: string;
  description: string;
  teacherId: string;
  teacherName?: string;
  studentIds: string[];
}

export interface Availability {
  id: string;
  teacherId: string;
  startTime: Timestamp;
  endTime: Timestamp;
  status?: 'available' | 'booked';
  studentId?: string; // Who booked it
}

export interface Booking {
  id: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  courseId: string;
  courseTitle: string;
  startTime: Timestamp;
  endTime: Timestamp;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  cancellationDeadline?: Timestamp;
  reminderSent?: boolean;
  feedback?: {
    rating: number;
    comment: string;
  };
}

// For teacher portal to handle requests
export interface BookingRequest extends Booking {
    // This can be represented by Booking with status 'pending'
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: Timestamp;
  link?: {
    type: 'chat' | 'booking';
    payload?: Record<string, any>;
  };
}

// For Chat feature
export interface Message {
    id: string;
    senderId: string;
    createdAt: Timestamp;
    type: 'text' | 'image';
    text?: string;
    imageUrl?: string;
    readBy: string[]; // Array of user IDs who have read the message
}

export interface Chat {
    id: string;
    participants: string[]; // array of user IDs
}