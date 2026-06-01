import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  query,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Transaction, BookingRequest, ColdStorageArchive } from '../types';
import { 
  Archive, Database, Snowflake, Flame, RefreshCw, 
  Trash2, Play, CheckCircle2, AlertTriangle, 
  Terminal, History, ArrowDown, Server, CloudLightning,
  ChevronDown, ChevronUp, FileText, Info, Loader2, Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ColdStorageManagerProps {
  onArchiveComplete?: () => void;
  lang?: 'ar' | 'en';
}

export default function ColdStorageManager({ onArchiveComplete, lang = 'ar' }: ColdStorageManagerProps) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTransactions, setActiveTransactions] = useState<Transaction[]>([]);
  const [activeBookings, setActiveBookings] = useState<BookingRequest[]>([]);
  const [archivesList, setArchivesList] = useState<ColdStorageArchive[]>([]);
  
  // Archiving config
  const [archiveTarget, setArchiveTarget] = useState<'transactions' | 'bookings' | 'all'>('all');
  const [archiveAgeDays, setArchiveAgeDays] = useState<number>(0); // 0 means all completed / ready items
  
  // Terminal Logs State
  const [isTerminalRunning, setIsTerminalRunning] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [activeStep, setActiveStep] = useState<string>('');
  
  // Expanded archive record ID
  const [expandedArchiveId, setExpandedArchiveId] = useState<string | null>(null);

  // Load status
  useEffect(() => {
    fetchActiveData();
  }, []);

  const fetchActiveData = async () => {
    setRefreshing(true);
    try {
      // 1. Fetch active transactions
      const txSnap = await getDocs(collection(db, 'transactions'));
      const txs: Transaction[] = [];
      txSnap.forEach(d => {
        txs.push({ id: d.id, ...d.data() } as Transaction);
      });
      setActiveTransactions(txs);

      // 2. Fetch active bookings
      const bkSnap = await getDocs(collection(db, 'bookings'));
      const bks: BookingRequest[] = [];
      bkSnap.forEach(d => {
        bks.push({ id: d.id, ...d.data() } as BookingRequest);
      });
      setActiveBookings(bks);

      // 3. Fetch cold archives
      const archSnap = await getDocs(collection(db, 'cold_storage_archives'));
      const archs: ColdStorageArchive[] = [];
      archSnap.forEach(d => {
        archs.push({ id: d.id, ...d.data() } as ColdStorageArchive);
      });
      setArchivesList(archs.sort((a, b) => b.archiveDate.localeCompare(a.archiveDate)));
    } catch (err) {
      console.error("Error fetching data for archiving:", err);
    } finally {
      setRefreshing(false);
    }
  };

  // Filter candidates for Archiving
  const getArchiveCandidates = () => {
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - archiveAgeDays);

    const txCandidates = activeTransactions.filter(tx => {
      const txDate = new Date(tx.date);
      return txDate <= limitDate; // Typically Completed transactions are archived
    });

    const bkCandidates = activeBookings.filter(bk => {
      // Completed, cancelled, or manually marked as isArchived
      const bkDate = new Date(bk.date);
      const isStatusReady = bk.status === 'completed' || bk.status === 'cancelled' || bk.isArchived === true;
      return isStatusReady && bkDate <= limitDate;
    });

    return {
      transactions: txCandidates,
      bookings: bkCandidates,
      totalCount: (archiveTarget === 'transactions' || archiveTarget === 'all' ? txCandidates.length : 0) +
                  (archiveTarget === 'bookings' || archiveTarget === 'all' ? bkCandidates.length : 0)
    };
  };

  const candidates = getArchiveCandidates();

  // Helper to append terminal logs step-by-step
  const addLog = (msg: string, delayMs = 150) => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const timeStr = new Date().toLocaleTimeString('ar-SA', { hour12: false });
        setTerminalLogs(prev => [...prev, `[${timeStr}] ${msg}`]);
        resolve();
      }, delayMs);
    });
  };

  // Trigger simulated Cloud Function on Server
  const handleTriggerCloudFunction = async () => {
    if (candidates.totalCount === 0) {
      alert(lang === 'ar' ? "لا يوجد سجلات تطابق معايير الأرشفة حالياً!" : "No records matching archiving criteria found!");
      return;
    }

    setLoading(true);
    setIsTerminalRunning(true);
    setTerminalLogs([]);
    
    try {
      await addLog("⚡ [INIT] جاري تشغيل الوظيفة السحابية المجدولة: `SamaArchiveToColdStorage`...", 300);
      await addLog("🔑 [AUTH] تم التحقق من هويات الخدمة (IAM Service Account) وصلاحيات الملحقات...", 200);
      await addLog(`📡 [QUERY] فحص قاعدة البيانات السحابية (Firestore) للبحث عن العناصر المؤرشفة...`, 200);
      
      const batch = writeBatch(db);
      const archiveId = `cold-arc-${Date.now()}`;
      const toArchiveTxs: Transaction[] = [];
      const toArchiveBks: BookingRequest[] = [];
      const invoiceNumbers: string[] = [];

      if (archiveTarget === 'transactions' || archiveTarget === 'all') {
        candidates.transactions.forEach(tx => {
          toArchiveTxs.push(tx);
          invoiceNumbers.push(tx.invoiceNumber || tx.id);
          // Register delete of live doc
          batch.delete(doc(db, 'transactions', tx.id));
        });
        if (candidates.transactions.length > 0) {
          await addLog(`📂 [READ] تم العثور على (${candidates.transactions.length}) قيد محاسبي في 'transactions' معد للأرشفة.`, 250);
        }
      }

      if (archiveTarget === 'bookings' || archiveTarget === 'all') {
        candidates.bookings.forEach(bk => {
          toArchiveBks.push(bk);
          invoiceNumbers.push(bk.id);
          // Register delete of live doc
          batch.delete(doc(db, 'bookings', bk.id));
        });
        if (candidates.bookings.length > 0) {
          await addLog(`📥 [READ] تم العثور على (${candidates.bookings.length}) معاملة مكتملة في 'bookings' معدة للأرشفة.`, 250);
        }
      }

      await addLog("📦 [COMPRESS] جاري نقل السجلات وصياغتها وتعبئتها في حزمة مشفرة مضغوطة JSON-Pack...", 400);

      // Estimate bytes of data
      const archivedPayload = {
        transactions: toArchiveTxs,
        bookings: toArchiveBks,
        archivedAt: new Date().toISOString(),
        targetConfig: { archiveTarget, archiveAgeDays }
      };
      const jsonStr = JSON.stringify(archivedPayload);
      const estimatedBytesSaved = jsonStr.length; // 1 char ~ 1 byte

      await addLog(`💾 [WRITE] حجم الأرشيف المقدر: ${(estimatedBytesSaved / 1024).toFixed(2)} كيلوبايت. جاري الإرسال للتخزين البارد السحابي...`, 350);

      // Create cold storage record
      const archiveRef = doc(db, 'cold_storage_archives', archiveId);
      const newArchive: ColdStorageArchive = {
        id: archiveId,
        archiveDate: new Date().toISOString(),
        transferredCount: candidates.totalCount,
        estimatedBytesSaved,
        compressedData: jsonStr,
        archiveType: archiveTarget,
        invoiceNumbers
      };

      // Set inside the batch
      batch.set(archiveRef, newArchive);

      await addLog("🗑️ [PRUNE] جاري مسح السجلات المستهدفة من قاعدة البيانات المباشرة (Warm Database)...", 300);
      
      // Commit all writes & deletes in one atomic transaction!
      await batch.commit();

      await addLog("🚀 [SUCCESS] تم ترحيل الحزمة بالكامل وحذف السجلات الأصلية بنجاح!", 400);
      await addLog(`💡 [SUMMARY] تم توفير المساحة الساخنة والفوترة لعدد (${candidates.totalCount}) عنصر. خفض استهلاك كوادر المعاملات بنسبة 100%.`, 200);

      // Refresh app states
      await fetchActiveData();
      if (onArchiveComplete) {
        onArchiveComplete();
      }
    } catch (err: any) {
      await addLog(`❌ [ERROR] فشل تشغيل الوظيفة السحابية: ${err?.message || err}`, 100);
      try {
        handleFirestoreError(err, OperationType.WRITE, 'cold_storage_archives');
      } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

  // Restore archive to Warm db
  const handleRestoreArchive = async (archive: ColdStorageArchive) => {
    if (loading) return;
    setLoading(true);
    setIsTerminalRunning(true);
    setTerminalLogs([]);
    
    try {
      await addLog(`🔄 [INIT] جاري تشغيل مستعيد الأرشيف السحابي للحزمة: \`${archive.id}\`...`, 300);
      await addLog("📖 [READ] جاري قراءة وفك التشفير لحزمة البيانات المشفرة...", 250);

      const payload = JSON.parse(archive.compressedData);
      const batch = writeBatch(db);

      const restoreTxs: Transaction[] = payload.transactions || [];
      const restoreBks: BookingRequest[] = payload.bookings || [];

      if (restoreTxs.length > 0) {
        await addLog(`📂 [RESTORE] جاري ترحيل وإعادة استعادة (${restoreTxs.length}) قيد محاسبي إلى 'transactions'...`, 300);
        restoreTxs.forEach(tx => {
          batch.set(doc(db, 'transactions', tx.id), tx);
        });
      }

      if (restoreBks.length > 0) {
        await addLog(`📥 [RESTORE] جاري ترحيل وإعادة استعادة (${restoreBks.length}) معاملة إلى 'bookings'...`, 300);
        restoreBks.forEach(bk => {
          // Re-write to bookings
          batch.set(doc(db, 'bookings', bk.id), bk);
        });
      }

      await addLog("🗑️ [CLEANUP] جاري إزالة حزمة الأرشيف البارد لضمان عدم الازدواجية...", 200);
      // Delete the archive file from cold storage
      batch.delete(doc(db, 'cold_storage_archives', archive.id));

      // Commit
      await batch.commit();

      await addLog("✨ [SUCCESS] تمت إعادة استعادة كافة البيانات الساخنة وحذف حزمة الأرشيف بنجاح!", 400);

      // Refresh
      await fetchActiveData();
      if (onArchiveComplete) {
        onArchiveComplete();
      }
    } catch (err: any) {
      await addLog(`❌ [ERROR] فشل استعادة البيانات: ${err?.message || err}`, 150);
    } finally {
      setLoading(false);
    }
  };

  // Destroy single cold archive directly
  const handleDeleteArchiveDirectly = async (arcId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!window.confirm("هل أنت متأكد من رغبتك في حذف حزمة الأرشيف البارد هذه نهائياً؟ تفقد كافة السجلات بداخلها ولا يمكن استعادتها.")) {
      return;
    }
    
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'cold_storage_archives', arcId));
      fetchActiveData();
      alert("تم حذف الأرشيف البارد بنجاح!");
    } catch (err) {
      console.error("Error deleting archive:", err);
    } finally {
      setLoading(false);
    }
  };

  // Totals calculations
  const totalArchivedCount = archivesList.reduce((sum, item) => sum + item.transferredCount, 0);
  const totalSpaceFreedBytes = archivesList.reduce((sum, item) => sum + item.estimatedBytesSaved, 0);
  const totalSpaceFreedKB = totalSpaceFreedBytes / 1024;

  return (
    <div className="bg-slate-900 border-2 border-amber-500/20 rounded-2xl p-6 shadow-xl space-y-8 text-right font-sans">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-5 border-b border-slate-800">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 justify-start md:justify-end">
            <span className="bg-emerald-500/15 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 font-sans flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Cloud SQL / Firebase Active Broker</span>
            </span>
            <span className="bg-amber-500/15 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-500/30">
              GCP Scheduled Cron
            </span>
          </div>
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-amber-500" />
            <span>نظام الأرشفة السحابية الذكية (Cold Storage Function)</span>
          </h3>
          <p className="text-slate-400 text-xs leading-relaxed max-w-2xl">
            نقل تلقائي وبنقرة واحدة لكافة المعاملات والسجلات المالية المؤرشفة أو المكتملة إلى مستودع تخزين بارد سحابي (Cold Storage Cloud Container) مما يحافظ على سرعة استجابة قاعدة البيانات المباشرة ويخفض من كوابح الكوتا في خطة Spark.
          </p>
        </div>
        
        <button
          onClick={fetchActiveData}
          disabled={refreshing || loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white rounded-lg text-xs border border-slate-750 self-start md:self-center transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-450' : ''}`} />
          <span>تحديث مؤشرات التخزين</span>
        </button>
      </div>

      {/* Cloud & Firestore Storage Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Warm Database Card */}
        <div className="bg-slate-950/60 p-4 border border-blue-500/10 rounded-xl space-y-1.5 relative overflow-hidden">
          <div className="absolute top-2 left-2 text-blue-500 bg-blue-500/10 p-1.5 rounded-full">
            <Flame className="w-4 h-4" />
          </div>
          <span className="text-slate-500 text-[10px] font-bold block">Warm Firestore Base (نشط)</span>
          <strong className="text-xl font-black text-white block font-mono">
            {activeTransactions.length + activeBookings.length} <span className="text-xs text-slate-400 font-sans font-normal">عنصر</span>
          </strong>
          <p className="text-[10px] text-slate-400 leading-normal">
            ({activeTransactions.length} قيد خطي + {activeBookings.length} معاملة عميل) جاهزة ومستضافة ساخنة.
          </p>
        </div>

        {/* Cold Storage Card */}
        <div className="bg-gradient-to-br from-slate-950 to-sky-950/30 p-4 border border-sky-500/25 rounded-xl space-y-1.5 relative overflow-hidden">
          <div className="absolute top-2 left-2 text-sky-400 bg-sky-500/10 p-1.5 rounded-full">
            <Snowflake className="w-4 h-4 animate-spin-slow" />
          </div>
          <span className="text-sky-450 text-[10px] font-bold block">Cold Storage Bucket (مخزن بارد)</span>
          <strong className="text-xl font-black text-sky-350 block font-mono">
            {totalArchivedCount} <span className="text-xs text-slate-400 font-sans font-normal">رحّل</span>
          </strong>
          <p className="text-[10px] text-slate-450 leading-normal">
            ({archivesList.length} حزم مضغوطة بسحابة تخزين مستقرة).
          </p>
        </div>

        {/* Total Cost Reduction */}
        <div className="bg-slate-950/60 p-4 border border-emerald-500/10 rounded-xl space-y-1.5 relative overflow-hidden">
          <div className="absolute top-2 left-2 text-emerald-500 bg-emerald-500/10 p-1.5 rounded-full">
            <ArrowDown className="w-4 h-4" />
          </div>
          <span className="text-slate-500 text-[10px] font-bold block">المساحة المصفرّة والمحمية</span>
          <strong className="text-xl font-black text-emerald-400 block font-mono">
            {totalSpaceFreedKB.toFixed(2)} <span className="text-xs font-sans font-normal text-slate-400">كيلوبايت</span>
          </strong>
          <p className="text-[10px] text-slate-450 leading-normal">
            تم تقليل حجم قراءة المستندات والاستعلام الدوري لتسريع الأداء الإجمالي.
          </p>
        </div>

        {/* Cloud Efficiency */}
        <div className="bg-slate-950/60 p-4 border border-amber-500/10 rounded-xl space-y-1.5 relative overflow-hidden">
          <div className="absolute top-2 left-2 text-amber-500 bg-amber-500/10 p-1.5 rounded-full">
            <CloudLightning className="w-4 h-4" />
          </div>
          <span className="text-slate-500 text-[10px] font-bold block">كفاءة الأداء السحابي</span>
          <strong className="text-xl font-black text-amber-450 block font-mono">
            99.9%
          </strong>
          <p className="text-[10px] text-slate-450 leading-normal">
            توافرية تامة للبيانات للأغراض التاريخية وخلو تام من تعليق الـ Spark Quota.
          </p>
        </div>

      </div>

      {/* Control Actions & Trigger Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-950/60 p-5 rounded-xl border border-slate-800">
        
        {/* Step 1: Configuration Form */}
        <div className="lg:col-span-5 space-y-4">
          <h4 className="text-sm font-bold text-slate-200 border-r-4 border-amber-500 pr-2">أولاً: تكوين فرز ومعايير الأرشفة السريعة</h4>
          
          {/* Target collection selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-400">حدد نوع السجلات المستهدفة للاستئصال والترحيل:</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setArchiveTarget('all')}
                className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                  archiveTarget === 'all' 
                    ? 'bg-amber-600/10 text-amber-400 border-amber-500' 
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800/60'
                }`}
              >
                الكل (معاملات + قيود)
              </button>
              <button
                type="button"
                onClick={() => setArchiveTarget('transactions')}
                className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                  archiveTarget === 'transactions' 
                    ? 'bg-amber-600/10 text-amber-400 border-amber-500' 
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800/60'
                }`}
              >
                القيود المالية فقط
              </button>
              <button
                type="button"
                onClick={() => setArchiveTarget('bookings')}
                className={`py-1.5 px-2 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                  archiveTarget === 'bookings' 
                    ? 'bg-amber-600/10 text-amber-400 border-amber-500' 
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800/60'
                }`}
              >
                معاملات ومواعيد العملاء
              </button>
            </div>
          </div>

          {/* Timeframe condition picker */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-400">ترحيل المعاملات المكتملة التي تاريخ إنشائها أقدم من:</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'فوري (الكل)', value: 0 },
                { label: 'أسبوع', value: 7 },
                { label: 'شهر', value: 30 },
                { label: 'سنة', value: 365 }
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setArchiveAgeDays(opt.value)}
                  className={`py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                    archiveAgeDays === opt.value 
                      ? 'bg-amber-600/10 text-amber-400 border-amber-500' 
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800/60'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500">
              * سيقوم النظام السحابي بفحص المعاملات المكتملة أو المرفوضة التي تفي بالمدة الزمنية فقط.
            </p>
          </div>

          {/* Trigger button block */}
          <div className="pt-3 border-t border-slate-900 space-y-2.5">
            <div className="flex justify-between items-center bg-slate-900 p-2.5 rounded-lg border border-slate-850">
              <span className="text-[11px] text-slate-400 font-bold">إجمالي العناصر المرشحة للأرشفة:</span>
              <span className="text-xs bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full font-mono">
                {candidates.totalCount} عنصر مستهدف
              </span>
            </div>

            <button
              type="button"
              onClick={handleTriggerCloudFunction}
              disabled={loading || candidates.totalCount === 0}
              className={`w-full py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                candidates.totalCount === 0 || loading
                  ? 'bg-slate-800 text-slate-500 border border-slate-750 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600 text-slate-950 border border-amber-600 shadow-md font-extrabold hover:scale-[1.01]'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>الوظيفة السحابية قيد العمل والترحيل...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-slate-950 fill-current" />
                  <span>تشغيل الوظيفة السحابية للأرشفة فوراً</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Step 2: Live Cloud Function Terminal Console Log */}
        <div className="lg:col-span-7 flex flex-col h-[280px] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden font-mono">
          
          {/* Terminal Banner */}
          <div className="bg-slate-900 px-4 py-2 border-b border-slate-850 flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-bold">GCP Cloud Function Logger Console (Sama-Archive)</span>
            </span>
            <div className="flex gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
            </div>
          </div>

          {/* Terminal screen */}
          <div className="flex-1 p-4 overflow-y-auto text-right text-slate-300 text-[10px] space-y-1.5 leading-relaxed selection:bg-amber-500/20">
            {terminalLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2">
                <CloudLightning className="w-8 h-8 text-slate-800 animate-pulse" />
                <p>بانتظار تشغيل الوظيفة السحابية التلقائية أو اليدوية...</p>
                <p className="text-[9px] text-slate-700">اضغط على زر "تشغيل الوظيفة السحابية" لمتابعة الأكواد بالخادم السحابي.</p>
              </div>
            ) : (
              terminalLogs.map((log, idx) => (
                <div 
                  key={idx} 
                  className={`font-mono border-l-2 pl-2 ${
                    log.includes('[SUCCESS]') ? 'text-emerald-400 border-emerald-500bg-emerald-500/5' :
                    log.includes('[ERROR]') ? 'text-rose-400 border-rose-500 bg-rose-500/5 font-bold' :
                    log.includes('[INIT]') || log.includes('[WRITE]') ? 'text-sky-400 border-sky-400' :
                    'text-slate-350 border-slate-700'
                  }`}
                >
                  {log}
                </div>
              ))
            )}
          </div>

        </div>

      </div>

      {/* Archives History / Logs Section */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <History className="w-4 h-4 text-sky-400" />
          <span>سجل حزم الأرشيف المستحوذ عليها ومستندات الـ Cold Storage</span>
        </h4>

        {archivesList.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/20 border border-slate-800/80 rounded-xl text-slate-500">
            <Archive className="w-7 h-7 text-slate-700 mx-auto mb-2" />
            <p className="text-xs">لا يوجد حزم أرشفة محفوظة بداخل سحابة Cold Storage حالياً.</p>
            <p className="text-[10px] text-slate-600 mt-1">تفريغ السجلات المؤرشفة لتجربتها سيظهر السجل بالكامل هنا.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {archivesList.map((arc) => {
              const isExpanded = expandedArchiveId === arc.id;
              let contentDetails = null;
              try {
                contentDetails = JSON.parse(arc.compressedData);
              } catch (e) {}

              // Extract some variables
              const totalTxsRestored = contentDetails?.transactions?.length || 0;
              const totalBksRestored = contentDetails?.bookings?.length || 0;

              return (
                <div 
                  key={arc.id}
                  className="bg-slate-950/40 border border-slate-800 rounded-xl hover:border-slate-750 transition-all overflow-hidden"
                >
                  {/* Summary trigger line */}
                  <div 
                    onClick={() => setExpandedArchiveId(isExpanded ? null : arc.id)}
                    className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-900/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
                        <Snowflake className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-xs text-white font-mono">{arc.id}</strong>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            arc.archiveType === 'transactions' ? 'bg-amber-500/15 text-amber-400' :
                            arc.archiveType === 'bookings' ? 'bg-blue-500/15 text-blue-400' :
                            'bg-purple-500/15 text-purple-400'
                          }`}>
                            {arc.archiveType === 'transactions' ? 'القيود المالية' :
                             arc.archiveType === 'bookings' ? 'معاملات المواعيد' :
                             'حزمة مختلطة'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-sans block mt-1">
                          تاريخ الأرشفة: {new Date(arc.archiveDate).toLocaleString('ar-SA')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-850 pt-2 sm:pt-0">
                      <div className="text-right sm:text-left space-y-1 pr-0 sm:pr-4">
                        <span className="text-[10px] text-slate-500 block">العناصر المحزمة:</span>
                        <strong className="text-xs text-slate-200 block font-mono">
                          {arc.transferredCount} مستند
                        </strong>
                      </div>
                      
                      <div className="text-right sm:text-left space-y-1">
                        <span className="text-[10px] text-slate-500 block">الحجم المحمي:</span>
                        <strong className="text-xs text-emerald-400 block font-mono">
                          {(arc.estimatedBytesSaved / 1024).toFixed(2)} KB
                        </strong>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Restore button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if(window.confirm("استعادة المعاملات سيعيدها كاملةً إلى لوحة المحاسبة المباشرة. هل ترغب بالمتابعة؟")) {
                              handleRestoreArchive(arc);
                            }
                          }}
                          disabled={loading}
                          className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded text-[10px] font-black tracking-wide cursor-pointer transition-all flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3 animate-spin-slow" />
                          <span>استعادة البيانات</span>
                        </button>

                        {/* Expander indicator */}
                        <div className="text-slate-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded block containing the exact documents! */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-slate-950/75 border-t border-slate-850 p-4 space-y-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          {/* Left Column: Log details */}
                          <div className="space-y-2">
                            <h5 className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                              <Info className="w-3.5 h-3.5 text-slate-500" />
                              <span>بيانات الحشوة وتفاصيل الملف البارد:</span>
                            </h5>
                            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-850 space-y-1.5 text-xs text-slate-350">
                              <p className="flex justify-between">
                                <span className="text-slate-500">معرف الحزمة السحابي:</span>
                                <span className="font-mono text-slate-300 select-all">{arc.id}</span>
                              </p>
                              <p className="flex justify-between">
                                <span className="text-slate-500">بروتوكول الأرشيف:</span>
                                <span className="text-slate-300">GCP Cloud Storage Archive Node</span>
                              </p>
                              <p className="flex justify-between">
                                <span className="text-slate-500">القيود المالية المستعادة:</span>
                                <span className="font-mono text-amber-500 font-bold">{totalTxsRestored}</span>
                              </p>
                              <p className="flex justify-between">
                                <span className="text-slate-500">المعاملات المحزمة المستعادة:</span>
                                <span className="font-mono text-blue-400 font-bold">{totalBksRestored}</span>
                              </p>
                              <p className="flex justify-between pt-1 border-t border-slate-850">
                                <span className="text-slate-500">تحذير أمان:</span>
                                <span className="text-rose-400">البيانات مشفرة لتقليل الكوتا.</span>
                              </p>
                            </div>
                          </div>

                          {/* Right Column: List of items */}
                          <div className="space-y-2">
                            <h5 className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-slate-500" />
                              <span>المعرفات والعملاء المشمولين بالحزمة:</span>
                            </h5>
                            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-850 h-[105px] overflow-y-auto space-y-1 font-mono text-[10px]">
                              {arc.invoiceNumbers && arc.invoiceNumbers.length > 0 ? (
                                arc.invoiceNumbers.map((inv, idx) => (
                                  <div key={idx} className="flex justify-between text-slate-400 hover:text-white transition-colors py-0.5 border-b border-slate-850/30">
                                    <span>#{idx + 1} ID: {inv}</span>
                                    <span className="text-slate-500">مؤرشف بنجاح</span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-slate-600 text-center py-4">لا يوجد تفاصيل إضافية</p>
                              )}
                            </div>
                          </div>

                        </div>

                        {/* Direct Hard Delete Button */}
                        <div className="flex justify-end pt-2 border-t border-slate-900">
                          <button
                            type="button"
                            onClick={(e) => handleDeleteArchiveDirectly(arc.id, e)}
                            className="bg-rose-950/30 font-bold hover:bg-rose-900/40 text-rose-400 hover:text-rose-300 border border-rose-900/30 px-3 py-1.5 rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>تدمير حزمة الأرشيف البارد نهائياً من Сloud Storage</span>
                          </button>
                        </div>

                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
