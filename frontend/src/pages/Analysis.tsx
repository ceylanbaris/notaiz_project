/* ── Analysis Page — Live Progress ── */

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, AudioWaveform } from 'lucide-react';
import { getAnalysis, subscribeToProgress } from '../services/api';
import { STEP_LABELS } from '../types';
import type { ProgressEvent, Analysis } from '../types';

const steps = [
  'uploading',
  'preprocessing',
  'feature_extraction',
  'comparison',
  'done',
] as const;

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!id) return;

    // First check if already completed
    getAnalysis(id)
      .then((analysis) => {
        if (analysis.status === 'completed') {
          navigate(`/results/${id}`, { replace: true });
          return;
        }
        if (analysis.status === 'failed') {
          setError(analysis.error_message || 'Analiz başarısız oldu');
          return;
        }

        // Subscribe to progress
        const unsub = subscribeToProgress(
          id,
          (data) => setProgress(data),
          () => {
            // Done — navigate to results
            setTimeout(() => navigate(`/results/${id}`, { replace: true }), 800);
          },
          (errMsg) => {
            setError(typeof errMsg === 'string' ? errMsg : 'Analiz sırasında hata oluştu');
          },
        );
        unsubRef.current = unsub;
      })
      .catch(() => {
        setError('Analiz bilgisi alınamadı');
      });

    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, [id, navigate]);

  const currentStep = progress?.step || 'uploading';
  const currentStepIndex = steps.indexOf(currentStep as any);
  const progressPercent = progress?.progress ?? 0;

  return (
    <motion.div
      initial="initial"
      animate="animate"
      className="section-container flex items-center justify-center min-h-[70vh]"
    >
      <motion.div variants={fadeUp} className="glass-card p-10 w-full max-w-lg text-center">
        {/* Header */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
          <AudioWaveform size={28} className="text-indigo-400" />
        </div>

        <h1 className="text-xl font-display font-bold text-white mb-2">
          Analiz İşleniyor
        </h1>
        <p className="text-sm text-slate-400 mb-8">
          {progress?.message || 'Dosyalar işleniyor, lütfen bekleyin...'}
        </p>

        {/* Error state */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <div className="flex items-center justify-center gap-2 text-red-400 mb-2">
              <XCircle size={20} />
              <span className="font-semibold text-sm">Hata</span>
            </div>
            <p className="text-xs text-red-300">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="btn-secondary !text-xs mt-4"
            >
              Ana Sayfaya Dön
            </button>
          </div>
        )}

        {/* Progress Bar */}
        {!error && (
          <>
            <div className="progress-track mb-6">
              <div
                className="progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Steps */}
            <div className="space-y-3">
              {steps.filter(s => s !== 'done').map((step, i) => {
                const isCompleted = currentStepIndex > i;
                const isCurrent = currentStepIndex === i;

                return (
                  <div
                    key={step}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                      isCurrent
                        ? 'bg-indigo-500/10 border border-indigo-500/20'
                        : isCompleted
                        ? 'bg-green-500/5 border border-green-500/10'
                        : 'bg-white/[0.02] border border-transparent'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={18} className="text-green-400 flex-shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 size={18} className="text-indigo-400 animate-spin flex-shrink-0" />
                    ) : (
                      <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-600 flex-shrink-0" />
                    )}
                    <span
                      className={`text-sm ${
                        isCurrent
                          ? 'text-indigo-300 font-medium'
                          : isCompleted
                          ? 'text-green-300'
                          : 'text-slate-500'
                      }`}
                    >
                      {STEP_LABELS[step] || step}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
