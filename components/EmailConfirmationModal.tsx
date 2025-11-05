import React from 'react';

interface EmailConfirmationModalProps {
  to: string;
  subject: string;
  bodyHtml: string;
  onClose: () => void;
}

const EmailConfirmationModal: React.FC<EmailConfirmationModalProps> = ({ to, subject, bodyHtml, onClose }) => {
  // Convert HTML body to a plain text format suitable for mailto link
  const bodyText = bodyHtml
    .replace(/<p>/g, '')
    .replace(/<\/p>/g, '\n')
    .replace(/<strong>/g, '')
    .replace(/<\/strong>/g, '')
    .replace(/<br\s*\/?>/g, '\n')
    .trim();

  const mailtoHref = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-2xl p-6 mx-4 bg-white rounded-xl shadow-xl transform transition-all">
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-semibold leading-6 text-gray-900" id="modal-title">メール送信の準備ができました</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="sr-only">閉じる</span>
            <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="mt-4">
          <p className="text-sm text-gray-600">以下の内容のメールを送信します。お使いのメールソフトが起動しますので、内容を確認して送信してください。</p>
          <div className="mt-4 p-4 border rounded-md bg-gray-50 space-y-2">
            <p><strong className="font-medium text-gray-800">宛先:</strong> {to}</p>
            <p><strong className="font-medium text-gray-800">件名:</strong> {subject}</p>
            <div>
              <strong className="font-medium text-gray-800">本文プレビュー:</strong>
              <div
                className="mt-1 p-3 border rounded-md bg-white max-h-48 overflow-y-auto prose prose-sm"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-8">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
          >
            閉じる
          </button>
          <a
            href={mailtoHref}
            onClick={onClose} // Close modal after clicking
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm bg-brand-primary hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-dark"
          >
            メールソフトを開く
          </a>
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmationModal;
