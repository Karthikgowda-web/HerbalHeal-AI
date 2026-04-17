import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutGrid, LogOut, ShieldAlert, User, Star, Camera, Bookmark, BookmarkCheck, Leaf } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface NavbarProps {
  mode: 'identify' | 'search' | 'library';
  setMode: (mode: 'identify' | 'search' | 'library') => void;
  reset: () => void;
  onSignIn: () => void;
}

export function Navbar({ mode, setMode, reset, onSignIn }: NavbarProps) {
  const { user, logout } = useAuth();

  return (
    <nav className="flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-md border-b border-sage-100 shadow-sm sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ rotate: 15, scale: 1.1 }}
            className="w-10 h-10 bg-sage-900 rounded-xl flex items-center justify-center shadow-lg shadow-sage-900/20"
          >
            <Leaf className="w-6 h-6 text-white" />
          </motion.div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-serif font-bold text-sage-900 tracking-tight block leading-none">HerbaScan</span>
              <span className="px-1.5 py-0.5 bg-sage-50 text-[7px] font-black text-sage-400 rounded-md border border-sage-100">V1.1.2</span>
            </div>
            <span className="text-[9px] uppercase tracking-[0.3em] font-black text-sage-400 mt-1 block">Botanical Intelligence</span>
          </div>

        </div>

        {}
        <div className="hidden md:flex bg-sage-50 p-1 rounded-xl border border-sage-100 gap-1">
          {(['identify', 'search', 'library'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); reset(); }}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                mode === m 
                  ? "bg-white text-sage-900 shadow-sm ring-1 ring-sage-200" 
                  : "text-sage-400 hover:text-sage-600"
              )}
            >
              {m === 'identify' && <Camera className="w-3.5 h-3.5" />}
              {m === 'search' && <Bookmark className="w-3.5 h-3.5" />}
              {m === 'library' && <BookmarkCheck className="w-3.5 h-3.5" />}
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-6">
        {user ? (
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-3 px-4 py-2 bg-sage-50 rounded-2xl border border-sage-100 shadow-inner">
              <div className="w-6 h-6 bg-sage-200 rounded-full flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-sage-600" />
              </div>
              <span className="text-[10px] font-bold text-sage-900 truncate max-w-[120px]">
                {user.email}
              </span>
            </div>
            <motion.button 
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              onClick={logout}
              className="p-2.5 text-sage-400 hover:text-red-500 transition-colors bg-sage-50 rounded-xl hover:bg-red-50"
            >
              <LogOut className="w-5 h-5" />
            </motion.button>
          </div>
        ) : (
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSignIn}
            className="px-8 py-3 bg-sage-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-sage-900/20 hover:bg-black transition-all"
          >
            Sign In
          </motion.button>
        )}
      </div>
    </nav>
  );
}
