import React from 'react';
import { BookmarkCheck, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ResultCardProps {
  historyId: string | null;
  isExporting: 'pdf' | 'jpg' | null;
  onDownloadPDF: () => void;
  onDownloadJPG: () => void;
}

export function ResultCard({ historyId, isExporting, onDownloadPDF, onDownloadJPG }: ResultCardProps) {
  return (
    <div className="space-y-4 pt-4">
      <AnimatePresence mode="wait">
        <motion.div 
          key="button"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "w-full py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-xl",
            historyId 
              ? "bg-sage-200 text-sage-800 border-2 border-sage-300"
              : "bg-sage-100 text-sage-400 border-2 border-sage-200"
          )}
        >
          {historyId ? (
            <>
               <BookmarkCheck className="w-6 h-6 text-sage-600" />
               ✅ Synced to Cloud
            </>
          ) : (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Syncing...
            </>
          )}
        </motion.div>
      </AnimatePresence>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onDownloadPDF}
          disabled={isExporting !== null}
          type="button"
          className="flex-1 py-5 bg-sage-900/50 backdrop-blur-md border border-white/10 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-sage-900/80 transition-all shadow-lg shadow-black/20 disabled:opacity-50"
        >
          {isExporting === 'pdf' ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
          {isExporting === 'pdf' ? "Generating..." : "Download as PDF"}
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onDownloadJPG}
          disabled={isExporting !== null}
          type="button"
          className="flex-1 py-5 bg-sage-900/50 backdrop-blur-md border border-white/10 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-sage-900/80 transition-all shadow-lg shadow-black/20 disabled:opacity-50"
        >
          {isExporting === 'jpg' ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
          {isExporting === 'jpg' ? "Generating..." : "Download as JPG"}
        </motion.button>
      </div>
    </div>
  );
}
