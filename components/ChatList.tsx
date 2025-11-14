import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { getUniqueChatPartnersForStudent } from '../services/firebase';
import Spinner from './Spinner';
import { ChatIcon } from './icons';

interface ChatListProps {
  currentUser: User;
  onSelectChat: (partner: User) => void;
}

const ChatList: React.FC<ChatListProps> = ({ currentUser, onSelectChat }) => {
  const [partners, setPartners] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPartners = async () => {
      setLoading(true);
      setError('');
      try {
        const fetchedPartners = await getUniqueChatPartnersForStudent(currentUser.id);
        setPartners(fetchedPartners);
      } catch (e: any) {
        console.error("Failed to fetch chat partners:", e);
        setError('チャット相手の読み込みに失敗しました。');
      } finally {
        setLoading(false);
      }
    };

    fetchPartners();
  }, [currentUser.id]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg h-full">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">教師とのチャット</h2>
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <Spinner />
        </div>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : partners.length > 0 ? (
        <ul className="space-y-3">
          {partners.map(partner => (
            <li key={partner.id}>
              <button
                onClick={() => onSelectChat(partner)}
                className="w-full flex items-center p-3 text-left bg-gray-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                  {partner.name.charAt(0)}
                </div>
                <span className="ml-3 font-semibold text-gray-700">{partner.name}</span>
                <ChatIcon className="ml-auto text-gray-400"/>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-center py-8">
          まだチャット可能な教師がいません。クラスを予約すると、担当教師とチャットできるようになります。
        </p>
      )}
    </div>
  );
};

export default ChatList;
