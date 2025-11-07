import { Timestamp } from 'firebase/firestore';

export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  teacherId: string;
  teacherName?: string;
  studentIds: string[];
}

export interface Booking {
  id:string;
  studentId: string;
  studentName: string;
  teacherId: string;
  courseId: string;
  courseTitle: string;
  startTime: Timestamp;
  endTime: Timestamp;
  status: string; // e.g., 'confirmed', 'cancelled'
}

export interface Availability {
  id: string;
  teacherId: string;
  startTime: Timestamp;
  endTime: Timestamp;
  status?: 'available' | 'booked';
  studentId?: string;
}

export interface Notification {
    id: string;
    userId: string;
    message: string;
    read: boolean;
    createdAt: Timestamp;
}
