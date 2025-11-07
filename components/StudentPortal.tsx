import React, { useState, useEffect } from 'react';
import { User, Course, Booking } from '../types';
import { getCoursesForStudent, getBookingsForUser } from '../services/firebase';
import Spinner from './Spinner';
import Alert from './Alert';
import BookingModal from './BookingModal';
import FeedbackModal from './FeedbackModal';

interface StudentPortalProps {
  user: User;
}

const StudentPortal: React.FC<StudentPortalProps> = ({ user }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [studentCourses, studentBookings] = await Promise.all([
        getCoursesForStudent(user.id),
        getBookingsForUser(user.id, 'student')
      ]);
      setCourses(studentCourses);
      setBookings(studentBookings);
    } catch (e: any) {
      setError('データの読み込みに失敗しました。');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user.id]);

  const handleOpenBookingModal = (course: Course) => {
    setSelectedCourse(course);
    setIsBookingModalOpen(true);
  };
  
  const handleOpenFeedbackModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsFeedbackModalOpen(true);
  };

  if (loading) return <div className="flex justify-center mt-8"><Spinner /></div>;
  if (error) return <Alert message={error} type="error" />;

  const upcomingBookings = bookings.filter(b => b.startTime.toDate() > new Date() && b.status === 'confirmed');
  const pastBookings = bookings.filter(b => b.startTime.toDate() <= new Date());

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">今後の予約</h2>
        {upcomingBookings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingBookings.map(booking => (
              <div key={booking.id} className="p-4 bg-white rounded-lg shadow">
                <p className="font-semibold text-blue-600">{booking.courseTitle}</p>
                <p className="text-sm text-gray-600">教師: {courses.find(c => c.id === booking.courseId)?.teacherName || 'N/A'}</p>
                <p className="text-sm text-gray-600