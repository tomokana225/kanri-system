import React, { useState } from 'react';
import Modal from './Modal';
import { uploadFileToSupabase } from '../services/supabase';
import Spinner from './Spinner';

interface AppIconSettingsModalProps {
  onClose: () => void;
  currentIcon: string | null;
  onSave: (iconUrl: string) => void;
}

const PRESET_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#1F2937', '#ffffff'];
const PRESET_EMOJIS = ['🎓', '📅', '🏫', '✏️', '📚', '🙋', '🍎', '⭐'];

const AppIconSettingsModal: React.FC<AppIconSettingsModalProps> = ({ onClose, currentIcon, onSave }) => {
  const [mode, setMode] = useState<'preset' | 'custom'>('preset');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [selectedEmoji, setSelectedEmoji] = useState(PRESET_EMOJIS[0]);
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentIcon);
  const [loading, setLoading] = useState(false);
  
  // Generate icon from preset
  const generateIconBlob = async (): Promise<Blob | null> => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Background
    ctx.fillStyle = selectedColor;
    ctx.fillRect(0, 0, 512, 512);

    // Emoji
    ctx.font = '300px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = selectedColor === '#ffffff' ? '#000000' : '#ffffff';
    ctx.fillText(selectedEmoji, 256, 270);

    return new Promise(resolve => {
        canvas.toBlob(blob => resolve(blob), 'image/png');
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
        let iconUrl = '';

        if (mode === 'preset') {
            const blob = await generateIconBlob();
            if (!blob) throw new Error('アイコン生成に失敗しました');
            const file = new File([blob], 'app-icon-preset.png', { type: 'image/png' });
            iconUrl = await uploadFileToSupabase(file);
        } else {
            if (customFile) {
                iconUrl = await uploadFileToSupabase(customFile);
            } else if (previewUrl) {
                iconUrl = previewUrl; // Use existing if not changed
            }
        }

        if (iconUrl) {
            onSave(iconUrl);
            onClose();
            alert('アイコン設定を保存しました。\n反映させるには、ブラウザのメニューから「ホーム画面に追加」を再度行ってください。\n（※既存のホーム画面アイコンは自動更新されません）');
        }
    } catch (e) {
        console.error(e);
        alert('保存に失敗しました。');
    } finally {
        setLoading(false);
    }
  };

  const handleCustomFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setCustomFile(file);
          setPreviewUrl(URL.createObjectURL(file));
      }
  };

  return (
    <Modal title="アプリアイコン設定" onClose={onClose}>
      <div className="space-y-6">
        
        <div className="flex justify-center space-x-4 border-b pb-2">
            <button 
                onClick={() => setMode('preset')}
                className={`pb-2 px-4 ${mode === 'preset' ? 'border-b-2 border-blue-500 font-bold text-blue-600' : 'text-gray-500'}`}
            >
                プリセット
            </button>
            <button 
                onClick={() => setMode('custom')}
                className={`pb-2 px-4 ${mode === 'custom' ? 'border-b-2 border-blue-500 font-bold text-blue-600' : 'text-gray-500'}`}
            >
                カスタム画像
            </button>
        </div>

        {/* Preview Area */}
        <div className="flex flex-col items-center justify-center space-y-2">
            <p className="text-sm text-gray-500">プレビュー</p>
            {mode === 'preset' ? (
                <div 
                    className="w-24 h-24 rounded-2xl shadow-lg flex items-center justify-center text-5xl transition-colors duration-300"
                    style={{ backgroundColor: selectedColor }}
                >
                    {selectedEmoji}
                </div>
            ) : (
                <div className="w-24 h-24 rounded-2xl shadow-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                    {previewUrl ? (
                        <img src={previewUrl} alt="Icon Preview" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-gray-400 text-xs">No Image</span>
                    )}
                </div>
            )}
        </div>

        {mode === 'preset' && (
            <div className="space-y-4">
                <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-2">背景色</label>
                    <div className="flex flex-wrap gap-3 justify-center">
                        {PRESET_COLORS.map(color => (
                            <button
                                key={color}
                                onClick={() => setSelectedColor(color)}
                                className={`w-8 h-8 rounded-full shadow-sm border-2 ${selectedColor === color ? 'border-blue-600 scale-110' : 'border-transparent'}`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                </div>
                <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-2">アイコン</label>
                    <div className="flex flex-wrap gap-3 justify-center bg-gray-50 p-3 rounded-lg">
                        {PRESET_EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => setSelectedEmoji(emoji)}
                                className={`w-10 h-10 flex items-center justify-center text-2xl rounded-lg ${selectedEmoji === emoji ? 'bg-white shadow ring-2 ring-blue-500' : 'hover:bg-white hover:shadow-sm'}`}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {mode === 'custom' && (
            <div className="text-center space-y-3">
                <input 
                    type="file" 
                    accept="image/*" 
                    id="icon-upload" 
                    className="hidden" 
                    onChange={handleCustomFileChange}
                />
                <label 
                    htmlFor="icon-upload"
                    className="inline-block px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                    画像をアップロード
                </label>
                <p className="text-xs text-gray-500">推奨サイズ: 512x512px (PNG/JPG)</p>
            </div>
        )}

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={loading || (mode === 'custom' && !customFile && !previewUrl)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {loading && <Spinner className="w-4 h-4 mr-2 text-white" />}
            保存して適用
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AppIconSettingsModal;