import { Timestamp } from 'firebase/firestore';

export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string; // Firebase Auth UIDに対応
  name: string;
  email: string;
  role: UserRole;
}

export interface Course {
  id:string;
  title: string;
  description: string;
  teacherId: string;
  teacherName?: string; // 表示を容易にするための非正規化データ
  studentIds: string[];
}

export interface Booking {
  id: string;
  studentId: string;
  studentName?: string;
  teacherId: string;
  courseId: string;
  startTime: Timestamp;
  endTime: Timestamp;
  status: 'pending' | 'confirmed' | 'cancelled';
  courseTitle?: string; // コンテキスト用
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: Timestamp;
}

export interface Availability {
  id: string;
  teacherId: string;
  startTime: Timestamp;
  endTime: Timestamp;
}