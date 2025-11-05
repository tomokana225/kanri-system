
export enum UserRole {
  STUDENT = '生徒',
  TEACHER = '先生',
  ADMIN = '管理者',
}

export interface User {
  uid: string; // Changed from id to uid to match Firebase Auth
  name: string;
  email: string;
  role: UserRole;
  // This is a local-only field, not stored in Firestore
  id?: string; // a document ID
}

export enum BookingStatus {
  CONFIRMED = '確定済み',
  CANCELED = 'キャンセル済み',
  COMPLETED = '完了',
  ABSENT = '欠席',
}

export interface Booking {
  id: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  subject: string;
  status: BookingStatus;
  notes?: string;
}

export interface ScheduleSlot {
  id: string;
  teacherId: string;
  date: string;
  time: string;
  isAvailable: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  }; // Firestore Timestamp
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string;
  recipientName: string;
  recipientRole: UserRole;
  content: string;
  createdAt: {
    seconds: number;
    nanoseconds: number;
  }; // Firestore Timestamp
  isRead: boolean;
}
