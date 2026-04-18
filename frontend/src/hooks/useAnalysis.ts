/* ── Analysis state management hook ── */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Analysis, ProgressEvent } from '../types';
import { createAnalysis, getAnalysis, subscribeToProgress } from '../services/api';

interface UseAnalysisReturn {
  analysis: Analysis | null;
  progress: ProgressEvent | null;
  isUploading: boolean;
  isProcessing: boolean;
  error: string | null;
  startAnalysis: (fileA: File, fileB: File) => Promise<void>;
  reset: () => void;
}

export function useAnalysis(): UseAnalysisReturn {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  const startAnalysis = useCallback(async (fileA: File, fileB: File) => {
    setError(null);
    setProgress(null);
    setAnalysis(null);

    try {
      // 1. Upload
      setIsUploading(true);
      setProgress({
        analysis_id: '',
        step: 'uploading',
        progress: 0,
        message: 'Dosyalar yükleniyor...',
      });

      const { analysis_id } = await createAnalysis(fileA, fileB);
      setIsUploading(false);
      setIsProcessing(true);

      // 2. Subscribe to progress
      const unsub = subscribeToProgress(
        analysis_id,
        (data: ProgressEvent) => {
          setProgress(data);
        },
        async () => {
          // Done — fetch final result
          try {
            const result = await getAnalysis(analysis_id);
            setAnalysis(result);
          } catch (e: any) {
            setError(e?.response?.data?.detail || 'Sonuç alınamadı');
          }
          setIsProcessing(false);
        },
        (errMsg: any) => {
          setError(typeof errMsg === 'string' ? errMsg : 'Analiz başarısız');
          setIsProcessing(false);
        },
      );
      unsubRef.current = unsub;
    } catch (e: any) {
      setIsUploading(false);
      setIsProcessing(false);
      setError(e?.response?.data?.detail || 'Analiz başlatılamadı');
    }
  }, []);

  const reset = useCallback(() => {
    if (unsubRef.current) unsubRef.current();
    setAnalysis(null);
    setProgress(null);
    setIsUploading(false);
    setIsProcessing(false);
    setError(null);
  }, []);

  return { analysis, progress, isUploading, isProcessing, error, startAnalysis, reset };
}
