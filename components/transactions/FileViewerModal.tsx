'use client';

import { createPortal } from 'react-dom';
import styles from './AttachmentsList.module.css';

interface FileViewerModalProps {
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  onClose: () => void;
}

export function FileViewerModal({ fileName, fileUrl, mimeType, onClose }: FileViewerModalProps) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{fileName}</h3>
          <button 
            className={styles.modalClose}
            onClick={onClose}
            title="Закрыть"
          >
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className={styles.modalBody}>
          {mimeType?.startsWith('image/') ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={fileUrl} 
              alt={fileName}
              className={styles.modalImage}
            />
          ) : (
            <iframe
              src={fileUrl}
              className={styles.modalIframe}
              title="Просмотр файла"
            />
          )}
        </div>
        <div className={styles.modalFooter}>
          <a
            href={fileUrl}
            download
            className={styles.modalDownloadBtn}
          >
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Скачать файл
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}
