/* ── History Page — Past Analyses ── */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { History as HistoryIcon, Search, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { getHistory, getStoredToken } from '../services/api';
import type { Analysis } from '../types';
import ReportCard from '../components/ReportCard';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const PAGE_SIZE = 10;

export default function HistoryPage() {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const isLoggedIn = !!getStoredToken();

  const fetchHistory = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const data = await getHistory(p * PAGE_SIZE, PAGE_SIZE);
      setAnalyses(data.items);
      setTotal(data.total);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchHistory(page);
    } else {
      setLoading(false);
    }
  }, [page, isLoggedIn, fetchHistory]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filteredAnalyses = searchTerm
    ? analyses.filter(
        (a) =>
          a.file_a_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          a.file_b_name?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : analyses;

  if (!isLoggedIn) {
    return (
      <motion.div
        initial="initial"
        animate="animate"
        className="section-container flex items-center justify-center min-h-[70vh]"
      >
        <motion.div variants={fadeUp} className="glass-card p-10 text-center max-w-md">
          <HistoryIcon size={40} className="mx-auto text-slate-500 mb-4" />
          <h2 className="text-lg font-display font-semibold text-white mb-2">
            Giriş Yapın
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            Analiz geçmişinizi görüntülemek için hesabınıza giriş yapmanız gerekiyor.
          </p>
          <button onClick={() => navigate('/auth')} className="btn-primary !text-sm">
            Giriş Yap
          </button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={stagger}
      className="section-container"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="mb-8">
        <h1 className="text-2xl font-display font-bold text-white mb-2">
          Analiz Geçmişi
        </h1>
        <p className="text-sm text-slate-400">
          Toplam {total} analiz kaydınız bulunmaktadır
        </p>
      </motion.div>

      {/* Search */}
      <motion.div variants={fadeUp} className="mb-6">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            id="search-history"
            type="text"
            placeholder="Dosya adına göre ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
          />
        </div>
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-5 h-20 shimmer" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredAnalyses.length === 0 && (
        <motion.div variants={fadeUp} className="glass-card p-16 text-center">
          <Inbox size={48} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-base font-semibold text-slate-300 mb-2">
            {searchTerm ? 'Sonuç Bulunamadı' : 'Henüz Analiz Yok'}
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            {searchTerm
              ? 'Arama kriterlerinize uygun analiz bulunamadı'
              : 'İlk analizinizi başlatmak için ana sayfaya gidin'}
          </p>
          {!searchTerm && (
            <button onClick={() => navigate('/')} className="btn-primary !text-sm">
              Analiz Başlat
            </button>
          )}
        </motion.div>
      )}

      {/* List */}
      {!loading && filteredAnalyses.length > 0 && (
        <div className="space-y-3">
          {filteredAnalyses.map((a) => (
            <motion.div key={a.id} variants={fadeUp}>
              <ReportCard
                analysis={a}
                onClick={() => {
                  if (a.status === 'completed') {
                    navigate(`/results/${a.id}`);
                  } else if (a.status === 'processing') {
                    navigate(`/analysis/${a.id}`);
                  }
                }}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <motion.div variants={fadeUp} className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm text-slate-400">
            Sayfa {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight size={20} />
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
