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
  studentIds: string[];
}

export interface Booking {
  id: string;
  studentId: string;
  teacherId: string;
  startTime: Date;
  endTime: Date;
  status: 'pending' | 'confirmed' | 'cancelled';
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: Date;
}
