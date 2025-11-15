import React, { useState, useEffect, useRef } from 'react';
import { User, Message } from '../types';
import { getChatId, sendChatMessage, getChatMessages, uploadImageToStorage, markMessagesAsRead } from '../services/firebase';
import Modal from './Modal';
import Spinner from './Spinner';
import { PaperclipIcon, CheckIcon } from './icons';

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
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chatId = getChatId(currentUser.id, otherUser.id!);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const messagesToMark = messages.filter(
      m => m.senderId === otherUser.id && !(m.readBy?.includes(currentUser.id))
    );
    if (messagesToMark.length > 0) {
      markMessagesAsRead(chatId, messagesToMark.map(m => m.id), currentUser.id);
    }
  }, [messages, chatId, currentUser.id, otherUser.id]);


  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    const initialLoading = messages.length === 0;
    if(initialLoading) setLoading(true);
    
    setError('');
    
    getChatMessages(
      chatId,
      (newMessages) => {
        setMessages(newMessages);
        setLoading(false);
      },
      (err) => {
        console.error("Chat Error:", err);
        setError(`チャットの読み込みに失敗しました (コード: ${err.code})`);
        setLoading(false);
      }
    ).then(unsub => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [chatId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;
    const text = newMessage;
    setNewMessage('');
    
    const messageData: Partial<Message> = {
      type: 'text',
      text: text,
    };
    await sendChatMessage(chatId, messageData, currentUser, otherUser);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
        const imageUrl = await uploadImageToStorage(file, chatId);
        const messageData: Partial<Message> = {
            type: 'image',
            imageUrl: imageUrl,
        };
        await sendChatMessage(chatId, messageData, currentUser, otherUser);
    } catch (err) {
        setError('画像のアップロードに失敗しました。');
        console.error(err);
    } finally {
        setIsUploading(false);
        // Reset file input
        if(fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Modal title={`${otherUser.name}とのチャット`} onClose={onClose}>
      <div className="flex flex-col h-[60vh]">
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 rounded-md mb-4 space-y-2">
          {loading && <div className="flex justify-center items-center h-full"><Spinner /></div>}
          {error && <p className="text-red-500 text-center">{error}</p>}
          {!loading && !error && messages.length === 0 && (
            <div className="flex justify-center items-center h-full">
                <p className="text-gray-500">まだメッセージはありません。</p>
            </div>
          )}
          {messages.map(msg => {
            const isMe = msg.senderId === currentUser.id;
            const isRead = msg.readBy?.includes(otherUser.id!);

            return (
                <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {isMe && (
                        <div className="text-xs text-gray-500 mb-1">
                            {isRead && <CheckIcon className="w-4 h-4 text-blue-500" />}
                            <span>{msg.createdAt.toDate().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    )}
                    <div className={`max-w-xs lg:max-w-md p-1 rounded-lg shadow ${isMe ? 'bg-blue-500 text-white' : 'bg-white text-gray-800'}`}>
                        {msg.type === 'image' ? (
                            <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
                                <img src={msg.imageUrl} alt="添付画像" className="rounded-md max-w-full h-auto" style={{ maxHeight: '200px' }} />
                            </a>
                        ) : (
                            <p className="px-3 py-1 break-words">{msg.text}</p>
                        )}
                    </div>
                     {!isMe && (
                        <span className="text-xs text-gray-500 mb-1">{msg.createdAt.toDate().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                </div>
            )})}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-blue-600" disabled={isUploading}>
            <PaperclipIcon />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="メッセージを入力..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            aria-label="New message"
            disabled={loading || !!error || isUploading}
          />
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={loading || !!error || isUploading || newMessage.trim() === ''}
          >
            {isUploading ? <Spinner className="w-5 h-5"/> : '送信'}
          </button>
        </form>
      </div>
    </Modal>
  );
};

export default ChatModal;