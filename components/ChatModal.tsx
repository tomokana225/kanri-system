import React, { useState, useEffect, useRef } from 'react';
import { User, Message } from '../types';
import { getChatId, sendChatMessage, getChatMessages, markMessagesAsRead, deleteChatMessage } from '../services/firebase';
import { uploadFileToSupabase } from '../services/supabase';
import Modal from './Modal';
import Spinner from './Spinner';
import { PaperclipIcon, CheckIcon, DeleteIcon } from './icons';
import firebase from 'firebase/compat/app';

interface ChatModalProps {
  currentUser: User;
  otherUser: Partial<User>;
  onClose: () => void;
}

interface UploadStatus {
    isUploading: boolean;
    message: string;
    progress: number;
}

const ChatModal: React.FC<ChatModalProps> = ({ currentUser, otherUser, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ isUploading: false, message: '', progress: 0 });
  
  // Long press state
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chatId = getChatId(currentUser.id, otherUser.id!);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const isDevMode = currentUser.id.startsWith('dev-');
    if (isDevMode) return;

    const messagesToMark = messages.filter(
      m => m.senderId === otherUser.id && !(m.readBy?.includes(currentUser.id))
    );
    if (messagesToMark.length > 0) {
      markMessagesAsRead(chatId, messagesToMark.map(m => m.id), currentUser.id);
    }
  }, [messages, chatId, currentUser.id, otherUser.id]);


  useEffect(() => {
    const isDevMode = currentUser.id.startsWith('dev-');
    if (isDevMode) {
        const mockTimestamp = (minutesAgo: number) => firebase.firestore.Timestamp.fromDate(new Date(Date.now() - minutesAgo * 60 * 1000));
        setMessages([
            { id: 'm1', senderId: otherUser.id!, createdAt: mockTimestamp(5), type: 'text', text: 'こんにちは！来週の授業の件で質問があります。', readBy: [currentUser.id, otherUser.id!] },
            { id: 'm2', senderId: currentUser.id, createdAt: mockTimestamp(4), type: 'text', text: 'はい、こんにちは！どうぞ、何でも聞いてください。', readBy: [currentUser.id, otherUser.id!] },
            { id: 'm3', senderId: otherUser.id!, createdAt: mockTimestamp(3), type: 'text', text: 'ありがとうございます。何か準備しておくものはありますか？', readBy: [currentUser.id] },
        ]);
        setLoading(false);
        return;
    }

    let unsubscribe: (() => void) | null = null;
    setLoading(true);
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
  }, [chatId, currentUser.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;
    
    const content = newMessage.trim();
    setNewMessage(''); // Clear input
    
    try {
        await sendChatMessage(chatId, { type: 'text', text: content }, currentUser, otherUser);
    } catch (err) {
        console.error(err);
        setError('メッセージの送信に失敗しました。');
        setNewMessage(content); // Restore input on error
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Increase limit to 30MB to handle high-res mobile photos (which will be compressed)
    if (file.size > 30 * 1024 * 1024) {
        alert('ファイルサイズが大きすぎます（最大30MB）。');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
    }

    setUploadStatus({ isUploading: true, message: '準備中...', progress: 0 });

    try {
        const publicUrl = await uploadFileToSupabase(file, (status, progress) => {
            setUploadStatus({ isUploading: true, message: status, progress });
        });
        
        // Determine type based on the original file type, but check result
        const isImage = file.type.startsWith('image/');
        const messageData: Partial<Message> = isImage 
            ? { type: 'image', imageUrl: publicUrl }
            : { type: 'file', fileUrl: publicUrl };

        await sendChatMessage(chatId, messageData, currentUser, otherUser);
    } catch (err: any) {
        console.error('File upload error:', err);
        setError(`ファイルの送信に失敗しました: ${err.message}`);
    } finally {
        setUploadStatus({ isUploading: false, message: '', progress: 0 });
        if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
    }
  };

  const handleDeleteMessage = async (message: Message) => {
      if (!window.confirm('このメッセージを削除しますか？（相手の画面からも削除されます）')) {
          return;
      }

      try {
          await deleteChatMessage(chatId, message);
      } catch (err: any) {
          console.error('Failed to delete message:', err);
          alert('メッセージの削除に失敗しました。');
      }
  };

  // Touch handling for long press (mobile deletion)
  const handleTouchStart = (msg: Message) => {
    const timer = setTimeout(() => {
        // Simple haptic feedback if supported
        if (navigator.vibrate) navigator.vibrate(50);
        handleDeleteMessage(msg);
    }, 600); // 600ms long press
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
    }
  };

  const handleTouchMove = () => {
    // If user scrolls, cancel the long press
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
    }
  };

  return (
    <Modal title={`${otherUser.name}とのチャット`} onClose={onClose}>
      <div className="flex flex-col h-[60vh] relative">
        {uploadStatus.isUploading && (
            <div className="absolute inset-0 bg-white bg-opacity-90 z-10 flex flex-col items-center justify-center p-4 rounded-lg">
                <Spinner />
                <p className="mt-4 font-semibold text-gray-700 animate-pulse">{uploadStatus.message}</p>
                <div className="w-full max-w-xs bg-gray-200 rounded-full h-2.5 mt-3">
                    <div 
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                        style={{ width: `${uploadStatus.progress}%` }}
                    ></div>
                </div>
            </div>
        )}

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
                <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'} group`}>
                    {isMe && (
                        <>
                            <button
                                onClick={() => handleDeleteMessage(msg)}
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1 hidden sm:block"
                                title="削除"
                            >
                                <DeleteIcon className="w-4 h-4" />
                            </button>
                            <div className="text-xs text-gray-500 mb-1 flex flex-col items-end">
                                <span>{msg.createdAt.toDate().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                                {isRead && <CheckIcon className="w-3 h-3 text-blue-500 mt-0.5" />}
                            </div>
                        </>
                    )}
                    <div 
                        className={`max-w-xs lg:max-w-md p-1 rounded-lg shadow ${isMe ? 'bg-blue-500 text-white cursor-pointer select-none' : 'bg-white text-gray-800'}`}
                        onTouchStart={() => isMe && handleTouchStart(msg)}
                        onTouchEnd={handleTouchEnd}
                        onTouchMove={handleTouchMove}
                        onContextMenu={(e) => { if(isMe) e.preventDefault(); }} // Optional: prevent default context menu on own messages for better UX
                    >
                        {msg.type === 'image' && msg.imageUrl ? (
                            <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer" className="block" onClick={(e) => { if(isMe) e.preventDefault(); }}>
                                <img src={msg.imageUrl} alt="添付画像" className="rounded-md max-w-full h-auto bg-gray-100" style={{ maxHeight: '200px' }} />
                            </a>
                        ) : msg.type === 'file' && msg.fileUrl ? (
                             <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-2 underline ${isMe ? 'text-white' : 'text-blue-600'}`}>
                                <PaperclipIcon className="w-4 h-4" />
                                <span className="truncate max-w-[200px]">{msg.fileUrl.split('/').pop()}</span>
                             </a>
                        ) : (
                            <p className="px-3 py-1 break-words whitespace-pre-wrap">{msg.text}</p>
                        )}
                    </div>
                     {!isMe && (
                        <span className="text-xs text-gray-500 mb-1">{msg.createdAt.toDate().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                </div>
            )})}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSendMessage} className="flex gap-2 items-center p-1">
          <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileSelect} 
          />
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()} 
            className="p-2 rounded-full text-gray-500 hover:text-blue-600 hover:bg-gray-100 transition-colors"
            title="ファイルまたは画像を送信"
            disabled={loading || uploadStatus.isUploading}
          >
            <PaperclipIcon />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="メッセージを入力..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            aria-label="New message"
            disabled={loading || !!error || uploadStatus.isUploading}
          />
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={loading || !!error || newMessage.trim() === '' || uploadStatus.isUploading}
          >
            送信
          </button>
        </form>
      </div>
    </Modal>
  );
};

export default ChatModal;