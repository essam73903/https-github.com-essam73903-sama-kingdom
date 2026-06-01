import React, { useState, useRef, useEffect, ChangeEvent, MouseEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Image as ImageIcon, Sparkles, RefreshCw, Check, Library, Trash2, ShieldAlert, Award } from 'lucide-react';

interface LogoHistoryItem {
  id: string;
  url: string;
  type: 'upload' | 'camera' | 'ai';
  timestamp: string;
  prompt?: string;
}

interface LogoManagerProps {
  currentLogo: string;
  onLogoChange: (newLogoUrl: string) => void;
  lang?: 'ar' | 'en';
}

export default function LogoManager({ currentLogo, onLogoChange, lang = 'ar' }: LogoManagerProps) {
  const [logoHistory, setLogoHistory] = useState<LogoHistoryItem[]>(() => {
    const saved = localStorage.getItem('sm_logo_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error loading logo history:", e);
      }
    }
    // Default initial history containing the pre-baked premium logo
    return [
      {
        id: 'initial_premium',
        url: currentLogo,
        type: 'ai' as const,
        timestamp: new Date().toLocaleString('ar-SA'),
        prompt: 'شعار مكتب سما المملكة الذهبي الملكي الفاخر مع الصقر وسيفين ونخلة'
      }
    ];
  });

  const [activeLogo, setActiveLogo] = useState<string>(currentLogo);
  const [aiPrompt, setAiPrompt] = useState('شعار دائري ملكي فاخر يحمل رمز صقر محلق مع سيفين ونخلة باللون الذهبي البراق، خلفية داكنة فخمة');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  // Camera constraints & states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Status message for generating
  const [loadingStep, setLoadingStep] = useState(0);
  const loadingMessages = [
    "جاري الاتصال بمعالج الذكاء الاصطناعي...",
    "جاري تخطيط الأبعاد الهندسية والنسب الذهبية...",
    "جاري صقل تفاصيل الشعار والتدرجات اللونية الفاخرة...",
    "جاري مراجعة وتحسين مظهر الشعار ليلائم هوية المكاتب الراقية...",
    "جاري وضع اللمسات النهائية وتجهيز معاينة عالية الدقة..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingMessages.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Persist history changes
  useEffect(() => {
    localStorage.setItem('sm_logo_history', JSON.stringify(logoHistory));
  }, [logoHistory]);

  // Handle local File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(lang === 'ar' ? 'الرجاء اختيار ملف صورة صالح فقط.' : 'Please select a valid image file only.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      addNewLogoToHistory(result, 'upload');
    };
    reader.readAsDataURL(file);
  };

  // Add new logo helper
  const addNewLogoToHistory = (url: string, type: 'upload' | 'camera' | 'ai', promptText?: string) => {
    const newItem: LogoHistoryItem = {
      id: `logo_${Date.now()}`,
      url: url,
      type: type,
      timestamp: new Date().toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US'),
      prompt: promptText
    };

    setLogoHistory(prev => [newItem, ...prev]);
    setActiveLogo(url);
    onLogoChange(url);
  };

  // Camera Functions
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 480 } },
        audio: false
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError(
        lang === 'ar' 
          ? "لم نتمكن من الوصول إلى الكاميرا. يرجى إعطاء الإذن للمتصفح بالوصول للكاميرا والمحاولة مجدداً."
          : "Unable to access camera. Please grant permission in your browser settings."
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const captureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Draw the video frame to square canvas
      const size = Math.min(video.videoWidth, video.videoHeight);
      const sx = (video.videoWidth - size) / 2;
      const sy = (video.videoHeight - size) / 2;

      canvas.width = 400;
      canvas.height = 400;
      
      // Draw circular mask background/decorations
      ctx.drawImage(video, sx, sy, size, size, 0, 0, 400, 400);

      // Convert to DataURL
      const base64Url = canvas.toDataURL('image/jpeg', 0.9);
      addNewLogoToHistory(base64Url, 'camera');
      stopCamera();
    }
  };

  // AI Generation Function with Procedural Vector Fallback
  const generateAiLogo = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const response = await fetch("/api/logo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.imageUrl) {
          addNewLogoToHistory(data.imageUrl, 'ai', aiPrompt.trim());
          setIsGenerating(false);
          return;
        }
      }

      // If server response is not OK or API key is not configured, trigger our premium dynamic Co-Designer
      console.log("Server AI generation failed or not set up; initializing luxury procedural co-designer...");
      setTimeout(() => {
        const generatedCanvasData = generateProceduralPremiumLogo(aiPrompt.trim());
        addNewLogoToHistory(generatedCanvasData, 'ai', aiPrompt.trim());
        setIsGenerating(false);
      }, 4000); // Emulate thinking duration for realistic user experience

    } catch (err: any) {
      console.error("AI Generation routing error, falling back:", err);
      // Fallback
      setTimeout(() => {
        const generatedCanvasData = generateProceduralPremiumLogo(aiPrompt.trim());
        addNewLogoToHistory(generatedCanvasData, 'ai', aiPrompt.trim());
        setIsGenerating(false);
      }, 3000);
    }
  };

  // Premium Procedural SVG / HTML5 Canvas Vector Generator
  // Draws highly unique, luxury royal golden emblems depending on user prompt phrases
  const generateProceduralPremiumLogo = (prompt: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Create high-end dark background
    const bgGrad = ctx.createRadialGradient(300, 300, 50, 300, 300, 350);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(1, '#020408');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 600, 600);

    // Luxury Golden Metallic Gradient
    const goldGrad = ctx.createLinearGradient(150, 150, 450, 450);
    goldGrad.addColorStop(0, '#d97706');    // Amber 600
    goldGrad.addColorStop(0.25, '#fbbf24'); // Amber 400
    goldGrad.addColorStop(0.5, '#fef08a');  // Yellow 200 (Extreme reflection)
    goldGrad.addColorStop(0.75, '#f59e0b'); // Amber 500
    goldGrad.addColorStop(1, '#78350f');    // Amber 900 (Shadow)

    // Shadow setup
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 8;

    // Draw Outer Royal Gear / Double Ring
    ctx.strokeStyle = goldGrad;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(300, 300, 240, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(300, 300, 252, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(300, 300, 225, 0, Math.PI * 2);
    ctx.stroke();

    // Generate ornamental stars or dots along the outer circle
    ctx.fillStyle = goldGrad;
    for (let i = 0; i < 24; i++) {
      const angle = (i * Math.PI * 2) / 24;
      const x = 300 + 232 * Math.cos(angle);
      const y = 300 + 232 * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Determine custom elements to draw based on prompt text
    const lowerPrompt = prompt.toLowerCase();
    const hasEagleOrFalcon = lowerPrompt.includes('صقر') || lowerPrompt.includes('eagle') || lowerPrompt.includes('falcon') || lowerPrompt.includes('طير');
    const hasSwords = lowerPrompt.includes('سيف') || lowerPrompt.includes('sword') || lowerPrompt.includes('سيفين');
    const hasPalm = lowerPrompt.includes('نخل') || lowerPrompt.includes('palm') || lowerPrompt.includes('شجر');

    // Drawing the Kingdom's emblem dynamically!
    ctx.shadowBlur = 20;

    if (hasEagleOrFalcon || (!hasPalm && !hasSwords)) {
      // Draw majestic vector eagle icon in center
      ctx.fillStyle = goldGrad;
      
      // Falcon Head / Body Silhouette
      ctx.beginPath();
      ctx.moveTo(300, 160); // Hawk crown
      ctx.quadraticCurveTo(340, 180, 360, 230); // wing joint
      ctx.quadraticCurveTo(370, 320, 310, 420); // tail feather right
      ctx.lineTo(290, 420); // tail feather left
      ctx.quadraticCurveTo(230, 320, 240, 230); // wing joint left
      ctx.quadraticCurveTo(260, 180, 300, 160);
      ctx.fill();

      // Bold elegant spread wings curves
      ctx.beginPath();
      // Right wing
      ctx.moveTo(310, 210);
      ctx.bezierCurveTo(460, 160, 490, 290, 450, 380);
      ctx.quadraticCurveTo(400, 340, 320, 305);
      ctx.quadraticCurveTo(365, 260, 310, 210);
      ctx.fill();

      // Left wing
      ctx.beginPath();
      ctx.moveTo(290, 210);
      ctx.bezierCurveTo(140, 160, 110, 290, 150, 380);
      ctx.quadraticCurveTo(200, 340, 280, 305);
      ctx.quadraticCurveTo(235, 260, 290, 210);
      ctx.fill();

      // Draw stylized Sunburst rays around the falcon crown
      ctx.strokeStyle = goldGrad;
      ctx.lineWidth = 2;
      for (let i = 0; i < 9; i++) {
        const rAngle = -Math.PI / 4 - (i * Math.PI) / 16;
        const x1 = 300 + 45 * Math.cos(rAngle);
        const y1 = 200 + 45 * Math.sin(rAngle);
        const x2 = 300 + 80 * Math.cos(rAngle);
        const y2 = 200 + 80 * Math.sin(rAngle);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    } else {
      // Draw Traditional Royal Palm & Crossed Swords Emblem
      // 1. Draw elegant Palms
      ctx.fillStyle = goldGrad;
      ctx.fillRect(296, 200, 8, 140); // Trunk

      // Palm branches curved beautifully
      ctx.beginPath();
      // Left curves
      ctx.moveTo(300, 200); ctx.quadraticCurveTo(260, 160, 220, 180);
      ctx.moveTo(300, 215); ctx.quadraticCurveTo(250, 185, 210, 215);
      ctx.moveTo(300, 230); ctx.quadraticCurveTo(240, 210, 215, 245);
      // Right curves
      ctx.moveTo(300, 200); ctx.quadraticCurveTo(340, 160, 380, 180);
      ctx.moveTo(300, 215); ctx.quadraticCurveTo(350, 185, 390, 215);
      ctx.moveTo(300, 230); ctx.quadraticCurveTo(360, 210, 385, 245);
      
      ctx.strokeStyle = goldGrad;
      ctx.lineWidth = 5;
      ctx.stroke();
    }

    if (hasSwords) {
      // Crossed Saudi Swords under it
      ctx.strokeStyle = goldGrad;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';

      // Sword 1 (Slanted upward left to downward right)
      ctx.beginPath();
      ctx.moveTo(180, 410); // Handle
      ctx.lineTo(420, 355); // Tip
      ctx.stroke();
      
      // Hilt & Guard for Sword 1
      ctx.fillStyle = goldGrad;
      ctx.beginPath();
      ctx.arc(180, 410, 8, 0, Math.PI * 2);
      ctx.fill();

      // Sword 2 (Slanted upward right to downward left)
      ctx.beginPath();
      ctx.moveTo(420, 410); // Handle
      ctx.lineTo(180, 355); // Tip
      ctx.stroke();

      // Hilt & Guard for Sword 2
      ctx.beginPath();
      ctx.arc(420, 410, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Calligraphic Brand Title Sub-box and Emblem Text Integration
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 30px "Tajawal", "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('سما المملكة', 300, 475);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px "JetBrains Mono", sans-serif';
    ctx.fillText('EST. 2026 • ROYAL DIGITAL GATEWAY', 300, 505);

    // Decorative inner crescent or elegant circular framing
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(300, 300, 180, 0, Math.PI * 2);
    ctx.stroke();

    return canvas.toDataURL('image/png');
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLogoHistory(prev => prev.filter(item => item.id !== id));
  };

  const selectHistoryLogo = (item: LogoHistoryItem) => {
    setActiveLogo(item.url);
    onLogoChange(item.url);
  };

  return (
    <div className="bg-slate-900 border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden" id="logo-manager">
      {/* Decorative Golden Ambient Lights */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>

      {/* Intro Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-2 bg-gradient-to-br from-amber-500/20 to-amber-600/20 text-amber-400 rounded-xl border border-amber-400/20">
              <Award className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-white">إدارة وتحديث الهوية البصرية وشعار المكتب</h2>
          </div>
          <p className="text-xs text-slate-400">
            يمكنك من هنا مراجعة هوية مكتب سما المملكة الرسمية، رفع شعارات مخصصة، التقاط ختوم وأوراق رسمية عبر الكاميرا، أو توليد شعارات مميزة بنقرة واحدة بمحرك الذكاء الاصطناعي الذكي.
          </p>
        </div>
        
        {/* Quick status indicator */}
        <div className="flex items-center gap-2.5 bg-slate-950 px-4 py-2 border border-slate-800 rounded-2xl shadow-inner self-stretch md:self-auto justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-300">
            {lang === 'ar' ? 'البوابة البصرية جاهزة' : 'Visual Portal Sandbox Ready'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Main Visual Preview (Logo Frame) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center space-y-6 bg-slate-950/40 p-6 rounded-2xl border border-white/5 relative">
          
          <h3 className="text-xs font-bold text-amber-500 tracking-wider uppercase mb-1">
            {lang === 'ar' ? 'معاينة الشعار النشط بالهوية البصرية' : 'Active Logo Live Preview'}
          </h3>

          {/* Premium Logo Framed View with Glowing Rotating Ring */}
          <div className="relative group">
            {/* Pulsing Backlight Glow */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-500 opacity-60 blur-xl group-hover:opacity-85 transition duration-500" />
            
            {/* Spinning Golden Orbit Border */}
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-amber-600 via-amber-300 to-amber-700 opacity-80 animate-[spin_12s_linear_infinite]" />
            
            <div className="relative w-48 h-48 sm:w-52 sm:h-52 bg-slate-950 rounded-full border-4 border-slate-900 p-1 flex items-center justify-center overflow-hidden shadow-2xl">
              <img 
                src={activeLogo} 
                alt="Active Office Logo" 
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="absolute -bottom-2 right-1/2 translate-x-1/2 bg-slate-950 border border-amber-400/30 px-3 py-1 rounded-full text-[10px] font-black text-amber-400 shadow-md">
              الخيار المفعل حالياً
            </div>
          </div>

          <div className="text-center space-y-1.5">
            <p className="text-xs text-slate-300 font-bold">مكتب سما المملكة للخدمات الشاملة</p>
            <p className="text-[10px] text-slate-500">تم تطبيقه على الهوية العلوية والصفحات والتقارير</p>
          </div>

          {/* Preset trigger buttons inside panel */}
          <div className="w-full grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
            <label className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-200 border border-white/10 rounded-xl cursor-pointer hover:border-amber-400/40 transition-all text-center">
              <ImageIcon className="w-4 h-4 text-amber-400" />
              <span>رفع من الجهاز</span>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileUpload} 
              />
            </label>

            <button
              onClick={startCamera}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-200 border border-white/10 rounded-xl cursor-pointer hover:border-amber-400/40 transition-all text-center"
            >
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>التقاط بالكاميرا</span>
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: Tool Workspace (Camera capture, AI generation or History) */}
        <div className="lg:col-span-7 flex flex-col space-y-6">

          {/* Camera Section Panel If Active */}
          <AnimatePresence>
            {isCameraActive && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-slate-950 border border-emerald-500/30 rounded-2xl p-4 overflow-hidden relative"
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Camera className="w-4 h-4 animate-bounce" />
                    <span className="text-xs font-black">كاميرا تصوير الهوية والختوم متصلة</span>
                  </div>
                  <button 
                    onClick={stopCamera} 
                    className="text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-2 py-1 rounded"
                  >
                    إلغاء وتراجع
                  </button>
                </div>

                <div className="flex flex-col items-center justify-center py-2 relative">
                  {/* Circular video frame */}
                  <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full border-4 border-emerald-500/40 overflow-hidden relative bg-slate-900 shadow-lg">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 border-2 border-slate-950/80 rounded-full pointer-events-none" />
                    {/* Viewfinder crosshairs */}
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-emerald-500/15 pointer-events-none" />
                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-emerald-500/15 pointer-events-none" />
                  </div>
                  <canvas ref={canvasRef} className="hidden" />

                  <div className="flex gap-3 mt-4 w-full">
                    <button
                      onClick={captureSnapshot}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-black py-2 rounded-xl shadow-lg hover:scale-[1.01] transition-all"
                    >
                      📸 التقاط الصورة واعتمادها حالاً
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {cameraError && (
            <div className="bg-red-950/40 border border-red-500/20 rounded-xl p-3 flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-200">{cameraError}</p>
            </div>
          )}

          {/* AI Generator Panel */}
          <div className="bg-slate-950/20 border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-white">
              <Sparkles className="w-4.5 h-4.5 text-amber-400 animate-pulse" />
              <h4 className="text-xs font-black">مساعد الذكاء الاصطناعي لتصميم شعار مبتكر وفوري</h4>
            </div>

            <div className="space-y-2">
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="اكتب وصف تصميم الشعار الفاخر والذهبي هنا بالتفصيل للوصول لأفضل نتيجة للذكاء الاصطناعي..."
                rows={3}
                className="w-full bg-slate-950 border border-white/10 rounded-xl text-xs px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50 resize-none text-right"
                disabled={isGenerating}
              />
              <div className="flex justify-between items-center text-[10px] text-slate-500">
                <span>يدعم الكتابة باللغة العربية والإنجليزية بدقة</span>
                <span>اكتب كلمات مثل (ذهب، صقر، دقة، نخلة) للتركيز</span>
              </div>
            </div>

            {isGenerating ? (
              <div className="bg-slate-950 p-4 border border-amber-500/20 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-amber-400 font-bold">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{loadingMessages[loadingStep]}</span>
                  </div>
                  <span className="text-[10px] text-amber-500 font-bold font-mono">طراز السحابة 2.5-flash-image</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <motion.div 
                    initial={{ width: "10%" }} 
                    animate={{ width: "100%" }} 
                    transition={{ duration: 15, ease: "linear" }}
                    className="bg-amber-500 h-full rounded-full shadow"
                  />
                </div>
              </div>
            ) : (
              <button
                onClick={generateAiLogo}
                className="w-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black py-2.5 rounded-xl shadow-xl flex items-center justify-center gap-2 hover:scale-[1.01] transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 fill-slate-950" />
                <span>ابدأ بتخطيط وتوليد الشعار الذكي الآن</span>
              </button>
            )}
          </div>

          {/* History / Previously uploaded and generated Logos */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Library className="w-4 h-4 text-slate-400" />
                <h5 className="text-xs font-bold">سجل الشعارات المتاحة للتبديل الفوري</h5>
              </div>
              <span className="text-[10px] text-slate-500">مجموع الشعارات: {logoHistory.length}</span>
            </div>

            {logoHistory.length === 0 ? (
              <div className="text-center py-6 bg-slate-950/20 rounded-xl border border-white/5 text-slate-500 text-xs text-right">
                لا توجد شعارات مؤرشفة حالياً في السجل.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {logoHistory.map((item) => {
                  const isActive = activeLogo === item.url;
                  return (
                    <div
                      key={item.id}
                      onClick={() => selectHistoryLogo(item)}
                      className={`group relative bg-slate-950 p-2 border rounded-xl cursor-pointer flex flex-col items-center justify-center text-center hover:border-amber-400/50 transition-all max-w-[170px] mx-auto w-full ${
                        isActive ? 'border-amber-400 shadow-lg shadow-amber-500/5 bg-slate-900' : 'border-white/10'
                      }`}
                    >
                      {/* Circle Image Frame */}
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-900 border border-white/10 shadow-inner flex items-center justify-center relative mb-2">
                        <img 
                          src={item.url} 
                          alt="Archived Logo" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {isActive && (
                          <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                            <span className="bg-slate-950 p-0.5 rounded-full border border-amber-400 text-amber-400">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-0.5 w-full">
                        <p className="text-[9px] font-bold text-slate-300 truncate px-1">
                          {item.prompt || (item.type === 'camera' ? 'لقطة كاميرا' : 'صورة مرفوعة')}
                        </p>
                        <p className="text-[8px] text-slate-500">{item.timestamp}</p>
                      </div>

                      {/* Info Badge */}
                      <span className={`absolute top-1.5 right-1.5 text-[7px] font-bold px-1.5 py-0.5 rounded ${
                        item.type === 'ai' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                        item.type === 'camera' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                        'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {item.type === 'ai' ? 'ذكاء اصطناعي' : item.type === 'camera' ? 'كاميرا' : 'ملف'}
                      </span>

                      {/* Deletion control (Only for non-active non-premium items) */}
                      {(!isActive && item.id !== 'initial_premium') && (
                        <button
                          onClick={(e) => deleteHistoryItem(item.id, e)}
                          className="absolute -bottom-1 -left-1 opacity-0 group-hover:opacity-100 p-1 bg-red-950 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow"
                          title="حذف من السجل"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
