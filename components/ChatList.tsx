import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { getUniqueChatPartnersForStudent, getUniqueChatPartnersForTeacher } from '../services/firebase';
import Spinner from './Spinner';
import { ChevronRightIcon } from './icons';

interface ChatListProps {
  currentUser: User;
  onSelectChat: (partner: User) => void;
}

const ChatList: React.FC<ChatListProps> = ({ currentUser, onSelectChat }) => {
  const [partners, setPartners] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isStudent = currentUser.role === 'student';
  const title = isStudent ? '教師とのチャット' : '生徒とのチャット';
  const emptyMessage = isStudent
    ? 'まだチャット可能な教師がいません。クラスを予約すると、担当教師とチャットできるようになります。'
    : 'まだチャット可能な生徒がいません。予約が入ると、担当生徒とチャットできるようになります。';

  useEffect(() => {
    const fetchPartners = async () => {
      const isDevMode = currentUser.id.startsWith('dev-');
      if (isDevMode) {
          const mockPartners: User[] = isStudent
            ? [ { id: 'dev-teacher-1', name: '田中先生', email: 'teacher1@example.com', role: 'teacher' }, { id: 'dev-teacher-2', name: '鈴木先生', email: 'teacher2@example.com', role: 'teacher' } ]
            : [ { id: 'dev-student-1', name: '佐藤学生', email: 'student1@example.com', role: 'student' }, { id: 'dev-student-2', name: '伊藤学生', email: 'student2@example.com', role: 'student' } ];
          setPartners(mockPartners);
          setLoading(false);
          return;
      }

      setLoading(true);
      setError('');
      try {
        const fetchFunction = isStudent
          ? getUniqueChatPartnersForStudent
          : getUniqueChatPartnersForTeacher;
        
        const fetchedPartners = await fetchFunction(currentUser.id);
        setPartners(fetchedPartners);
      } catch (e: any) {
        console.error("Failed to fetch chat partners:", e);
        const code = e.code ? ` (コード: ${e.code})` : '';
        setError(`チャット相手の読み込みに失敗しました。${code}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPartners();
  }, [currentUser.id, currentUser.role, isStudent]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg h-full flex flex-col">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">{title}</h1>
      <div className="flex-1 overflow-y-auto -mr-6 pr-6">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Spinner />
          </div>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : partners.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {partners.map(partner => (
              <li key={partner.id}>
                <button
                  onClick={() => onSelectChat(partner)}
                  className="w-full flex items-center p-4 text-left hover:bg-gray-50 transition-colors duration-150 focus:outline-none focus:bg-gray-100"
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xl">
                    {partner.name.charAt(0)}
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="font-semibold text-gray-800 text-lg">{partner.name}</p>
                    <p className="text-sm text-gray-500 capitalize">{partner.role}</p>
                  </div>
                  <ChevronRightIcon className="w-6 h-6 text-gray-400" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-500 text-center py-8 max-w-sm">
              {emptyMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;
