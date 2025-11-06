import React, { useState } from 'react';
import Modal from './Modal';
import Alert from './Alert';
import Spinner from './Spinner';

interface AiCourseGenerateModalProps {
  onClose: () => void;
  onGenerate: (topic: string) => Promise<void>;
}

const AiCourseGenerateModal: React.FC<AiCourseGenerateModalProps> = ({ onClose, onGenerate }) => {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
        setError('トピックを入力してください。');
        return;
    }
    setError('');
    setLoading(true);
    try {
        await onGenerate(topic);
    } catch (err: any) {
        setError(err.message || 'コースの生成に失敗しました。');
    } finally {
        setLoading(false);
    }
  };

  return (
    <Modal title="AIによるコース生成" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert message={error} type="error" />}
        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-gray-700">
            コースのトピックやキーワード
          </label>
          <textarea
            id="topic"
            rows={3}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
            placeholder="例: 「初心者向けのJavaScriptプログラミング」「ビジネス英会話入門」"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
           <p className="text-xs text-gray-500 mt-1">入力された内容をもとに、AIがコース名と説明文を自動で作成します。</p>
        </div>
        <div className="flex justify-end space-x-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center min-w-[100px]"
          >
            {loading ? (
                <>
                    <Spinner className="animate-spin h-5 w-5 text-white mr-2" />
                    <span>生成中...</span>
                </>
            ) : (
                '生成する'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AiCourseGenerateModal;
