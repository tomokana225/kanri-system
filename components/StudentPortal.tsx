import React, { useState } from 'react';
import { User } from '../types';
import { generateStudentProgressSummary } from '../services/geminiService';
import Spinner from './Spinner';
import Alert from './Alert';

interface StudentPortalProps {
  user: User;
}

const StudentPortal: React.FC<StudentPortalProps> = ({ user }) => {
  const [summary, setSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  // Mock course data
  const enrolledCourses = [
    { id: 'c1', title: 'Introduction to AI' },
    { id: 'c2', title: 'Advanced React' },
    { id: 'c3', title: 'Data Structures and Algorithms' },
  ];

  const handleGenerateSummary = async (courseTitle: string) => {
    setLoadingSummary(true);
    setSelectedCourse(courseTitle);
    setSummary('');
    setError('');
    try {
      const result = await generateStudentProgressSummary(user, courseTitle);
      setSummary(result);
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred.");
    } finally {
      setLoadingSummary(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Student Dashboard</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">My Courses</h2>
          <ul className="space-y-3">
            {enrolledCourses.map(course => (
              <li key={course.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-50 rounded-md">
                <span className="text-gray-700 mb-2 sm:mb-0">{course.title}</span>
                <button 
                  onClick={() => handleGenerateSummary(course.title)}
                  disabled={loadingSummary}
                  className="px-3 py-1 text-sm text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:bg-blue-300 w-full sm:w-auto"
                >
                  {loadingSummary && selectedCourse === course.title ? 'Generating...' : 'Get AI Summary'}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">AI-Powered Progress Summary</h2>
          {error && <Alert message={error} type="error" />}
          {loadingSummary && <div className="flex justify-center items-center h-24"><Spinner /></div>}
          {summary && !loadingSummary && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="font-semibold text-blue-800 mb-2">Summary for {selectedCourse}</h3>
              <p className="text-gray-800 whitespace-pre-wrap">{summary}</p>
            </div>
          )}
          {!summary && !loadingSummary && (
            <p className="text-gray-500 text-center pt-8">Click "Get AI Summary" on a course to see your progress overview.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentPortal;
