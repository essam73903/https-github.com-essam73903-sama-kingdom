import React from 'react';
import { X, Printer, Download, Receipt, Building, Calendar, User, FileText, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { Transaction } from '../types';

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export default function InvoiceDetailModal({ isOpen, onClose, transaction }: InvoiceDetailModalProps) {
  if (!isOpen || !transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in" dir="rtl">
      {/* Dynamic print-optimized stylesheet */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body, html {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 11px !important;
          }
          .print-hidden, .print\\:hidden, [class*="print:hidden"] {
            display: none !important;
          }
          #print-area {
            padding: 2cm !important;
            margin: 0 !important;
            border: none !important;
            background: #ffffff !important;
            width: 100% !important;
            box-shadow: none !important;
          }
          /* Keep high contrast background and colors during print */
          .print-exact {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          /* Custom paper borders for print style */
          .print-border-header {
            border-bottom: 2px solid #000000 !important;
          }
          .print-table {
            border: 1px solid #000000 !important;
          }
          .print-table th {
            background-color: #0f172a !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
          }
        }
      `}} />

      <div className="w-full max-w-2xl bg-white border-2 border-slate-900 rounded-lg shadow-2xl overflow-hidden my-8">
        {/* Modal Toolbar (Non-printable) */}
        <div className="bg-slate-950 text-white px-6 py-4 flex justify-between items-center print:hidden">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-500" />
            <span className="font-bold text-base">استعراض الفاتورة الضريبية المبسطة</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 bg-amber-600 hover:bg-amber-500 text-slate-950 px-3 py-1.5 rounded text-sm font-bold transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الفاتورة</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content Frame */}
        <div id="print-area" className="p-8 md:p-12 bg-white text-slate-900 font-sans leading-relaxed relative overflow-hidden print-exact">
          
          {/* Watermark Background of the Office (Elegant, very low opacity) */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.025] select-none print:opacity-[0.035]">
            <svg className="w-[450px] h-[450px] text-slate-900 transform rotate-[-20deg]" viewBox="0 0 100 100" fill="currentColor">
              <path d="M50 12 L20 48 L42 48 L32 82 L68 82 L58 48 L80 48 Z" />
              <circle cx="50" cy="30" r="6" />
              <path d="M12 60 C32 88, 68 88, 88 60" stroke="currentColor" strokeWidth="4" fill="none" />
              <text x="50" y="95" fontSize="8" fontWeight="900" textAnchor="middle" fill="currentColor" letterSpacing="1">SAMA KINGDOM</text>
            </svg>
          </div>

          {/* Decorative Gold Header Bar for printing */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700"></div>

          {/* Interactive Print Invoice Action Button (Hidden in Print Mode) */}
          <div className="mb-6 flex justify-center print:hidden relative z-20">
            <button
              onClick={handlePrint}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 hover:text-white font-black px-8 py-3.5 rounded-xl shadow-lg border border-emerald-450/40 hover:shadow-emerald-500/20 active:scale-98 transition duration-150 cursor-pointer text-sm"
              id="print-action-btn"
            >
              <Printer className="w-5 h-5 animate-pulse text-slate-950 hover:text-white" />
              <span className="text-slate-950 font-black">طباعة وتحميل الفاتورة الضريبية الرئسية (PDF)</span>
            </button>
          </div>

          {/* Internal Header Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b-2 border-slate-900 items-start print-border-header relative z-10">
            <div className="flex gap-4 items-start">
              {/* Premium Official Corporate Vector Logo */}
              <div className="flex-shrink-0 bg-slate-950 p-2.5 rounded-xl border-2 border-amber-500 shadow-md">
                <svg className="w-11 h-11 text-amber-400" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Style Crown / Wing Architecture of Mamlaka */}
                  <path d="M50 12 L20 48 L42 48 L32 82 L68 82 L58 48 L80 48 Z" fill="currentColor" />
                  <circle cx="50" cy="30" r="6" fill="#ffffff" />
                  <path d="M12 60 C32 88, 68 88, 88 60" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" />
                  <text x="50" y="94" fontSize="12" fontWeight="900" textAnchor="middle" fill="#ffffff" letterSpacing="1">SAMA</text>
                </svg>
              </div>

              <div>
                <div className="text-2xl font-black text-slate-900 tracking-wider">مكتب سما المملكة</div>
                <div className="text-amber-600 font-bold text-xs tracking-wide mb-2">للخدمات المتكاملة والتأشيرات والتعقيب الحكومي</div>
                <div className="text-xs text-slate-500 space-y-0.5 font-mono">
                  <p>الرقم الضريبي المستهدف: 300065432100003</p>
                  <p>مكتب مرخص رقم: 84729 / ج</p>
                  <p>العنوان: شارع العليا العام، الرياض، المملكة العربية السعودية</p>
                  <p>الجوال: +966 50 000 0000</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end md:text-left text-xs space-y-2 font-mono relative z-10">
              <div className="bg-slate-100 px-3 py-1.5 border border-slate-300 font-bold text-[11px] rounded flex items-center gap-1.5 text-slate-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>فاتورة ضريبية مبسطة صادرة ومسجلة</span>
              </div>
              <p><span className="text-slate-500">رقم الفاتورة:</span> <span className="font-bold text-slate-900 text-sm">{transaction.invoiceNumber}</span></p>
              <p><span className="text-slate-500">تاريخ الإصدار:</span> <span className="font-bold">{new Date(transaction.date).toLocaleDateString('ar-SA')} - {new Date(transaction.date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span></p>
            </div>
          </div>

          {/* Client Details Row */}
          <div className="my-6 bg-slate-50/85 p-5 border border-slate-200 rounded-xl relative z-10 backdrop-blur-[1px]">
            <h4 className="text-slate-500 font-bold text-xs uppercase tracking-wider mb-2 border-b border-slate-200 pb-1.5">بيانات العميل المستفيد والمكلف</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm leading-relaxed">
              <div className="flex items-center gap-2">
                <User className="w-4.5 h-4.5 text-amber-500" />
                <span className="font-bold text-slate-800 text-base">{transaction.clientName}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-amber-500" />
                <span className="font-bold text-slate-700">الطلب المعتمد: <span className="font-sans font-normal text-slate-600">{transaction.serviceName}</span></span>
              </div>
            </div>
          </div>

          {/* Services breakdown table */}
          <div className="overflow-x-auto border border-slate-900 rounded-xl mt-6 relative z-10">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="bg-slate-900 text-white border-b border-slate-900">
                  <th className="p-4 sm:p-5 w-3/5 text-right font-bold tracking-wide">وصف الخدمة والإجراء للعملية</th>
                  <th className="p-4 sm:p-5 w-1/5 text-center font-bold tracking-wide">الخضوع للضريبة</th>
                  <th className="p-4 sm:p-5 w-1/5 text-left font-bold tracking-wide">قيمة البند المالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {/* Government segment */}
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 sm:p-5">
                    <p className="font-bold font-sans text-[14.5px] text-slate-900">الرسوم والمستحقات الحكومية والدولة</p>
                    <p className="text-slate-500 text-xs font-sans mt-0.5 leading-relaxed">تشمل المبالغ المسددة للوزارات، ومنصة الجوازات، والجهات البلدية والاعتمادات الخارجية المباشرة المعفاة.</p>
                  </td>
                  <td className="p-4 sm:p-5 text-center text-slate-500 font-sans font-medium">معفى / صفر ضريبة</td>
                  <td className="p-4 sm:p-5 text-left font-bold text-[14.5px] text-slate-800">{transaction.govFee.toFixed(2)} ر.س</td>
                </tr>
                {/* Office fee segment */}
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 sm:p-5">
                    <p className="font-bold font-sans text-[14.5px] text-slate-900">أتعاب وتكاليف خدمات سما المملكة</p>
                    <p className="text-slate-500 text-xs font-sans mt-0.5 leading-relaxed">أتعاب المعاملة الإدارية وتدقيق الطلبات والاستشارات وصياغة الملفات والتعقيب الميداني.</p>
                  </td>
                  <td className="p-4 sm:p-5 text-center text-slate-900 font-sans font-semibold text-amber-700">خاضع (15%)</td>
                  <td className="p-4 sm:p-5 text-left font-bold text-[14.5px] text-slate-800">{transaction.officeFee.toFixed(2)} ر.س</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="mt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pt-5 border-t border-slate-200 relative z-10">
            {/* Zatca QR Code mockup */}
            <div className="flex items-center gap-3 bg-slate-50/90 p-3 border border-slate-200 rounded-xl">
              <div className="p-1.5 bg-white border border-slate-300 rounded">
                {/* Dynamic simulated beautiful QR code vector representation */}
                <svg className="w-20 h-20 text-slate-900" viewBox="0 0 100 100">
                  <rect x="0" y="0" width="10" height="10" fill="currentColor"/>
                  <rect x="15" y="0" width="10" height="5" fill="currentColor"/>
                  <rect x="0" y="15" width="10" height="10" fill="currentColor"/>
                  <rect x="40" y="0" width="20" height="10" fill="currentColor"/>
                  <rect x="80" y="0" width="20" height="20" fill="currentColor"/>
                  <rect x="80" y="30" width="10" height="10" fill="currentColor"/>
                  <rect x="0" y="80" width="20" height="20" fill="currentColor"/>
                  <rect x="30" y="80" width="5" height="10" fill="currentColor"/>
                  <text x="50" y="60" fontSize="7" fontWeight="bold" textAnchor="middle" fill="#d97706">ZATCA</text>
                  <rect x="30" y="30" width="30" height="15" fill="currentColor" opacity="0.8"/>
                  <rect x="65" y="65" width="30" height="30" fill="currentColor"/>
                </svg>
              </div>
              <div className="text-[11px] font-sans text-slate-500 leading-normal max-w-[190px]">
                <p className="font-bold text-slate-800">فاتورة إلكترونية معتمدة</p>
                <p>مشفر باسم مكتب سما المملكة للفوترة الرقمية والتسجيل في هيئة الزكاة والضريبة والجمارك بالمملكة.</p>
              </div>
            </div>

            {/* Price Calculations Column */}
            <div className="w-full md:w-80 font-mono text-sm space-y-2.5">
              <div className="flex justify-between text-slate-600">
                <span>إجمالي الخاضع للضريبة (أتعاب المكتب):</span>
                <span>{transaction.officeFee.toFixed(2)} ر.س</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>ضريبة القيمة المضافة (15%):</span>
                <span>{transaction.tax.toFixed(2)} ر.س</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>الرسوم والمصاريف الحكومية المستحقة والمسددة:</span>
                <span>{transaction.govFee.toFixed(2)} ر.س</span>
              </div>
              <div className="flex justify-between font-black text-lg text-slate-950 border-t-2 border-slate-900 pt-2 bg-amber-50 p-2.5 rounded-lg">
                <span className="font-sans">الإجمالي النهائي المستحق:</span>
                <span>{transaction.total.toFixed(2)} ر.س</span>
              </div>
            </div>
          </div>

          {/* Signatures & Stamps section (Highly Professional) */}
          <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 items-end relative z-10">
            {/* Stamp Column */}
            <div className="flex flex-col items-start space-y-2">
              <span className="text-[10px] text-slate-500 font-bold">الختم المعتمد للمكتب:</span>
              <div className="relative w-28 h-28 flex items-center justify-center">
                {/* Visual Official Royal Seal SVG representation */}
                <svg className="w-24 h-24 text-amber-600/80" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3,1"/>
                  <circle cx="50" cy="50" r="41" fill="none" stroke="currentColor" strokeWidth="1"/>
                  <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                  
                  {/* Arc paths for stamp fonts to draw beautifully */}
                  <defs>
                    <path id="stampTitlePath" d="M 18,50 A 32,32 0 1,1 82,50" fill="none" />
                    <path id="stampSubtitlePath" d="M 82,50 A 32,32 0 1,1 18,50" fill="none" />
                  </defs>
                  
                  <text fontSize="5.5" fontWeight="black" fill="currentColor">
                    <textPath href="#stampTitlePath" startOffset="50%" textAnchor="middle">
                      مكتب سما المملكة للخدمات المتكاملة
                    </textPath>
                  </text>
                  
                  <text fontSize="5" fontWeight="extrabold" fill="currentColor">
                    <textPath href="#stampSubtitlePath" startOffset="50%" textAnchor="middle">
                      الرياض - تأسس ٢٠٢٦ - الختم المالي
                    </textPath>
                  </text>

                  {/* Centered Golden Crown Shape */}
                  <path d="M 40 45 L 50 35 L 60 45 L 55 55 L 45 55 Z" fill="currentColor" opacity="0.4"/>
                  <circle cx="50" cy="46" r="2" fill="currentColor"/>
                  <text x="50" y="65" fontSize="6.5" fontWeight="900" fill="currentColor" textAnchor="middle">مُعتمد</text>
                </svg>
                {/* Certified overlay ribbon indicator */}
                <div className="absolute top-4 left-6 rotate-[-12deg] bg-amber-600/10 border border-amber-600/20 px-2 py-0.5 rounded text-[8px] font-black text-amber-700 font-sans tracking-wide">
                  VERIFIED
                </div>
              </div>
            </div>

            {/* Manager Official Digital Signature Autopen Column */}
            <div className="flex flex-col items-end space-y-2 text-left">
              <span className="text-[10px] text-slate-500 font-bold w-full text-left">المدير العام والمسؤول المالي:</span>
              <div className="flex flex-col items-center pl-4">
                {/* Simulated Handwritten Cursive Autopen Signature Vector */}
                <div className="h-16 flex items-center justify-end relative">
                  <svg className="w-36 h-12 text-blue-700/80 filter drop-shadow-sm select-none pointer-events-none" viewBox="0 0 150 50">
                    <path 
                      d="M 12 36 C 35 15, 50 42, 62 18 C 76 -2, 82 43, 98 22 C 112 8, 118 48, 138 18 C 146 8, 151 32, 154 12 M 22 36 L 142 22 C 146 20, 102 46, 72 41 C 42 38, 22 28, 58 32" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="absolute bottom-1 right-1 bg-emerald-100 text-emerald-800 text-[8px] font-black px-1.5 py-0.5 rounded transform rotate-[-3deg]">موقّع رقمياً</div>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-slate-900 text-xs">أ. عصام التركي</p>
                  <p className="text-[10px] text-slate-500">المدير العام والتنفيذي للمكتب</p>
                </div>
              </div>
            </div>
          </div>

          {/* Special Notes */}
          {transaction.notes && (
            <div className="mt-8 p-4 bg-slate-50/90 border-r-4 border-amber-600 text-xs rounded-xl text-slate-600 font-sans relative z-10">
              <span className="font-bold text-slate-800 block mb-1">ملاحظات المستند المالي:</span>
              {transaction.notes}
            </div>
          )}

          {/* Footer of Receipt */}
          <div className="mt-12 text-center text-[11px] text-slate-400 border-t border-slate-100 pt-4 relative z-10">
            تعتبر هذه الفاتورة مستند رسمي لإثبات إنهاء وتعميد المعاملات عبر مكتب سما المملكة. نشكركم لثقتكم الغالية بنا.
          </div>
        </div>

        {/* Foot toolbar for cancellation */}
        <div className="bg-slate-50 px-6 py-3 flex justify-end gap-2 border-t border-slate-200 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-sm font-bold rounded transition-colors"
          >
            إغلاق العرض
          </button>
        </div>
      </div>
    </div>
  );
}
