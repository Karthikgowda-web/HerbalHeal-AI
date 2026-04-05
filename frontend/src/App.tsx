import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Leaf, Info, AlertTriangle, Loader2, Download, Share2, FileText, Image as ImageIcon, Bookmark, BookmarkCheck, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { identifyPlant, suggestPlantsByIllness, type IdentificationResult, type PlantSuggestion } from './services/geminiService';
import { savePlantToLibrary, getSavedPlants, type SavedPlant } from './services/databaseService';
import { cn } from './lib/utils';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<PlantSuggestion[] | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedPlants, setSavedPlants] = useState<SavedPlant[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [loadingFactIndex, setLoadingFactIndex] = useState(0);
  const [librarySearch, setLibrarySearch] = useState('');

  const filteredLibrary = savedPlants.filter(plant => 
    plant.name.toLowerCase().includes(librarySearch.toLowerCase()) ||
    plant.scientificName.toLowerCase().includes(librarySearch.toLowerCase()) ||
    plant.description.toLowerCase().includes(librarySearch.toLowerCase())
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

  const handleSaveToLibrary = async () => {
    if (!result || !image || isSaving) return;
    setIsSaving(true);
    try {
      await savePlantToLibrary(result, image);
      setIsSaved(true);
      // Refresh library if we're in library mode
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

  useEffect(() => {
    if (mode === 'library') {
      fetchLibrary();
    }
  }, [mode]);

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
    try {
      const data = await identifyPlant(image);
      setResult(data);
    } catch (err) {
      setError("Failed to identify plant. Please try a clearer photo.");
      console.error(err);
    } finally {
      setIsIdentifying(false);
    }
  };

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const resultRef = useRef<HTMLDivElement>(null);

  const reset = () => {
    setImage(null);
    setResult(null);
    setError(null);
    setActiveTab('overview');
    setSuggestions(null);
    setSearchQuery('');
    setIsSaved(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setError(null);
    setSuggestions(null);
    setResult(null);
    try {
      const data = await suggestPlantsByIllness(searchQuery);
      setSuggestions(data);
    } catch (err) {
      setError("Failed to find suggestions. Please try another illness or condition.");
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const [isExporting, setIsExporting] = useState<'pdf' | 'jpg' | null>(null);

  const exportAsPDF = async () => {
    if (!resultRef.current || isExporting) return;
    setIsExporting('pdf');
    setError(null);
    try {
      const canvas = await html2canvas(resultRef.current, { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f9fafb' // sage-50 color
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      // If content is longer than one page, we might need multiple pages, 
      // but for now let's just ensure it fits or scales.
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${result?.name || 'herbal-report'}.pdf`);
    } catch (err) {
      console.error("PDF Export Error:", err);
      setError("Failed to generate PDF. Please try again.");
    } finally {
      setIsExporting(null);
    }
  };

  const exportAsJPG = async () => {
    if (!resultRef.current || isExporting) return;
    setIsExporting('jpg');
    setError(null);
    try {
      const canvas = await html2canvas(resultRef.current, { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f9fafb'
      });
      const link = document.createElement('a');
      link.download = `${result?.name || 'herbal-report'}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    } catch (err) {
      console.error("JPG Export Error:", err);
      setError("Failed to generate Image. Please try again.");
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="min-h-screen bg-sage-50 pb-12 relative overflow-hidden perspective-1000">
      {/* Atmospheric Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-sage-200/30 blur-[120px] rounded-full animate-float" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-sage-300/20 blur-[100px] rounded-full animate-float [animation-delay:2s]" />
        <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] bg-sage-200/40 blur-[150px] rounded-full animate-float [animation-delay:4s]" />
        
        {/* Floating Botanical Elements with 3D feel */}
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

      {/* Header */}
      <header className="relative bg-white/80 backdrop-blur-md border-b border-sage-200/50 py-8 px-4 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ 
                rotateY: 180, 
                rotateX: 15,
                scale: 1.1,
                z: 50
              }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="bg-sage-900 p-2.5 rounded-2xl shadow-lg shadow-sage-900/20 preserve-3d"
            >
              <Leaf className="text-white w-6 h-6" />
            </motion.div>
            <div>
              <h1 className="text-3xl font-serif font-bold text-sage-900 tracking-tight leading-none">HerbalHeal</h1>
              <p className="text-sage-500 text-[10px] uppercase tracking-[0.2em] font-bold mt-1">Botanical Intelligence</p>
            </div>
          </div>
          
          <nav className="bg-sage-100/50 p-1 rounded-2xl border border-sage-200/50 flex gap-1">
            {(['identify', 'search', 'library'] as ModeType[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); reset(); }}
                className={cn(
                  "px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2",
                  mode === m 
                    ? "bg-white text-sage-900 shadow-sm ring-1 ring-sage-200" 
                    : "text-sage-500 hover:text-sage-700"
                )}
              >
                {m === 'identify' && <Camera className="w-3.5 h-3.5" />}
                {m === 'search' && <Leaf className="w-3.5 h-3.5" />}
                {m === 'library' && <LayoutGrid className="w-3.5 h-3.5" />}
                {m}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="relative max-w-5xl mx-auto px-4 mt-12">
        <div className={cn("grid gap-12", mode === 'library' ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-12")}>
          {/* Left Column: Input */}
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
                    <p className="text-sage-500 text-sm mb-8">Capture or upload a photo of any medicinal herb.</p>
                    
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
                        
                        <div className="flex items-center gap-4">
                          <div className="h-px flex-1 bg-sage-100" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-sage-300">Or</span>
                          <div className="h-px flex-1 bg-sage-100" />
                        </div>

                        <motion.button 
                          whileHover={{ scale: 1.02, translateZ: 20 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={startCamera}
                          className="w-full py-5 bg-sage-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl shadow-sage-900/20"
                        >
                          <Camera className="w-5 h-5" />
                          Open Camera
                        </motion.button>
                      </div>
                    ) : isCameraOpen ? (
                      <div className="relative rounded-[2rem] overflow-hidden bg-black aspect-[4/3] shadow-2xl">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <div className="absolute inset-0 border-[12px] border-white/10 pointer-events-none" />
                        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6">
                          <motion.button 
                            whileTap={{ scale: 0.9 }}
                            onClick={capturePhoto}
                            className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl"
                          >
                            <div className="w-12 h-12 border-4 border-sage-900 rounded-full" />
                          </motion.button>
                          <motion.button 
                            whileTap={{ scale: 0.9 }}
                            onClick={stopCamera}
                            className="w-16 h-16 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-white/30 transition-colors"
                          >
                            <X className="w-6 h-6" />
                          </motion.button>
                        </div>
                        <canvas ref={canvasRef} className="hidden" />
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="relative rounded-[2rem] overflow-hidden aspect-[4/3] shadow-2xl group/preview">
                          <img src={image!} alt="Selected plant" className={cn("w-full h-full object-cover transition-all duration-500", isIdentifying && "brightness-50 grayscale-[0.5]")} />
                          
                          {isIdentifying && (
                            <div className="absolute inset-0 pointer-events-none">
                              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-sage-400/30 to-transparent h-1/4 w-full animate-scan" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-full h-px bg-sage-400/50 shadow-[0_0_15px_rgba(122,156,122,0.5)] animate-scan" />
                              </div>
                            </div>
                          )}

                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/preview:opacity-100 transition-opacity" />
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={reset}
                            className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-md text-sage-900 rounded-full flex items-center justify-center shadow-lg"
                          >
                            <X className="w-5 h-5" />
                          </motion.button>
                        </div>
                        
                        <motion.button 
                          whileHover={{ scale: 1.02, translateZ: 20 }}
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
                    
                    <form onSubmit={handleSearch} className="space-y-6">
                      <div className="relative group">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
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

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm flex items-start gap-3"
              >
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <p className="font-medium">{error}</p>
              </motion.div>
            )}

            <motion.div 
              whileHover={{ rotateY: 5, rotateX: -2, z: 10 }}
              className="bg-sage-900/5 p-8 rounded-[2rem] border border-sage-900/5 preserve-3d"
            >
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-sage-900 flex items-center gap-2 mb-4">
                <Info className="w-4 h-4" />
                Methodology
              </h3>
              <p className="text-sm text-sage-600 leading-relaxed font-medium">
                {mode === 'identify' 
                  ? "Our botanical intelligence engine analyzes visual markers—leaf venation, phyllotaxy, and floral structure—to provide precise identification and traditional medicinal context."
                  : "We cross-reference your symptoms with centuries of ethnobotanical records to suggest the most effective and safe herbal interventions."
                }
              </p>
            </motion.div>
          </section>

          {/* Right Column: Results / Library */}
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
                          key={plant.id} 
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
                          className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl shadow-sage-900/5 border border-sage-100 hover:shadow-sage-900/10 transition-all cursor-pointer group preserve-3d"
                          onClick={() => {
                            setResult(plant);
                            setImage(plant.imageUrl);
                            setMode('identify');
                            setIsSaved(true);
                          }}
                        >
                          <div className="aspect-[4/3] relative overflow-hidden">
                            <img src={plant.imageUrl} alt={plant.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-t from-sage-900/80 via-sage-900/20 to-transparent flex items-end p-8">
                              <div>
                                <h3 className="text-white text-2xl font-serif font-bold leading-tight">{plant.name}</h3>
                                <p className="text-sage-200 text-xs italic mt-1 font-medium">{plant.scientificName}</p>
                              </div>
                            </div>
                          </div>
                          <div className="p-8">
                            <p className="text-sage-600 text-sm line-clamp-2 leading-relaxed font-medium">{plant.description}</p>
                            <div className="mt-6 flex items-center text-[10px] font-black uppercase tracking-widest text-sage-400 group-hover:text-sage-900 transition-colors">
                              View Details <Share2 className="w-3 h-3 ml-2" />
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
                              <p className="text-sage-400 italic font-serif text-xl">{plant.scientificName}</p>
                              <p className="text-sage-200 font-medium leading-relaxed text-lg">{plant.description}</p>
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
                  key="result"
                  initial={{ opacity: 0, scale: 0.95, rotateY: 10 }}
                  animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                  whileHover={{ rotateY: -2, rotateX: 1, z: 5 }}
                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  className="space-y-8 preserve-3d"
                >
                  {/* Tabs Navigation */}
                  <div className="flex p-1.5 bg-white/50 backdrop-blur-md rounded-2xl border border-sage-200 shadow-sm">
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
                          {/* Main Info Card - Dark Theme Variant */}
                          <div className="bg-sage-950 p-10 rounded-[3rem] shadow-2xl shadow-black/40 border border-sage-800 relative overflow-hidden text-white">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-sage-900/50 rounded-bl-[6rem] -mr-12 -mt-12" />
                            
                            <div className="relative">
                              <div className="mb-10">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-sage-400 mb-2 block">Botanical Classification</span>
                                <h2 className="text-5xl font-serif font-bold text-white leading-tight">{result.name}</h2>
                                <p className="text-sage-300 italic font-serif text-2xl mt-1">{result.scientificName}</p>
                              </div>
                              
                              <div className="text-sage-100 text-lg leading-relaxed mb-10 prose prose-invert prose-sage max-w-none font-medium">
                                <ReactMarkdown>{result.description}</ReactMarkdown>
                              </div>

                              <div className="flex flex-wrap gap-3">
                                {result.medicinalProperties.map((prop, i) => (
                                  <span key={i} className="px-4 py-2 bg-white/10 text-white rounded-xl text-xs font-bold border border-white/10 backdrop-blur-sm">
                                    {prop}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Warnings Card - Dark Theme Variant */}
                          <div className="bg-amber-950/30 backdrop-blur-md p-8 rounded-[2.5rem] border border-amber-900/30 shadow-lg shadow-black/20">
                            <h3 className="text-amber-400 font-black flex items-center gap-3 mb-4 text-[10px] uppercase tracking-[0.3em]">
                              <AlertTriangle className="w-5 h-5" />
                              Contraindications
                            </h3>
                            <p className="text-amber-100/80 font-medium leading-relaxed">
                              {result.warnings}
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
                            
                            <div className="grid grid-cols-1 gap-12">
                              {result.remedies.map((remedy, i) => (
                                <div key={i} className="group">
                                  <div className="flex items-center gap-4 mb-6">
                                    <div className="h-px flex-1 bg-white/10" />
                                    <h4 className="text-3xl font-serif font-bold text-white tracking-tight">{remedy.condition}</h4>
                                    <div className="h-px flex-1 bg-white/10" />
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                                    <div className="md:col-span-7 space-y-4">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-sage-400 block">Preparation Protocol</span>
                                        <button 
                                          onClick={() => copyToClipboard(remedy.preparation, i)}
                                          className="text-[10px] font-bold uppercase tracking-widest text-sage-400 hover:text-white flex items-center gap-1.5 transition-colors"
                                        >
                                          {copyingIndex === i ? (
                                            <>Copied <BookmarkCheck className="w-3 h-3" /></>
                                          ) : (
                                            <>Copy <Share2 className="w-3 h-3" /></>
                                          )}
                                        </button>
                                      </div>
                                      <div className="text-sage-100 font-medium leading-relaxed text-lg prose prose-invert prose-sage max-w-none prose-p:m-0">
                                        <ReactMarkdown>{remedy.preparation}</ReactMarkdown>
                                      </div>
                                    </div>
                                    <div className="md:col-span-5">
                                      <div className="bg-white/5 text-white p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden h-full flex flex-col justify-center">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-bl-full -mr-8 -mt-8" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-sage-400 block mb-4">Expected Efficacy</span>
                                        <p className="text-xl font-serif italic leading-relaxed">"{remedy.expectedOutcome}"</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
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
                            <p className="text-sage-400 font-medium mb-10">In instances where <span className="text-white font-bold">{result.name}</span> is unavailable, these taxa offer analogous therapeutic profiles:</p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              {result.alternatives.map((alt, i) => (
                                <motion.div 
                                  key={i} 
                                  whileHover={{ y: -5 }}
                                  className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 hover:bg-white/10 transition-all"
                                >
                                  <h4 className="text-xl font-serif font-bold text-white mb-3">{alt.name}</h4>
                                  <p className="text-sage-300 text-sm font-medium leading-relaxed">{alt.reason}</p>
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
                                  <span className="text-6xl font-serif font-bold text-white">{(result.cnnAnalysis.confidence * 100).toFixed(1)}</span>
                                  <span className="text-sage-400 font-bold mb-2">%</span>
                                </div>
                                <div className="mt-6 h-2 bg-white/10 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${result.cnnAnalysis.confidence * 100}%` }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    className="h-full bg-sage-400"
                                  />
                                </div>
                              </div>
                              
                              <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10">
                                <span className="text-[10px] font-black uppercase tracking-widest text-sage-400 block mb-4">Extracted Visual Markers</span>
                                <div className="flex flex-wrap gap-2">
                                  {result.cnnAnalysis.featuresIdentified.map((feature, i) => (
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
                                "{result.cnnAnalysis.neuralMarkers}"
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Export Actions */}
                    <div className="space-y-4 pt-4">
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSaveToLibrary}
                        disabled={isSaving || isSaved}
                        className={cn(
                          "w-full py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-xl",
                          isSaved 
                            ? "bg-white/10 text-white border border-white/10 backdrop-blur-md" 
                            : "bg-white text-sage-900 hover:bg-sage-50 shadow-white/10"
                        )}
                      >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : isSaved ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                        {isSaving ? "Archiving..." : isSaved ? "Archived in Library" : "Archive to Library"}
                      </motion.button>
                      
                      <div className="flex flex-col sm:flex-row gap-4">
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={exportAsPDF}
                          disabled={isExporting !== null}
                          className="flex-1 py-5 bg-sage-900/50 backdrop-blur-md border border-white/10 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-sage-900/80 transition-all shadow-lg shadow-black/20 disabled:opacity-50"
                        >
                          {isExporting === 'pdf' ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                          {isExporting === 'pdf' ? "Generating..." : "Download as PDF"}
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={exportAsJPG}
                          disabled={isExporting !== null}
                          className="flex-1 py-5 bg-sage-900/50 backdrop-blur-md border border-white/10 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-sage-900/80 transition-all shadow-lg shadow-black/20 disabled:opacity-50"
                        >
                          {isExporting === 'jpg' ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                          {isExporting === 'jpg' ? "Generating..." : "Download as JPG"}
                        </motion.button>
                      </div>
                    </div>

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
    </div>
  );
}
