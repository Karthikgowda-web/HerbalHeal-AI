import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Leaf, Info, AlertTriangle, Loader2, Download, Share2, FileText, Image as ImageIcon, Bookmark, BookmarkCheck, LayoutGrid, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { identifyPlant, suggestPlantsByIllness, type IdentificationResult, type PlantSuggestion } from './services/geminiService';
import { remedyBank, type RemedyData } from './data/remedyBank';
import { savePlantToLibrary, getSavedPlants, type SavedPlant } from './services/databaseService';
import { cn } from './lib/utils';
import axios from 'axios';
import { ResultCard } from './components/ResultCard';

import { Navbar } from './components/Navbar';
import { useAuth } from './context/AuthContext';


type TabType = 'overview' | 'remedies' | 'alternatives' | 'cnn';
type ModeType = 'identify' | 'search' | 'library';

const BOTANICAL_FACTS = [
  "Ancient Egyptians used Aloe Vera to treat burns and skin conditions over 3,500 years ago.",
  "Peppermint is one of the oldest documented herbs used for medicinal purposes.",
  "Chamomile has been used for centuries as a natural sleep aid and digestive tonic.",
  "Turmeric contains curcumin, a powerful anti-inflammatory compound used in Ayurveda for millennia.",
  "Lavender's name comes from the Latin 'lavare', meaning 'to wash', as it was used in ancient baths.",
  "Ginger has been used in Asian medicine for over 2,000 years to treat nausea and digestion.",
  "Holy Basil (Tulsi) is considered the 'Queen of Herbs' in India for its stress-relieving properties."
];

export default function App() {
  const [mode, setMode] = useState<ModeType>('identify');
  const [image, setImage] = useState<string | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [result, setResult] = useState<IdentificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<PlantSuggestion[] | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedPlants, setSavedPlants] = useState<SavedPlant[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [loadingFactIndex, setLoadingFactIndex] = useState(0);
  const [librarySearch, setLibrarySearch] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'hi' | 'kn'>('en');

  const { user: currentUser, token } = useAuth();
  const [toastMsg, setToastMsg] = useState<{ message: string, visible: boolean }>({ message: '', visible: false });

  const showToast = (message: string) => {
    setToastMsg({ message, visible: true });
    setTimeout(() => {
      setToastMsg(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  const filteredLibrary = savedPlants.filter(plant => 
    (plant.plant_name || plant.name || '').toLowerCase().includes(librarySearch.toLowerCase()) ||
    (plant.scientific_name || (plant as any).scientificName || '').toLowerCase().includes(librarySearch.toLowerCase()) ||
    (plant.overview?.[selectedLanguage] || (plant as any).description || '').toLowerCase().includes(librarySearch.toLowerCase())
  );

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isIdentifying || isSearching) {
      interval = setInterval(() => {
        setLoadingFactIndex(prev => (prev + 1) % BOTANICAL_FACTS.length);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isIdentifying, isSearching]);

  const [copyingIndex, setCopyingIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopyingIndex(index);
    setTimeout(() => setCopyingIndex(null), 2000);
  };

  const handleArchive = async () => {
    if (!result || !image || isSaving) return;
    setIsSaving(true);
    try {
      await savePlantToLibrary(result, image);
      setIsSaved(true);
      showToast("Successfully archived to library!");
      
      if (mode === 'library') fetchLibrary();
    } catch (err) {
      setError("Failed to save to library. Please try again.");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const fetchLibrary = async () => {
    setIsLoadingLibrary(true);
    try {
      const plants = await getSavedPlants();
      setSavedPlants(plants);
    } catch (err) {
      console.error("Error fetching library:", err);
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    const ua = window.navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);
  }, []);

  useEffect(() => {
    if (mode === 'library') {
      fetchLibrary();
    }
  }, [mode]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };
  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      });
    } else {
      setShowInstallModal(true);
    }
  };

  const startCamera = async () => {
    try {
      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Could not access camera. Please check permissions.");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setImage(dataUrl);
        stopCamera();
        setResult(null);
        setError(null);
      }
    }
  };

  const handleIdentify = async () => {
    if (!image) return;
    setIsIdentifying(true);
    setError(null);
    setCurrentHistoryId(null);
    try {
      const data = await identifyPlant(image);
      setResult(data);
      setIsSaved(false); 
      
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      axios.post(`${baseUrl}/history`, {
        commonName: data.name || (data as any).plant_name || 'Unknown',
        scientificName: data.scientific_name || 'Unknown',
        remedies: data.remedies || {},
        imagePath: image,
        timestamp: new Date()
      }).then((res) => {
        console.log("History persistence response:", res);
        if (res.status !== 201) {
          alert('Warning: History auto-save did not return expected status (201).');
        }
        if (res.data?.historyId) {
          setCurrentHistoryId(res.data.historyId);
        }
      }).catch((e) => {
        console.error('Failed to auto-save history:', e);
        alert('Server error preventing history save.');
      });
      
    } catch (err) {
      setError("Failed to identify plant. Please try a clearer photo.");
      console.error(err);
    } finally {
      setIsIdentifying(false);
    }
  };

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const resultRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
    setActiveTab('overview');
    setSuggestions(null);
    setSearchQuery('');
    setIsSaved(false);
  };

  const handleLocalSearch = (query: string) => {
    setSearchQuery(query);
    if (searchTimeout) clearTimeout(searchTimeout);

    if (!query.trim()) {
      setSuggestions(null);
      return;
    }

    setIsSearching(true);
    
    // Instant fuzzy matching logic
    const timeout = setTimeout(() => {
      const normalizedQuery = query.toLowerCase().trim();
      
      const matches: PlantSuggestion[] = [];
      
      Object.keys(remedyBank).forEach(key => {
        const item = remedyBank[key];
        const isMatch = key.includes(normalizedQuery) || 
                       item.name.toLowerCase().includes(normalizedQuery) ||
                       item.tags.some(tag => tag.includes(normalizedQuery));
        
        if (isMatch) {
          matches.push({
            name: item.name,
            scientificName: item.scientificName,
            description: item.description[selectedLanguage],
            howItHelps: item.howItHelps[selectedLanguage],
            preparation: item.preparation[selectedLanguage]
          });
        }
      });

      setSuggestions(matches.length > 0 ? matches : null);
      setIsSearching(false);
    }, 300); // 300ms Debounce

    setSearchTimeout(timeout);
  };

  const [isExporting, setIsExporting] = useState<'pdf' | 'jpg' | null>(null);

  const handleDownloadPDF = () => {
    const printElement = document.getElementById('export-container');
    if (!printElement || isExporting) return;
    
    console.log("Download Started (PDF)");
    setIsExporting('pdf');
    setError(null);
    
    // 500ms delay to ensure DOM is fully painted
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(printElement, { 
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#f9fafb' 
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        // Using 'FAST' compression to avoid memory timeouts
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        pdf.save(`${result?.name || 'herbal-report'}.pdf`);
        console.log("Download Complete (PDF)");
      } catch (err) {
        console.error("PDF Export Error:", err);
        setError("Failed to generate PDF. Please try again.");
      } finally {
        setIsExporting(null);
      }
    }, 500);
  };

  const handleDownloadJPG = () => {
    const printElement = document.getElementById('export-container');
    if (!printElement || isExporting) return;
    
    console.log("Download Started (JPG)");
    setIsExporting('jpg');
    setError(null);
    
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(printElement, { 
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#f9fafb'
        });
        
        // Virtual <a> tag method for maximum reliability
        const link = document.createElement('a');
        link.download = `${result?.name || 'herbal-report'}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log("Download Complete (JPG)");
      } catch (err) {
        console.error("JPG Export Error:", err);
        setError("Failed to generate Image. Please try again.");
      } finally {
        setIsExporting(null);
      }
    }, 500);
  };

  return (
    <div className="min-h-screen bg-sage-50 pb-12 relative overflow-hidden perspective-1000">
      {}
      <AnimatePresence>
        {!isStandalone && (
          <motion.button 
            initial={{ opacity: 0, scale: 0.5, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 100 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleInstallClick}
            className="fixed bottom-6 right-6 z-40 sm:hidden w-14 h-14 bg-sage-900 text-white rounded-full shadow-2xl flex items-center justify-center border-4 border-white"
          >
            <Download className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {}
      <AnimatePresence>
        {showInstallModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-sage-900/60 backdrop-blur-sm"
            onClick={() => setShowInstallModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-sage-50 rounded-bl-full -mr-8 -mt-8" />
              
              <div className="relative">
                <div className="w-12 h-12 bg-sage-900 rounded-2xl flex items-center justify-center mb-6">
                  <Download className="w-6 h-6 text-white" />
                </div>
                
                <h3 className="text-2xl font-serif font-bold text-sage-900 mb-2">Install HerbalHeal</h3>
                <p className="text-sage-500 text-sm mb-6 font-medium leading-relaxed">
                  Add HerbalHeal to your home screen for instant botanical analysis and offline records.
                </p>
                
                <div className="space-y-4 bg-sage-50 p-6 rounded-2xl mb-8 border border-sage-100">
                  {isIOS ? (
                    <div className="flex gap-4 items-start">
                      <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] font-black shrink-0 border border-sage-200">1</div>
                      <p className="text-xs text-sage-700 font-bold leading-relaxed">
                        Tap the <span className="inline-block p-1 bg-white rounded border border-sage-200"><Share2 className="w-3 h-3 inline" /> Share</span> icon in your Safari browser.
                      </p>
                    </div>
                  ) : (
                    <div className="flex gap-4 items-start">
                      <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] font-black shrink-0 border border-sage-200">1</div>
                      <p className="text-xs text-sage-700 font-bold leading-relaxed">
                        Open your browser menu (usually three dots) and look for <span className="text-sage-900 font-black italic">"Install App"</span> or <span className="text-sage-900 font-black italic">"Add to Home Screen"</span>.
                      </p>
                    </div>
                  )}
                  {isIOS && (
                    <div className="flex gap-4 items-start pt-2">
                       <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[10px] font-black shrink-0 border border-sage-200">2</div>
                      <p className="text-xs text-sage-700 font-bold leading-relaxed">
                        Scroll down and select <span className="text-sage-900 font-black italic">"Add to Home Screen"</span>.
                      </p>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => setShowInstallModal(false)}
                  className="w-full py-4 bg-sage-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-xl shadow-sage-900/10"
                >
                  Got it!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toastMsg.visible && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 32, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-0 left-1/2 z-50 flex items-center gap-3 bg-sage-900 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-sage-900/20"
          >
            <BookmarkCheck className="w-5 h-5 text-sage-300" />
            <span className="font-medium text-sm">{toastMsg.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-sage-200/30 blur-[120px] rounded-full animate-float" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-sage-300/20 blur-[100px] rounded-full animate-float [animation-delay:2s]" />
        <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] bg-sage-200/40 blur-[150px] rounded-full animate-float [animation-delay:4s]" />
        
        {}
        <motion.div 
          animate={{ 
            y: [0, -40, 0],
            rotate: [45, 60, 45],
            z: [0, 50, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-10 opacity-10"
        >
          <Leaf className="w-24 h-24" />
        </motion.div>
        <motion.div 
          animate={{ 
            y: [0, 40, 0],
            rotate: [-12, -30, -12],
            z: [0, -50, 0]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 3 }}
          className="absolute bottom-1/4 right-10 opacity-10"
        >
          <Leaf className="w-32 h-32" />
        </motion.div>
      </div>

      {}
      {}
      <Navbar mode={mode} setMode={setMode} reset={reset} />

      <main className="relative max-w-5xl mx-auto px-4 mt-12">
        <div className={cn("grid gap-12", mode === 'library' ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-12")}>
          {}
          <section className={cn("lg:col-span-5 space-y-8", mode === 'library' && "hidden")}>
            <AnimatePresence mode="wait">
              {mode === 'identify' ? (
                <motion.div 
                  key="identify-card"
                  initial={{ opacity: 0, x: -50, rotateY: 15 }}
                  animate={{ opacity: 1, x: 0, rotateY: 0 }}
                  exit={{ opacity: 0, x: -50, rotateY: -15 }}
                  whileHover={{ rotateY: -5, rotateX: 2, z: 10 }}
                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-sage-900/5 border border-sage-100 relative overflow-hidden group preserve-3d"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-sage-50 rounded-bl-[5rem] -mr-8 -mt-8 transition-transform group-hover:scale-110" />
                  
                  <div className="relative">
                    <h2 className="text-2xl font-serif font-bold mb-2 text-sage-900">Identify Plant</h2>
                    <p className="text-sage-500 text-sm mb-4">Capture or upload a photo of any medicinal herb.</p>
                    
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-bold flex items-center gap-3"
                      >
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                        {error}
                      </motion.div>
                    )}
                    
                    {!image && !isCameraOpen ? (
                      <div className="space-y-6">
                        <motion.button 
                          whileHover={{ scale: 1.02, translateZ: 20 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full aspect-[4/3] border-2 border-dashed border-sage-200 rounded-[2rem] flex flex-col items-center justify-center gap-4 hover:border-sage-400 hover:bg-sage-50/50 transition-all group/upload"
                        >
                          <div className="w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center group-hover/upload:bg-sage-200 transition-colors">
                            <Upload className="w-8 h-8 text-sage-600" />
                          </div>
                          <div className="text-center">
                            <span className="text-sage-900 font-bold block">Choose Image</span>
                            <span className="text-sage-400 text-xs">JPG, PNG or WebP</span>
                          </div>
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
                            accept="image/*"
                            className="hidden"
                          />
                        </motion.button>

                        <motion.button 
                          whileHover={{ scale: 1.02, translateZ: 20 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={startCamera}
                          className="w-full py-5 bg-sage-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-sage-900/20"
                        >
                          <Camera className="w-5 h-5" />
                          Open Camera
                        </motion.button>
                      </div>
                    ) : image && !isCameraOpen ? (
                      <div className="space-y-6">
                        <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl group/preview preserve-3d">
                          <img src={image} alt="Specimen" className="w-full h-full object-cover" />
                          <button 
                            onClick={reset}
                            className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-all opacity-0 group-hover/preview:opacity-100"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleIdentify}
                          disabled={isIdentifying}
                          className={cn(
                            "w-full py-5 rounded-2xl font-bold text-white transition-all shadow-xl flex items-center justify-center gap-3",
                            isIdentifying ? "bg-sage-400 cursor-not-allowed" : "bg-sage-900 hover:bg-black shadow-sage-900/20"
                          )}
                        >
                          {isIdentifying ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Analyzing Specimen...
                            </>
                          ) : (
                            <>
                              <Leaf className="w-5 h-5" />
                              Identify Specimen
                            </>
                          )}
                        </motion.button>
                      </div>
                    ) : isCameraOpen && (
                      <div className="space-y-6">
                        <div className="relative aspect-[4/3] bg-black rounded-[2rem] overflow-hidden shadow-2xl">
                          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                          <button 
                            onClick={stopCamera}
                            className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-all"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={capturePhoto}
                          className="w-full py-5 bg-sage-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl"
                        >
                          <Camera className="w-5 h-5" />
                          Capture Photo
                        </motion.button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="search-card"
                  initial={{ opacity: 0, x: 50, rotateY: -15 }}
                  animate={{ opacity: 1, x: 0, rotateY: 0 }}
                  exit={{ opacity: 0, x: 50, rotateY: 15 }}
                  whileHover={{ rotateY: 5, rotateX: 2, z: 10 }}
                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-sage-900/5 border border-sage-100 relative overflow-hidden preserve-3d"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-sage-50 rounded-bl-[5rem] -mr-8 -mt-8" />
                  
                  <div className="relative">
                    <h2 className="text-2xl font-serif font-bold mb-2 text-sage-900">Search Remedies</h2>
                    <p className="text-sage-500 text-sm mb-8">Find traditional herbal solutions for your condition.</p>
                    
                    <form onSubmit={(e) => { e.preventDefault(); handleLocalSearch(searchQuery); }} className="space-y-6">
                      <div className="relative group">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => handleLocalSearch(e.target.value)}
                          placeholder="e.g., insomnia, cough, stress"
                          className="w-full px-6 py-5 bg-sage-50 border border-sage-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sage-900/20 focus:bg-white transition-all text-sage-900 font-medium placeholder:text-sage-300"
                        />
                        <Leaf className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-sage-200 group-focus-within:text-sage-900 transition-colors" />
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.02, translateZ: 20 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={isSearching || !searchQuery.trim()}
                        className={cn(
                          "w-full py-5 rounded-2xl font-bold text-white transition-all shadow-xl flex items-center justify-center gap-3",
                          isSearching || !searchQuery.trim() ? "bg-sage-400 cursor-not-allowed" : "bg-sage-900 hover:bg-black shadow-sage-900/20"
                        )}
                      >
                        {isSearching ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Consulting Records...
                          </>
                        ) : (
                          <>
                            <Leaf className="w-5 h-5" />
                            Find Solutions
                          </>
                        )}
                      </motion.button>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
          <section className={cn("relative", mode === 'library' ? "w-full" : "lg:col-span-7")}>
            <AnimatePresence mode="wait">
              {mode === 'library' ? (
                <motion.div
                  key="library"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-10"
                >
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                    <div className="space-y-2">
                      <h2 className="text-5xl font-serif font-bold text-sage-900 tracking-tight">Your Collection</h2>
                      <p className="text-sage-500 font-medium">Curated botanical records from your explorations.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <motion.div 
                        whileHover={{ scale: 1.02, z: 10 }}
                        className="relative w-full sm:w-64 preserve-3d"
                      >
                        <input 
                          type="text"
                          value={librarySearch}
                          onChange={(e) => setLibrarySearch(e.target.value)}
                          placeholder="Search collection..."
                          className="w-full pl-10 pr-10 py-2.5 bg-white border border-sage-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sage-900/10 transition-all shadow-sm"
                        />
                        <Leaf className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage-300" />
                        {librarySearch && (
                          <button 
                            onClick={() => setLibrarySearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-sage-300 hover:text-sage-900 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </motion.div>
                      <div className="bg-white px-4 py-2.5 rounded-xl border border-sage-200 shadow-sm flex items-center gap-3">
                        <span className="text-sage-900 font-black text-lg">{filteredLibrary.length}</span>
                        <span className="text-sage-400 text-[10px] uppercase tracking-widest font-bold">Specimens</span>
                      </div>
                    </div>
                  </div>

                  {isLoadingLibrary ? (
                    <div className="flex flex-col items-center justify-center py-32">
                      <Loader2 className="w-12 h-12 text-sage-200 animate-spin mb-6" />
                      <p className="text-sage-400 font-serif italic text-xl">Opening the archives...</p>
                    </div>
                  ) : filteredLibrary.length === 0 ? (
                    <div className="text-center py-32 bg-white/50 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-sage-200">
                      <div className="w-20 h-20 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Bookmark className="w-10 h-10 text-sage-300" />
                      </div>
                      <h3 className="text-xl font-serif font-bold text-sage-900">
                        {librarySearch ? "No matches found" : "Empty Library"}
                      </h3>
                      <p className="text-sage-500 mt-2 max-w-xs mx-auto">
                        {librarySearch ? "Try a different search term or clear the filter." : "Start identifying and saving plants to build your personal herbal reference."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {filteredLibrary.map((plant, idx) => (
                        <motion.div 
                          key={plant._id || plant.id} 
                          initial={{ opacity: 0, scale: 0.9, rotateY: -15 }}
                          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                          whileHover={{ 
                            rotateY: -10, 
                            rotateX: 5,
                            z: 20,
                            scale: 1.02
                          }}
                          transition={{ 
                            delay: idx * 0.05,
                            type: "spring",
                            stiffness: 100,
                            damping: 15
                          }}
                          className={cn(
                            "bg-white rounded-[2.5rem] overflow-hidden shadow-xl shadow-sage-900/5 border border-sage-100 transition-all group preserve-3d",
                            (!plant.remedies || Object.keys(plant.remedies).length === 0) 
                              ? "opacity-60 cursor-not-allowed" 
                              : "cursor-pointer hover:shadow-sage-900/10 hover:-translate-y-1"
                          )}
                          onClick={() => {
                            if (!plant.remedies || Object.keys(plant.remedies).length === 0) return;
                            
                            if (plant.overview || plant.remedies) {
                              setResult(plant);
                              setImage(plant.imagePath || plant.image_url || plant.imageUrl);
                              setMode('identify');
                              setIsSaved(true);
                            } else {
                              showToast("Detailed information was not saved for this specimen.");
                            }
                          }}
                        >
                          <div className="aspect-[4/3] relative overflow-hidden">
                            <img src={plant.imagePath || plant.image_url || plant.imageUrl} alt={plant.commonName || plant.plant_name || plant.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-t from-sage-900/80 via-sage-900/20 to-transparent flex items-end p-8">
                              <div>
                                <h3 className="text-white text-2xl font-serif font-bold leading-tight">{plant.commonName || plant.plant_name || plant.name}</h3>
                                <p className="text-sage-200 text-xs italic mt-1 font-medium">{plant.scientificName || plant.scientific_name || 'Medicinal Species'}</p>
                              </div>
                            </div>
                          </div>
                            <div className="p-8">
                              <p className="text-sage-600 text-sm line-clamp-2 leading-relaxed font-medium">
                                {plant.overview?.[selectedLanguage] || (plant as any).description || 'Medicinal details available in full view.'}
                              </p>
                            <div className={cn(
                              "mt-6 flex items-center text-[10px] font-black uppercase tracking-widest transition-colors",
                              (!plant.remedies || Object.keys(plant.remedies).length === 0) ? "text-sage-300" : "text-sage-400 group-hover:text-sage-900"
                            )}>
                              {(!plant.remedies || Object.keys(plant.remedies).length === 0) ? "No Details Available" : "View Details"} <Share2 className="w-3 h-3 ml-2" />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : !result && !suggestions && !isIdentifying && !isSearching ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0, scale: 0.9, rotateX: 10 }}
                  animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                  exit={{ opacity: 0, scale: 0.9, rotateX: -10 }}
                  className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-12 bg-white/30 backdrop-blur-sm rounded-[3rem] border-2 border-dashed border-sage-200/50 preserve-3d"
                >
                  <div className="relative mb-8">
                    <div className="w-24 h-24 bg-sage-100 rounded-full flex items-center justify-center">
                      <Leaf className="w-12 h-12 text-sage-300" />
                    </div>
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="absolute -top-2 -right-2 w-8 h-8 bg-sage-900 rounded-full flex items-center justify-center"
                    >
                      <Info className="w-4 h-4 text-white" />
                    </motion.div>
                  </div>
                  <h3 className="text-2xl font-serif text-sage-900 font-bold">
                    {mode === 'identify' ? "Awaiting Specimen" : "Awaiting Query"}
                  </h3>
                  <p className="text-sage-500 font-medium mt-4 max-w-sm leading-relaxed">
                    {mode === 'identify' 
                      ? "Provide a visual sample to begin the botanical analysis and unlock traditional medicinal insights."
                      : "Specify a condition to explore our curated database of traditional herbal interventions."
                    }
                  </p>
                </motion.div>
              ) : (isIdentifying || isSearching) ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0, scale: 0.9, rotateY: -10 }}
                  animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                  exit={{ opacity: 0, scale: 0.9, rotateY: 10 }}
                  className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-12 bg-white rounded-[3rem] shadow-2xl shadow-sage-900/10 border border-sage-100 preserve-3d"
                >
                  <div className="relative mb-12">
                    <div className="w-32 h-32 border-[3px] border-sage-100 border-t-sage-900 rounded-full animate-spin" />
                    <div className="absolute inset-0 m-auto w-16 h-16 bg-sage-50 rounded-full flex items-center justify-center">
                      <Leaf className="w-8 h-8 text-sage-900 animate-pulse" />
                    </div>
                  </div>
                  
                  <div className="max-w-md mx-auto">
                    <h3 className="text-2xl font-serif text-sage-900 font-bold mb-4">
                      {isIdentifying ? "Analyzing Botanical Markers" : "Consulting Ethnobotanical Records"}
                    </h3>
                    
                    <div className="h-24 flex items-center justify-center">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={loadingFactIndex}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="space-y-2"
                        >
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-sage-400">Did you know?</span>
                          <p className="text-sage-600 font-medium leading-relaxed italic">
                            "{BOTANICAL_FACTS[loadingFactIndex]}"
                          </p>
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              ) : suggestions ? (
                <motion.div
                  key="suggestions"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-8"
                >
                  <div className="bg-sage-950 p-10 rounded-[3rem] shadow-2xl shadow-black/40 border border-sage-800 text-white">
                    <div className="flex items-center gap-4 mb-10">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-white/10">
                        <Leaf className="w-6 h-6 text-sage-900" />
                      </div>
                      <div>
                        <h3 className="text-3xl font-serif font-bold text-white leading-none">Remedies Found</h3>
                        <p className="text-sage-400 font-medium mt-1">Suggested for: <span className="text-white font-bold">{searchQuery}</span></p>
                      </div>
                    </div>

                    <div className="space-y-16">
                      {suggestions.map((plant, i) => (
                        <motion.div 
                          key={i} 
                          initial={{ opacity: 0, scale: 0.9, rotateX: 20 }}
                          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                          whileHover={{ rotateY: 5, rotateX: -2, z: 20 }}
                          transition={{ 
                            delay: i * 0.1,
                            type: "spring",
                            stiffness: 100,
                            damping: 15
                          }}
                          className="group preserve-3d"
                        >
                          <div className="flex flex-col md:flex-row gap-8 items-start">
                            <div className="flex-1 space-y-4">
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-sage-500">Botanical Suggestion {i + 1}</span>
                                <div className="h-px flex-1 bg-white/10" />
                              </div>
                              <h4 className="text-4xl font-serif font-bold text-white tracking-tight group-hover:text-sage-300 transition-colors">{plant.name}</h4>
                              <p className="text-sage-400 italic font-serif text-xl">{(plant as any).scientific_name || plant.scientificName}</p>
                              <p className="text-sage-200 font-medium leading-relaxed text-lg">
                                {(plant as any).overview?.[selectedLanguage] || plant.description}
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
                            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-bl-full -mr-8 -mt-8 opacity-50" />
                              <span className="relative text-[10px] font-black uppercase tracking-widest text-sage-400 block mb-4">Therapeutic Action</span>
                              <p className="relative text-sage-100 text-base font-medium leading-relaxed">{plant.howItHelps}</p>
                            </div>
                            <div className="bg-white/10 p-8 rounded-[2.5rem] border border-white/10 shadow-sm">
                              <span className="text-[10px] font-black uppercase tracking-widest text-sage-400 block mb-4">Preparation Protocol</span>
                              <div className="text-sage-200 text-sm leading-relaxed font-medium prose prose-invert prose-sage max-w-none prose-p:m-0">
                                <ReactMarkdown>{plant.preparation}</ReactMarkdown>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : result ? (
                <motion.div
                  id="export-container"
                  key="result"
                  ref={resultRef}
                  initial={{ opacity: 0, scale: 0.95, rotateY: 10 }}
                  animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                  whileHover={{ rotateY: -2, rotateX: 1, z: 5 }}
                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  className="space-y-8 preserve-3d"
                >
                  {}
                  <div className="flex p-1.5 bg-white/50 backdrop-blur-md rounded-2xl border border-sage-200 shadow-sm" ref={pdfRef}>
                    {(['overview', 'remedies', 'alternatives', 'cnn'] as TabType[]).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                          "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                          activeTab === tab 
                            ? "bg-sage-900 text-white shadow-lg shadow-sage-900/20" 
                            : "text-sage-400 hover:text-sage-600"
                        )}
                      >
                        {tab === 'cnn' ? 'CNN Analysis' : tab}
                      </button>
                    ))}
                  </div>

                  {}
                  <div className="flex justify-center mt-6">
                    <div className="inline-flex p-1 bg-white/50 backdrop-blur-md rounded-xl border border-sage-200 shadow-sm gap-1">
                      {(['en', 'hi', 'kn'] as const).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setSelectedLanguage(lang)}
                          className={cn(
                            "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                            selectedLanguage === lang 
                              ? "bg-sage-900 text-white shadow-md" 
                              : "text-sage-400 hover:text-sage-600 hover:bg-white/50"
                          )}
                        >
                          {lang === 'en' ? 'EN' : lang === 'hi' ? 'HI' : 'KN'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div ref={resultRef} className="space-y-8">
                    <AnimatePresence mode="wait">
                      {activeTab === 'overview' && (
                        <motion.div
                          key="overview"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="space-y-8"
                        >
                          {}
                          <div className="bg-sage-950 p-10 rounded-[3rem] shadow-2xl shadow-black/40 border border-sage-800 relative overflow-hidden text-white">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-sage-900/50 rounded-bl-[6rem] -mr-12 -mt-12" />
                            
                            <div className="relative">
                              <div className="mb-10">
                                <div className="flex items-center justify-between">
                                  <h2 className="text-5xl font-serif font-bold text-white leading-tight">{(result?.name || (result as any)?.plant_name)?.replace(/_/g, ' ') || 'Searching...'}</h2>
                                </div>
                                <p className="text-sage-300 italic font-serif text-2xl mt-1">{result?.scientific_name || ''}</p>
                              </div>
                              
                              <div className="text-sage-100 text-lg leading-relaxed mb-10 prose prose-invert prose-sage max-w-none font-medium">
                                <ReactMarkdown>
                                  {result?.overview?.[selectedLanguage] || ''}
                                </ReactMarkdown>
                              </div>

                              <div className="flex flex-wrap gap-3">
                                {result?.medicinalProperties?.map((prop, i) => (
                                  <span key={i} className="px-4 py-2 bg-white/10 text-white rounded-xl text-xs font-bold border border-white/10 backdrop-blur-sm">
                                    {prop}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {}
                          <div className="bg-amber-950/30 backdrop-blur-md p-8 rounded-[2.5rem] border border-amber-900/30 shadow-lg shadow-black/20">
                            <h3 className="text-amber-400 font-black flex items-center gap-3 mb-4 text-[10px] uppercase tracking-[0.3em]">
                              <AlertTriangle className="w-5 h-5" />
                              Contraindications
                            </h3>
                            <p className="text-amber-100/80 font-medium leading-relaxed">
                              {result?.warnings || 'Consult a professional.'}
                            </p>
                          </div>
                        </motion.div>
                      )}

                      {activeTab === 'remedies' && (
                        <motion.div
                          key="remedies"
                           initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="space-y-8"
                        >
                          <div className="bg-sage-950 p-10 rounded-[3rem] shadow-2xl shadow-black/40 border border-sage-800 text-white">
                            <div className="flex items-center gap-4 mb-12">
                              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-white/10">
                                <Leaf className="w-6 h-6 text-sage-900" />
                              </div>
                              <h3 className="text-3xl font-serif font-bold text-white leading-none">Traditional Remedies</h3>
                            </div>
                            
                            {isIdentifying ? (
                              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                <Loader2 className="w-10 h-10 animate-spin text-sage-400" />
                                <p className="text-sage-400 font-medium">Synchronizing medical records...</p>
                              </div>
                            ) : result?.remedies?.[selectedLanguage] ? (
                              <div className="text-sage-100 font-medium leading-relaxed text-lg prose prose-invert prose-sage max-w-none">
                                <ReactMarkdown>{result.remedies[selectedLanguage]}</ReactMarkdown>
                              </div>
                            ) : (
                              <div className="p-8 bg-white/5 rounded-2xl border border-white/10 text-center">
                                <p className="text-sage-400">Remedy data is currently being verified by our botanical experts.</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}

                      {activeTab === 'alternatives' && (
                        <motion.div
                          key="alternatives"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="space-y-8"
                        >
                          <div className="bg-sage-950 p-10 rounded-[3rem] shadow-2xl shadow-black/40 border border-sage-800 text-white">
                            <div className="flex items-center gap-4 mb-8">
                              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-white/10">
                                <Share2 className="w-6 h-6 text-sage-900" />
                              </div>
                              <h3 className="text-3xl font-serif font-bold text-white leading-none">Phytotherapy Substitutes</h3>
                            </div>
                            <p className="text-sage-400 font-medium mb-10">In instances where <span className="text-white font-bold">{result.name || (result as any).plant_name}</span> is unavailable, these taxa offer analogous therapeutic profiles:</p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              {(result?.alternatives?.[selectedLanguage] || []).map((alt, i) => (
                                <motion.div 
                                  key={i} 
                                  whileHover={{ y: -5 }}
                                  className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 hover:bg-white/10 transition-all text-center"
                                >
                                  <h4 className="text-xl font-serif font-bold text-white">{alt}</h4>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {activeTab === 'cnn' && (
                        <motion.div
                          key="cnn"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="space-y-8"
                        >
                          <div className="bg-sage-950 p-10 rounded-[3rem] shadow-2xl shadow-black/40 border border-sage-800 text-white">
                            <div className="flex items-center gap-4 mb-8">
                              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-white/10">
                                <LayoutGrid className="w-6 h-6 text-sage-900" />
                              </div>
                              <h3 className="text-3xl font-serif font-bold text-white leading-none">Neural Feature Extraction</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                              <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10">
                                <span className="text-[10px] font-black uppercase tracking-widest text-sage-400 block mb-4">CNN Confidence Score</span>
                                <div className="flex items-end gap-2">
                                  <span className="text-6xl font-serif font-bold text-white">{((result?.cnnAnalysis?.confidence || 0) * 100).toFixed(1)}</span>
                                  <span className="text-sage-400 font-bold mb-2">%</span>
                                </div>
                                <div className="mt-6 h-2 bg-white/10 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(result?.cnnAnalysis?.confidence || 0) * 100}%` }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    className="h-full bg-sage-400"
                                  />
                                </div>
                              </div>
                              
                              <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10">
                                <span className="text-[10px] font-black uppercase tracking-widest text-sage-400 block mb-4">Extracted Visual Markers</span>
                                <div className="flex flex-wrap gap-2">
                                  {(result?.cnnAnalysis?.featuresIdentified || ['Analyzing traits...']).map((feature, i) => (
                                    <span key={i} className="px-3 py-1.5 bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider text-sage-200 border border-white/5">
                                      {feature}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10">
                              <span className="text-[10px] font-black uppercase tracking-widest text-sage-400 block mb-4">Neural Pattern Recognition</span>
                              <p className="text-sage-200 font-medium leading-relaxed italic">
                                "{result?.cnnAnalysis?.neuralMarkers || 'Processing neural patterns...'}"
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {}
                    <ResultCard 
                      historyId={currentHistoryId}
                      isExporting={isExporting}
                      onDownloadPDF={handleDownloadPDF}
                      onDownloadJPG={handleDownloadJPG}
                    />

                    <p className="text-center text-sage-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-8 max-w-md mx-auto leading-relaxed">
                      Disclaimer: Ethnobotanical data is for educational purposes. Consult clinical practitioners for medical intervention.
                    </p>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </section>
        </div>
      </main>

      {}
      {result && (
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
          <div ref={pdfRef} className="w-[800px] bg-white p-12 relative overflow-hidden" style={{ color: '#1a1a1a', fontFamily: 'serif' }}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-sage-50 rounded-bl-[8rem] -mr-16 -mt-16 opacity-50" />
            <h1 className="text-5xl font-bold mb-2 text-sage-900 border-b-4 border-sage-200 pb-4 inline-block">HerbalHeal Report</h1>
            
            <div className="mt-8 flex gap-8">
              {image && (
                <div className="w-64 h-64 rounded-3xl overflow-hidden shrink-0 shadow-lg">
                  <img src={image} alt="Specimen" className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <span className="text-sm font-black uppercase tracking-[0.3em] text-sage-400 block mb-2">Botanical Classification</span>
                <h2 className="text-4xl font-bold text-sage-900 mb-1">{(result.name || (result as any).plant_name || '').replace(/_/g, ' ')}</h2>
                <p className="text-2xl text-sage-500 italic mb-6">{result.scientific_name}</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {result.medicinalProperties?.map((prop, i) => (
                     <span key={i} className="px-3 py-1 bg-sage-100 text-sage-900 rounded-lg text-xs font-bold border border-sage-200">{prop}</span>
                  ))}
                </div>
                <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200">
                  <h3 className="text-amber-700 font-bold uppercase text-xs tracking-widest mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> Contraindications</h3>
                  <p className="text-amber-900 text-sm leading-relaxed">{result.warnings}</p>
                </div>
              </div>
            </div>

            <div className="mt-12 space-y-10">
              <section>
                <h3 className="text-2xl font-bold text-sage-900 mb-4 border-b border-sage-100 pb-2">Methodology & Overview</h3>
                <div className="text-sage-800 leading-relaxed text-lg prose prose-sage max-w-none">
                  <ReactMarkdown>{result.overview?.[selectedLanguage] || ''}</ReactMarkdown>
                </div>
              </section>

              <section>
                <h3 className="text-2xl font-bold text-sage-900 mb-4 border-b border-sage-100 pb-2 flex items-center gap-2"><Leaf className="w-6 h-6"/> Traditional Remedies</h3>
                <div className="text-sage-800 leading-relaxed text-lg prose prose-sage max-w-none bg-sage-50/50 p-6 rounded-3xl border border-sage-100">
                  <ReactMarkdown>{result.remedies?.[selectedLanguage] || 'No specific remedies documented.'}</ReactMarkdown>
                </div>
              </section>

              {result.cnnAnalysis && (
                <section className="bg-sage-900 text-white p-8 rounded-3xl mt-8">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><LayoutGrid className="w-5 h-5"/> Neural AI Analysis</h3>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <span className="block text-xs uppercase tracking-widest text-sage-400 mb-2">Confidence Score</span>
                      <span className="text-4xl font-bold">{((result.cnnAnalysis.confidence || 0) * 100).toFixed(1)}%</span>
                    </div>
                    <div>
                       <span className="block text-xs uppercase tracking-widest text-sage-400 mb-2">Extracted Markers</span>
                       <div className="flex flex-wrap gap-2 text-sm text-sage-200">
                         {result.cnnAnalysis.featuresIdentified?.map((f, i) => <span key={i} className="bg-white/10 px-2 py-1 rounded-md">{f}</span>)}
                       </div>
                    </div>
                  </div>
                </section>
              )}
            </div>
            <div className="mt-12 pt-6 border-t border-sage-100 text-center text-xs text-sage-400 font-medium tracking-widest uppercase">
              Generated by HerbalHeal Intelligence Engine • For Educational Purposes Only
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
