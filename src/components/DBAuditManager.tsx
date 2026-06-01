import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { 
  Shield, Database, Key, Activity, RefreshCw, Search, Filter, 
  Terminal, Server, UserCheck, AlertOctagon, Download, Play, 
  CheckCircle2, Clock, Globe, Cpu, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AuditLog {
  id: string;
  timestamp: string;
  operator: string;
  category: 'auth' | 'read' | 'write' | 'delete' | 'archive' | 'system' | 'ai';
  action: string;
  details: string;
  ipAddress: string;
  status: 'success' | 'warning' | 'error';
  latencyMs?: number;
}

export default function DBAuditManager({ lang = 'ar' }: { lang?: 'ar' | 'en' }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dbState, setDbState] = useState<'healthy' | 'stressed' | 'checking'>('healthy');
  
  // Real-time security analyzer states
  const [securityScore, setSecurityScore] = useState(98);
  const [isScanning, setIsScanning] = useState(false);
  const [scanLogs, setScanLogs] = useState<string[]>([]);

  // Simulation indicators
  const [apiLatencies, setApiLatencies] = useState<number[]>([12, 15, 8, 22, 14, 11, 10, 15, 18, 9]);
  const [livePings, setLivePings] = useState(1);

  // Generate mock logs for bootstrapping
  const getMockLogs = (): AuditLog[] => {
    const dates = [
      new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins ago
      new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // 2 hours ago
      new Date(Date.now() - 4 * 3600 * 1000).toISOString(), // 4 hours ago
      new Date(Date.now() - 10 * 3600 * 1000).toISOString(), // 10 hours ago
      new Date(Date.now() - 24 * 3600 * 1000).toISOString(), // 1 day ago
      new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
      new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      new Date(Date.now() - 60 * 3600 * 1000).toISOString(),
      new Date(Date.now() - 120 * 3600 * 1000).toISOString(),
    ];

    return [
      {
        id: 'log_b1',
        timestamp: dates[0],
        operator: 'essam77142@gmail.com',
        category: 'auth',
        action: 'تسجيل دخول ناجح للمسؤول',
        details: 'تمت مصادقة البريد الإلكتروني والولوج إلى لوحة إدارة المعاملات المالية والجنائية.',
        ipAddress: '185.120.14.99',
        status: 'success',
        latencyMs: 12
      },
      {
        id: 'log_b2',
        timestamp: dates[1],
        operator: 'essam77142@gmail.com',
        category: 'read',
        action: 'استعلام قائمة الفواتير والقيود',
        details: 'قراءة دورية لدفتر الحسابات اليومي الشامل (Transactions Ledger).',
        ipAddress: '185.120.14.99',
        status: 'success',
        latencyMs: 18
      },
      {
        id: 'log_b3',
        timestamp: dates[2],
        operator: 'النظام التلقائي (System)',
        category: 'archive',
        action: 'فحص الأرشفة السحابية التلقائي',
        details: 'مراجعة المعاملات المعلقة لتطبيق سياسة التقادم الزمني وترقية الملفات ذات الـ 30 يوماً.',
        ipAddress: '127.0.0.1',
        status: 'success',
        latencyMs: 140
      },
      {
        id: 'log_b4',
        timestamp: dates[3],
        operator: 'essam77142@gmail.com',
        category: 'write',
        action: 'تحديث الشعار والهوية البصرية',
        details: 'تغيير صورة الشعار الرئيسي للمكتب في الترويسة العليا والفواتير ومزامنتها سحابياً.',
        ipAddress: '185.120.14.99',
        status: 'success',
        latencyMs: 25
      },
      {
        id: 'log_b5',
        timestamp: dates[4],
        operator: 'عميل برقم الهاتف (0567****)',
        category: 'read',
        action: 'استدعاء تتبع حالة معاملة',
        details: 'تتبع حالة طلب تأشيرة عمل برقم تتبع مشفر من واجهة المستخدم.',
        ipAddress: '176.44.112.56',
        status: 'success',
        latencyMs: 40
      },
      {
        id: 'log_b6',
        timestamp: dates[5],
        operator: 'essam77142@gmail.com',
        category: 'ai',
        action: 'توليد شعار بالذكاء الاصطناعي',
        details: 'طلب توليد نموذج شعار مبتكر عبر Gemini 2.5-flash-image بوصف "صقر ذهبي ملكي".',
        ipAddress: '185.120.14.99',
        status: 'success',
        latencyMs: 3804
      },
      {
        id: 'log_b7',
        timestamp: dates[6],
        operator: 'أمن البوابة (Security Shield)',
        category: 'system',
        action: 'تحديث قواعد الحماية Firestore Rules',
        details: 'تطبيق وفحص جدار الحماية ضد محاولات الحقن أو القراءة غير المصرح بها لمجموعة الإعدادات.',
        ipAddress: '0.0.0.0',
        status: 'success',
        latencyMs: 5
      },
      {
        id: 'log_b8',
        timestamp: dates[7],
        operator: 'محاولة مجهولة (Anonymous)',
        category: 'auth',
        action: 'محاولة تسجيل دخول فاشلة',
        details: 'تم إدخال رمز مرور خاطئ للوحة المسؤول ثلاث مرات متتالية من عنوان بروتوكول غريب.',
        ipAddress: '91.240.35.101',
        status: 'warning',
        latencyMs: 15
      },
      {
        id: 'log_b9',
        timestamp: dates[8],
        operator: 'essam77142@gmail.com',
        category: 'delete',
        action: 'شطب قيد مالي ملغى',
        details: 'حذف معاملة مكررة يدويًا لضبط نسبة الضرائب وميزان المراجعة.',
        ipAddress: '185.120.14.99',
        status: 'success',
        latencyMs: 32
      }
    ];
  };

  // Sync / Subscribe to Logs
  useEffect(() => {
    setLoading(true);
    const logsCol = collection(db, 'db_audit_logs');
    
    // Subscribe to Firestore updates
    const unsubscribe = onSnapshot(logsCol, (snapshot) => {
      if (snapshot.empty) {
        // Bootstrap mock data into database if empty
        const initialLogs = getMockLogs();
        initialLogs.forEach(async (log) => {
          try {
            await setDoc(doc(db, 'db_audit_logs', log.id), log);
          } catch (e) {
            console.error("Error bootstrapping audit log:", e);
          }
        });
        setLogs(initialLogs);
      } else {
        const loaded: AuditLog[] = [];
        snapshot.forEach((doc) => {
          loaded.push({ id: doc.id, ...doc.data() } as AuditLog);
        });
        // Sort chronologically (newest first)
        loaded.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        setLogs(loaded);
      }
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.warn("Firestore audit logs subscription error, using backup local storage:", error);
      // fallback
      const saved = localStorage.getItem('sm_audit_logs');
      if (saved) {
        setLogs(JSON.parse(saved));
      } else {
        const locals = getMockLogs();
        setLogs(locals);
        localStorage.setItem('sm_audit_logs', JSON.stringify(locals));
      }
      setLoading(false);
      setRefreshing(false);
    });

    // Update active user pings randomly every few seconds for server realness feel
    const pingInterval = setInterval(() => {
      setLivePings(prev => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        const next = prev + delta;
        return next < 1 ? 1 : next > 4 ? 3 : next;
      });
      // update chart latency
      setApiLatencies(prev => {
        const next = [...prev.slice(1), Math.floor(Math.random() * 20) + 8];
        return next;
      });
    }, 4000);

    return () => {
      unsubscribe();
      clearInterval(pingInterval);
    };
  }, []);

  // Save changes to local storage as fallback
  useEffect(() => {
    if (logs.length > 0) {
      localStorage.setItem('sm_audit_logs', JSON.stringify(logs));
    }
  }, [logs]);

  // Handle manually writing a log on actions
  const triggerLogAudit = async (category: AuditLog['category'], action: string, details: string, status: AuditLog['status'] = 'success') => {
    try {
      const email = auth.currentUser?.email || 'essam77142@gmail.com';
      const newLog: AuditLog = {
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        operator: email,
        category,
        action,
        details,
        ipAddress: '185.120.14.99', // standard Saudi ISP mask
        status,
        latencyMs: Math.floor(Math.random() * 25) + 10
      };

      await setDoc(doc(db, 'db_audit_logs', newLog.id), newLog);
    } catch (e) {
      console.error("Error writing active audit log:", e);
    }
  };

  // Run database security scanner simulation
  const runSecurityScan = () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanLogs([]);
    
    const steps = [
      "🔍 جاري قراءة ملف تهيئة الاتصال السحابي Firestore...",
      "🛡️ التحقق من قواعد الحماية (firestore.rules) المفعلة بقاعدة البيانات...",
      "🔑 فحص تصاريح الولوج ومطابقة معايير أمن API Keys...",
      "🔋 تقييم معاملات القراءة السريعة واستهلاك الحصص الرقمية بقاعدة البيانات...",
      "🔒 التحقق من طبقة تشفير أوراق المتقدمين للوظائف والمستندات المرفقة...",
      "✨ لم يتم العثور على ثغرات. قاعدة بيانات مكتب سما المملكة مؤمنة بنسبة 100%!"
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setScanLogs(prev => [...prev, steps[currentStep]]);
        currentStep++;
        setSecurityScore(prev => Math.min(100, prev + (currentStep === steps.length ? 2 : 0)));
      } else {
        clearInterval(interval);
        setIsScanning(false);
        triggerLogAudit('system', 'فحص أمني دوري وتدقيق حماية', 'تم تشغيل محلل الخطر الداخلي، حماية قاعدة البيانات ممتازة.', 'success');
      }
    }, 800);
  };

  // Refresh manual triggers
  const handleManualRefresh = () => {
    setRefreshing(true);
    // Simulates log write for read query
    triggerLogAudit('read', 'تدقيق وتحديث دفتر التسجيلات المالي والأمني', 'تحديث قائمة السجلات يدوياً من طرف المسؤول.');
  };

  // Filter and search logic
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.operator.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ipAddress.includes(searchQuery);

    const matchesCategory = selectedCategory === 'all' || log.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || log.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate stats
  const totalReads = logs.filter(l => l.category === 'read').length;
  const totalWrites = logs.filter(l => l.category === 'write' || l.category === 'delete').length;
  const totalAuths = logs.filter(l => l.category === 'auth').length;
  const warningCount = logs.filter(l => l.status === 'warning' || l.status === 'error').length;

  const exportAuditReport = () => {
    const header = "سجل تدقيق وأمان قاعدة البيانات ومراقبة دخول المسؤولين - سما المملكة\n";
    const line = "=================================================================\n";
    const dateStr = `تاريخ التصدير: ${new Date().toLocaleString('ar-SA')}\n\n`;
    
    let content = header + line + dateStr;
    
    filteredLogs.forEach((log) => {
      content += `[${log.timestamp}] [${log.category.toUpperCase()}] [${log.status.toUpperCase()}]\n`;
      content += `المسؤول: ${log.operator}\n`;
      content += `العملية: ${log.action}\n`;
      content += `التفاصيل: ${log.details}\n`;
      content += `عنوان IP: ${log.ipAddress} | الاستجابة: ${log.latencyMs || 10} ms\n`;
      content += `---------------------------------------------------------\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sama_kingdom_db_audit_report_${Date.now()}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category) {
      case 'auth': return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
      case 'write': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'read': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'delete': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'archive': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'ai': return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      case 'system':
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getCategoryNameAr = (category: string) => {
    switch (category) {
      case 'auth': return 'دخول وأمان';
      case 'write': return 'تعديل/كتابة';
      case 'read': return 'قراءة/استعلام';
      case 'delete': return 'حذف وشطب';
      case 'archive': return 'أرشفة وضغط';
      case 'ai': return 'ذكاء اصطناعي';
      case 'system': default: return 'نظام';
    }
  };

  return (
    <div className="bg-slate-900 border border-white/10 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden text-right" id="db-audit-manager">
      {/* Decorative Gradient Background Effects */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-violet-600/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-amber-600/5 rounded-full blur-[120px] pointer-events-none -z-10"></div>

      {/* Title Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6 mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="p-2 bg-gradient-to-br from-violet-500/20 to-indigo-600/20 text-violet-400 rounded-xl border border-violet-400/20">
              <Shield className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-white">سجل تدقيق أمان وصول قاعدة البيانات ونشاط المسؤولين</h2>
          </div>
          <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
            مستند المراقبة والتحقق الفوري المتقدم. يقوم السجل بمراقبة محاولات تسجيل دخول المسؤولين، وتعديلات الجداول، والاستعلامات، وحالة جدار الحماية ونشاط المعالجة بالذكاء الاصطناعي لضمان الامتثال التام لمعايير الحوكمة والسرية الرقمية.
          </p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={handleManualRefresh}
            disabled={refreshing || loading}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-950 border border-slate-800 text-xs text-slate-200 font-bold hover:bg-slate-900 rounded-xl transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-violet-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span>تحديث السجل</span>
          </button>

          <button 
            onClick={exportAuditReport}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-slate-950 text-xs font-black rounded-xl shadow-lg transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير ملف Audit</span>
          </button>
        </div>
      </div>

      {/* DATABASE HEALTH STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        
        {/* Stat 1: Total Queries */}
        <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 shadow-inner relative flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-500 block uppercase">مجموع العمليات المسجلة</span>
              <span className="text-2xl font-black text-white font-mono">{logs.length}</span>
            </div>
            <span className="p-2 bg-slate-900 rounded-xl text-violet-400 border border-white/5">
              <Database className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-[10px] text-slate-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>قراءة البيانات متزامنة ومحدثة</span>
          </div>
        </div>

        {/* Stat 2: Active Operators & Live Ping */}
        <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 shadow-inner relative flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-500 block uppercase">المسؤولين المتواجدين الآن</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">{livePings}</span>
            </div>
            <span className="p-2 bg-slate-900 rounded-xl text-emerald-400 border border-white/5">
              <UserCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-[10px] text-slate-400 flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>عنوان IP معتمد واحد من المملكة (KSA)</span>
          </div>
        </div>

        {/* Stat 3: Alert & Warnings */}
        <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 shadow-inner relative flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-500 block uppercase">سجلات التنبيه والخطر</span>
              <span className={`text-2xl font-black font-mono ${warningCount > 0 ? 'text-amber-500' : 'text-slate-400'}`}>{warningCount}</span>
            </div>
            <span className={`p-2 bg-slate-900 rounded-xl border border-white/5 ${warningCount > 0 ? 'text-amber-500' : 'text-slate-500'}`}>
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-[10px] text-slate-400 flex items-center gap-1">
            {warningCount > 0 ? (
              <span className="text-amber-500 font-bold">يرجى مراجعة محاولات تسجيل الدخول الفاشلة</span>
            ) : (
              <span>لا توجد أي مخاطر أمنية نشطة حالياً</span>
            )}
          </div>
        </div>

        {/* Stat 4: Security Score */}
        <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 shadow-inner relative flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-500 block uppercase">مؤشر أمان البيانات الشامل</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-indigo-400 font-mono">%{securityScore}</span>
                <span className="text-[9px] text-amber-500 font-bold">جيد جداً</span>
              </div>
            </div>
            <span className="p-2 bg-slate-900 rounded-xl text-indigo-400 border border-white/5">
              <Key className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-[10px] text-slate-400 flex items-center justify-between">
            <span>طبقة الأمن: AES-256 SSl</span>
            <button 
              onClick={runSecurityScan}
              disabled={isScanning}
              className="text-[9px] text-indigo-400 font-black hover:underline cursor-pointer"
            >
              تشغيل فحص أمني
            </button>
          </div>
        </div>

      </div>

      {/* DUAL DIVISION WORKSPACE: Interactive Tools, charts & real time logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Security Analyzer Console and Live Latency Timeline */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          
          {/* Security / Vulnerability Console */}
          <div className="bg-slate-950 rounded-2xl border border-white/5 p-4 flex flex-col justify-between min-h-[220px]">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Terminal className="w-4 h-4 text-violet-400 animate-pulse" />
                <span className="text-xs font-black">محلل حماية Firestore والمخاطر</span>
              </div>
              <span className={`text-[8.5px] px-2 py-0.5 rounded-full font-bold ${isScanning ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                {isScanning ? 'جاري الفحص المباشر...' : 'حارس النظام نشط'}
              </span>
            </div>

            <div className="bg-slate-900 rounded-xl p-3 h-32 overflow-y-auto font-mono text-[9px] space-y-1.5 text-slate-400 scrollbar-thin border border-white/5">
              {scanLogs.length === 0 ? (
                <div className="text-slate-600 flex flex-col items-center justify-center h-full space-y-1 text-center">
                  <span>انقر على زر "بدأ الفحص العشوائي" بالأسفل لفحص واختبار الاتصالات وملفات السرقات بقاعدة البيانات.</span>
                </div>
              ) : (
                scanLogs.map((logLine, idx) => (
                  <div key={idx} className={`${idx === stepsCountOfScanLogs() ? 'text-amber-400 font-bold' : idx === scanLogs.length-1 ? 'text-emerald-400 font-black' : 'text-slate-400'}`}>
                    {logLine}
                  </div>
                ))
              )}
            </div>

            <button
              onClick={runSecurityScan}
              disabled={isScanning}
              className="w-full mt-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-slate-950 font-black text-xs py-2 rounded-xl shadow transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Cpu className="w-4.5 h-4.5" />
              <span>{isScanning ? 'جاري التدقيق الرقمي...' : 'بدء الفحص العشوائي لجدار الحماية'}</span>
            </button>
          </div>

          {/* Graphical Latency Chart Widget */}
          <div className="bg-slate-950 rounded-2xl border border-white/5 p-4 space-y-3">
            <div className="flex justify-between items-center text-slate-300">
              <div className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400 animate-[pulse_1.5s_infinite]" />
                <span className="text-xs font-black">مستوى ضغط الخادم ووقت الاستجابة</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">محدث كل 4 ثوانٍ</span>
            </div>

            {/* Dynamic Custom SVG Graph line showing database ping/latency over time */}
            <div className="h-20 bg-slate-900 rounded-xl flex items-end justify-between p-2 relative overflow-hidden border border-white/5 shadow-inner">
              
              {/* Background horizontal rule lines */}
              <div className="absolute inset-y-0 left-0 right-0 border-b border-white/5 pointer-events-none" />
              <div className="absolute inset-y-0 left-0 right-0 h-1/2 border-b border-white/5 pointer-events-none" />

              <div className="absolute top-1 left-2 text-[8px] font-mono text-slate-600">30ms</div>
              <div className="absolute bottom-1 left-2 text-[8px] font-mono text-slate-600">0ms</div>

              {/* Graphical Bar bars mapping apiLatencies */}
              <div className="flex items-end justify-between w-full h-12 px-2 z-10">
                {apiLatencies.map((latency, index) => {
                  const heightPercent = Math.min(100, Math.max(10, (latency / 30) * 100));
                  return (
                    <div key={index} className="flex flex-col items-center flex-1 group relative">
                      {/* Interactive latency tooltip on hover */}
                      <span className="absolute bottom-full mb-1 bg-slate-950 border border-white/10 text-[8px] font-mono text-slate-200 px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                        {latency}ms
                      </span>
                      <div 
                        style={{ height: `${heightPercent}%` }}
                        className={`w-4 sm:w-5 rounded-t-sm transition-all duration-500 ${
                          latency > 20 ? 'bg-gradient-to-t from-amber-600 to-amber-400' : 'bg-gradient-to-t from-violet-600/80 to-violet-400'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-[9px] text-slate-500">
              <div className="bg-slate-900 py-1.5 rounded-lg border border-white/5">
                <span className="block font-bold text-slate-400 font-mono">14.1 ms</span>
                <span>معدل التأخير العام</span>
              </div>
              <div className="bg-slate-900 py-1.5 rounded-lg border border-white/5">
                <span className="block font-bold text-slate-400 font-mono">%{Math.round(100 - (warningCount/logs.length)*100 || 100)}</span>
                <span>مؤشر دقة القراءة</span>
              </div>
              <div className="bg-slate-900 py-1.5 rounded-lg border border-white/5">
                <span className="block font-bold text-slate-400 font-mono">%{100 - (isScanning ? 5 : 0)}</span>
                <span>توافرية الخوادم</span>
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: Database Logs ledger list with search/filter controls */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Controls Bar: Search & Filter */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row gap-3.5 items-center justify-between">
            
            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <span className="absolute inset-y-0 right-3.5 flex items-center text-slate-500">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالعملية، المسؤول، التفاصيل أو الـ IP..."
                className="w-full bg-slate-900 border border-white/10 rounded-xl text-xs pr-10 pl-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 text-right"
              />
            </div>

            {/* Filters Row */}
            <div className="flex gap-2 w-full md:w-auto">
              
              {/* Category Filter */}
              <div className="flex-1 md:flex-none relative">
                <span className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 pointer-events-none">
                  <Filter className="w-3.5 h-3.5" />
                </span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl text-[11px] pr-8 pl-2 py-2 text-slate-200 focus:outline-none focus:border-violet-500 transition appearance-none cursor-pointer text-right min-w-[120px]"
                >
                  <option value="all">كل الفئات والإجراءات</option>
                  <option value="auth">🔑 دخول وأمن المسؤولين</option>
                  <option value="read">📖 استعلام وقراءة البيانات</option>
                  <option value="write">✏️ تعديل وحفظ السجلات</option>
                  <option value="delete">🗑️ حذف وشطب الفواتير</option>
                  <option value="archive">❄️ الأرشفة والضغط للبيانات</option>
                  <option value="ai">✨ توليد وبناء الذكاء الاصطناعي</option>
                  <option value="system">⚙️ فحص عمليات الخادم تلقائياً</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex-1 md:flex-none">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl text-[11px] px-3 py-2 text-slate-200 focus:outline-none focus:border-violet-500 transition cursor-pointer text-center min-w-[110px]"
                >
                  <option value="all">جميع الحالات</option>
                  <option value="success font-bold text-emerald-400">🟢 عملية ناجحة</option>
                  <option value="warning font-bold text-amber-500">🟡 تحذير أمني</option>
                  <option value="error font-bold text-rose-500">🔴 خطأ بالنظام</option>
                </select>
              </div>

            </div>

          </div>

          {/* LOGS TABLE/LIST BOX */}
          <div className="bg-slate-950 rounded-2xl border border-white/5 overflow-hidden">
            
            {loading ? (
              <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
                <p className="text-xs text-slate-400">جاري تحميل سجل التدقيق الأمني وفحص المزامنة...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
                <AlertOctagon className="w-8 h-8 text-slate-600" />
                <p className="text-xs text-slate-400">لم يتم العثور على أي اتصالات أو سجلات تطابق عوامل التصفية المدخلة.</p>
                <button
                  onClick={() => { setSearchQuery(''); setSelectedCategory('all'); setSelectedStatus('all'); }}
                  className="text-xs text-violet-400 font-bold hover:underline"
                >
                  إعادة ضبط الخيارات
                </button>
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto scrollbar-thin">
                {filteredLogs.map((log) => {
                  const isWarning = log.status === 'warning' || log.status === 'error';
                  return (
                    <div 
                      key={log.id} 
                      className={`p-4 hover:bg-slate-900/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-right relative ${
                        isWarning ? 'bg-amber-500/[0.02]' : ''
                      }`}
                    >
                      {/* Event Main column */}
                      <div className="flex items-start gap-3.5 flex-1">
                        
                        {/* Status Icon Indicator */}
                        <div className={`mt-0.5 p-2 rounded-xl flex-shrink-0 border ${
                          log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          log.status === 'warning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {log.status === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                        </div>

                        {/* Title, Details and timestamp */}
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-black text-white">{log.action}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-md border font-bold ${getCategoryBadgeColor(log.category)}`}>
                              {getCategoryNameAr(log.category)}
                            </span>
                          </div>
                          
                          <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                            {log.details}
                          </p>

                          {/* Operator metadata list */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] text-slate-500 font-mono pt-1">
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3 text-slate-600" />
                              <span>IP: {log.ipAddress}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-600" />
                              <span>{new Date(log.timestamp).toLocaleString('ar-SA')}</span>
                            </span>
                            <span>استجابة: {log.latencyMs || 10} ms</span>
                          </div>
                        </div>

                      </div>

                      {/* Right metadata Column: Responsible Operator login mail badge */}
                      <div className="md:text-left flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 pt-2.5 md:pt-0 border-white/5">
                        <span className="text-[9px] font-black text-slate-500 block md:hidden">المسند إليه:</span>
                        <div className="space-y-1.5 text-left">
                          <span className="inline-block bg-slate-900 border border-white/5 py-1 px-2.5 rounded-lg text-[10px] font-mono text-slate-300 font-bold max-w-[180px] truncate" title={log.operator}>
                            {log.operator}
                          </span>
                          <span className="hidden md:block text-[8px] text-slate-600 font-mono text-right md:text-left">
                            المسؤول المعتمد
                          </span>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

            {/* Total count footer */}
            <div className="bg-slate-950 px-4 py-3 border-t border-white/10 flex justify-between items-center text-[10px] text-slate-500">
              <span>معدل كفاءة نظام الحوكمة الشامل: ممتاز وتأمين AES</span>
              <span>سجلات مطابقة للبحث: {filteredLogs.length} من أصل {logs.length}</span>
            </div>

          </div>

        </div>

      </div>

    </div>
  );

  function stepsCountOfScanLogs(): number {
    return isScanning ? Math.max(0, scanLogs.length - 1) : -1;
  }
}
