'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './AttachmentPreviewModal.module.css';

interface AttachmentPreviewModalProps {
  fileUrl: string;
  fileName: string;
  mimeType: string;
  onClose: () => void;
}

export function AttachmentPreviewModal({
  fileUrl,
  fileName,
  mimeType,
  onClose,
}: AttachmentPreviewModalProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const isImage = mimeType.startsWith('image/');
  const isPDF = mimeType === 'application/pdf';
  const isDoc = mimeType.includes('word') || mimeType.includes('document');

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{fileName}</h3>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.content}>
          {loading && (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Загрузка...</p>
            </div>
          )}

          {isImage && (
            <Image
              src={fileUrl}
              alt={fileName}
              className={styles.image}
              width={800}
              height={600}
              style={{ objectFit: 'contain', width: '100%', height: 'auto' }}
              onLoad={() => setLoading(false)}
              onError={() => setLoading(false)}
            />
          )}

          {isPDF && (
            <iframe
              src={fileUrl}
              className={styles.iframe}
              onLoad={() => setLoading(false)}
              title={fileName}
            />
          )}

          {isDoc && (
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`}
              className={styles.iframe}
              onLoad={() => setLoading(false)}
              title={fileName}
            />
          )}

          {!isImage && !isPDF && !isDoc && (
            <div className={styles.unsupported}>
              <div className={styles.unsupportedIcon}>📎</div>
              <p>Предпросмотр недоступен для этого типа файла</p>
              <a
                href={fileUrl}
                download={fileName}
                className={styles.downloadButton}
                onClick={(e) => e.stopPropagation()}
              >
                Скачать файл
              </a>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <a
            href={fileUrl}
            download={fileName}
            className={styles.downloadLink}
            onClick={(e) => e.stopPropagation()}
          >
            Скачать
          </a>
        </div>
      </div>
    </div>
  );
}
