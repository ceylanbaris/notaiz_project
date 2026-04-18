/* ── Drag & Drop Upload Zone ── */

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Music, X, CheckCircle } from 'lucide-react';

interface UploadZoneProps {
  label: string;
  file: File | null;
  onFileDrop: (file: File) => void;
  onRemove: () => void;
}

const ACCEPTED = {
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/x-wav': ['.wav'],
  'audio/flac': ['.flac'],
  'audio/ogg': ['.ogg'],
};

export default function UploadZone({ label, file, onFileDrop, onRemove }: UploadZoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) onFileDrop(accepted[0]);
    },
    [onFileDrop],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50 MB
    multiple: false,
  });

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-surface-300 mb-2">{label}</label>
      <AnimatePresence mode="wait">
        {file ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative flex items-center gap-4 rounded-2xl border border-primary-500/30 bg-primary-500/5 backdrop-blur-sm p-5"
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary-500/20 text-primary-400">
              <Music size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{file.name}</p>
              <p className="text-xs text-surface-400 mt-1">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <CheckCircle className="text-green-400" size={20} />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-1.5 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            {...getRootProps()}
            className={`
              cursor-pointer rounded-2xl border-2 border-dashed p-8
              flex flex-col items-center justify-center gap-3
              transition-all duration-300
              ${
                isDragActive
                  ? 'border-primary-400 bg-primary-500/10 scale-[1.02]'
                  : 'border-surface-600 hover:border-primary-500/50 hover:bg-surface-800/50'
              }
            `}
          >
            <input {...getInputProps()} />
            <div
              className={`p-3 rounded-xl transition-colors ${
                isDragActive ? 'bg-primary-500/20 text-primary-400' : 'bg-surface-700 text-surface-400'
              }`}
            >
              <Upload size={28} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-surface-200">
                {isDragActive ? 'Dosyayı bırakın' : 'Sürükle & bırak veya tıkla'}
              </p>
              <p className="text-xs text-surface-500 mt-1">MP3, WAV, FLAC, OGG — max 50MB</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
