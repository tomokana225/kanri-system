import React, { useState, useEffect, useRef } from 'react';
import { User, Message } from '../types';
import { getChatId, sendChatMessage, getChatMessages } from '../services/firebase';
import Modal from './Modal';
import Spinner from './Spinner';

interface ChatModalProps {
  currentUser: User;
  otherUser: Partial<User>;
  onClose: () => void;
}

const ChatModal: React.FC<ChatModalProps> = ({ currentUser, otherUser, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatId = getChatId(currentUser.id, otherUser.id!);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setupChatListener = async () => {
      setLoading(true);
      setError(''); // Reset error on new setup
      try {
        unsubscribe = await getChatMessages(
          chatId,
          (newMessages) => {
            setMessages(newMessages);
            // Only set loading false on first data load
            if (loading) {
                setLoading(false);
            }
          },
          (error: any) => { // Error handler callback
            console.error("Chat Error:", error);
            if (error.code === 'permission-denied') {
              setError('チャットへのアクセス権限がありません。セキュリティ設定を確認してください。');
            } else if (error.code === 'failed-precondition') {
              setError('チャットの読み込みに失敗しました。必要なデータベースインデックスがありません。');
            } else {
              setError(`チャットの読み込み中にエラーが発生しました。(コード: ${error.code})`);
            }
            setLoading(false);
          }
        );
      } catch (e: any) {
        // This outer catch is for initial setup errors before the listener is attached
        setError('チャットのセットアップに失敗しました。');
        console.error("Chat Setup Error:", e);
        setLoading(false);
      }
    };

    setupChatListener();

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [chatId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    const messageData: Omit<Message, 'id' | 'createdAt'> = {
      text: newMessage,
      senderId: currentUser.id,
    };

    try {
      setNewMessage('');
      await sendChatMessage(chatId, messageData);
    } catch (e: any) {
      console.error('メッセージの送信に失敗:', e);
      // Optionally, show an error to the user
    }
  };

  return (
    <Modal title={`${otherUser.name}とのチャット`} onClose={onClose}>
      <div className="flex flex-col h-96">
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 rounded-md mb-4 space-y-4">
          {loading && <div className="flex justify-center items-center h-full"><Spinner /></div>}
          {error && <p className="text-red-500 text-center">{error}</p>}
          {!loading && !error && messages.length === 0 && (
            <div className="flex justify-center items-center h-full">
                <p className="text-gray-500">まだメッセージはありません。</p>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow ${msg.senderId === currentUser.id ? 'bg-blue-500 text-white' : 'bg-white text-gray-800'}`}>
                <p>{msg.text}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="メッセージを入力..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            aria-label="New message"
            disabled={loading || !!error}
          />
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={loading || !!error}
          >
            送信
          </button>
        </form>
      </div>
    </Modal>
  );
};

export default ChatModal;