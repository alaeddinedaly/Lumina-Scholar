import { useState, useEffect } from 'react';
import api from './api';

export function useDocumentStatus(documentId: string | null) {
  const [status, setStatus] = useState<string | null>(null);
  const [chunkCount, setChunkCount] = useState<number>(0);

  useEffect(() => {
    if (!documentId) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/documents/${documentId}/status`);
        setStatus(res.data.status);
        setChunkCount(res.data.chunkCount);

        if (res.data.status === 'INDEXED' || res.data.status === 'FAILED') {
          clearInterval(interval);
        }
      } catch (e) {
        console.error('Error fetching document status', e);
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [documentId]);

  return { status, chunkCount };
}
