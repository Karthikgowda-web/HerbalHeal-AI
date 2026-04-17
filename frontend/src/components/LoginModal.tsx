import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

import { API_BASE_URL } from '../config';

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const endpoint = isLogin ? '/auth/login' : '/auth/signup';

    try {
      const fullUrl = `${API_BASE_URL}${endpoint}`;
      
      console.log(`[Auth] Attempting ${isLogin ? 'Login' : 'Signup'} at: ${fullUrl}`);

      const response = await axios.post(fullUrl, {

        email,
        password
      });

      login(response.data.token, response.data.user.email);
      onClose();
    } catch (err: any) {
      console.error('[Auth Error Details]:', err.response?.data || err.message);
      const serverMsg = err.response?.data?.message;
      setError(serverMsg || `Failed to ${isLogin ? 'sign in' : 'create account'}. ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-sage-950/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl relative overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-sage-50 rounded-bl-full -mr-8 -mt-8" />
            
            <div className="relative">
              <div className="flex justify-between items-center mb-8">
                <div className="w-12 h-12 bg-sage-900 rounded-2xl flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <button onClick={onClose} className="p-2 hover:bg-sage-50 rounded-full transition-colors">
                  <X className="w-5 h-5 text-sage-400" />
                </button>
              </div>

              <h2 className="text-3xl font-serif font-bold text-sage-900 mb-2">
                {isLogin ? 'Admin Portal' : 'Create Account'}
              </h2>
              <p className="text-sage-500 text-sm mb-8 font-medium">
                {isLogin 
                  ? 'Please sign in to access botanical verification tools.' 
                  : 'Join HerbaScan to start building your personal botanical library.'}
              </p>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-red-600 leading-relaxed">{error}</p>
                </motion.div>
              )}

              <form onSubmit={handleAuth} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-sage-400 ml-1">Email Address</label>
                  <div className="relative group">
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="w-full pl-12 pr-6 py-4 bg-sage-50 border border-sage-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sage-900/10 focus:bg-white transition-all text-sage-900 font-medium"
                      placeholder="admin@herbascan.ai"
                    />
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sage-300 group-focus-within:text-sage-900 transition-colors" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-sage-400 ml-1">Secure Password</label>
                  <div className="relative group">
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      className="w-full pl-12 pr-6 py-4 bg-sage-50 border border-sage-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sage-900/10 focus:bg-white transition-all text-sage-900 font-medium"
                      placeholder="••••••••"
                    />
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sage-300 group-focus-within:text-sage-900 transition-colors" />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-5 bg-sage-900 text-white rounded-2xl font-bold shadow-xl shadow-sage-900/20 hover:bg-black transition-all flex items-center justify-center gap-3"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    isLogin ? "Authorize Access" : "Create Account"
                  )}
                </motion.button>
              </form>

              <div className="mt-8 text-center">
                <button 
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-xs font-bold text-sage-400 hover:text-sage-900 transition-colors uppercase tracking-widest"
                >
                  {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
