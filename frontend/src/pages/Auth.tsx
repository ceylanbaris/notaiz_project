/* ── Auth Page — Google OAuth Login ── */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Music } from 'lucide-react';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import { loginWithGoogle, getStoredToken } from '../services/api';

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
};

export default function AuthPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (getStoredToken()) {
      navigate('/');
    }
  }, [navigate]);

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      toast.error('Google kimlik bilgisi alınamadı.');
      return;
    }
    try {
      await loginWithGoogle(credentialResponse.credential);
      navigate('/');
    } catch {
      toast.error('Giriş başarısız. Lütfen tekrar deneyin.');
    }
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      className="section-container flex items-center justify-center min-h-[80vh]"
    >
      <motion.div variants={fadeUp} className="glass-card p-10 w-full max-w-md text-center">
        {/* Logo */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/20">
          <Music size={28} className="text-white" />
        </div>

        <h1 className="text-2xl font-display font-bold text-white mb-2">
          Notaiz'e Giriş Yap
        </h1>
        <p className="text-sm text-slate-400 mb-8 leading-relaxed">
          Analiz geçmişinize erişmek ve yeni analizler başlatmak için giriş yapın
        </p>

        {/* Google Login Button */}
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => toast.error('Google girişi başarısız oldu.')}
            theme="filled_black"
            size="large"
            text="signin_with"
            shape="rectangular"
            locale="tr"
          />
        </div>

        <div className="mt-8 pt-6 border-t border-white/5">
          <p className="text-xs text-slate-500 leading-relaxed">
            Giriş yaparak, şarkı benzerlik analizi geçmişinizi saklayabilir ve
            raporlarınızı PDF olarak indirebilirsiniz.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
