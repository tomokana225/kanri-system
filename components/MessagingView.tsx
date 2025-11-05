
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Message, UserRole } from '../types';
import { api } from '../services/api';
import { geminiService } from '../services/geminiService';
import Spinner from './Spinner';
import { PaperAirplaneIcon, UserCircleIcon } from './icons';

interface MessagingViewProps {
  user: User;
  recipientRole: UserRole;
}

const MessagingView: React.FC<MessagingViewProps> = ({ user, recipientRole }) => {
  const [conversations, setConversations] = useState<{ user: User; lastMessage: Message }[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiIntent, setAiIntent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const fetchConversations = useCallback(async () => {
    setIsLoading(true);
    try {
        const convos = await api.getRecentConversations(user.uid);
        const filteredConvos = convos.filter(c => c.user.role === recipientRole);
        setConversations(filteredConvos);
        
        if (filteredConvos.length > 0 && !selectedConversation) {
            setSelectedConversation(filteredConvos[0].user);
        }
    } catch (error) {
        console.error("Failed to fetch conversations", error);
    } finally {
        setIsLoading(false);
    }
  }, [user.uid, recipientRole, selectedConversation]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!selectedConversation) return;

    const unsubscribe = api.getMessages(user.uid, selectedConversation.uid, (fetchedMessages) => {
        setMessages(fetchedMessages);
    });

    return () => unsubscribe();
  }, [selectedConversation, user.uid]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    setIsSending(true);
    try {
      await api.sendMessage({
        senderId: user.uid,
        senderName: user.name,
        senderRole: user.role,
        recipientId: selectedConversation.uid,
        recipientName: selectedConversation.name,
        recipientRole: selectedConversation.role,
        content: newMessage,
      });
      // Real-time listener will update the messages state
      setNewMessage('');
      fetchConversations(); // Update conversation list to show new last message
    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiIntent.trim() || !selectedConversation) return;
    setIsAiGenerating(true);
    try {
        const draft = await geminiService.generateMessageDraft(selectedConversation.name, user.name, aiIntent);
        setNewMessage(draft);
        setAiIntent('');
    } catch (error) {
        console.error("AI generation failed", error);
    } finally {
        setIsAiGenerating(false);
    }
  };

  return (
    <div className="flex h-[600px] bg-white rounded-xl shadow-md border border-gray-200">
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">会話リスト ({recipientRole})</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? <Spinner /> : conversations.map(({ user: contact, lastMessage }) => (
            <div
              key={contact.uid}
              onClick={() => setSelectedConversation(contact)}
              className={`p-4 cursor-pointer hover:bg-gray-100 ${selectedConversation?.uid === contact.uid ? 'bg-brand-light' : ''}`}
            >
              <p className="font-bold text-gray-800">{contact.name}</p>
              <p className="text-sm text-gray-500 truncate">{lastMessage.content}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="w-2/3 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="p-4 border-b border-gray-200 flex items-center gap-3">
               <UserCircleIcon className="w-8 h-8 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-800">{selectedConversation.name}</h3>
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-md p-3 rounded-lg ${msg.senderId === user.uid ? 'bg-brand-primary text-white' : 'bg-white border'}`}>
                    <p className="text-sm">{msg.content}</p>
                    <p className="text-xs mt-1 opacity-70 text-right">{msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex items-center gap-2 mb-2">
                    <input 
                        type="text" 
                        value={aiIntent}
                        onChange={(e) => setAiIntent(e.target.value)}
                        placeholder="AIに伝えたいことを入力 (例: 明日の予約をキャンセルしたい)"
                        className="flex-1 block w-full px-3 py-1.5 text-sm border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary"
                        disabled={isAiGenerating}
                    />
                    <button onClick={handleAiGenerate} disabled={isAiGenerating || !aiIntent} className="px-3 py-1.5 text-sm font-medium text-white bg-brand-secondary rounded-md hover:bg-brand-dark disabled:bg-gray-400">
                        {isAiGenerating ? <Spinner/> : '下書き生成'}
                    </button>
                </div>
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="メッセージを入力..."
                  className="flex-1 block w-full px-3 py-2 text-sm border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary resize-none"
                  rows={3}
                  disabled={isSending}
                />
                <button type="submit" disabled={isSending || !newMessage} className="p-3 text-white bg-brand-primary rounded-full hover:bg-brand-secondary disabled:bg-gray-400">
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            会話を選択してください
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagingView;
