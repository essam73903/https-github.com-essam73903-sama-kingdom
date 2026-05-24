import React, { useState, useEffect } from 'react';
import { 
  Briefcase, Compass, Users, FileText, Truck, Plane, 
  TrendingUp, Coins, Receipt, CreditCard, Calendar, Search, Lock, 
  Plus, Trash2, CheckCircle2, AlertCircle, Download, 
  LogOut, Home, Info, ShieldCheck, Activity, ChevronLeft, 
  PlusCircle, FileSpreadsheet, ListFilter, HelpCircle, PhoneCall,
  Paperclip, Eye, Upload, Sparkles, Sun, Moon, ArrowUpDown,
  MessageSquare, Send, Clock, Smartphone, Menu, X,
  Twitter, Instagram, Linkedin, Facebook, ExternalLink, Archive, Inbox, Zap, Printer, QrCode, Copy, Check
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';

import { 
  Service, BookingRequest, Transaction, JobVacancy, JobApplication,
  DEFAULT_SERVICES, INITIAL_TRANSACTIONS, INITIAL_BOOKINGS 
} from './types';

import PasscodeModal from './components/PasscodeModal';
import InvoiceDetailModal from './components/InvoiceDetailModal';
import { GlobalPaymentModal } from './components/GlobalPaymentModal';
import { 
  collection, 
  onSnapshot, 
  setDoc, 
  doc, 
  deleteDoc, 
  getDocs 
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from './firebase';

// WhatsApp Notification Log Interface
export interface WhatsAppLog {
  id: string;
  bookingId: string;
  clientName: string;
  phoneNumber: string;
  serviceName: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  message: string;
  sentAt: string;
  success: boolean;
  apiResponse: string;
}

// Helper to read credential with local storage overriding environment variables
const getWhatsAppCredential = (key: string, envVal: string | undefined): string => {
  if (typeof window !== 'undefined') {
    const localVal = localStorage.getItem(key);
    if (localVal) return localVal;
  }
  return envVal || '';
};

export const AVAILABLE_PAYMENT_METHODS = [
  { id: 'sadad', name: 'سداد للمدفوعات الحكومية', badge: 'سداد 🇸🇦', color: 'bg-teal-50 text-teal-805 border-teal-200 hover:bg-teal-100/50' },
  { id: 'mada', name: 'بطاقة مدى الوطنية', badge: 'مدى 💳', color: 'bg-sky-50 text-sky-805 border-sky-200 hover:bg-sky-100/50' },
  { id: 'credit_card', name: 'فيزا وماستركارد الدولية', badge: 'فيزا/ماستر 🌐', color: 'bg-indigo-50 text-indigo-805 border-indigo-200 hover:bg-indigo-100/50' },
  { id: 'applepay', name: 'Apple Pay الآمن المباشر', badge: 'Apple Pay ', color: 'bg-neutral-100 text-neutral-805 border-neutral-300 hover:bg-neutral-200/50' },
  { id: 'stcpay', name: 'محفظة STC Pay الرقمية', badge: 'STC Pay 📱', color: 'bg-fuchsia-50 text-fuchsia-805 border-fuchsia-200 hover:bg-fuchsia-100/50' },
  { id: 'paypal', name: 'بوابة PayPal العالمية', badge: 'PayPal 🅿️', color: 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100/50' },
  { id: 'fawry', name: 'شبكة فوري السريعة للمدفوعات', badge: 'فوري ⚡', color: 'bg-amber-50 text-amber-805 border-amber-200 hover:bg-amber-100/50' },
  { id: 'bank_transfer', name: 'تحويل بنكي مباشر (بنك الأهلي)', badge: 'تحويل بنكي 🏦', color: 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100/50' }
];

// Real & Mock API integration to send WhatsApp notifications via Twilio, UltraMsg, or a fallback Mock Gateway
const sendPlaceholderWhatsAppAPI = async (phoneNumber: string, message: string) => {
  // Normalize recipient number to digits only (cleaning spaces, dashes, parentheses and leading plus/zeros)
  let formattedPhone = phoneNumber.trim().replace(/[\s\-\(\)\+]/g, '');
  
  // Saudi number normalization
  if (formattedPhone.startsWith('05')) {
    formattedPhone = `966${formattedPhone.substring(1)}`;
  } else if (formattedPhone.startsWith('00966')) {
    formattedPhone = `966${formattedPhone.substring(5)}`;
  }
  
  // E.164 format with plus (needed for Twilio)
  const e164Phone = `+${formattedPhone}`;

  // Retrieve active gateway type and credentials (either from localStorage or import.meta.env fallback)
  const gatewayType = getWhatsAppCredential('sm_wa_gateway_type', (import.meta as any).env?.VITE_WA_GATEWAY_TYPE) || 'mock';
  const twilioSid = getWhatsAppCredential('sm_twilio_account_sid', (import.meta as any).env?.VITE_TWILIO_ACCOUNT_SID);
  const twilioToken = getWhatsAppCredential('sm_twilio_auth_token', (import.meta as any).env?.VITE_TWILIO_AUTH_TOKEN);
  const twilioSender = getWhatsAppCredential('sm_twilio_sender', (import.meta as any).env?.VITE_TWILIO_SENDER) || 'whatsapp:+14155238886';
  const ultramsgInstance = getWhatsAppCredential('sm_ultramsg_instance_id', (import.meta as any).env?.VITE_ULTRAMSG_INSTANCE_ID);
  const ultramsgToken = getWhatsAppCredential('sm_ultramsg_token', (import.meta as any).env?.VITE_ULTRAMSG_TOKEN);

  try {
    if (gatewayType === 'twilio' && twilioSid && twilioToken) {
      // TWILIO WHATSAPP BUSINESS API INTEGRATION
      const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const authHeader = 'Basic ' + btoa(`${twilioSid}:${twilioToken}`);
      
      const cleanSender = twilioSender.toLowerCase().startsWith('whatsapp:') 
        ? twilioSender 
        : `whatsapp:${twilioSender}`;

      const params = new URLSearchParams();
      params.append('To', `whatsapp:${e164Phone}`);
      params.append('From', cleanSender);
      params.append('Body', message);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`بوابة Twilio أرجعت خطأ: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return {
        success: true,
        apiResponse: JSON.stringify({
          gateway: 'Twilio WhatsApp API',
          status: data.status,
          sid: data.sid,
          to: data.to,
          from: data.from,
          date_created: data.date_created,
          body_preview: message.substring(0, 100) + '...'
        }, null, 2)
      };

    } else if (gatewayType === 'ultramsg' && ultramsgInstance && ultramsgToken) {
      // ULTRAMSG DIRECT GATEWAY INTEGRATION (Real immediate numbers)
      const url = `https://api.ultramsg.com/${ultramsgInstance}/messages/chat`;
      
      const params = new URLSearchParams();
      params.append('token', ultramsgToken);
      params.append('to', formattedPhone); // UltraMsg expects digits-only layout
      params.append('body', message);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`بوابة UltraMsg أرجعت خطأ: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (data.error || data.success === false) {
        throw new Error(`UltraMsg Error: ${JSON.stringify(data.error || data)}`);
      }

      return {
        success: true,
        apiResponse: JSON.stringify({
          gateway: 'UltraMsg Gateway',
          status: 'sent_success',
          id: data.id || `msg-${Date.now()}`,
          recipient: formattedPhone,
          description: data.description || 'تم إرسال وجدولة الرسالة بنجاح عبر البوابة.',
          payload: data
        }, null, 2)
      };

    } else {
      // GRACEFUL DEGRADATION FALLBACK: JSONPlaceholder Simulator Mock
      const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: e164Phone,
          body: message,
          client: 'SamaAlMamlaka_WA_Gateway',
          timestamp: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        const errorStatusText = response.statusText || 'Unknown Status';
        throw new Error(`مشكلة الاتصال بالبوابة الافتراضية: ${response.status} (${errorStatusText})`);
      }
      
      const data = await response.json();
      return {
        success: true,
        apiResponse: JSON.stringify({
          gateway: 'بوابة المحاكاة الافتراضية (Mock Simulator)',
          status: 'queued',
          messageId: `wa-mock-msg-${Date.now()}`,
          warning: '⚠️ لم يتم تهيئة مفاتيح الربط الحقيقية (Twilio/UltraMsg) بعد أو تم اختيار البوابة الافتراضية. يرجى تهيئتها من شاشة الإدارة لتفعيل الإرسال الحقيقي للجوالات.',
          payload: {
            id: data.id,
            recipient: e164Phone,
            message_preview: message.substring(0, 50) + '...'
          }
        }, null, 2)
      };
    }
  } catch (error: any) {
    const errorMsg = error?.message || 'خطأ غير معروف في الاتصال بالبوابة أو إرسال المشغل';
    console.error(`[WhatsApp API Exception] Thrown error while sending to ${phoneNumber}. Message: ${errorMsg}`);
    
    // Separate global log array/variable for telemetry debugging
    if (typeof window !== 'undefined') {
      const exceptionLog = {
        timestamp: new Date().toISOString(),
        recipient: phoneNumber,
        messagePreview: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
        type: 'EXCEPTION_ERROR',
        details: errorMsg,
        stack: error?.stack || null
      };
      (window as any).whatsappErrorLogs = (window as any).whatsappErrorLogs || [];
      (window as any).whatsappErrorLogs.push(exceptionLog);
    }

    return {
      success: false,
      apiResponse: errorMsg
    };
  }
};

// Import image assets to allow proper bundling by Vite
// @ts-ignore
import makkahSunriseImg from './assets/images/makkah_sunrise_1779229201653.png';
// @ts-ignore
import makkahSunsetImg from './assets/images/makkah_bg_1779228945233.png';
// @ts-ignore
import makkahNightImg from './assets/images/makkah_night_1779229182943.png';
// @ts-ignore
import samaLogoImg from './assets/images/sama_logo_1779229636162.png';

const TRANSLATIONS = {
  ar: {
    officeName: "مكتب سما المملكة",
    integratedServices: "الخدمات المتكاملة",
    home: "الرئيسية",
    trackRequest: "الاستعلام عن طلب",
    vacancies: "الوظائف الشاغرة",
    adminPanel: "لوحة التحكم والعمليات",
    connectedStatus: "سجل الحسابات والتعقيب متصل بالبوابة الموحدة للمملكة",
    localTime: "التوقيت المحلي لإنهاء المعاملات:",
    currentUser: "المستخدم الحالي للفوترة:",
    searchPlaceholder: "أدخل رقم الجوال للبحث عن معاملاتك...",
    searchButton: "استعلام ومعاينة الحجز",
    welcomeTitle: "مرحباً بكم في منصة مكتب سما المملكة",
    servicesTitle: "دليل الخدمات الإلكترونية المعتمدة الفورية",
    servicesSub: "اختر الخدمة المطلوبة لبدء ملء وتدقيق استمارة التجزئة والدفع الآمن فوراً",
    applyNow: "احجز خدمتك الآن",
    jobVacanciesTitle: "فرص التوظيف المتاحة بمكتب سما المملكة",
    applyForJob: "التقدم لهذه الوظيفة الآن",
    clientName: "اسم المستفيد (الاسم بالكامل كما في الهوية):",
    phoneNumber: "رقم الجوال النشط (مع رمز الدولة):",
    passportNumber: "رقم جواز السفر أو الهوية الوطنية:",
    specialNotes: "ملاحظات خاصة أو تعديلات مطلوبة للمعاملة:",
    uploadDoc: "إرفاق مستندات مساندة (الهوية، جواز السفر، الإقامات أو التأشيرات المؤقتة):",
    dragDrop: "اسحب وأسقط الملف هنا أو انقر للاختيار يدوياً لرفعها فوراً لخوادمنا المحمية",
    officeFee: "أتعاب مكتب سما المملكة:",
    govFee: "الرسوم الحكومية والتأشيرات والضرائب:",
    vat: "مشمول ضريبة مضافة (15%):",
    totalFee: "إجمالي السداد المستحق للخدمة:",
    confirmBookingButton: "تأكيد الحجز وبدء السداد وتجهيز الملف الآن",
    submitting: "جاّر تجهيز وإيداع المعاملة...",
    allServices: "كل الخدمات",
    filterVisa: "تأشيرات وإقامات",
    filterGov: "معاملات حكومية",
    filterTransport: "نقل ومرور",
    filterOther: "أخرى ومتنوعة",
    sortBy: "ترتيب حسب:",
    saving: "حفظ التغييرات...",
    saved: "تم الحفظ بنجاح!",
    jobTitle: "المسمى الوظيفي:",
    department: "القسم / الإدارة:",
    salaryRange: "نطاق الراتب المتوقع:",
    location: "موقع العمل:",
    workType: "طبيعة العمل ونوعه:",
    noBookingsFound: "لا توجد معاملات مسجلة في منصتنا الحالية لعام 2026.",
    searchYourBookings: "ابحث عن معاملاتك وحجزك الآن من قسم الاستعلام للتحقق من الفواتير والتقارير المرفقة.",
    languageToggle: "English",
  },
  en: {
    officeName: "Sama Al-Mamlaka Office",
    integratedServices: "Integrated Services",
    home: "Home",
    trackRequest: "Track Request",
    vacancies: "Job Vacancies",
    adminPanel: "Admin Panel & Operations",
    connectedStatus: "Accounting and general services connected to the Kingdom's unified portal",
    localTime: "Local transaction processing time:",
    currentUser: "Current active billing user:",
    searchPlaceholder: "Enter phone number to search for your transactions...",
    searchButton: "Query & Preview Booking",
    welcomeTitle: "Welcome to Sama Al-Mamlaka Portal",
    servicesTitle: "Directory of Instant Approved Electronic Services",
    servicesSub: "Choose the requested service to start filling the booking form and pay securely instantly",
    applyNow: "Select & Book Service",
    jobVacanciesTitle: "Employment Opportunities at Sama Al-Mamlaka",
    applyForJob: "Apply for this Job Now",
    clientName: "Beneficiary Name (Full name as on ID):",
    phoneNumber: "Active Mobile Number (with country code):",
    passportNumber: "Passport Number or National ID:",
    specialNotes: "Special notes or required adjustments for your transaction:",
    uploadDoc: "Attach supporting documents (ID, Passport, Iqama or Temporary Visas):",
    dragDrop: "Drag & drop files here or click to browse manually to upload securely to our protected servers",
    officeFee: "Sama Al-Mamlaka Fee:",
    govFee: "Government, Visas & Taxes Fees:",
    vat: "Includes Value Added Tax (15%):",
    totalFee: "Total Due Payment for Service:",
    confirmBookingButton: "Confirm Booking, Start Secure Payment & Prepare File Now",
    submitting: "Preparing and depositing your transaction...",
    allServices: "All Services",
    filterVisa: "Visas & Iqamas",
    filterGov: "Gov Transactions",
    filterTransport: "Transport & Traffic",
    filterOther: "Other Services",
    sortBy: "Sort by:",
    saving: "Saving changes...",
    saved: "Saved successfully!",
    jobTitle: "Job Title:",
    department: "Department / Admin:",
    salaryRange: "Expected Salary Range:",
    location: "Location:",
    workType: "Nature and Type of Work:",
    noBookingsFound: "No recorded transactions found in our portal for 2026.",
    searchYourBookings: "Search your transactions and bookings from the Query tab to check bills and attached reports.",
    languageToggle: "العربية",
  }
};

export default function App() {
  // --- STATE DECLARATIONS ---
  const [lang, setLang] = useState<'ar' | 'en'>(() => {
    return (localStorage.getItem('sm_lang') as 'ar' | 'en') || 'ar';
  });

  const handleLangToggle = () => {
    const nextLang = lang === 'ar' ? 'en' : 'ar';
    setLang(nextLang);
    localStorage.setItem('sm_lang', nextLang);
  };

  const t = (key: keyof typeof TRANSLATIONS['ar']) => {
    const defaultTranslations = TRANSLATIONS['ar'];
    const selectedTranslations = TRANSLATIONS[lang];
    return selectedTranslations ? (selectedTranslations[key] || defaultTranslations[key]) : defaultTranslations[key];
  };

  const getTranslatedServiceName = (serviceName: string) => {
    if (lang === 'ar') return serviceName;
    const mapped: Record<string, string> = {
      'تأشيرة عمل': 'Work Visa',
      'تأشيرة عمرة وحج': 'Umrah & Hajj Visa',
      'تأشيرة زيارة': 'Visit Visa',
      'خدمات تعقيب': 'Clearance & Follow-up Services',
      'نقل بري': 'Land Transport',
      'نقل جوي': 'Air Transport'
    };
    return mapped[serviceName] || serviceName;
  };

  const getTranslatedServiceDesc = (desc: string) => {
    if (lang === 'ar') return desc;
    const mapped: Record<string, string> = {
      'تسهيل كافة إجراءات الاستقدام وتفويض وإصدار تأشيرات العمل للأفراد والمؤسسات بسرية وسرعة فائقة.': 'Facilitating recruitment procedures, authorization, and issuance of work visas for individuals and establishments with high speed and privacy.',
      'إصدار تأشيرات المعتمرين والزوار وتنسيق السكن والتنقل بأسعار متميزة تخدم ضيوف الرحمن.': 'Issuance of Hajj & Umrah visas, coordinating accommodation and transport at excellent rates serving pilgrims.',
      'إجراءات تأشيرات الزيارة العائلية، الشخصية، التجارية، والسياحية مع متابعة القبول والتأشير.': 'Family, personal, commercial, and tourist visit visas procedures with approval follow-up.',
      'متابعة وإنجاز كافة المعاملات لدى الدوائر الحكومية، مكاتب العمل، الجوازات، والبلديات بكفاءة عالية.': 'Efficient follow-up and completion of all transactions with government departments, labor offices, passports, and municipalities.',
      'توفير خدمات النقل البري الجماعي والشحن للبضائع والطرود والسيارات بين كافة مدن المملكة ودول الخليج.': 'Providing land transport and shipping services for cargo, parcels, and vehicles between all cities in the Kingdom and Gulf countries.',
      'حجز ومتابعة تذاكر السفر وإصدار بوالص الشحن الجوي وتسهيل معاملات المطارات والاستقبال.': 'Booking and tracking flights, issuing airway bills, and facilitating airport transactions and receiving passengers.'
    };
    return mapped[desc] || desc;
  };

  const getTranslatedJobTitle = (title: string) => {
    if (lang === 'ar') return title;
    const mapped: Record<string, string> = {
      'معقب معاملات حكومية محترف': 'Professional Government Clearance Clerk',
      'أخصائي خدمة عملاء ومبيعات هاتفية': 'Customer Service & Telesales Specialist'
    };
    return mapped[title] || title;
  };

  const getTranslatedJobDept = (dept: string) => {
    if (lang === 'ar') return dept;
    const mapped: Record<string, string> = {
      'قسم العلاقات العامة والتعقيب': 'Public Relations & Clearance Department',
      'قسم المبيعات والدعم الفني': 'Sales & Technical Support Department'
    };
    return mapped[dept] || dept;
  };

  const getTranslatedJobDesc = (desc: string) => {
    if (lang === 'ar') return desc;
    const mapped: Record<string, string> = {
      'نبحث عن معقب معاملات ذو خبرة واسعة في مراجعة الدوائر الحكومية والوزارات الإلكترونية مثل بلدي، قوى، التأمينات الاجتماعية، والجوازات بصورة احترافية وسريعة.': 'We are looking for an experienced transaction officer proficient in handling government databases and electronic portals like Balady, Qiwa, GOSI, and Muqeem.',
      'استقبل استفسارات العملاء واقتراح الخدمات الإجرائية المناسبة لهم ومتابعة المعاملات مع فريق التعقيب عبر بوابة سما المملكة الإلكترونية بصورة ودية وعملية.': 'Handle customer inquiries, propose appropriate procedural services, and coordinate transactions with the clearance team through Sama Al-Mamlaka digital portal.'
    };
    return mapped[desc] || desc;
  };

  const [services, setServices] = useState<Service[]>(() => {
    const saved = localStorage.getItem('sm_services');
    let loaded: Service[] = saved ? JSON.parse(saved) : DEFAULT_SERVICES;
    
    // Auto-fill missing paymentMethods arrays with default values from DEFAULT_SERVICES
    loaded = loaded.map(s => {
      if (!s.paymentMethods || s.paymentMethods.length === 0) {
        const def = DEFAULT_SERVICES.find(d => d.id === s.id);
        return {
          ...s,
          paymentMethods: def?.paymentMethods || ['mada', 'credit_card', 'applepay', 'bank_transfer']
        };
      }
      return s;
    });
    
    // Check if we already applied the 10% increase to visa services
    const migKey = 'sm_visa_fees_raised_v2';
    if (!localStorage.getItem(migKey)) {
      loaded = loaded.map(s => {
        if (s.category === 'visa') {
          return {
            ...s,
            govFee: Math.round(s.govFee * 1.1),
            officeFee: Math.round(s.officeFee * 1.1)
          };
        }
        return s;
      });
      localStorage.setItem(migKey, 'true');
      localStorage.setItem('sm_services', JSON.stringify(loaded));
    }
    return loaded;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('sm_transactions');
    let loaded: Transaction[] = saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
    
    // Check if we should migrate pre-populated transactions too
    const migKeyTx = 'sm_visa_tx_fees_raised_v2';
    if (!localStorage.getItem(migKeyTx)) {
      loaded = loaded.map(t => {
        if (t.serviceName === 'تأشيرة عمل' && t.govFee === 2000 && t.officeFee === 500) {
          const govFee = 2200;
          const officeFee = 550;
          const tax = 82.5;
          const total = 2832.5;
          return { ...t, govFee, officeFee, tax, total };
        }
        if (t.serviceName === 'تأشيرة عمرة وحج' && t.govFee === 300 && t.officeFee === 150) {
          const govFee = 330;
          const officeFee = 165;
          const tax = 24.75;
          const total = 519.75;
          return { ...t, govFee, officeFee, tax, total };
        }
        return t;
      });
      localStorage.setItem(migKeyTx, 'true');
      localStorage.setItem('sm_transactions', JSON.stringify(loaded));
    }
    return loaded;
  });

  const [bookings, setBookings] = useState<BookingRequest[]>(() => {
    const saved = localStorage.getItem('sm_bookings');
    return saved ? JSON.parse(saved) : INITIAL_BOOKINGS;
  });

  // Current tab: 'home' | 'track' | 'jobs' | 'admin'
  const [activeTab, setActiveTab] = useState<'home' | 'track' | 'jobs' | 'admin'>('home');

  // Job Vacancies State
  const [jobVacancies, setJobVacancies] = useState<JobVacancy[]>(() => {
    const saved = localStorage.getItem('sm_job_vacancies');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'job-1',
        title: 'معقب معاملات حكومية محترف',
        department: 'قسم العلاقات العامة والتعقيب',
        location: 'الرياض - الملز',
        type: 'دوام كامل',
        salary: '6,000 - 8,500 ريال',
        description: 'نبحث عن معقب معاملات ذو خبرة واسعة في مراجعة الدوائر الحكومية والوزارات الإلكترونية مثل بلدي، قوى، التأمينات الاجتماعية، والجوازات بصورة احترافية وسريعة.',
        requirements: [
          'خبرة لا تقل عن 3 سنوات في مجال التعقيب بالمملكة والتعامل مع الجهات الرسمية.',
          'رخصة قيادة سارية المفعول ووجود وسيلة نقل خاصة لتخليص المعاملات.',
          'إلمام تام باستخدام جميع المنصات والخدمات الحكومية الإلكترونية.'
        ],
        date: '2026-05-18T10:00:00.000Z'
      },
      {
        id: 'job-2',
        title: 'أخصائي خدمة عملاء ومبيعات هاتفية',
        department: 'قسم المبيعات والدعم الفني',
        location: 'الرياض (طريق الملك فهد)',
        type: 'دوام كامل',
        salary: '4,500 - 6,000 ريال',
        description: 'استقبال استفسارات العملاء واقتراح الخدمات الإجرائية المناسبة لهم ومتابعة المعاملات مع فريق التعقيب عبر بوابة سما المملكة الإلكترونية بصورة ودية وعملية.',
        requirements: [
          'مهارات اتصال واستماع متميزة والقدرة على الإقناع بصورة ودية ولطيفة.',
          'القدرة على استخدام برمجيات الحاسب الآلي وتطبيقات إدخال السجلات.',
          'مؤهل ثانوي أو دبلوم كحد أدنى ولغة عربية سليمة ونظيفة.'
        ],
        date: '2026-05-19T14:30:00.000Z'
      }
    ];
  });

  const [jobApplications, setJobApplications] = useState<JobApplication[]>(() => {
    const saved = localStorage.getItem('sm_job_applications');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'app-1',
        jobId: 'job-1',
        jobTitle: 'معقب معاملات حكومية محترف',
        applicantName: 'محمد بن علي الرشيد',
        applicantPhone: '0551234567',
        applicantEmail: 'm.alrasheed@example.com',
        qualification: 'دبلوم إدارة عامة',
        notes: 'لدي خبرة سابقة في إنهاء إجراءات وزارة التجارة الجمركية والبلديات.',
        experienceYears: 4,
        date: '2026-05-19T20:15:00.050Z'
      }
    ];
  });

  // Apply inputs and form states
  const [selectedJobForApply, setSelectedJobForApply] = useState<JobVacancy | null>(null);
  const [applyApplicantName, setApplyApplicantName] = useState('');
  const [applyApplicantPhone, setApplyApplicantPhone] = useState('');
  const [applyApplicantEmail, setApplyApplicantEmail] = useState('');
  const [applyQualification, setApplyQualification] = useState('');
  const [applyExperienceYears, setApplyExperienceYears] = useState<number>(1);
  const [applyNotes, setApplyNotes] = useState('');
  const [isJobApplying, setIsJobApplying] = useState(false);
  const [applyFeedback, setApplyFeedback] = useState<{ success: boolean; msg: string } | null>(null);

  // Admin New Job Creation Inputs
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobDepartment, setNewJobDepartment] = useState('');
  const [newJobLocation, setNewJobLocation] = useState('');
  const [newJobType, setNewJobType] = useState('دوام كامل');
  const [newJobSalary, setNewJobSalary] = useState('');
  const [newJobDescription, setNewJobDescription] = useState('');
  const [newJobRequirements, setNewJobRequirements] = useState('');
  const [jobFilterType, setJobFilterType] = useState<string>('all');

  // Job Applicant notification states
  const [selectedAppForNotify, setSelectedAppForNotify] = useState<JobApplication | null>(null);
  const [notifyMessageText, setNotifyMessageText] = useState('');
  const [isSendingJobNotification, setIsSendingJobNotification] = useState(false);

  
  // Admin Authentication State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return sessionStorage.getItem('sm_admin_logged') === 'true';
  });
  const [showPasscode, setShowPasscode] = useState(false);

  // Home Page Form states
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [submissionFeedback, setSubmissionFeedback] = useState<{ success: boolean; msg: string } | null>(null);
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Validation touch elements
  const [clientNameTouched, setClientNameTouched] = useState(false);
  const [clientPhoneTouched, setClientPhoneTouched] = useState(false);
  const [selectedServiceTouched, setSelectedServiceTouched] = useState(false);

  // Booking result Toast notification state
  const [bookingToast, setBookingToast] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    bookingId?: string;
  } | null>(null);

  // Client requests search status
  const [searchPhone, setSearchPhone] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [trackedRequests, setTrackedRequests] = useState<BookingRequest[]>([]);
  
  // Temporary client-side rating and comment state hooks
  const [tempBookingRatings, setTempBookingRatings] = useState<Record<string, number>>({});
  const [tempBookingComments, setTempBookingComments] = useState<Record<string, string>>({});

  // Selected Transaction for printable Invoice view
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // Global International Online Payment Modal States
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentBookingTarget, setPaymentBookingTarget] = useState<BookingRequest | null>(null);

  // Administrative Payment Configuration States (Admin-editable)
  const [paymentGatewayStripeKey, setPaymentGatewayStripeKey] = useState(() => localStorage.getItem('sm_stripe_key') || 'pk_live_51O8vS5SamaKingdomSecureKey');
  const [paymentGatewayPaypalEmail, setPaymentGatewayPaypalEmail] = useState(() => localStorage.getItem('sm_paypal_email') || 'accounting@sama-kingdom.com');
  const [paymentGatewayMadaActive, setPaymentGatewayMadaActive] = useState(() => localStorage.getItem('sm_mada_active') !== 'false');
  const [paymentGatewayFawryActive, setPaymentGatewayFawryActive] = useState(() => localStorage.getItem('sm_fawry_active') !== 'false');

  // Admin Inner-Tab: 'ledger' | 'requests' | 'services' | 'stats' | 'whatsapp' | 'jobs'
  const [adminTab, setAdminTab] = useState<'stats' | 'requests' | 'ledger' | 'services' | 'whatsapp' | 'jobs'>('stats');

  // New Transaction Form State (Admin)
  const [txClientName, setTxClientName] = useState('');
  const [txServiceId, setTxServiceId] = useState(DEFAULT_SERVICES[0]?.id || '');
  const [txGovFee, setTxGovFee] = useState<number>(DEFAULT_SERVICES[0]?.govFee || 0);
  const [txOfficeFee, setTxOfficeFee] = useState<number>(DEFAULT_SERVICES[0]?.officeFee || 0);
  const [txNotes, setTxNotes] = useState('');

  // New Dynamic Service Form State (Admin)
  const [newSrvName, setNewSrvName] = useState('');
  const [newSrvDesc, setNewSrvDesc] = useState('');
  const [newSrvGovFee, setNewSrvGovFee] = useState<number>(0);
  const [newSrvOfficeFee, setNewSrvOfficeFee] = useState<number>(0);
  const [newSrvCategory, setNewSrvCategory] = useState<'visa' | 'gov' | 'transport' | 'other'>('visa');
  const [newSrvIcon, setNewSrvIcon] = useState('PlusCircle');
  const [newSrvPaymentMethods, setNewSrvPaymentMethods] = useState<string[]>(['mada', 'credit_card', 'applepay', 'bank_transfer']);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceToDeleteCheck, setServiceToDeleteCheck] = useState<Service | null>(null);
  const [showCannotDeleteAlert, setShowCannotDeleteAlert] = useState(false);

  // Triggering visual popup on service cards details
  const [infoPopupService, setInfoPopupService] = useState<Service | null>(null);

  // Client PDF Attachment state variables
  const [attachedFileName, setAttachedFileName] = useState('');
  const [attachedFileData, setAttachedFileData] = useState('');
  const [attachedFileSize, setAttachedFileSize] = useState('');
  const [selectedViewBooking, setSelectedViewBooking] = useState<BookingRequest | null>(null);

  // Service management filtering & sorting state
  const [servicesSearchQuery, setServicesSearchQuery] = useState('');
  const [servicesFilterCategory, setServicesFilterCategory] = useState<'all' | 'visa' | 'gov' | 'transport' | 'other'>('all');
  const [servicesSortKey, setServicesSortKey] = useState<'name-asc' | 'name-desc' | 'total-asc' | 'total-desc'>('name-asc');

  // Welcome Message States
  const [welcomeMessage, setWelcomeMessage] = useState<string>(() => {
    return localStorage.getItem('sm_welcome_msg') || 'أهلاً ومرحباً بكم في منصة مكتب سما المملكة للخدمات المتكاملة وتخليص المعاملات الإلكترونية الحكومية. نسعد بخدمتكم وتخليص كافة معاملاتكم بكل دقة وأمان وسرعة بإشراف نخبة من المختصين والمهنيين.';
  });
  const [welcomeEditor, setWelcomeEditor] = useState<string>(() => {
    return localStorage.getItem('sm_welcome_msg') || 'أهلاً ومرحباً بكم في منصة مكتب سما المملكة للخدمات المتكاملة وتخليص المعاملات الإلكترونية الحكومية. نسعد بخدمتكم وتخليص كافة معاملاتكم بكل دقة وأمان وسرعة بإشراف نخبة من المختصين والمهنيين.';
  });
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Customizable Status Update messages for bookings
  const [statusMsgPending, setStatusMsgPending] = useState<string>(() => {
    return localStorage.getItem('sm_status_msg_pending') || 'قيد الانتظار لمراجعة الإدارة - نعتز بثقتكم وسنتولى معالجتها حالاً.';
  });
  const [statusMsgProcessing, setStatusMsgProcessing] = useState<string>(() => {
    return localStorage.getItem('sm_status_msg_processing') || 'تحت المعالجة الإجرائية الآن - يتم تنفيذ المعاملة ومراجعة الجهات المختصة.';
  });
  const [statusMsgCompleted, setStatusMsgCompleted] = useState<string>(() => {
    return localStorage.getItem('sm_status_msg_completed') || 'مكتملة ومستند الفاتورة جاهز - نسعد دائماً برضاكم التام.';
  });
  const [statusMsgCancelled, setStatusMsgCancelled] = useState<string>(() => {
    return localStorage.getItem('sm_status_msg_cancelled') || 'ملغية - نرجو التواصل مع الإدارة للاستفسار والتحقق.';
  });
  const [saveSuccessStatusMsg, setSaveSuccessStatusMsg] = useState(false);

  // Auto-Archiving System for Completed Requests older than 30 days
  const [requestsFilter, setRequestsFilter] = useState<'active' | 'archived'>('active');
  const [lastArchivedCount, setLastArchivedCount] = useState<number>(0);
  const [showArchivedNotice, setShowArchivedNotice] = useState(false);

  // WhatsApp Integration states and customizable templates
  const [whatsappTemplatePending, setWhatsappTemplatePending] = useState<string>(() => {
    return localStorage.getItem('sm_wa_template_pending') || 'السلام عليكم ورحمة الله وبركاته، الأخ/الأخت {name} المحترم. يسعدنا إبلاغكم بأنه تم استلام معاملتكم رقم {bookingId} لطلب ({service}) بنجاح، وهي الآن قيد المراجعة والانتظار من الإدارة. شكراً لثقتكم بمكتب سما المملكة.';
  });
  const [whatsappTemplateProcessing, setWhatsappTemplateProcessing] = useState<string>(() => {
    return localStorage.getItem('sm_wa_template_processing') || 'السلام عليكم ورحمة الله وبركاته، الأخ/الأخت {name} المحترم. نفيدكم علماً بأن معاملتكم رقم {bookingId} لطلب ({service}) قد دخلت حيز المراجعة والمعالجة الإجرائية من فريق التعقيب بالمكتب. سنوافيكم بالنتائج فوراً.';
  });
  const [whatsappTemplateCompleted, setWhatsappTemplateCompleted] = useState<string>(() => {
    return localStorage.getItem('sm_wa_template_completed') || 'السلام عليكم ورحمة الله وبركاته، الأخ/الأخت {name} المحترم. يسعدنا إبلاغكم بأن معاملتكم لطلب ({service}) قد اكتملت بنجاح ومستند الفاتورة جاهز. شكراً لثقتكم بمكتب سما المملكة للخدمات المتكاملة.';
  });
  const [whatsappTemplateCancelled, setWhatsappTemplateCancelled] = useState<string>(() => {
    return localStorage.getItem('sm_wa_template_cancelled') || 'السلام عليكم ورحمة الله وبركاته، الأخ/الأخت {name} المحترم. نود إبلاغكم بأنه تم إلغاء معاملتكم رقم {bookingId} لطلب ({service}). لمزيد من الاستفسارات يرجى الاتصال بإدارة المكتب. شكراً لتفهمكم.';
  });
  const [whatsappLogs, setWhatsappLogs] = useState<WhatsAppLog[]>(() => {
    const saved = localStorage.getItem('sm_wa_logs');
    return saved ? JSON.parse(saved) : [];
  });
  const [waToast, setWaToast] = useState<{ show: boolean; type: 'loading' | 'success' | 'error'; message: string; details: string } | null>(null);
  const [saveSuccessWaTemplate, setSaveSuccessWaTemplate] = useState(false);

  // Social Media Link Integration
  const [socialFacebook, setSocialFacebook] = useState<string>(() => {
    return localStorage.getItem('sm_social_facebook') || 'https://facebook.com/SamakingdomOffice';
  });
  const [socialTwitter, setSocialTwitter] = useState<string>(() => {
    return localStorage.getItem('sm_social_twitter') || 'https://x.com/sama_almamlakah';
  });
  const [socialSnapchat, setSocialSnapchat] = useState<string>(() => {
    return localStorage.getItem('sm_social_snapchat') || 'https://snapchat.com/add/sama_mamlakah';
  });
  const [socialInstagram, setSocialInstagram] = useState<string>(() => {
    return localStorage.getItem('sm_social_instagram') || 'https://instagram.com/sama_almamlakah';
  });
  const [socialLinkedin, setSocialLinkedin] = useState<string>(() => {
    return localStorage.getItem('sm_social_linkedin') || 'https://linkedin.com/company/sama-almamlakah';
  });
  const [socialWhatsapp, setSocialWhatsapp] = useState<string>(() => {
    const value = localStorage.getItem('sm_social_whatsapp');
    if (!value || value === 'https://wa.me/966500000000') {
      return 'https://wa.me/967778259418';
    }
    return value;
  });
  const [socialWhatsappChannel, setSocialWhatsappChannel] = useState<string>(() => {
    return localStorage.getItem('sm_social_whatsapp_channel') || 'https://whatsapp.com/channel/0029Vb6XdRxLNSaBok90XK2C';
  });
  const [officeDomain, setOfficeDomain] = useState<string>(() => {
    return localStorage.getItem('sm_office_domain') || 'sama-almamlakah.online';
  });
  const [showBrandedUrlBanner, setShowBrandedUrlBanner] = useState<boolean>(() => {
    const saved = localStorage.getItem('sm_show_branded_url_banner');
    return saved !== 'false';
  });
  const [domainCopied, setDomainCopied] = useState(false);
  const [saveSuccessSocialLinks, setSaveSuccessSocialLinks] = useState(false);

  // Social Sync / Auto Posts Import States (WhatsApp and Facebook Integration)
  const [socialImportText, setSocialImportText] = useState('');
  const [socialImportTab, setSocialImportTab] = useState<'ai' | 'webhook'>('ai');
  const [isSocialSyncing, setIsSocialSyncing] = useState(false);
  const [socialSyncCompleted, setSocialSyncCompleted] = useState(false);
  const [webhookLogs, setWebhookLogs] = useState<{ time: string; event: string; status: string; title: string }[]>([
    { time: 'قبل 12 دقيقة', event: 'تم اختبار اتصال الوصلة بنجاح مع قناة الواتساب', status: 'نشط', title: 'سما وظائف' },
    { time: 'قبل ساعتين', event: 'تلقي منشور جديد من صفحة فيسبوك الرسمية برمجياً عبر الويب هوك', status: 'مكتمل', title: 'دعم فني وتخليص' }
  ]);

  // Active WhatsApp Gateway Credentials (supporting Twilio, Ultramsg or Fallback Mock-Simulator)
  const [waGatewayType, setWaGatewayType] = useState<string>(() => {
    return localStorage.getItem('sm_wa_gateway_type') || 'mock';
  });
  const [twilioAccountSid, setTwilioAccountSid] = useState<string>(() => {
    return localStorage.getItem('sm_twilio_account_sid') || '';
  });
  const [twilioAuthToken, setTwilioAuthToken] = useState<string>(() => {
    return localStorage.getItem('sm_twilio_auth_token') || '';
  });
  const [twilioSender, setTwilioSender] = useState<string>(() => {
    return localStorage.getItem('sm_twilio_sender') || 'whatsapp:+14155238886';
  });
  const [ultramsgInstanceId, setUltramsgInstanceId] = useState<string>(() => {
    return localStorage.getItem('sm_ultramsg_instance_id') || '';
  });
  const [ultramsgToken, setUltramsgToken] = useState<string>(() => {
    return localStorage.getItem('sm_ultramsg_token') || '';
  });
  const [saveSuccessWaCreds, setSaveSuccessWaCreds] = useState(false);

  // WhatsApp testing and simulation state
  const [testConsoleBookingId, setTestConsoleBookingId] = useState<string>('');
  const [testConsoleTemplateType, setTestConsoleTemplateType] = useState<'pending' | 'processing' | 'completed' | 'cancelled'>('completed');
  const [testConsoleIsDispatching, setTestConsoleIsDispatching] = useState(false);

  // Auto archiving helper function for requests older than 30 days
  const runAutoArchiving = (manual = false) => {
    let archivedCount = 0;
    const now = new Date();
    const updatedBookings = bookings.map(b => {
      // Archive if completed or cancelled and older than 30 days
      if ((b.status === 'completed' || b.status === 'cancelled') && !b.isArchived) {
        const date = new Date(b.date);
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 30) {
          archivedCount++;
          return { ...b, isArchived: true };
        }
      }
      return b;
    });

    if (archivedCount > 0) {
      setBookings(updatedBookings);
      setLastArchivedCount(archivedCount);
      setShowArchivedNotice(true);
      // Automatically hide the notice after 8 seconds
      setTimeout(() => setShowArchivedNotice(false), 8000);
      if (manual) {
        alert(`تم بنجاح ترحيل وأرشفة ${archivedCount} معاملة قديمة (أكبر من 30 يوماً) للحفاظ على سرعة أداء البوابة.`);
      }
    } else {
      if (manual) {
        alert('لم يتم العثور على أي معاملات مكتملة أو ملغية مضى عليها أكثر من 30 يوماً؛ لم يتم أرشفة أي سجلات جديدة.');
      }
    }
  };

  // Run automatically on application load / mount
  useEffect(() => {
    const timer = setTimeout(() => {
      runAutoArchiving(false);
    }, 1200);

    // 1. Services Sync
    const unsubscribeServices = onSnapshot(collection(db, 'services'), (snapshot) => {
      if (snapshot.empty) {
        // Bootstrap services
        DEFAULT_SERVICES.forEach(async (srv) => {
          try {
            await setDoc(doc(db, 'services', srv.id), srv);
          } catch (e) {
            console.error("Error bootstrapping service:", e);
          }
        });
      } else {
        const loadedServices: Service[] = [];
        snapshot.forEach((doc) => {
          loadedServices.push(doc.data() as Service);
        });
        setServices(loadedServices);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'services');
    });

    // 2. Bookings Sync
    const unsubscribeBookings = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      if (snapshot.empty) {
        // Bootstrap bookings
        INITIAL_BOOKINGS.forEach(async (b) => {
          try {
            await setDoc(doc(db, 'bookings', b.id), b);
          } catch (e) {
            console.error("Error bootstrapping booking:", e);
          }
        });
      } else {
        const loadedBookings: BookingRequest[] = [];
        snapshot.forEach((doc) => {
          loadedBookings.push(doc.data() as BookingRequest);
        });
        loadedBookings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setBookings(loadedBookings);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'bookings');
    });

    // 3. Transactions Sync
    const unsubscribeTransactions = onSnapshot(collection(db, 'transactions'), (snapshot) => {
      if (snapshot.empty) {
        // Bootstrap transactions
        INITIAL_TRANSACTIONS.forEach(async (tx) => {
          try {
            await setDoc(doc(db, 'transactions', tx.id), tx);
          } catch (e) {
            console.error("Error bootstrapping transaction:", e);
          }
        });
      } else {
        const loadedTx: Transaction[] = [];
        snapshot.forEach((doc) => {
          loadedTx.push(doc.data() as Transaction);
        });
        loadedTx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(loadedTx);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    // 4. Job Vacancies Sync
    const unsubscribeJobs = onSnapshot(collection(db, 'job_vacancies'), (snapshot) => {
      if (snapshot.empty) {
        // Bootstrap jobs
        const initialJobs: JobVacancy[] = [
          {
            id: 'job-1',
            title: 'معقب معاملات حكومية محترف',
            department: 'قسم العلاقات العامة والتعقيب',
            location: 'الرياض - الملز',
            type: 'دوام كامل',
            salary: '6,000 - 8,500 ريال',
            description: 'نبحث عن معقب معاملات ذو خبرة واسعة في مراجعة الدوائر الحكومية والوزارات الإلكترونية مثل بلدي، قوى، التأمينات الاجتماعية، والجوازات بصورة احترافية وسريعة.',
            requirements: [
              'خبرة لا تقل عن 3 سنوات في مجال التعقيب بالمملكة والتعامل مع الجهات الرسمية.',
              'رخصة قيادة سارية المفعول ووجود وسيلة نقل خاصة لتخليص المعاملات.',
              'إلمام تام باستخدام جميع المنصات والخدمات الحكومية الإلكترونية.'
            ],
            date: '2026-05-18T10:00:00.000Z'
          },
          {
            id: 'job-2',
            title: 'أخصائي خدمة عملاء ومبيعات هاتفية',
            department: 'قسم المبيعات والدعم الفني',
            location: 'الرياض (طريق الملك فهد)',
            type: 'دوام كامل',
            salary: '4,500 - 6,000 ريال',
            description: 'استقبل استفسارات العملاء واقتراح الخدمات الإجرائية المناسبة لهم ومتابعة المعاملات مع فريق التعقيب عبر بوابة سما المملكة الإلكترونية بصورة ودية وعملية.',
            requirements: [
              'مهارات اتصال واستماع متميزة والقدرة على الإقناع بصورة ودية ولطيفة.',
              'القدرة على استخدام برمجيات الحاسب الآلي وتطبيقات إدخال السجلات.',
              'مؤهل ثانوي أو دبلوم كحد أدنى ولغة عربية سليمة ونظيفة.'
            ],
            date: '2026-05-19T14:30:00.000Z'
          }
        ];
        initialJobs.forEach(async (job) => {
          try {
            await setDoc(doc(db, 'job_vacancies', job.id), job);
          } catch (e) {
            console.error("Error bootstrapping job:", e);
          }
        });
      } else {
        const loadedJobs: JobVacancy[] = [];
        snapshot.forEach((doc) => {
          loadedJobs.push(doc.data() as JobVacancy);
        });
        setJobVacancies(loadedJobs);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'job_vacancies');
    });

    // 5. Job Applications Sync
    const unsubscribeApplications = onSnapshot(collection(db, 'job_applications'), (snapshot) => {
      const loadedApp: JobApplication[] = [];
      snapshot.forEach((doc) => {
        loadedApp.push(doc.data() as JobApplication);
      });
      setJobApplications(loadedApp);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'job_applications');
    });

    // Listen to Auth State
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (user.email === 'essam77142@gmail.com') {
          setIsAdminAuthenticated(true);
        }
      } else {
        // If they had logged state but no firebase session, optionally preserve passcode modal login, 
        // but we let Firestore auth keep the single source of truth for DB reads/writes
      }
    });

    return () => {
      clearTimeout(timer);
      unsubscribeServices();
      unsubscribeBookings();
      unsubscribeTransactions();
      unsubscribeJobs();
      unsubscribeApplications();
      unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (bookings.length > 0 && !testConsoleBookingId) {
      setTestConsoleBookingId(bookings[0].id);
    }
  }, [bookings]);

  // Background selection strategy: 'ai' | 'sunrise' | 'sunset' | 'night'
  const [bgStrategy, setBgStrategy] = useState<'ai' | 'sunrise' | 'sunset' | 'night'>('ai');

  const makkahImages = {
    sunrise: makkahSunriseImg,
    sunset: makkahSunsetImg,
    night: makkahNightImg,
  };

  const getActiveMakkahImg = () => {
    if (bgStrategy !== 'ai') {
      return makkahImages[bgStrategy];
    }
    // AI Intelligent Strategy: Determine based on local client hour!
    const clientHour = new Date().getHours();
    if (clientHour >= 5 && clientHour < 16) {
      return makkahImages.sunrise; // Day / Sunrise (5 AM to 4 PM)
    } else if (clientHour >= 16 && clientHour < 20) {
      return makkahImages.sunset; // Twilight / Sunset (4 PM to 8 PM)
    } else {
      return makkahImages.night; // Midnight / Stars (8 PM to 5 AM)
    }
  };

  const getBgNameAr = (strategy: string) => {
    switch (strategy) {
      case 'sunrise': return 'مظهر شروق مكة (الصباح)';
      case 'sunset': return 'مظهر غروب مكة (الأصيل)';
      case 'night': return 'مظهر ليل مكة (التهجد)';
      case 'ai': 
      default: {
        const hr = new Date().getHours();
        if (hr >= 5 && hr < 16) return 'الذكاء الاصطناعي (شروق مكة الآن)';
        if (hr >= 16 && hr < 20) return 'الذكاء الاصطناعي (غروب مكة الآن)';
        return 'الذكاء الاصطناعي (ليل مكة الآن)';
      }
    }
  };

  // Local persistence triggers
  useEffect(() => {
    localStorage.setItem('sm_bg_strategy', bgStrategy);
  }, [bgStrategy]);

  useEffect(() => {
    localStorage.setItem('sm_services', JSON.stringify(services));
  }, [services]);

  useEffect(() => {
    localStorage.setItem('sm_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('sm_bookings', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem('sm_welcome_msg', welcomeMessage);
  }, [welcomeMessage]);

  useEffect(() => {
    localStorage.setItem('sm_status_msg_pending', statusMsgPending);
  }, [statusMsgPending]);

  useEffect(() => {
    localStorage.setItem('sm_status_msg_processing', statusMsgProcessing);
  }, [statusMsgProcessing]);

  useEffect(() => {
    localStorage.setItem('sm_status_msg_completed', statusMsgCompleted);
  }, [statusMsgCompleted]);

  useEffect(() => {
    localStorage.setItem('sm_status_msg_cancelled', statusMsgCancelled);
  }, [statusMsgCancelled]);

  useEffect(() => {
    localStorage.setItem('sm_wa_template_pending', whatsappTemplatePending);
  }, [whatsappTemplatePending]);

  useEffect(() => {
    localStorage.setItem('sm_wa_template_processing', whatsappTemplateProcessing);
  }, [whatsappTemplateProcessing]);

  useEffect(() => {
    localStorage.setItem('sm_wa_template_completed', whatsappTemplateCompleted);
  }, [whatsappTemplateCompleted]);

  useEffect(() => {
    localStorage.setItem('sm_wa_template_cancelled', whatsappTemplateCancelled);
  }, [whatsappTemplateCancelled]);

  useEffect(() => {
    localStorage.setItem('sm_wa_logs', JSON.stringify(whatsappLogs));
  }, [whatsappLogs]);

  useEffect(() => {
    localStorage.setItem('sm_job_vacancies', JSON.stringify(jobVacancies));
  }, [jobVacancies]);

  useEffect(() => {
    localStorage.setItem('sm_job_applications', JSON.stringify(jobApplications));
  }, [jobApplications]);

  // Handle standard dynamic service standard changes when selected in admin form
  const handleAdminServiceSelectChange = (srvId: string) => {
    setTxServiceId(srvId);
    const selected = services.find(s => s.id === srvId);
    if (selected) {
      setTxGovFee(selected.govFee);
      setTxOfficeFee(selected.officeFee);
    }
  };

  // Maps custom system icons from standard catalog by accepting properties as a React component
  const RenderServiceIcon = ({ iconName, className }: { iconName: string; className?: string }) => {
    // Dynamically retrieve the component from standard Lucide namespace
    const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.FileText;
    return <IconComponent className={className || "w-6 h-6 text-amber-600"} />;
  };

  // Backwards compatible wrapper for simple functional calls
  const renderServiceIcon = (iconName: string, className?: string) => {
    return <RenderServiceIcon iconName={iconName} className={className} />;
  };

  // --- SUBMISSIONS HANDLERS ---
  
  // Handle client PDF attachment upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('عذراً، يرجى إرفاق مستندات بصيغة PDF فقط لضمان توافق النظام وسهولة المعالجة.');
      e.target.value = '';
      return;
    }

    // Limit to 4MB for high reliability in local state/storage
    if (file.size > 4 * 1024 * 1024) {
      alert('عذراً، حجم المستند كبير للغاية. يرجى إرفاق ملف PDF بحجم لا يتجاوز 4 ميجابايت.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAttachedFileData(event.target.result as string);
        setAttachedFileName(file.name);
        
        const kb = file.size / 1024;
        const formattedSize = kb > 1024 
          ? `${(kb / 1024).toFixed(2)} MB` 
          : `${kb.toFixed(1)} KB`;
        setAttachedFileSize(formattedSize);
      }
    };
    reader.readAsDataURL(file);
  };
  
  // Validation formulas for the customer booking form
  const getClientNameError = (nameStr: string): string | null => {
    const trimmed = nameStr.trim();
    if (!trimmed) {
      return "اسم العميل حقل مطلوب لتسجيل المعاملة ولا يمكن تركه فارغاً.";
    }
    if (trimmed.length < 5) {
      return "صيغة الاسم قصيرة جداً؛ يرجى كتابة الاسم الثنائي أو الثلاثي بالكامل (5 أحرف على الأقل).";
    }
    const words = trimmed.split(/\s+/).filter(w => w.length > 0);
    if (words.length < 2) {
      return "يرجى كتابة الاسم ثنائياً على الأقل لسهولة مطابقة السجلات الحكومية والتحقق.";
    }
    // Permit arabic and english letters and spaces only
    const nameRegex = /^[\u0600-\u06FFa-zA-Z\s\-]+$/;
    if (!nameRegex.test(trimmed)) {
      return "الاسم يجب أن يتضمن حروفاً صحيحة فقط (عربي أو إنجليزي)، بدون أرقام أو رموز خاصة.";
    }
    return null;
  };

  const getClientPhoneError = (phoneStr: string): string | null => {
    const trimmed = phoneStr.trim();
    if (!trimmed) {
      return "رقم جوال العميل حقل أساسي ومطلوب لاستقبال إشعارات الـ WhatsApp الفورية.";
    }
    // Accepts 10 digits starting with 05 (strict Saudi mobile)
    // Or 9 digits starting with 5 (such as 5xxxxxxxx)
    // Or 12 digits starting with 9665
    // Or 13 digits starting with +9665
    const saudiPhoneRegex = /^(05|5|9665|\+9665)\d{8}$/;
    if (!saudiPhoneRegex.test(trimmed)) {
      return "صيغة الهاتف غير صحيحة. يرجى إدخال رقم جوال سعودي نشط يتكون من 10 خانات ويبدأ بـ 05 (مثل: 0501234567).";
    }
    return null;
  };

  const getSelectedServiceError = (serviceIdStr: string): string | null => {
    if (!serviceIdStr) {
      return "يرجى تحديد واختيار الخدمة الإجرائية المطلوبة لتحديد التكلفة وزمن الإنجاز.";
    }
    return null;
  };

  // Submit Customer booking from public site with advanced validation & toast notifications
  const handleClientBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all inputs as touched to display errors immediately if empty
    setClientNameTouched(true);
    setClientPhoneTouched(true);
    setSelectedServiceTouched(true);

    const nameErr = getClientNameError(clientName);
    const phoneErr = getClientPhoneError(clientPhone);
    const serviceErr = getSelectedServiceError(selectedServiceId);

    if (nameErr || phoneErr || serviceErr) {
      const firstErrorMessage = nameErr || phoneErr || serviceErr || 'يرجى مراجعة وتعديل الحقول المميز باللون الأحمر.';
      
      // Update local feedback box
      setSubmissionFeedback({
        success: false,
        msg: `فشل التحقق: ${firstErrorMessage}`
      });

      // Show beautiful floating Toast Error
      setBookingToast({
        show: true,
        type: 'error',
        title: 'فشل التحقق من صحة البيانات تم إيقاف الترحيل',
        message: firstErrorMessage
      });

      // Auto close validation toast after 6 seconds
      setTimeout(() => {
        setBookingToast(prev => prev && prev.type === 'error' ? { ...prev, show: false } : prev);
      }, 6000);

      return;
    }

    const matchedService = services.find(s => s.id === selectedServiceId);
    if (!matchedService) return;

    // Trigger loading spinner State
    setIsBookingSubmitting(true);

    // Simulate backend transmission and check delay
    setTimeout(() => {
      const requestReferenceId = `bk-${Date.now()}`;
      const newBooking: BookingRequest = {
        id: requestReferenceId,
        clientName: clientName.trim(),
        phoneNumber: clientPhone.trim(),
        serviceId: selectedServiceId,
        serviceName: matchedService.name,
        status: 'pending',
        notes: clientNotes.trim(),
        date: new Date().toISOString(),
        attachedFileName: attachedFileName || undefined,
        attachedFileData: attachedFileData || undefined,
        attachedFileSize: attachedFileSize || undefined
      };

      // Write to Firestore!
      setDoc(doc(db, 'bookings', newBooking.id), newBooking)
        .catch(err => handleFirestoreError(err, OperationType.CREATE, `bookings/${newBooking.id}`));

      const updatedBookings = [newBooking, ...bookings];
      setBookings(updatedBookings);

      // Update submission feedback box
      setSubmissionFeedback({ 
        success: true, 
        msg: `تم إرسال طلبك بنجاح لمكتب سما المملكة الرقم المرجعي للطلب: ${requestReferenceId.substring(3)}` 
      });

      // Show persistent premium Toast success message with action step
      setBookingToast({
        show: true,
        type: 'success',
        title: 'تم استلام المعاملة وبدء معالجتها بنجاح!',
        message: `أهلاً بك الأخ/الأخت ${clientName.trim()}، تم ترحيل طلبك رقم (${requestReferenceId.substring(3)}) لإجراء (${matchedService.name}) بنجاح وجاري المراجعة.`,
        bookingId: requestReferenceId
      });

      // Auto-close success toast after 10 seconds
      setTimeout(() => {
        setBookingToast(prev => prev && prev.bookingId === requestReferenceId ? { ...prev, show: false } : prev);
      }, 10000);

      // Save tracking candidate phone
      const targetPhoneTrack = clientPhone.trim();

      // Reset touch States and input fields
      setClientName('');
      setClientPhone('');
      setClientNotes('');
      setSelectedServiceId('');
      setAttachedFileName('');
      setAttachedFileData('');
      setAttachedFileSize('');
      
      setClientNameTouched(false);
      setClientPhoneTouched(false);
      setSelectedServiceTouched(false);
      setIsBookingSubmitting(false);

      // Pre-populate track inquiry immediately for customer's ease
      setSearchPhone(targetPhoneTrack);
    }, 1200);
  };

  // Client Request status lookup
  const handleTrackPhoneNumberLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPhone.trim()) return;

    const results = bookings.filter(b => b.phoneNumber.replace(/\s+/g, '') === searchPhone.trim().replace(/\s+/g, ''));
    setTrackedRequests(results);
    setHasSearched(true);
  };

  // Submit Job Application
  const handleJobApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobForApply) return;
    if (!applyApplicantName.trim()) {
      setApplyFeedback({ success: false, msg: 'يرجى إدخال الاسم الرباعي للمتقدم.' });
      return;
    }
    const cleanPhone = applyApplicantPhone.trim();
    if (!cleanPhone || cleanPhone.length < 9) {
      setApplyFeedback({ success: false, msg: 'يرجى إدخال رقم هاتف التواصل بشكل صحيح.' });
      return;
    }

    setIsJobApplying(true);
    setApplyFeedback(null);

    setTimeout(() => {
      const newApp: JobApplication = {
        id: `app-${Date.now()}`,
        jobId: selectedJobForApply.id,
        jobTitle: selectedJobForApply.title,
        applicantName: applyApplicantName.trim(),
        applicantPhone: cleanPhone,
        applicantEmail: applyApplicantEmail.trim() || 'لا يوجد',
        qualification: applyQualification.trim() || 'غير محدد',
        experienceYears: Number(applyExperienceYears) || 0,
        notes: applyNotes.trim() || undefined,
        date: new Date().toISOString(),
        status: 'قيد المراجعة'
      };

      // Write to Firestore!
      setDoc(doc(db, 'job_applications', newApp.id), newApp)
        .catch(err => handleFirestoreError(err, OperationType.CREATE, `job_applications/${newApp.id}`));

      const updatedApps = [newApp, ...jobApplications];
      setJobApplications(updatedApps);

      setApplyFeedback({
        success: true,
        msg: `تم إرسال طلب التوظيف بنجاح للوظيفة "${selectedJobForApply.title}". رقم المرجع الخاص بملفك: ${newApp.id.substring(4)}`
      });

      // Show beautiful custom toast
      setBookingToast({
        show: true,
        type: 'success',
        title: 'تم استلام طلب التوظيف الخاص بك!',
        message: `أهلاً بك المتقدم/المتقدمة ${applyApplicantName.trim()}، تم قيد طلبك لوظيفة (${selectedJobForApply.title}) وسنقوم بمراجعة سيرتكم للتواصل الفوري.`
      });

      // Reset application inputs
      setApplyApplicantName('');
      setApplyApplicantPhone('');
      setApplyApplicantEmail('');
      setApplyQualification('');
      setApplyExperienceYears(1);
      setApplyNotes('');
      setIsJobApplying(false);
      setSelectedJobForApply(null);
    }, 1200);
  };

  // Arabic Natural Language Extractor for WhatsApp Channel and Facebook page announcements
  const parseSocialPost = (postText: string): Partial<JobVacancy> => {
    const locationKeywords = ['الرياض', 'جدة', 'مكة', 'الدمام', 'الخبر', 'جازان', 'تبوك', 'عسير', 'المدينة', 'الشرقية', 'بريدة', 'عن بعد'];
    
    let title = 'وظيفة شاغرة جديدة';
    let department = 'إدارة التوظيف وشؤون الموظفين';
    let location = 'الرياض - فرع سما المملكة الرئيسي';
    let type = 'دوام كامل';
    let salary = 'يحدد بعد المقابلة الشخصية';
    let requirements: string[] = [];
    let description = '';

    const lines = postText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Extract Title
    for (const line of lines) {
      if (line.includes('مطلوب') || line.includes('وظيفة') || line.includes('نعلن عن') || line.includes('شاغر') || line.includes('تعلن')) {
        let cleaned = line
          .replace(/مطلوب/g, '')
          .replace(/وظيفة/g, '')
          .replace(/شاغرة/g, '')
          .replace(/تعلن/g, '')
          .replace(/إعلان عن/g, '')
          .replace(/شاغر/g, '')
          .replace(/فرصة عمل/g, '')
          .replace(/[:-\[\]{}()]/g, '')
          .trim();
        if (cleaned.length > 3 && cleaned.length < 50) {
          title = cleaned;
          break;
        }
      }
    }
    if (title === 'وظيفة شاغرة جديدة' && lines.length > 0) {
      title = lines[0].substring(0, 45);
    }

    // Extract Location
    for (const loc of locationKeywords) {
      if (postText.includes(loc)) {
        if (loc === 'عن بعد') {
          location = 'عن بعد (من المنزل)';
          type = 'عن بعد';
        } else {
          location = `${loc} - مكتب العمل الميداني`;
        }
        break;
      }
    }

    // Extract Type
    if (postText.includes('جزئي') || postText.includes('دبلوم جزئي')) {
      type = 'دوام جزئي';
    } else if (postText.includes('عن بعد')) {
      type = 'عن بعد';
    } else if (postText.includes('كامل') || postText.includes('رسمي')) {
      type = 'دوام كامل';
    }

    // Extract Salary
    const salaryRegex = /(\d+[\d,]*\s*-\s*\d+[\d,]*|\d+[\d,]*)\s*(ريال|SR|\s*ر\.س|SAUDI)/i;
    const match = postText.match(salaryRegex);
    if (match) {
      salary = `${match[1]} ريال سعودي`;
    }

    // Extract Department based on contexts
    if (postText.includes('معقب') || postText.includes('تعقيب') || postText.includes('الميداني')) {
      department = 'قسم العلاقات العامة والتعقيب الحكومي';
    } else if (postText.includes('عملاء') || postText.includes('مبيعات') || postText.includes('هاتف')) {
      department = 'قسم الدعم الفني والمبيعات الهاتفية';
    } else if (postText.includes('محاسب') || postText.includes('مالي') || postText.includes('حسابات')) {
      department = 'قسم الحسابات والمالية الموحد';
    }

    // Extract Description
    description = postText.length > 300 ? postText.substring(0, 280) + '...' : postText;

    // Extract Requirements (Lines with bullet points or dashes or numbering or certain words)
    const reqLines = lines.filter(line => 
      line.startsWith('-') || 
      line.startsWith('*') || 
      line.startsWith('•') || 
      /^\d+[\.\-\)]/.test(line) ||
      line.includes('شرط') ||
      line.includes('خبرة') ||
      line.includes('مؤهل') ||
      line.includes('رخصة') ||
      line.includes('مهارة')
    );

    reqLines.forEach(line => {
      let cleanReq = line.replace(/^[\-\*\•\d\.\)\s]+/, '').trim();
      if (cleanReq.length > 4) {
        requirements.push(cleanReq);
      }
    });

    if (requirements.length === 0) {
      requirements = [
        'خبرة عملية وسيرة ذاتية حديثة بمؤهل التقديم من خلال قنوات التواصل.',
        'الالتزام بالأنظمة الوطنية والمهنية المتبعة بمكتب سما المملكة.'
      ];
    }

    return { title, department, location, type, salary, description, requirements };
  };

  const handleSocialImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socialImportText.trim()) return;

    setIsSocialSyncing(true);
    setSocialSyncCompleted(false);

    // Realistic simulation of active AI web extractor parsing WhatsApp channel feeds
    setTimeout(() => {
      const parsed = parseSocialPost(socialImportText);
      
      // Auto-populate traditional form inputs for verification and potential updates
      setNewJobTitle(parsed.title || '');
      setNewJobDepartment(parsed.department || 'إدارة التوظيف وشؤون الموظفين');
      setNewJobLocation(parsed.location || 'الرياض - فرع سما المملكة الرئيسي');
      setNewJobType(parsed.type || 'دوام كامل');
      setNewJobSalary(parsed.salary || 'يحدد بعد المقابلة');
      setNewJobDescription(parsed.description || 'تم استيراد هذا الإعلان تلقائياً من قنوات التواصل عبر الذكاء الاصطناعي والمزامنة الفورية.');
      setNewJobRequirements(parsed.requirements ? parsed.requirements.join('\n') : '');

      // Create and inject the job vacancy directly for real-time live update
      const newJobId = `job-sync-${Date.now()}`;
      const newJobPost: JobVacancy = {
        id: newJobId,
        title: (parsed.title || 'وظيفة شاغرة جديدة').trim(),
        department: (parsed.department || 'إدارة التوظيف وشؤون الموظفين').trim(),
        location: (parsed.location || 'الرياض - فرع سما المملكة الرئيسي').trim(),
        type: parsed.type || 'دوام كامل',
        salary: (parsed.salary || 'يحدد بعد المقابلة الشخصية').trim(),
        description: (parsed.description || 'تم استيراد هذا الإعلان تلقائياً من قنوات التواصل عبر المزامنة الفورية.').trim(),
        requirements: parsed.requirements && parsed.requirements.length > 0 
          ? parsed.requirements 
          : ['امتلاك خبرة ومؤهلات مناسبة تتوافق مع مسمى الوظيفة المعلن عنها.'],
        date: new Date().toISOString()
      };

      // Direct state update for immediate rendering in both visitor and admin boards
      setJobVacancies(prevVacancies => [newJobPost, ...prevVacancies]);

      setIsSocialSyncing(false);
      setSocialSyncCompleted(true);
      setSocialImportText('');

      // Add a simulated webhook log entry
      const logTitle = parsed.title?.length && parsed.title.length > 25 ? parsed.title.substring(0, 22) + '...' : parsed.title;
      setWebhookLogs(prev => [
        {
          time: 'الآن',
          event: `تم سحب وتحليل الإعلان (${logTitle}) ونشره تلقائياً بالمنصة`,
          status: 'مكتمل',
          title: 'الاستيراد الذكي'
        },
        ...prev
      ]);

      // Pop custom toast
      setBookingToast({
        show: true,
        type: 'success',
        title: '🤖 تم المزامنة والنشر التلقائي الفوري بالمنصة!',
        message: `قرأ الذكاء الاصطناعي بنجاح منشور "${parsed.title}" وتم إنشاؤه ونشره مباشرة كبطاقة وظيفة شاغرة نشطة بدون حاجة لأي إدخال يدوي إضافي.`
      });

      // Simple scroll up into view
      const formHead = document.querySelector('.lg\\:col-span-4');
      if (formHead) {
        formHead.scrollIntoView({ behavior: 'smooth' });
      }
    }, 1500);
  };

  // Create Job Vacancy (Admin)
  const handleCreateJobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobTitle.trim()) {
      alert('يرجى تحديد عنوان مسمى الوظيفة الشاغرة.');
      return;
    }
    if (!newJobDepartment.trim()) {
      alert('يرجى تحديد القسم الإداري المشرف.');
      return;
    }

    const reqsArray = newJobRequirements
      .split('\n')
      .map(r => r.trim())
      .filter(r => r.length > 0);

    const newJob: JobVacancy = {
      id: `job-${Date.now()}`,
      title: newJobTitle.trim(),
      department: newJobDepartment.trim(),
      location: newJobLocation.trim() || 'الرياض (المركز الرئيسي)',
      type: newJobType,
      salary: newJobSalary.trim() || 'يُحدد بعد المقابلة الشخصية',
      description: newJobDescription.trim() || 'لم يتم إدخال وصف تفصيلي للوظيفة حتى الآن.',
      requirements: reqsArray.length > 0 ? reqsArray : ['وجود مؤهل علمي معتمد ومناسب لمسمى التقديم.'],
      date: new Date().toISOString()
    };

    setJobVacancies([newJob, ...jobVacancies]);
    
    // Toast notification
    setBookingToast({
      show: true,
      type: 'success',
      title: 'تم نشر إعلان الوظيفة الشاغرة بنجاح!',
      message: `تم تفعيل وتعميم إعلان وظيفة (${newJob.title}) وسيتمكن زوار المنصة والمتقدمون من تصفحها وإرسال طلباتهم.`
    });

    // Reset Job Creation fields
    setNewJobTitle('');
    setNewJobDepartment('');
    setNewJobLocation('');
    setNewJobSalary('');
    setNewJobDescription('');
    setNewJobRequirements('');
  };

  // Delete Job Vacancy (Admin)
  const handleDeleteJob = (jobId: string) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا الإعلان الوظيفي نهائياً؟ سيتم كذلك إلغاء جميع طلبات التقدم المرتبطة به.')) {
      setJobVacancies(jobVacancies.filter(j => j.id !== jobId));
      setJobApplications(jobApplications.filter(a => a.jobId !== jobId));
      
      setBookingToast({
        show: true,
        type: 'warning',
        title: 'تم إزالة الإعلان الشاغر',
        message: 'تم مسح بطاقة الإعلان عن الوظيفة وجميع ملفات المتقدمين المرتبطة بها بنجاح.'
      });
    }
  };

  // Delete Job Application (Admin)
  const handleDeleteJobApplication = (appId: string) => {
    if (window.confirm('هل أنت متأكد من حذف طلب التقدم لسيرة هذا المرشح بصفة نهائية؟')) {
      setJobApplications(jobApplications.filter(a => a.id !== appId));
      setBookingToast({
        show: true,
        type: 'info',
        title: 'تم حذف طلب التوظيف',
        message: 'تم شطب ملف سيرة المرشح ونظام السجلات مستقر.'
      });
    }
  };

  // Update Job Application Status and open Notify modal
  const handleUpdateJobApplicationStatus = (appId: string, newStatus: 'قيد المراجعة' | 'تمت المقابلة' | 'تم القبول' | 'مرفوض') => {
    setJobApplications(prev => prev.map(a => {
      if (a.id === appId) {
        return { ...a, status: newStatus };
      }
      return a;
    }));

    const app = jobApplications.find(a => a.id === appId);
    if (app) {
      // Craft an incredibly professional WhatsApp / SMS message template
      let message = '';
      if (newStatus === 'قيد المراجعة') {
        message = `مرحباً أ. ${app.applicantName}، نفيدكم بأن طلبكم رقم (#${app.id.substring(4, 9)}) المقدم عبر بوابة التوظيف لمكتب سما المملكة لوظيفة (${app.jobTitle}) هو الآن قيد المراجعة والتدقيق والفرز الأولي من قبل إدارة الموارد البشرية. سنقوم بالتواصل معكم فور الانتهاء. نسعد باهتمامكم المتميز!`;
      } else if (newStatus === 'تمت المقابلة') {
        message = `الأخ/الأخت الكريمة أ. ${app.applicantName}، نسعد بإبلاغكم بأنه تم ترشيحكم للمرحلة التالية وجدولة المقابلة الشخصية لوظيفة (${app.jobTitle}) بمكتب سما المملكة. يرجى التكرم بالاستعداد للتواصل الهاتفي أو المقابلة الحضورية في مقر فرعنا الرئيسي قريباً وسيتم تزويدكم بالتاريخ والموعد بدقة. بالتوفيق!`;
      } else if (newStatus === 'تم القبول') {
        message = `تهانينا الحارة أ. ${app.applicantName}! يسعدنا إعلامكم بـ (قبولكم المبدئي) للانضمام إلى فريق عمل مكتب سما المملكة الوطني لوظيفة (${app.jobTitle}). نرجو منكم تجهيز المستندات الرسمية وصورة الهوية وبطاقة الحساب البنكي لمراجعة قسم شؤون الموظفين لإمضاء عقد التعاقد وبدء مباشرة العمل قريباً. أهلاً بكم في بيئة النجاح!`;
      } else if (newStatus === 'مرفوض') {
        message = `عزيزنا المتقدم أ. ${app.applicantName}، نشكر لكم ثقتكم واهتمامكم بالتقديم للعمل بمكتب سما المملكة لوظيفة (${app.jobTitle}). يؤسفنا إبلاغكم بأنه لم يتم اختيار طلبكم لهذه الجولة نظراً لاكتفاء الأعداد والشروط المطلوبة، وسوف نحتفظ بملف سيرتكم الذاتية في أرشيف الكفاءات المتميز للفرص القادمة بمشيئة الله. تمنياتنا لكم بمسيرة مهنية مشعة وموفقة.`;
      }

      setSelectedAppForNotify({ ...app, status: newStatus });
      setNotifyMessageText(message);

      setBookingToast({
        show: true,
        type: 'success',
        title: 'تم تعديل حالة الطلب',
        message: `تم تعديل حالة طلب المتقدم (${app.applicantName}) بنجاح إلى "${newStatus}". يمكنك الآن مراجعة وإرسال الإشعار التواصلي له بالنافذة المنبثقة.`
      });
    }
  };

  // Open notify window manually
  const handleOpenNotifyModal = (app: JobApplication) => {
    const currentStatus = app.status || 'قيد المراجعة';
    const message = `مرحباً أ. ${app.applicantName}، نفيدكم بأن طلبكم رقم (#${app.id.substring(4, 9)}) المقدم بمكتب سما المملكة لوظيفة (${app.jobTitle}) حالته الحالية هي: [${currentStatus}]. يسعدنا اهتمامكم المتميز بالعمل معنا ونمو تقدمكم المهني.`;
    setSelectedAppForNotify(app);
    setNotifyMessageText(message);
  };

  // Dispatch final notification (WhatsApp / Simulation)
  const handleSendJobNotificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppForNotify) return;

    setIsSendingJobNotification(true);

    setTimeout(() => {
      // Simulate/register into Whatsapp Log matching the system
      const newLog: WhatsAppLog = {
        id: `log-${Date.now()}`,
        bookingId: `JOB-${selectedAppForNotify.id.substring(4, 9).toUpperCase()}`,
        clientName: `المرشح: ${selectedAppForNotify.applicantName}`,
        phoneNumber: selectedAppForNotify.applicantPhone,
        serviceName: `إخطار وظيفة: ${selectedAppForNotify.jobTitle}`,
        status: 'completed',
        message: `[إشعار توظيف - ${selectedAppForNotify.status || 'قيد المراجعة'}] ${notifyMessageText}`,
        sentAt: new Date().toISOString(),
        success: true,
        apiResponse: '{"status":"success", "channel":"WhatsApp Workplace Gate"}'
      };

      setWhatsappLogs([newLog, ...whatsappLogs]);
      setIsSendingJobNotification(false);
      setSelectedAppForNotify(null);

      setBookingToast({
        show: true,
        type: 'success',
        title: 'تم إرسال إشعار التوظيف!',
        message: `تم تبليغ المتقدم (${newLog.clientName}) عن تحديث ملفه بنجاح وتوثيق العملية بسجلات المحادثات الإدارية.`
      });

      // Also trigger a real WhatsApp window for the administrator!
      const waUrl = `https://wa.me/${selectedAppForNotify.applicantPhone.replace(/^0/, '966').replace(/\+/g, '')}?text=${encodeURIComponent(notifyMessageText)}`;
      window.open(waUrl, '_blank');
    }, 1000);
  };

  // Adding transaction ledger directly via Admin
  const handleAddTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txClientName.trim()) {
      alert('يرجى كتابة اسم العميل أولاً.');
      return;
    }

    const matchedService = services.find(s => s.id === txServiceId);
    const serviceName = matchedService ? matchedService.name : 'خدمة مخصصة';

    const calculatedTax = txOfficeFee * 0.15;
    const finalTotal = txGovFee + txOfficeFee + calculatedTax;

    const invoiceCode = `SM-${new Date().getFullYear().toString().substring(2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${(transactions.length + 1).toString().padStart(3, '0')}`;

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      clientName: txClientName.trim(),
      serviceName: serviceName,
      govFee: txGovFee,
      officeFee: txOfficeFee,
      tax: calculatedTax,
      total: finalTotal,
      date: new Date().toISOString(),
      invoiceNumber: invoiceCode,
      notes: txNotes.trim()
    };

    setTransactions([newTx, ...transactions]);

    // Cleanup inputs
    setTxClientName('');
    setTxNotes('');
    
    // reset to original service parameters
    if (services.length > 0) {
      setTxServiceId(services[0].id);
      setTxGovFee(services[0].govFee);
      setTxOfficeFee(services[0].officeFee);
    }

    alert('تم حفظ القيد المالي وترحيله للفاتورة الضريبية بنجاح!');
  };

  const handleCopyDomainLink = () => {
    navigator.clipboard.writeText(`https://${officeDomain}`);
    setDomainCopied(true);
    setTimeout(() => {
      setDomainCopied(false);
    }, 2500);
  };

  // Pre-fill administrative transaction creation using a customer request
  const handlePreFillTransactionFromBooking = (booking: BookingRequest) => {
    setTxClientName(booking.clientName);
    const svc = services.find(s => s.id === booking.serviceId) || services.find(s => s.name === booking.serviceName);
    if (svc) {
      setTxServiceId(svc.id);
      setTxGovFee(svc.govFee);
      setTxOfficeFee(svc.officeFee);
    } else {
      setTxGovFee(0);
      setTxOfficeFee(200);
    }
    setTxNotes(`مرحل تلقائياً من طلب العميل برقم الجوال: ${booking.phoneNumber} والملاحظات الكلوية مسبقاً: ${booking.notes}`);
    
    // Switch to active financial ledger
    setAdminTab('ledger');
  };

  // Add Dynamic Service
  const handleAddServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSrvName.trim() || !newSrvDesc.trim()) {
      alert('يرجى ملء اسم الخدمة ووصفها بشكل صحيح.');
      return;
    }

    const newSrv: Service = {
      id: `srv-${Date.now()}`,
      name: newSrvName.trim(),
      description: newSrvDesc.trim(),
      govFee: Number(newSrvGovFee) || 0,
      officeFee: Number(newSrvOfficeFee) || 0,
      category: newSrvCategory,
      icon: newSrvIcon,
      paymentMethods: newSrvPaymentMethods
    };

    setServices([...services, newSrv]);

    // reset fields
    setNewSrvName('');
    setNewSrvDesc('');
    setNewSrvGovFee(0);
    setNewSrvOfficeFee(0);
    setNewSrvPaymentMethods(['mada', 'credit_card', 'applepay', 'bank_transfer']);

    alert('تمت إضافة الخدمة الجديدة بنجاح للمكتب!');
  };

  // Edit Dynamic Service and Prices
  const handleUpdateServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService || !editingService.name.trim() || !editingService.description.trim()) {
      alert('يرجى ملء كافة الخانات المطلوبة بشكل صحيح.');
      return;
    }

    const updated = services.map(s => {
      if (s.id === editingService.id) {
        return editingService;
      }
      return s;
    });

    setServices(updated);
    setEditingService(null);
    alert('تم حفظ وتعديل أسعار وبنود الخدمة بنجاح!');
  };

  // Callback when public payment succeeds internationally
  const handleGlobalPaymentSuccess = (method: string, ref: string, countryName: string, amountLocalLabel: string) => {
    if (!paymentBookingTarget) return;

    // 1. Update the booking request to be marked as Paid
    const updatedBookings = bookings.map(b => {
      if (b.id === paymentBookingTarget.id) {
        return {
          ...b,
          isPaid: true,
          paymentMethod: method,
          paymentRef: ref,
          paymentCountry: countryName,
          paidAmount: b.paidAmount || 0
        };
      }
      return b;
    });

    setBookings(updatedBookings);

    // Also update current tracked list in UI search view state to reflect paid status immediately
    const updatedTracked = trackedRequests.map(b => {
      if (b.id === paymentBookingTarget.id) {
        return {
          ...b,
          isPaid: true,
          paymentMethod: method,
          paymentRef: ref,
          paymentCountry: countryName
        };
      }
      return b;
    });
    setTrackedRequests(updatedTracked);

    // 2. Automatically check if a matched Transaction inside financial ledger already exists or we should auto-create it!
    const matchedService = services.find(s => s.id === paymentBookingTarget.serviceId || s.name.trim() === paymentBookingTarget.serviceName.trim());
    const govFee = matchedService?.govFee || 0;
    const officeFee = matchedService?.officeFee || 0;
    const gst = officeFee * 0.15;
    const finalAmount = govFee + officeFee + gst;
    const invoiceNum = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const newTx: Transaction = {
      id: `tx-pay-${Date.now()}`,
      clientName: paymentBookingTarget.clientName,
      serviceName: paymentBookingTarget.serviceName,
      govFee: govFee,
      officeFee: officeFee,
      tax: gst,
      total: finalAmount,
      invoiceNumber: invoiceNum,
      date: new Date().toISOString().split('T')[0],
      notes: `سداد إلكتروني دولي آلي عبر بوابة الدفع الآمنة (${method}) من دولة ${countryName}. المرجع المصرفي للمطابقة الجمركية والضريبية: ${ref} • القيمة المحلية المحمولة: ${amountLocalLabel}.`
    };

    setTransactions([newTx, ...transactions]);

    // Send an automated WhatsApp notification alert to confirm payment!
    const messageText = `مرحباً ${paymentBookingTarget.clientName}،\nلقد أتممت بنجاح سداد رسوم معاملتك لدى مكتب سما المملكة أونلاين.\nالخدمة: ${paymentBookingTarget.serviceName}\nبوابة الدفع: ${method}\nموقع وسفارة الدفع: ${countryName}\nالرقم المرجعي للسداد: ${ref}\nشاكرين ثقتكم بنا.`;
    
    sendPlaceholderWhatsAppAPI(paymentBookingTarget.phoneNumber, messageText)
      .then(() => {
        // register WhatsApp log
        const logId = `wa-${Date.now()}`;
        const newLog: WhatsAppLog = {
          id: logId,
          bookingId: paymentBookingTarget.id,
          clientName: paymentBookingTarget.clientName,
          phoneNumber: paymentBookingTarget.phoneNumber,
          serviceName: paymentBookingTarget.serviceName,
          status: paymentBookingTarget.status,
          message: messageText,
          sentAt: new Date().toISOString(),
          success: true,
          apiResponse: 'Payment Success auto-notification dispatched successfully.'
        };
        setWhatsappLogs(prev => [newLog, ...prev]);
      })
      .catch(err => {
        console.warn('WhatsApp confirm payment failure', err);
      });
  };

  // Submit and save customer 5-star quality rating and feedback
  const handleRateBooking = (bookingId: string, rating: number, comment: string) => {
    // Update main bookings
    const targetBooking = bookings.find(b => b.id === bookingId);
    if (targetBooking) {
      const updatedDoc = {
        ...targetBooking,
        rating,
        ratingComment: comment.trim() || undefined
      };
      setDoc(doc(db, 'bookings', bookingId), updatedDoc)
        .catch(err => handleFirestoreError(err, OperationType.UPDATE, `bookings/${bookingId}`));
    }

    const updatedBookings = bookings.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          rating,
          ratingComment: comment.trim() || undefined
        };
      }
      return b;
    });
    setBookings(updatedBookings);

    // Update current search results if they are shown
    const updatedTracked = trackedRequests.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          rating,
          ratingComment: comment.trim() || undefined
        };
      }
      return b;
    });
    setTrackedRequests(updatedTracked);

    // Show custom toast feedback for client
    setBookingToast({
      show: true,
      type: 'success',
      title: 'شكرًا لتقييمك الكريم! 🌟',
      message: 'تم تسجيل تقييم مستوى جودة الخدمة بنجاح، ملاحظاتك تساعدنا في التطوير والارتقاء ومواصلة إسعاد عملاء سما المملكة.'
    });
    
    setTimeout(() => {
      setBookingToast(null);
    }, 5500);
  };

  // Admin Request status updates with automatic WhatsApp notifications
  const handleUpdateBookingStatus = async (bookingId: string, status: 'pending' | 'processing' | 'completed' | 'cancelled') => {
    const targetBooking = bookings.find(b => b.id === bookingId);
    if (!targetBooking) return;

    const oldStatus = targetBooking.status;

    const updatedDoc = { ...targetBooking, status: status };
    setDoc(doc(db, 'bookings', bookingId), updatedDoc)
      .catch(err => handleFirestoreError(err, OperationType.UPDATE, `bookings/${bookingId}`));

    const updated = bookings.map(b => {
      if (b.id === bookingId) {
        return { ...b, status: status };
      }
      return b;
    });
    setBookings(updated);

    // If the status is changing, send relevant WhatsApp notification
    if (oldStatus !== status) {
      let template = '';
      let statusLabelAr = '';
      if (status === 'pending') {
        template = whatsappTemplatePending;
        statusLabelAr = 'قيد الانتظار لمراجعة الإدارة';
      } else if (status === 'processing') {
        template = whatsappTemplateProcessing;
        statusLabelAr = 'تحت المعالجة والتعقيب الإجرائي';
      } else if (status === 'completed') {
        template = whatsappTemplateCompleted;
        statusLabelAr = 'مكتملة ومستند الفاتورة جاهز';
      } else if (status === 'cancelled') {
        template = whatsappTemplateCancelled;
        statusLabelAr = 'ملغية من النظام';
      }

      if (template) {
        const formattedMessage = template
          .replace(/{name}/g, targetBooking.clientName)
          .replace(/{service}/g, targetBooking.serviceName)
          .replace(/{status}/g, statusLabelAr)
          .replace(/{phone}/g, targetBooking.phoneNumber)
          .replace(/{bookingId}/g, bookingId);

        // Trigger temporary visual notification feedback
        setWaToast({
          show: true,
          type: 'loading',
          message: `جاري إرسال إشعار WhatsApp تلقائي إلى ${targetBooking.clientName}...`,
          details: formattedMessage
        });

        // Call API
        const result = await sendPlaceholderWhatsAppAPI(targetBooking.phoneNumber, formattedMessage);

        // Create Transmission Log
        const newLog: WhatsAppLog = {
          id: `wa-log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          bookingId: bookingId,
          clientName: targetBooking.clientName,
          phoneNumber: targetBooking.phoneNumber,
          serviceName: targetBooking.serviceName,
          status: status,
          message: formattedMessage,
          sentAt: new Date().toISOString(),
          success: result.success,
          apiResponse: result.apiResponse
        };

        setWhatsappLogs(prev => [newLog, ...prev]);

        if (result.success) {
          setWaToast({
            show: true,
            type: 'success',
            message: `تم إرسال إشعار WhatsApp تلقائي بالنجاح للأخ ${targetBooking.clientName}!`,
            details: formattedMessage
          });
        } else {
          setWaToast({
            show: true,
            type: 'error',
            message: `تعذر إرسال الإشعار للعميل: ${result.apiResponse}`,
            details: formattedMessage
          });
        }

        // Automatically auto-close feedback toast in 7 seconds
        setTimeout(() => {
          setWaToast(prev => {
            if (prev && (prev.message.includes(targetBooking.clientName) || prev.type === 'error')) {
              return { ...prev, show: false };
            }
            return prev;
          });
        }, 7000);
      }
    }
  };

  // Manual Trigger for WhatsApp Dynamic Testing Console
  const handleManualTestWaDispatch = async () => {
    const target = bookings.find(b => b.id === testConsoleBookingId);
    if (!target) {
      alert('يرجى تحديد معاملة نشطة من القائمة المنسدلة أولاً.');
      return;
    }

    setTestConsoleIsDispatching(true);

    let template = '';
    let statusLabelAr = '';
    if (testConsoleTemplateType === 'pending') {
      template = whatsappTemplatePending;
      statusLabelAr = 'قيد الانتظار لمراجعة الإدارة';
    } else if (testConsoleTemplateType === 'processing') {
      template = whatsappTemplateProcessing;
      statusLabelAr = 'تحت المعالجة والتعقيب الإجرائي';
    } else if (testConsoleTemplateType === 'completed') {
      template = whatsappTemplateCompleted;
      statusLabelAr = 'مكتملة ومستند الفاتورة جاهز';
    } else if (testConsoleTemplateType === 'cancelled') {
      template = whatsappTemplateCancelled;
      statusLabelAr = 'ملغية من النظام';
    }

    if (!template) {
      setTestConsoleIsDispatching(false);
      return;
    }

    const formattedMessage = template
      .replace(/{name}/g, target.clientName)
      .replace(/{service}/g, target.serviceName)
      .replace(/{status}/g, statusLabelAr)
      .replace(/{phone}/g, target.phoneNumber)
      .replace(/{bookingId}/g, target.id);

    const result = await sendPlaceholderWhatsAppAPI(target.phoneNumber, formattedMessage);

    const newLog: WhatsAppLog = {
      id: `wa-log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      bookingId: target.id,
      clientName: target.clientName,
      phoneNumber: target.phoneNumber,
      serviceName: target.serviceName,
      status: testConsoleTemplateType,
      message: formattedMessage,
      sentAt: new Date().toISOString(),
      success: result.success,
      apiResponse: result.apiResponse
    };

    setWhatsappLogs(prev => [newLog, ...prev]);
    setTestConsoleIsDispatching(false);

    setWaToast({
      show: true,
      type: result.success ? 'success' : 'error',
      message: result.success 
        ? `[إرسال تجريبي] تم بث رسالة WhatsApp تلقائية بنجاح للمستفيد ${target.clientName}!`
        : `[فشل تجريبي] تعذر بث الإشعار للعميل: ${result.apiResponse}`,
      details: formattedMessage
    });

    setTimeout(() => {
      setWaToast(prev => {
        if (prev && prev.message.includes('[إرسال تجريبي]')) {
          return { ...prev, show: false };
        }
        return prev;
      });
    }, 7000);
  };

  // Link booking directly to a service in the service directory
  const handleUpdateBookingService = (bookingId: string, serviceId: string) => {
    const srv = services.find(s => s.id === serviceId);
    if (!srv) return;
    const updated = bookings.map(b => {
      if (b.id === bookingId) {
        return { ...b, serviceId: serviceId, serviceName: srv.name };
      }
      return b;
    });
    setBookings(updated);
  };

  // Export all transaction ledger records to a CSV file (including UTF-8 BOM for Arabic compatibility in Excel)
  const handleExportTransactionsCSV = () => {
    if (transactions.length === 0) {
      setBookingToast({
        show: true,
        type: 'error',
        title: 'لا توجد بيانات لتصديرها',
        message: 'لا توجد أي معاملات مسجلة في دفتر الحسابات لتصديرها حالياً.'
      });
      return;
    }

    // CSV headers in Arabic
    const headers = [
      'رقم الفاتورة',
      'اسم العميل',
      'نوع الخدمة الإجرائية',
      'رسوم الجهات الحكومية (ر.س)',
      'أتعاب مكتب سما المملكة (ر.س)',
      'ضريبة القيمة المضافة 15% (ر.س)',
      'المجموع الشامل (ر.س)',
      'تاريخ تسجيل القيد'
    ];

    const rows = transactions.map(t => [
      t.invoiceNumber,
      `"${t.clientName.replace(/"/g, '""')}"`,
      `"${t.serviceName.replace(/"/g, '""')}"`,
      t.govFee.toFixed(2),
      t.officeFee.toFixed(2),
      t.tax.toFixed(2),
      t.total.toFixed(2),
      new Date(t.date).toLocaleDateString('ar-SA')
    ]);

    // Build CSV Content
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    // Add UTF-8 BOM to ensure Excel opens Arabic characters correctly without glitching
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `Sama-Kingdom-Transactions-Ledger-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show premium toast
    setBookingToast({
      show: true,
      type: 'success',
      title: 'تم تصدير الدفتر المالي بنجاح',
      message: `تم إنشاء وتحميل ملف Excel/CSV يحتوي على جميع الفواتير والمقبوضات المقيدة (عدد ${transactions.length} معاملة).`
    });

    // Auto-close success toast after 6 seconds
    setTimeout(() => {
      setBookingToast(prev => prev && prev.title === 'تم تصدير الدفتر المالي بنجاح' ? { ...prev, show: false } : prev);
    }, 6000);
  };

  // Generate and download a beautifully styled PDF Statement/Report using browser rendering via a hidden iframe
  const handleDownloadPDFReport = () => {
    if (transactions.length === 0) {
      setBookingToast({
        show: true,
        type: 'error',
        title: 'لا توجد بيانات لتصديرها',
        message: 'لا توجد أي معاملات مسجلة في دفتر الحسابات لتوليد تقرير PDF.'
      });
      return;
    }

    // Calculate sum metrics
    const totalGov = transactions.reduce((acc, t) => acc + t.govFee, 0);
    const totalOffice = transactions.reduce((acc, t) => acc + t.officeFee, 0);
    const totalTax = transactions.reduce((acc, t) => acc + t.tax, 0);
    const totalSum = transactions.reduce((acc, t) => acc + t.total, 0);

    const reportStyles = `
      @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800&display=swap');
      
      body {
        font-family: 'Cairo', 'Inter', sans-serif;
        direction: rtl;
        text-align: right;
        color: #1e293b;
        background-color: #ffffff;
        margin: 0;
        padding: 40px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .report-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-b: 3px double #cbd5e1;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      
      .brand-title {
        font-size: 20px;
        font-weight: 800;
        color: #0c1a30;
        margin: 0 0 5px 0;
      }
      
      .brand-subtitle {
        font-size: 11px;
        color: #64748b;
        margin: 0;
        font-weight: 600;
      }
      
      .report-metadata {
        text-align: left;
        font-size: 11px;
        color: #475569;
        line-height: 1.6;
      }
      
      .report-title-container {
        text-align: center;
        margin-bottom: 25px;
      }
      
      .report-main-title {
        font-size: 17px;
        font-weight: 700;
        color: #d97706;
        background-color: #fffbeb;
        border: 1px solid #fef3c7;
        padding: 10px 24px;
        border-radius: 12px;
        display: inline-block;
      }
      
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 15px;
        margin-bottom: 30px;
      }
      
      .stat-card {
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 12px 15px;
        text-align: center;
      }
      
      .stat-card-title {
        font-size: 10px;
        color: #64748b;
        font-weight: 700;
        margin-bottom: 5px;
      }
      
      .stat-card-value {
        font-size: 14px;
        font-weight: 800;
        color: #0f172a;
      }
      
      .stat-card-value.highlight {
        color: #b45309;
      }
      
      .data-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 40px;
        font-size: 11px;
      }
      
      .data-table th {
        background-color: #0f172a;
        color: #ffffff;
        font-weight: 700;
        padding: 10px 8px;
        text-align: right;
        border: 1px solid #1e293b;
      }
      
      .data-table td {
        padding: 9px 8px;
        border-bottom: 1px solid #e2e8f0;
        border-left: 1px solid #e2e8f0;
        border-right: 1px solid #e2e8f0;
        color: #334155;
      }
      
      .data-table tr:nth-child(even) {
        background-color: #f8fafc;
      }
      
      .data-table tr.total-row {
        background-color: #f1f5f9;
        font-weight: 800;
      }
      
      .data-table tr.total-row td {
        border-top: 2px solid #94a3b8;
        color: #0f172a;
      }
      
      .signature-area {
        margin-top: 50px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        font-size: 11px;
        page-break-inside: avoid;
      }
      
      .signature-box {
        width: 250px;
        border-top: 1px dashed #cbd5e1;
        padding-top: 12px;
        text-align: center;
        line-height: 1.8;
      }
      
      .stamp-circle {
        border: 2px dashed #b45309;
        color: #b45309;
        width: 110px;
        height: 110px;
        border-radius: 50%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-size: 9px;
        font-weight: 800;
        text-align: center;
        margin: 15px auto 0 auto;
        transform: rotate(-10deg);
        opacity: 0.85;
        line-height: 1.3;
      }

      @media print {
        body {
          padding: 20px;
        }
        button, .no-print {
          display: none !important;
        }
      }
    `;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>سما المملكة - تقرير كشف قيود الحسابات والفواتير</title>
        <style>${reportStyles}</style>
      </head>
      <body>
        <div class="report-header">
          <div>
            <h1 class="brand-title">مكتب سما المملكة للخدمات والتعقيب</h1>
            <p class="brand-subtitle">لتخليص المعاملات الإجرائية وتأشيرات السفر والعمل والجهات الحكومية</p>
          </div>
          <div class="report-metadata">
            <div>تاريخ التصدير: <strong>${new Date().toLocaleDateString('ar-SA')}</strong></div>
            <div>المستخدم المسؤول: <strong>إدارة الحسابات المعتمدة</strong></div>
            <div>نوع المستند: <strong>كشف حساب مالي وقيد ضريبي معتمد</strong></div>
          </div>
        </div>

        <div class="report-title-container">
          <div class="report-main-title">تقرير كشف قيود دفتر الحسابات والفواتير السنوية المعتمدة لعام ${new Date().getFullYear()}م</div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-card-title">إجمالي الفواتير المرحلة</div>
            <div class="stat-card-value">${transactions.length} قيد مالي</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-title">إجمالي الرسوم الحكومية</div>
            <div class="stat-card-value">${totalGov.toFixed(2)} ر.س</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-title">إجمالي أتعاب المكتب المكتبية</div>
            <div class="stat-card-value">${totalOffice.toFixed(2)} ر.س</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-title">الإجمالي الشامل والضرائب المقبوضة</div>
            <div class="stat-card-value highlight">${totalSum.toFixed(2)} ر.س</div>
          </div>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 15%;">رقم القيد / الفاتورة</th>
              <th style="width: 20%;">المستفيد / العميل</th>
              <th style="width: 25%;">نوع الخدمة أو المعاملة</th>
              <th style="width: 10%;">الرسوم الحكومية</th>
              <th style="width: 10%;">أتعاب المكتب</th>
              <th style="width: 8%;">ضريبة 15%</th>
              <th style="width: 12%;">إجمالي المبلغ</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.map(t => `
              <tr>
                <td style="font-family: monospace; font-weight: bold; font-size: 10.5px; color: #000000;">${t.invoiceNumber}</td>
                <td>${t.clientName}</td>
                <td>${t.serviceName}</td>
                <td style="font-family: monospace;">${t.govFee.toFixed(2)} ر.س</td>
                <td style="font-family: monospace;">${t.officeFee.toFixed(2)} ر.س</td>
                <td style="font-family: monospace;">${t.tax.toFixed(2)} ر.س</td>
                <td style="font-family: monospace; font-weight: bold; color: #0f172a;">${t.total.toFixed(2)} ر.س</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="3" style="text-align: center; font-size: 12px;">مجموع الترصيد الكلي العام للقيود واستمارات التحصيل المالي</td>
              <td style="font-family: monospace;">${totalGov.toFixed(2)} ر.س</td>
              <td style="font-family: monospace;">${totalOffice.toFixed(2)} ر.س</td>
              <td style="font-family: monospace;">${totalTax.toFixed(2)} ر.س</td>
              <td style="font-family: monospace; color: #b45309; font-size: 12px;">${totalSum.toFixed(2)} ر.س</td>
            </tr>
          </tbody>
        </table>

        <div class="signature-area">
          <div class="signature-box">
            <strong>محاسب المكتب والتدقيق المالي:</strong>
            <p style="margin-top: 40px; color: #64748b;">(توقيع الموظف المسؤول)</p>
          </div>
          
          <div class="signature-box" style="border: none;">
            <div class="stamp-circle">
              مكتب سما المملكة<br>
              شؤون الحسابات<br>
              مقبول للتحصيل
            </div>
          </div>

          <div class="signature-box">
            <strong>مدير عام مكتب سما المملكة:</strong>
            <p style="margin-top: 40px; color: #64748b;">(الاعتماد المالي والختم الرسمي)</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create a hidden iframe, write HTML and print
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1500);
      }, 500);
    }

    setBookingToast({
      show: true,
      type: 'success',
      title: 'تم تجهيز كشف حساب PDF للطباعة',
      message: `تم توليد وتهيئة تقرير الحسابات الضريبية (عدد المقبوضات: ${transactions.length}) بنجاح.`
    });

    setTimeout(() => {
      setBookingToast(prev => prev && prev.title === 'تم تجهيز كشف حساب PDF للطباعة' ? { ...prev, show: false } : prev);
    }, 6000);
  };

  // Delete transaction safely
  const handleDeleteTransaction = (txId: string) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا القيد المالي بشكل نهائي؟')) {
      const filtered = transactions.filter(t => t.id !== txId);
      setTransactions(filtered);
    }
  };

  // Delete Service safely
  const handleDeleteService = (srvId: string) => {
    const srv = services.find(s => s.id === srvId);
    if (!srv) return;
    
    if (services.length <= 1) {
      setShowCannotDeleteAlert(true);
      return;
    }
    setServiceToDeleteCheck(srv);
  };

  const confirmDeleteService = () => {
    if (serviceToDeleteCheck) {
      const filtered = services.filter(s => s.id !== serviceToDeleteCheck.id);
      setServices(filtered);
      setServiceToDeleteCheck(null);
    }
  };

  // Handling navigation tabs
  const handleTabClick = (tab: 'home' | 'track' | 'jobs' | 'admin') => {
    setIsMobileMenuOpen(false);
    if (tab === 'admin') {
      if (isAdminAuthenticated) {
        setActiveTab('admin');
      } else {
        setShowPasscode(true);
      }
    } else {
      setActiveTab(tab);
    }
  };

  const handleAdminAuthSuccess = () => {
    setIsAdminAuthenticated(true);
    sessionStorage.setItem('sm_admin_logged', 'true');
    setShowPasscode(false);
    setActiveTab('admin');
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('sm_admin_logged');
    setActiveTab('home');
  };

  // --- CUSTOMER CSAT AVERAGE & STATISTICS ---
  const ratedBookings = bookings.filter(b => b.rating !== undefined && b.rating !== null);
  const totalReviewsCount = ratedBookings.length;
  const averageServiceRating = totalReviewsCount > 0
    ? (ratedBookings.reduce((sum, b) => sum + (b.rating || 0), 0) / totalReviewsCount).toFixed(1)
    : "5.0";

  // --- FINANCIAL CALC COMBINED ---
  const totalGovSpent = transactions.reduce((sum, t) => sum + t.govFee, 0);
  const totalOfficeRevenues = transactions.reduce((sum, t) => sum + t.officeFee, 0);
  const totalVATCollected = transactions.reduce((sum, t) => sum + t.tax, 0);
  const totalOverallAccountingVolume = totalGovSpent + totalOfficeRevenues + totalVATCollected;

  return (
    <div 
      className="relative min-h-screen bg-slate-50 transition-all duration-500 flex flex-col"
      dir={lang === 'ar' ? 'rtl' : 'ltr'} 
      style={{ 
        fontFamily: lang === 'ar' 
          ? '"Tajawal", "Helvetica Neue", Helvetica, "Segoe UI", system-ui, -apple-system, sans-serif'
          : '"Inter", system-ui, -apple-system, sans-serif',
      }}
    >
      {/* 🌟 Safari-compatible Hardware-Accelerated Fixed Background Layer (Resolves iOS Safari 'bg-fixed' distortion & lag bugs) */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-100"
        style={{ 
          backgroundImage: `linear-gradient(rgba(248, 250, 252, 0.94), rgba(248, 250, 252, 0.94)), url("${getActiveMakkahImg()}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      
      {/* Scrollable Main Content Container (Placed in standard relative positioning to sit on top of background) */}
      <div className="relative z-10 flex-grow flex flex-col">

      
      {/* Top Main Nav */}
      <nav className="bg-slate-900 border-b border-slate-950 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Logo brand */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden border border-amber-500/30 flex-shrink-0 bg-slate-950 shadow-md">
                <img 
                  src={samaLogoImg} 
                  alt={lang === 'ar' ? 'شعار سما المملكة' : 'Sama Al-Mamlaka Logo'} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <span className="font-extrabold text-xs sm:text-base md:text-xl tracking-tight text-amber-500 whitespace-nowrap">{t('officeName')}</span>
                <span className="hidden sm:inline-block sm:mr-2 text-[10px] sm:text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-750 self-start sm:self-auto mt-0.5 sm:mt-0">{t('integratedServices')}</span>
              </div>
            </div>

            {/* Nav tabs desktop */}
            <div className="hidden md:flex items-center gap-2 lg:gap-4">
              <button 
                onClick={() => handleTabClick('home')}
                className={`px-3 py-2 text-xs lg:text-sm font-bold rounded transition-all flex items-center gap-1.5 ${activeTab === 'home' ? 'bg-amber-600 text-slate-950 shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}
              >
                <Home className="w-4 h-4" />
                <span>{t('home')}</span>
              </button>

              <button 
                onClick={() => handleTabClick('track')}
                className={`px-3 py-2 text-xs lg:text-sm font-bold rounded transition-all flex items-center gap-1.5 ${activeTab === 'track' ? 'bg-amber-600 text-slate-950 shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}
              >
                <Search className="w-4 h-4" />
                <span>{t('trackRequest')}</span>
              </button>

              <button 
                onClick={() => handleTabClick('jobs')}
                className={`px-3 py-2 text-xs lg:text-sm font-bold rounded transition-all flex items-center gap-1.5 ${activeTab === 'jobs' ? 'bg-amber-600 text-slate-950 shadow-md' : 'text-slate-300 hover:text-white hover:bg-slate-800'}`}
              >
                <Briefcase className="w-4 h-4" />
                <span className="relative">
                  {t('vacancies')}
                  {jobVacancies.length > 0 && (
                    <span className="absolute -top-3 -left-3.5 bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full animate-bounce">
                      {jobVacancies.length}
                    </span>
                  )}
                </span>
              </button>

              <button 
                onClick={() => handleTabClick('admin')}
                className={`px-3 py-2 text-xs lg:text-sm font-bold rounded transition-all flex items-center gap-1.5 ${activeTab === 'admin' ? 'bg-slate-200 text-slate-950 shadow-md' : 'bg-slate-800 border border-slate-700 text-amber-500 hover:bg-slate-700'}`}
              >
                <Lock className="w-4 h-4" />
                <span>{t('adminPanel')}</span>
              </button>

              {/* Language Switcher Button (Desktop) */}
              <button 
                onClick={handleLangToggle}
                className="px-3 py-2 text-xs lg:text-sm font-bold rounded transition-all flex items-center gap-1.5 bg-slate-800 border border-slate-700 text-amber-500 hover:bg-slate-700 cursor-pointer select-none"
                title={lang === 'ar' ? 'Switch to English' : 'التحويل للعربية'}
              >
                <LucideIcons.Globe className="w-4 h-4 text-amber-500" />
                <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
              </button>

              {isAdminAuthenticated && activeTab === 'admin' && (
                <button 
                  onClick={handleAdminLogout}
                  title="تسجيل الخروج من الإدارة"
                  className="p-1.5 bg-red-900/40 text-red-300 hover:text-white rounded border border-red-800/60 hover:bg-red-900 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Mobile menu toggle & Language Selector */}
            <div className="flex md:hidden items-center gap-2">
              {/* Language Switcher Button (Mobile) */}
              <button 
                onClick={handleLangToggle}
                className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700/65 flex items-center gap-1 text-xs select-none"
                title={lang === 'ar' ? 'Switch to English' : 'التحويل للعربية'}
              >
                <LucideIcons.Globe className="w-4 h-4 text-amber-500 animate-pulse" />
                <span className="font-bold">{lang === 'ar' ? 'EN' : 'عربي'}</span>
              </button>

              {isAdminAuthenticated && activeTab === 'admin' && (
                <button 
                  onClick={handleAdminLogout}
                  title="تسجيل الخروج من الإدارة"
                  className="p-2 bg-red-900/40 text-red-300 hover:text-white rounded border border-red-800/60 hover:bg-red-900 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
              
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 border border-slate-700/65"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5 text-amber-500" /> : <Menu className="w-5 h-5 text-amber-500" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Dropdown Panel */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-950 bg-slate-900/95 backdrop-blur-md px-4 py-3 space-y-2 shadow-inner">
            <button 
              onClick={() => handleTabClick('home')}
              className={`w-full px-4 py-3 text-sm font-bold rounded-lg transition-all flex items-center gap-2.5 ${activeTab === 'home' ? 'bg-amber-600 text-slate-950 shadow-md font-extrabold' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              <Home className="w-4.5 h-4.5 text-amber-500" />
              <span>{t('home')}</span>
            </button>

            <button 
              onClick={() => handleTabClick('track')}
              className={`w-full px-4 py-3 text-sm font-bold rounded-lg transition-all flex items-center gap-2.5 ${activeTab === 'track' ? 'bg-amber-600 text-slate-950 shadow-md font-extrabold' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              <Search className="w-4.5 h-4.5 text-amber-500" />
              <span>{t('trackRequest')}</span>
            </button>

            <button 
              onClick={() => handleTabClick('jobs')}
              className={`w-full px-4 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-between ${activeTab === 'jobs' ? 'bg-amber-600 text-slate-950 shadow-md font-extrabold' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              <div className="flex items-center gap-2.5">
                <Briefcase className="w-4.5 h-4.5 text-amber-500" />
                <span>{t('vacancies')}</span>
              </div>
              {jobVacancies.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {jobVacancies.length} {lang === 'ar' ? 'شاغر' : 'positions'}
                </span>
              )}
            </button>

            <button 
              onClick={() => handleTabClick('admin')}
              className={`w-full px-4 py-3 text-sm font-bold rounded-lg transition-all flex items-center gap-2.5 ${activeTab === 'admin' ? 'bg-slate-200 text-slate-950 shadow-md font-extrabold' : 'bg-slate-800 border border-slate-750 text-amber-500 hover:bg-slate-750'}`}
            >
              <Lock className="w-4.5 h-4.5" />
              <span>{t('adminPanel')}</span>
            </button>
          </div>
        )}
      </nav>

      {/* BANNER CLOCK & SYSTEM STATE */}
      <div className="bg-slate-950 text-slate-400 py-2 border-b border-slate-800 text-center text-xs font-mono select-none px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-1 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-300 font-sans font-medium">{t('connectedStatus')}</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>{t('localTime')} <strong className="text-slate-200">2026-05-19</strong></span>
            <span className="hidden sm:inline">|</span>
            <span>{t('currentUser')} <strong className="text-amber-500">essam77142@gmail.com</strong></span>
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER CONTENT VIEW */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* ==================== TAB 1: CLIENT HOME PORTAL ==================== */}
        {activeTab === 'home' && (
          <div className="space-y-12">
            
            {/* Elegant Saudi Pattern Hero */}
            <div 
              className="bg-slate-900 text-white rounded-2xl overflow-hidden shadow-2xl relative border border-slate-850 bg-cover bg-center transition-all duration-500" 
              style={{ backgroundImage: `linear-gradient(to left, rgba(15, 23, 42, 0.96) 45%, rgba(15, 23, 42, 0.7) 80%, rgba(15, 23, 42, 0.3)), url("${getActiveMakkahImg()}")` }}
            >
              {/* Abs decoration backdrop line */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl -z-10"></div>
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -z-10"></div>
              
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-8 md:p-12">
                {/* Right Side: Welcome text and info - occupies 7 cols on lg */}
                <div className={`lg:col-span-7 flex flex-col justify-center ${lang === 'ar' ? 'text-center md:text-right' : 'text-center md:text-left'}`}>
                  <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full text-xs font-bold border border-amber-500/20 mb-4 self-center md:self-start">
                    <Activity className="w-3.5 h-3.5 animate-pulse" />
                    <span>{lang === 'ar' ? 'البوابة الرسمية والذكية للمستفيدين' : 'Official and Intelligent Beneficiary Portal'}</span>
                  </div>
                  <h1 className="text-3xl md:text-5xl font-black mb-4 leading-normal text-slate-100 font-sans">
                    {lang === 'ar' ? (
                      <>ننجز معاملاتك بكل <span className="text-amber-500 underline decoration-wavy decoration-amber-500/40">ثقة وكفاءة</span></>
                    ) : (
                      <>We process your transactions with <span className="text-amber-500 underline decoration-wavy decoration-amber-500/40">Confidence & Excellence</span></>
                    )}
                  </h1>
                  
                  <div className={`bg-slate-950/80 backdrop-blur-md rounded-2xl p-5 border border-amber-500/30 max-w-3xl mb-8 shadow-2xl relative overflow-hidden ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                    <div className={`absolute top-0 ${lang === 'ar' ? 'right-0' : 'left-0'} w-1.5 h-full bg-amber-500`}></div>
                    <div className="flex items-center gap-2 text-amber-500 font-extrabold text-xs mb-2 bg-amber-500/10 w-fit px-2.5 py-1 rounded-md border border-amber-500/20">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      <span>{lang === 'ar' ? 'البيان الترحيبي الخاص بالزوار والعملاء' : 'Official Visitor Welcome Statement'}</span>
                    </div>
                    <p className="text-xs md:text-sm text-slate-100 leading-relaxed font-sans whitespace-pre-wrap">
                      {lang === 'en' && welcomeMessage.startsWith('أهلاً ومرحباً بكم') 
                        ? 'Welcome and greetings to Sama Al-Mamlaka digital platform for integrated services and government clearance. We are pleased to assist you with speed and safety under the supervision of specialists.' 
                        : welcomeMessage}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-start">
                    <a 
                      href="#booking-anchor" 
                      className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold px-8 py-3.5 rounded-lg text-center transition-all shadow-lg hover:shadow-amber-600/20 text-sm"
                    >
                      {lang === 'ar' ? 'اطلب خدمتك الآن' : 'Request Service Now'}
                    </a>
                    <button 
                      onClick={() => handleTabClick('track')}
                      className="bg-slate-800 hover:bg-slate-750 hover:text-white text-slate-200 font-bold px-8 py-3.5 rounded-lg text-center transition-all text-sm border border-slate-700"
                    >
                      {lang === 'ar' ? 'الاستعلام المباشر عن حالة المعاملة' : 'Direct Transaction Status Query'}
                    </button>
                  </div>
                </div>

                {/* Left Side: Outstanding Royal Logo with customized premium background - occupies 5 cols on lg */}
                <div className="lg:col-span-5 flex flex-col items-center justify-center">
                  <div className="relative group w-64 h-64 md:w-72 md:h-72 rounded-3xl overflow-hidden shadow-2xl border-2 border-amber-500/40 bg-slate-950 flex items-center justify-center transition-all duration-500 hover:border-amber-400 hover:scale-102">
                    
                    {/* Glowing backlight */}
                    <div className="absolute -inset-1 bg-gradient-to-tr from-amber-600 to-indigo-600 rounded-3xl blur opacity-30 group-hover:opacity-40 transition-opacity duration-500"></div>
                    
                    {/* Dynamic overlay reflection */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80 z-10"></div>
                    
                    {/* The Actual Luxury Logo Image */}
                    <img 
                      src={samaLogoImg} 
                      alt={lang === 'ar' ? 'شعار مكتب سما المملكة' : 'Sama Al-Mamlaka Logo'} 
                      className="w-full h-full object-cover relative z-0"
                      referrerPolicy="no-referrer"
                    />

                    {/* Logo Info Overlay */}
                    <div className="absolute bottom-4 inset-x-4 z-20 text-center space-y-1">
                      <h3 className="text-amber-400 font-black text-sm tracking-wide drop-shadow-md">{t('officeName')}</h3>
                      <p className="text-slate-300 text-[9px] drop-shadow-sm font-sans">{lang === 'ar' ? 'الخدمات المتكاملة وتخليص المعاملات الحكومية' : 'Integrated Services & Government Clearance'}</p>
                    </div>

                    {/* Live indicator badge */}
                    <span className="absolute top-3 left-3 z-25 bg-amber-500 text-slate-950 text-[8px] font-black px-2 py-0.5 rounded-full border border-amber-400 animate-pulse uppercase tracking-wider font-sans">
                      المكتب الرقمي الموثق
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* BRAND URL & QR CODE LUXURY WIDGET (رابط الموقع المميز بتصميم مذهل يجذب الانتباه - مخفي ويظهر فقط لمسؤولي الموقع) */}
            {isAdminAuthenticated && showBrandedUrlBanner && (
              <div className="bg-gradient-to-l from-slate-900 via-slate-950 to-slate-900 rounded-2xl border-2 border-dashed border-amber-500/60 p-6 md:p-8 text-white shadow-2xl relative overflow-hidden animate-fade-in my-6">
                {/* Administrative safeguard header */}
                <div className="absolute top-2 left-2 bg-red-600/95 text-white font-bold text-[9px] px-2.5 py-1 rounded-md z-30 uppercase tracking-widest flex items-center gap-1.5 select-none shadow-md">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>لوحة المسؤول المعتمد (مخفية عن بقية الزوار)</span>
                </div>

                {/* Premium Glow Overlays */}
                <div className="absolute top-0 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl"></div>
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                  
                  {/* Right Area: Large Interactive Domain and copy controls (7 columns) */}
                  <div className="lg:col-span-7 text-right space-y-4 font-sans">
                    <div className="flex flex-wrap items-center gap-2 justify-start">
                      <span className="bg-amber-500 text-slate-950 font-black text-[9px] sm:text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wide flex items-center gap-1 shadow-3xs">
                        <Sparkles className="w-3.5 h-3.5 animate-spin text-slate-950" />
                        <span>الرابط الرقمي الرسمي المعتمد</span>
                      </span>
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] sm:text-[10px] px-2.5 py-1 rounded-md font-bold flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>نشط ومعتمد رسمياً ✓</span>
                      </span>
                      <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-[9px] sm:text-[10px] px-2.5 py-1 rounded-md font-bold">
                        بروتوكول آمن SSL 🔒
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-xl sm:text-2xl font-black text-white leading-normal">
                        بوابة النفاذ المميزة لمكتب <span className="text-amber-400 font-extrabold">سما المملكة للخدمات المتكاملة</span>
                      </h3>
                      <p className="text-slate-350 text-xs sm:text-sm leading-relaxed max-w-xl">
                        يسعدنا تمكين زوارنا الأعزاء ومراجعينا الكرام من النفاذ السريع للمنصة واستعراض دليل الخدمات عبر هذا الرابط المميز والبارز، الداعم لبروتوكولات الأمان الحكومية.
                      </p>
                    </div>

                    {/* Absolute Stunning Link Container */}
                    <div className="bg-slate-950/90 rounded-2xl border-2 border-slate-800 p-4 relative group max-w-2xl shadow-inner transition-all hover:border-amber-500/50">
                      <div className="absolute top-3 left-4 flex gap-1.5 text-slate-600 select-none">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/70"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500/70"></span>
                      </div>

                      <div className="pt-5 pb-2 text-center select-all">
                        <span className="text-slate-500 text-[11px] sm:text-xs font-mono block">https://</span>
                        <strong className="text-xl sm:text-3.5xl font-mono tracking-wider text-amber-500 font-extrabold block drop-shadow-lg transition-all group-hover:text-amber-400 py-1">
                          {officeDomain}
                        </strong>
                      </div>

                      {/* Interactive Click to Copy Panel */}
                      <div className="border-t border-slate-800/80 pt-3 flex flex-col sm:flex-row justify-between items-center gap-3">
                        <span className="text-[10px] text-slate-400 font-medium text-right sm:text-right">انقر لنسخ الرابط المطور ومشاركته مع المستفيدين</span>
                        
                        <button
                          type="button"
                          onClick={handleCopyDomainLink}
                          className={`text-xs font-black px-5 py-2.5 rounded-xl transition-all w-full sm:w-auto flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                            domainCopied
                              ? 'bg-emerald-600 text-white hover:bg-emerald-500 hover:scale-102 scale-102 ring-2 ring-emerald-500/40'
                              : 'bg-amber-500 text-slate-950 hover:bg-amber-400 hover:scale-102 hover:shadow-amber-500/20 active:scale-98'
                          }`}
                        >
                          {domainCopied ? (
                            <>
                              <Check className="w-4 h-4 text-white animate-bounce" />
                              <span>تم نسخ الرابط بنجاح! 📋</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 text-slate-950" />
                              <span>نسخ الرابط المميز للمكتب</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Share shortcuts */}
                    <div className="flex flex-wrap gap-2 pt-1 max-w-2xl justify-start">
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`تفضل بزيارة منصة مكتب سما المملكة للخدمات الإلكترونية المتكاملة وتخليص المعاملات الحكومية على الرابط المعتمد:\nhttps://${officeDomain}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                        <span>مشاركة فورية على الواتساب</span>
                      </a>
                      
                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`منصة مكتب سما المملكة الرقمي لتخليص المعاملات الحكومية وتأشيرات العمل والسفر:\nhttps://${officeDomain}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-slate-800 hover:bg-slate-700/80 text-sky-400 border border-slate-700 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all"
                      >
                        <Twitter className="w-3.5 h-3.5 text-sky-400" />
                        <span>مشاركة على منصة X</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({
                              title: 'مكتب سما المملكة',
                              text: 'البوابة الرقمية المعتمدة للخدمات وتخليص المعاملات الحكومية',
                              url: `https://${officeDomain}`,
                            }).catch(() => {});
                          } else {
                            handleCopyDomainLink();
                          }
                        }}
                        className="bg-slate-800 hover:bg-slate-755 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all"
                      >
                        <Send className="w-3.5 h-3.5 text-slate-400" />
                        <span>مشاركة النظام الشامل</span>
                      </button>
                    </div>
                  </div>

                  {/* Left Area: Digital QR-code scanner panel (5 columns) */}
                  <div className="lg:col-span-5 flex flex-col items-center justify-center space-y-3.5 bg-slate-900/60 p-5 rounded-2xl border border-slate-800 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent pointer-events-none z-0"></div>
                    
                    {/* Decorative corner brackets or borders to represent scanner target */}
                    <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-amber-500/40"></div>
                    <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-amber-500/40"></div>
                    <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-amber-500/40"></div>
                    <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-amber-500/40"></div>

                    <strong className="block text-amber-400 text-xs font-black tracking-wide z-10 flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-amber-500 animate-pulse" />
                      <span>الرمز البصري الذكي للرابط (QR-Code)</span>
                    </strong>

                    {/* Stunning Custom SVG QR-Code Mockup */}
                    <div className="w-44 h-44 bg-white p-3 rounded-2xl shadow-2xl relative z-10 transition-all duration-300 hover:scale-105 border-2 border-amber-500/30 flex items-center justify-center">
                      <svg viewBox="0 0 100 100" className="w-full h-full text-slate-950 font-bold select-none">
                        {/* Top-Left Scanner Block */}
                        <path d="M 5,5 H 25 V 25 H 5 Z" fill="currentColor" />
                        <path d="M 8,8 H 22 V 22 H 8 Z" fill="white" />
                        <path d="M 11,11 H 19 V 19 H 11 Z" fill="currentColor" />
                        
                        {/* Top-Right Scanner Block */}
                        <path d="M 75,5 H 95 V 25 H 75 Z" fill="currentColor" />
                        <path d="M 78,8 H 92 V 22 H 78 Z" fill="white" />
                        <path d="M 81,11 H 89 V 19 H 81 Z" fill="currentColor" />
                        
                        {/* Bottom-Left Scanner Block */}
                        <path d="M 5,75 H 25 V 95 H 5 Z" fill="currentColor" />
                        <path d="M 8,78 H 22 V 92 H 8 Z" fill="white" />
                        <path d="M 11,81 H 19 V 89 H 11 Z" fill="currentColor" />

                        {/* Small Bottom-Right Scanner Sub-block */}
                        <path d="M 78,78 H 86 V 86 H 78 Z" fill="currentColor" />
                        <path d="M 80,80 H 84 V 84 H 80 Z" fill="white" />
                        <path d="M 81,81 H 83 V 83 H 81 Z" fill="currentColor" />

                        {/* simulated detailed QR pattern internally */}
                        <path d="M 32,5 H 36 V 15 H 32 Z M 40,8 H 48 V 12 H 40 Z M 52,5 H 56 V 20 H 52 Z M 60,10 H 68 V 14 H 60 Z" fill="currentColor" />
                        <path d="M 32,18 H 38 V 22 H 32 Z M 44,18 H 48 V 26 H 44 Z M 60,18 H 64 V 28 H 60 Z M 68,22 H 72 V 26 H 68 Z" fill="currentColor" />
                        <path d="M 5,32 H 15 V 36 H 5 Z M 18,32 H 26 V 38 H 18 Z M 5,42 H 9 V 50 H 5 Z M 14,46 H 22 V 50 H 14 Z" fill="currentColor" />
                        <path d="M 75,32 H 85 V 36 H 75 Z M 88,32 H 95 V 40 H 88 Z M 78,44 H 84 V 52 H 78 Z M 88,46 H 92 V 54 H 88 Z" fill="currentColor" />
                        
                        {/* Central Custom Logo Frame cutout */}
                        <circle cx="50" cy="50" r="14" fill="white" stroke="#f59e0b" strokeWidth="1.5" />
                        {/* Inside central logo: Elegant Crown symbol */}
                        <path d="M 44,53 L 42,47 L 46,49 L 50,44 L 54,49 L 58,47 L 56,53 Z" fill="#b45309" />
                        <circle cx="50" cy="53" r="1.5" fill="#f59e0b" />
                        <path d="M 44,54 L 56,54" stroke="#b45309" strokeWidth="1" />

                        {/* remaining simulated matrices */}
                        <path d="M 32,32 H 36 V 40 H 32 Z M 40,34 H 44 V 38 H 40 Z M 56,32 H 68 V 36 H 56 Z M 60,40 H 64 V 48 H 60 Z" fill="currentColor" />
                        <path d="M 32,44 H 38 V 48 H 32 Z M 44,46 H 52 V 50 H 44 Z M 56,46 H 58 V 50 H 56 Z" fill="currentColor" />
                        <path d="M 32,56 H 42 V 60 H 32 Z M 36,64 H 40 V 70 H 36 Z M 32,72 H 34 V 74 H 32 Z" fill="currentColor" />
                        <path d="M 58,56 H 62 V 64 H 58 Z M 64,60 H 70 V 68 H 64 Z M 58,68 H 62 V 74 H 58 Z" fill="currentColor" />
                        <path d="M 36,80 H 44 V 84 H 36 Z M 48,80 H 52 V 92 H 48 Z M 40,88 H 46 V 92 H 40 Z" fill="currentColor" />
                        <path d="M 58,80 H 66 V 84 H 58 Z M 70,80 H 72 V 88 H 70 Z M 64,88 H 72 V 92 H 64 Z" fill="currentColor" />
                      </svg>
                    </div>

                    <div className="z-10 font-sans space-y-1">
                      <p className="text-slate-300 text-[10px] sm:text-[11px] leading-relaxed">
                        امسح الرمز بكاميرا الجوال لمواصلة الحجز ومشاركة المنصة
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          window.print();
                        }}
                        className="text-amber-500 hover:text-amber-400 text-[10px] font-black underline hover:no-underline flex items-center justify-center gap-1 mx-auto transition-all bg-white/5 py-1 px-2.5 rounded-md border border-white/10"
                      >
                        <span>🖨️ طباعة ملصق الـ QR لتعليقه بالمكتب</span>
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* SERVICES PREVIEW CARDS */}
            <section className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-300 pb-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{lang === 'ar' ? 'دليل الخدمات والتكاليف والرسوم' : 'Directory of Services, Costs & Fees'}</h2>
                  <p className="text-slate-500 text-sm mt-1">{lang === 'ar' ? 'تحديد دقيق وموثق للتكاليف الإدارية للمكتب والرسوم التابعة للدولة قبل البدء بالمعاملة.' : 'Precise, documented details of office administrative costs and government fees before starting transactions.'}</p>
                </div>
                <span className="text-xs bg-slate-200 text-slate-600 hover:bg-slate-300 font-bold px-3 py-1.5 rounded-full mt-2 md:mt-0">
                  {lang === 'ar' ? 'محدثة حسب اللوائح الضريبية لعام 2026 (15%)' : 'Updated under 2026 tax rules (15% VAT)'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map(s => {
                  const srvTax = s.officeFee * 0.15;
                  const srvTotal = s.govFee + s.officeFee + srvTax;

                  return (
                    <div 
                      key={s.id} 
                      className="bg-white rounded-xl shadow border border-slate-200 hover:border-amber-500/60 p-5 flex flex-col justify-between hover:shadow-md transition-all relative group"
                    >
                      <div>
                        {/* Service Card Top */}
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                            {renderServiceIcon(s.icon, "w-6 h-6 text-amber-700")}
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-widest">
                            {s.category === 'visa' && (lang === 'ar' ? 'خدمات تأشيرات' : 'Visas Services')}
                            {s.category === 'gov' && (lang === 'ar' ? 'تعقيب ومراجعة دائرية' : 'Gov Clearance')}
                            {s.category === 'transport' && (lang === 'ar' ? 'نقل ومواصلات' : 'Transport & Logistics')}
                            {s.category === 'other' && (lang === 'ar' ? 'خدمات عامة' : 'General Services')}
                          </span>
                        </div>

                        {/* Title and details */}
                        <h3 className="text-lg font-black text-slate-900 mb-2">{getTranslatedServiceName(s.name)}</h3>
                        <p className="text-slate-600 text-xs leading-relaxed mb-5 line-clamp-3">
                          {getTranslatedServiceDesc(s.description)}
                        </p>
                      </div>

                      {/* Fee Calculator Break down */}
                      <div className="border-t border-slate-100 pt-4 space-y-1 bg-slate-50 p-3 rounded-lg text-xs font-mono">
                        <div className="flex justify-between text-slate-500">
                          <span>{lang === 'ar' ? 'الرسوم الحكومية للدولة:' : 'Gov Fees:'}</span>
                          <span className="font-bold text-slate-900">{s.govFee.toFixed(2)} {lang === 'ar' ? 'ر.س' : 'SAR'}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>{lang === 'ar' ? 'أتعاب سما المملكة:' : 'Sama Al-Mamlaka Fee:'}</span>
                          <span className="font-bold text-slate-900">{s.officeFee.toFixed(2)} {lang === 'ar' ? 'ر.س' : 'SAR'}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>{lang === 'ar' ? 'ضريبة القيمة المضافة (15%):' : 'VAT (15%):'}</span>
                          <span className="font-bold text-slate-900">{srvTax.toFixed(2)} {lang === 'ar' ? 'ر.س' : 'SAR'}</span>
                        </div>
                        <div className="flex justify-between font-bold text-amber-800 border-t border-slate-200 pt-1.5 mt-1.5 text-xs">
                          <span className="font-sans">{lang === 'ar' ? 'الإجمالي التقريبي:' : 'Total Cost:'}</span>
                          <span>{srvTotal.toFixed(2)} {lang === 'ar' ? 'ر.س' : 'SAR'}</span>
                        </div>
                      </div>

                      {/* Linked Payment Methods representing service-specific billing */}
                      <div className={`mt-3.5 space-y-1 select-none ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                        <span className="text-[10px] text-slate-400 block font-bold">{lang === 'ar' ? 'طرق الدفع المشمولة بالسداد:' : 'Supported Payment Methods:'}</span>
                        <div className="flex flex-wrap gap-1 justify-start leading-none">
                          {s.paymentMethods && s.paymentMethods.length > 0 ? (
                            s.paymentMethods.map(pmId => {
                              const found = AVAILABLE_PAYMENT_METHODS.find(p => p.id === pmId);
                              if (!found) return null;
                              return (
                                <span 
                                  key={pmId} 
                                  className="text-[10px] font-black px-1.5 py-0.5 rounded border bg-slate-50 border-slate-200 text-slate-700 block hover:bg-slate-100 transition-colors"
                                  title={found.name}
                                >
                                  {found.badge}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[9px] text-slate-500 font-bold bg-slate-150 py-0.5 px-2 rounded">
                              {lang === 'ar' ? 'التحويل البنكي المعتمد 🏦' : 'Official Bank Transfer 🏦'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Floating actions */}
                      <div className="mt-4 pt-1 flex justify-between gap-1">
                        <button
                          onClick={() => {
                            setSelectedServiceId(s.id);
                            // Scroll to form smoothly
                            document.getElementById('booking-anchor')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="flex-1 bg-slate-950 hover:bg-slate-850 text-white py-2 rounded text-xs font-extrabold text-center transition-colors"
                        >
                          {lang === 'ar' ? 'اطلب الخدمة الآن' : 'Request Service Now'}
                        </button>
                        <button
                          onClick={() => setInfoPopupService(s)}
                          className="px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs transition-colors border border-slate-200"
                          title={lang === 'ar' ? 'تفاصيل البنود والخطوات' : 'Details & Steps'}
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* REALTIME SYSTEM SUBMIT FORM */}
            <section id="booking-anchor" className="bg-slate-100 py-10 rounded-2xl border border-slate-200 shadow-inner px-4 block">
              <div className="max-w-xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-l from-slate-900 to-slate-800 text-white p-6 space-y-1">
                  <div className="flex items-center gap-2">
                    <PlusCircle className="w-5 h-5 text-amber-500" />
                    <h3 className="text-xl font-bold">{lang === 'ar' ? 'تقديم أو حجز معاملة جديدة' : 'Submit or Book a New Transaction'}</h3>
                  </div>
                  <p className="text-slate-300 text-xs">{lang === 'ar' ? 'سجل بياناتك وسيصلك إشعار المتابعة والترحيل الفوري من فريق المراجعة.' : 'Register your details and you will receive instant clearance tracking notifications.'}</p>
                </div>

                <form onSubmit={handleClientBookingSubmit} className="p-6 space-y-5" noValidate>
                  {submissionFeedback && (
                    <div className={`p-4 rounded-xl border text-sm flex items-start gap-3 shadow-inner ${submissionFeedback.success ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-red-50 border-red-200 text-red-950'}`}>
                      {submissionFeedback.success ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" /> : <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />}
                      <div className="flex-1">
                        <p className="font-bold">{submissionFeedback.msg}</p>
                        {submissionFeedback.success && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTx(null);
                              setActiveTab('track');
                              setHasSearched(true);
                              const searchInput = document.getElementById('search-phone-input') as HTMLInputElement;
                              if (searchInput) searchInput.value = searchPhone;
                            }}
                            className="block text-emerald-700 underline font-extrabold mt-2 text-xs hover:text-emerald-850 text-right"
                          >
                            {lang === 'ar' ? 'انتقل للاستعلام وتتبع حالة المعاملة الآن ←' : 'Go to Query & Track Transaction Status Now ←'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className={`space-y-4 ${lang === 'ar' ? 'text-right' : 'text-left'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                    {/* Client Name Input block */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-bold text-slate-700">
                          {lang === 'ar' ? 'اسم العميل المستفيد بالكامل:' : 'Beneficiary Full Name:'}
                        </label>
                        {clientNameTouched && (
                          <span className={`text-[10px] font-bold ${getClientNameError(clientName) ? 'text-red-500 animate-pulse' : 'text-emerald-600'}`}>
                            {getClientNameError(clientName) 
                              ? (lang === 'ar' ? '✕ التنسيق غير مكتمل' : '✕ Format incomplete') 
                              : (lang === 'ar' ? '✓ الاسم جاهز ومطابق' : '✓ Name matches passport')}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={clientName}
                          onBlur={() => setClientNameTouched(true)}
                          onChange={(e) => {
                            setClientName(e.target.value);
                            if (!clientNameTouched) setClientNameTouched(true);
                          }}
                          placeholder={lang === 'ar' ? 'مثل: عبد الله بن محمد العتيبي' : 'e.g. Abdullah bin Muhammad Al-Otaibi'} 
                          className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-1 font-sans shadow-sm text-sm transition-all duration-150 ${
                            !clientNameTouched 
                              ? 'border-slate-300 focus:border-amber-500 focus:ring-amber-500/30'
                              : getClientNameError(clientName)
                                ? 'border-red-400 bg-red-50/10 focus:border-red-500 focus:ring-red-500/30 text-red-900'
                                : 'border-emerald-500 bg-emerald-50/5 focus:border-emerald-600 focus:ring-emerald-600/30'
                          }`}
                        />
                        {clientNameTouched && getClientNameError(clientName) && (
                          <p className="text-[11px] text-red-600 font-bold mt-1.5 flex items-start gap-1 p-2 bg-red-50/50 rounded-lg border border-red-150 animate-fade-in transition-all">
                            <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                            <span>{lang === 'ar' ? getClientNameError(clientName) : 'Please write your full name as on your ID or passport'}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Client Phone Input block */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-xs font-bold text-slate-700">
                            {lang === 'ar' ? 'رقم جوال العميل للتواصل والمتابعة:' : 'Mobile Number for Tracking:'}
                          </label>
                          {clientPhoneTouched && (
                            <span className={`text-[10px] font-bold ${getClientPhoneError(clientPhone) ? 'text-red-500 animate-pulse' : 'text-emerald-600'}`}>
                              {getClientPhoneError(clientPhone) 
                                ? (lang === 'ar' ? '✕ رقم غير متطابق' : '✕ Invalid number') 
                                : (lang === 'ar' ? '✓ الهاتف متسق' : '✓ Mobile valid')}
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <input 
                            type="text" 
                            value={clientPhone}
                            onBlur={() => setClientPhoneTouched(true)}
                            onChange={(e) => {
                              setClientPhone(e.target.value);
                              if (!clientPhoneTouched) setClientPhoneTouched(true);
                            }}
                            placeholder={lang === 'ar' ? 'مثلاً: 0501234567' : 'e.g. 0501234567'} 
                            className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-1 font-mono shadow-sm text-sm transition-all duration-150 ${
                              !clientPhoneTouched 
                                ? 'border-slate-300 focus:border-amber-500 focus:ring-amber-500/30'
                                : getClientPhoneError(clientPhone)
                                  ? 'border-red-400 bg-red-50/10 focus:border-red-500 focus:ring-red-500/30 text-red-900'
                                  : 'border-emerald-500 bg-emerald-50/5 focus:border-emerald-600 focus:ring-emerald-600/30'
                            }`}
                          />
                          {clientPhoneTouched && getClientPhoneError(clientPhone) && (
                            <p className="text-[11px] text-red-600 font-bold mt-1.5 flex items-start gap-1 p-2 bg-red-50/50 rounded-lg border border-red-150 animate-fade-in transition-all">
                              <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                              <span>{lang === 'ar' ? getClientPhoneError(clientPhone) : 'Phone must match SA format e.g., 05xxxxxxx'}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Select core service Category block */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-xs font-bold text-slate-700">
                            {lang === 'ar' ? 'باقة الخدمة الإلكترونية المطلوبة:' : 'Requested service package:'}
                          </label>
                          {selectedServiceTouched && (
                            <span className={`text-[10px] font-bold ${getSelectedServiceError(selectedServiceId) ? 'text-red-500 animate-pulse' : 'text-emerald-600'}`}>
                              {getSelectedServiceError(selectedServiceId) 
                                ? (lang === 'ar' ? '✕ لم تختار باقة' : '✕ Choose a package') 
                                : (lang === 'ar' ? '✓ تم التحديد' : '✓ Selected')}
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <select 
                            value={selectedServiceId}
                            onBlur={() => setSelectedServiceTouched(true)}
                            onChange={(e) => {
                              setSelectedServiceId(e.target.value);
                              setSelectedServiceTouched(true);
                            }}
                            className={`w-full p-3 border rounded-lg bg-white focus:outline-none focus:ring-1 shadow-sm text-sm font-sans transition-all duration-150 ${
                              !selectedServiceTouched 
                                ? 'border-slate-300 focus:border-amber-500 focus:ring-amber-500/30'
                                : getSelectedServiceError(selectedServiceId)
                                  ? 'border-red-400 bg-red-50/10 focus:border-red-500 focus:ring-red-500/30 text-red-900'
                                  : 'border-emerald-500 bg-emerald-50/5 focus:border-emerald-600 focus:ring-emerald-600/30'
                            }`}
                          >
                            <option value="">{lang === 'ar' ? 'اختر الخدمة الإجرائية...' : 'Choose requested service...'}</option>
                            {services.map(s => (
                              <option key={s.id} value={s.id}>
                                {getTranslatedServiceName(s.name)} ({lang === 'ar' ? 'أتعاب:' : 'Fee:'} {s.officeFee} {lang === 'ar' ? 'ر.س' : 'SAR'} + {lang === 'ar' ? 'رسوم جهة:' : 'Gov Fee:'} {s.govFee} {lang === 'ar' ? 'ر.س' : 'SAR'})
                              </option>
                            ))}
                          </select>
                          {selectedServiceTouched && getSelectedServiceError(selectedServiceId) && (
                            <p className="text-[11px] text-red-600 font-bold mt-1.5 flex items-start gap-1 p-2 bg-red-50/50 rounded-lg border border-red-150 animate-fade-in transition-all">
                              <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                              <span>{lang === 'ar' ? getSelectedServiceError(selectedServiceId) : 'Please select at least one core service'}</span>
                            </p>
                          )}

                          {/* Dynamic Authorized Service-Specific Payment Methods Display */}
                          {(() => {
                            const actSvc = services.find(s => s.id === selectedServiceId);
                            if (!actSvc) return null;
                            return (
                              <div className="mt-2.5 p-3 bg-amber-500/5 rounded-xl border border-amber-200/50 space-y-1.5 animate-fade-in text-right">
                                <span className="text-[10px] text-amber-900 font-black block">{lang === 'ar' ? 'قنوات الدفع والسداد المتاحة لهذه المعاملة تلقائياً:' : 'Instant Payment Channels For This Service:'}</span>
                                <div className="flex flex-wrap gap-1.5 justify-start">
                                  {actSvc.paymentMethods && actSvc.paymentMethods.length > 0 ? (
                                    actSvc.paymentMethods.map(pmId => {
                                      const pm = AVAILABLE_PAYMENT_METHODS.find(p => p.id === pmId);
                                      if (!pm) return null;
                                      return (
                                        <span 
                                          key={pmId} 
                                          className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-800 flex items-center gap-1 shadow-3xs"
                                          title={pm.name}
                                        >
                                          <span>{pm.badge}</span>
                                        </span>
                                      );
                                    })
                                  ) : (
                                    <span className="text-[10px] text-slate-500 font-bold bg-slate-100 py-1 px-2.5 rounded">
                                      {lang === 'ar' ? 'التحويل البنكي المعتمد لحسابات المكتب المباشرة 🏦' : 'Default Official Direct Bank Transfer 🏦'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">{lang === 'ar' ? 'أي ملاحظات إضافية، مستندات، أو متطلبات خاصة:' : 'Additional notes, documents or special requests:'}</label>
                      <textarea 
                        value={clientNotes}
                        onChange={(e) => setClientNotes(e.target.value)}
                        placeholder={lang === 'ar' ? 'دون هنا تفاصيل الطلب الإضافية مثل أعداد الأفراد، الجهة المقصودة للتأشيرة، أي تعليمات خاصة بالإدارة الحكومية...' : 'Write additional request details such as number of individuals, specific government instructions, or visa notes...'}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 h-28 font-sans shadow-sm text-sm text-right"
                      ></textarea>
                    </div>

                    {/* Integrated PDF Document Upload */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                        <span>{lang === 'ar' ? 'إرفاق مستندات المعاملة بصيغة PDF (اختياري - كالهوية الوطنية، السجل، أو المتطلبات):' : 'Attach supporting documents in PDF format (Optional - ID, Iqama or Visas):'}</span>
                      </label>
                      <div className="relative border-2 border-dashed border-slate-200 hover:border-amber-500/80 rounded-lg p-5 bg-[#fafbfd] hover:bg-slate-50 transition duration-150 flex flex-col items-center justify-center cursor-pointer">
                        <input 
                          type="file" 
                          id="client-pdf-upload"
                          accept=".pdf"
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                        />
                        {!attachedFileName ? (
                          <div className="text-center space-y-1.5 select-none pointer-events-none">
                            <Upload className="w-8 h-8 text-slate-400 mx-auto" strokeWidth={1.5} />
                            <p className="text-xs text-slate-600 font-bold">اسحب ملف الـ PDF وأفلته هنا أو انقر للتحديد من جهازك</p>
                            <p className="text-[10px] text-slate-400">يقبل النظام ملفات بصيغة PDF فقط (بحد أقصى 4 ميجابايت)</p>
                          </div>
                        ) : (
                          <div className="w-full flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2.5 rounded text-xs select-none relative z-30">
                            <div className="flex items-center gap-2">
                              <FileText className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                              <div className="text-right">
                                <p className="font-bold text-slate-850 line-clamp-1">{attachedFileName}</p>
                                <p className="text-[10px] text-slate-500 font-mono">{attachedFileSize}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setAttachedFileName('');
                                setAttachedFileData('');
                                setAttachedFileSize('');
                                const rawInput = document.getElementById('client-pdf-upload') as HTMLInputElement;
                                if (rawInput) rawInput.value = '';
                              }}
                              className="text-slate-400 hover:text-red-600 hover:bg-white p-1.5 rounded border border-transparent hover:border-red-100 transition font-bold relative z-40"
                              title="إزالة المرفق"
                            >
                              ✕ إزالة الملف
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isBookingSubmitting}
                      className={`w-full border text-white transition py-3.5 rounded-lg text-sm font-bold shadow-md flex items-center justify-center gap-2 ${
                        isBookingSubmitting 
                          ? 'bg-slate-700 border-slate-700 cursor-not-allowed' 
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-950'
                      }`}
                    >
                      {isBookingSubmitting ? (
                        <>
                          <svg className="animate-spin -ml-1 h-4 w-4 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span className="animate-pulse">جاري فحص البيانات وترحيل المعاملة...</span>
                        </>
                      ) : (
                        <span>تأكيد الإرسال والترحيل لمكتب سما المملكة</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          </div>
        )}

        {/* ==================== TAB 2: CLIEN REQUEST STATUS INQUIRY ==================== */}
        {activeTab === 'track' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
                <Search className="w-5.5 h-5.5 text-amber-600" />
                <span>{lang === 'ar' ? 'الاستعلام التفاعلي عن حالة المعاملات والطلبات المالية' : 'Interactive Status Inquiry for Orders & Payments'}</span>
              </h2>
              <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">
                {lang === 'ar' 
                  ? 'يرجى إدخال رقم الجوال المسجل عند تقديم المعاملة لاستعراض حالة طلبك فورياً، والاطلاع على الفاتورة المبسطة وتنزيلها للعملاء الذين أكملوا سداد رسوم المعاملة الإدارية.'
                  : 'Please enter the registered mobile number to track request states immediately, and download invoices once the administrative fees are settled.'}
              </p>

              <form onSubmit={handleTrackPhoneNumberLookup} className="mt-5 max-w-lg">
                <div className="flex gap-2">
                  <input
                    type="tel"
                    id="search-phone-input"
                    value={searchPhone}
                    onChange={(e) => {
                      setSearchPhone(e.target.value);
                      setHasSearched(false);
                    }}
                    placeholder={lang === 'ar' ? 'مثال رقم الجوال: 0501234567' : 'e.g. Mobile number: 0501234567'}
                    className="flex-1 p-3 border-2 border-slate-300 rounded focus:outline-none focus:border-slate-800 font-mono text-sm"
                  />
                  <button
                    type="submit"
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-3 rounded text-sm whitespace-nowrap transition-colors flex items-center gap-2"
                  >
                    <Search className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'تتبع الآن' : 'Track Now'}</span>
                  </button>
                </div>
              </form>
            </div>

            {hasSearched ? (
              trackedRequests.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-slate-700 font-bold text-sm">
                    {lang === 'ar' 
                      ? `وجدنا عدد (${trackedRequests.length}) معامِلات مسجلة لطلبك المالي:` 
                      : `We found (${trackedRequests.length}) transaction(s) registered for your number:`}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {trackedRequests.map(b => {
                      // Lookup corresponding transaction
                      // If the request has matched name & service, let's link
                      const correspondingTx = transactions.find(
                        t => t.clientName.trim() === b.clientName.trim() && t.serviceName.trim() === b.serviceName.trim()
                      );

                      return (
                        <div key={b.id} className="bg-white border-r-4 border-l border-t border-b border-slate-200 rounded-lg p-5 shadow-sm relative flex flex-col justify-between"
                          style={{
                            borderRightColor: 
                              b.status === 'completed' ? '#10b981' : 
                              b.status === 'processing' ? '#3b82f6' : 
                              b.status === 'cancelled' ? '#ef4444' : '#f59e0b'
                          }}
                        >
                          <div>
                            <div className="flex justify-between items-center mb-3">
                              <span className="font-mono text-xs text-slate-500 font-bold">
                                {lang === 'ar' ? `معاملة ID: #${b.id.substring(3, 9)}` : `Tx ID: #${b.id.substring(3, 9)}`}
                              </span>
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                b.status === 'completed' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                                b.status === 'processing' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                                b.status === 'cancelled' ? 'bg-red-50 text-red-800 border border-red-200' :
                                'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}>
                                {b.status === 'pending' && (lang === 'ar' ? 'قيد الانتظار لمراجعة الإدارة' : 'Pending Administrative Review')}
                                {b.status === 'processing' && (lang === 'ar' ? 'تحت المعالجة الإجرائية الآن' : 'Under Active Processing Now')}
                                {b.status === 'completed' && (lang === 'ar' ? 'مكتملة ومستند الفاتورة جاهز' : 'Completed & Invoice Ready')}
                                {b.status === 'cancelled' && (lang === 'ar' ? 'ملغية' : 'Cancelled')}
                              </span>
                            </div>

                            <h4 className="text-base font-black text-slate-900 mb-1">{getTranslatedServiceName(b.serviceName)}</h4>
                            <p className="text-slate-500 text-xs mb-3 font-mono">
                              {lang === 'ar' ? 'تاريخ تقديم الطلب المالي:' : 'Submission Date:'} {new Date(b.date).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                            </p>
                            
                            {/* Global Payment Status Panel */}
                            {(() => {
                              const currentSrv = services.find(s => s.id === b.serviceId || s.name.trim() === b.serviceName.trim());
                              const totalSrvAmount = currentSrv ? (currentSrv.govFee + currentSrv.officeFee * 1.15) : 345.00;

                              if (b.isPaid) {
                                return (
                                  <div className="bg-emerald-500/5 border border-emerald-200 p-3 rounded-lg text-emerald-950 text-xs mb-4 font-sans space-y-1">
                                    <div className="flex items-center gap-1.5 font-bold">
                                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                                      <span>{lang === 'ar' ? 'حالة الرسوم: تم سداد وإيداع التكلفة أونلاين المباشرة' : 'Fees Status: Paid online directly'}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-600 font-sans">
                                      {lang === 'ar' ? 'بلد السداد:' : 'Payment Location:'} <strong className="text-slate-900">{b.paymentCountry || (lang === 'ar' ? "سداد دولي موثق" : "Verified Int'l Payment")}</strong> • 
                                      {lang === 'ar' ? 'المرجع البنكي:' : 'Reference ID:'} <span className="font-mono text-slate-850">{b.paymentRef}</span> • 
                                      {lang === 'ar' ? 'البوابة المعتمدة:' : 'Approved Gateway:'} <strong className="text-slate-900">{b.paymentMethod || (lang === 'ar' ? "بطاقة ائتمانية" : "Credit Card")}</strong>
                                    </p>
                                  </div>
                                );
                              }

                              return (
                                <div className="bg-amber-500/5 border border-amber-250 p-3.5 rounded-xl text-slate-850 text-xs mb-4 font-sans space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-slate-500 flex items-center gap-1 font-bold">
                                      <Coins className="w-3.5 h-3.5 text-amber-600" />
                                      <span>{lang === 'ar' ? 'الرسوم المستحقة:' : 'Due Fees:'}</span>
                                    </span>
                                    <strong className="text-slate-950 font-mono font-black">{totalSrvAmount.toFixed(2)} {lang === 'ar' ? 'ر.س' : 'SAR'}</strong>
                                  </div>
                                  <p className="text-[10px] text-slate-500 leading-normal font-medium">
                                    {lang === 'ar' 
                                      ? 'يرجى تسوية رسوم المعاملة الإدارية والضريبية لتسهيل إجراءات الرفع المباشر مع سما المملكة.' 
                                      : 'Please settle administrative and tax fees to facilitate direct clearance procedures with Sama Al-Mamlaka.'}
                                  </p>
                                  
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPaymentBookingTarget(b);
                                      setIsPaymentOpen(true);
                                    }}
                                    className="w-full bg-slate-950 text-amber-500 hover:text-amber-400 hover:bg-slate-850 border border-slate-900 transition py-2 text-[10.5px] rounded-lg font-black shadow-3xs hover:shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                                  >
                                    <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                                    <span>{lang === 'ar' ? 'سداد الرسوم المباشر أونلاين (قنوات مادا، فيزا، فوري، PayPal)' : 'Pay Due Fees Online (Mada, Visa, PayPal)'}</span>
                                  </button>
                                </div>
                              );
                            })()}

                            {b.attachedFileName && (
                              <div className="text-xs bg-emerald-50/40 p-2 rounded border border-emerald-200 text-slate-700 flex items-center justify-between mb-4 gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Paperclip className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                  <span className="truncate font-bold text-slate-850 text-right" title={b.attachedFileName}>
                                    {lang === 'ar' ? 'المستند:' : 'Attachment:'} {b.attachedFileName}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-mono">({b.attachedFileSize})</span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  {b.attachedFileData && (
                                    <a
                                      href={b.attachedFileData}
                                      download={b.attachedFileName}
                                      className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-950 bg-amber-500 hover:bg-amber-600 border border-amber-600 px-2 py-1 rounded shadow-3xs hover:shadow-2xs transition-all cursor-pointer"
                                      title={lang === 'ar' ? 'تنزيل المستند مباشرة' : 'Download document directly'}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Download className="w-3 h-3" />
                                      <span>{lang === 'ar' ? 'تنزيل' : 'Download'}</span>
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedViewBooking(b)}
                                    className="text-[9px] bg-emerald-100 text-emerald-800 hover:bg-emerald-200 px-2 py-1 rounded font-bold whitespace-nowrap transition-colors"
                                    title={lang === 'ar' ? 'استعراض المستند' : 'Preview Document'}
                                  >
                                    {lang === 'ar' ? 'معاينة' : 'Preview'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                            <span className="text-xs text-slate-500 font-sans">{lang === 'ar' ? 'اسم المستفيد:' : 'Beneficiary:'} <strong className="text-slate-800">{b.clientName}</strong></span>
                            {b.status === 'completed' && correspondingTx ? (
                              <button
                                onClick={() => {
                                  setSelectedTx(correspondingTx);
                                  setIsInvoiceOpen(true);
                                }}
                                className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold text-xs px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors"
                              >
                                <Receipt className="w-3.5 h-3.5 text-amber-600" />
                                <span>{lang === 'ar' ? 'استعراض وطباعة الفاتورة' : 'View & Print Invoice'}</span>
                              </button>
                            ) : b.status === 'completed' ? (
                              <div className="text-[11px] text-slate-400 font-sans italic">{lang === 'ar' ? 'يرجى من الإدارة ربط المعاملة بالدفتر المالي لتظهر الفاتورة' : 'Invoice generation pending administrative linkage'}</div>
                            ) : (
                              <span className="text-xs text-slate-400 italic font-sans flex items-center gap-1">
                                <Activity className="w-3.5 h-3.5 animate-pulse text-amber-600" />
                                <span>{lang === 'ar' ? 'ستظهر الفاتورة فور الإنجاز والترحيل المالي' : 'Invoice will appear upon completion & release'}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-8 bg-red-50 text-red-800 border-2 border-dashed border-red-200 rounded-lg text-center font-bold">
                  {lang === 'ar' 
                    ? '⚠️ عذراً، لا توجد معاملات مسجلة برقم الجوال المعبأ للمستعلم. يرجى مراجعة الإدارة من خلال قنوات الواتساب لربط رقمك بنظام تتبع الشحنات الإدارية.' 
                    : '⚠️ Sorry, there are no registered transactions with this mobile number. Please contact our support team to link your number.'}
                </div>
              )
            ) : null}
          </div>
        )}

        {/* ==================== TAB 2.5: JOB VACANCIES SECTION ==================== */}
        {activeTab === 'jobs' && (
          <div className="space-y-8 animate-fade-in" dir="rtl">
            {/* Header Area */}
            <div className="bg-slate-900 text-white rounded-2xl overflow-hidden shadow-2xl relative border border-slate-800 p-6 sm:p-8"
              style={{ backgroundImage: `linear-gradient(to left, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.8)), url("https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80")`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
              <div className="max-w-2xl text-right">
                <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider mb-3 inline-block">بوابة التوظيف المفتوحة</span>
                <h1 className="text-2xl sm:text-3.5xl font-black text-white tracking-tight leading-tight">انضم إلى فريق عمل مكتب سما المملكة</h1>
                <p className="text-slate-300 text-xs sm:text-sm mt-3 leading-relaxed">
                  نبحث دوماً عن الكفاءات الوطنية المتميزة وأصحاب الخبرة في مجالات المبيعات، تخليص المعاملات الإلكترونية والتعقيب الحكومي، لدعم عملائنا وشركائنا بجميع أنحاء المملكة.
                </p>
              </div>
            </div>

            {/* Main Application Interface */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Right/Main Section: Job Listings Grid - 8 cols */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Search & Filter Header */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-950">إعلانات الفرص الشاغرة الحالية</h2>
                    <p className="text-[11px] text-slate-500">تم تحديث الشواغر قبل قليل حسب احتياج الإدارة ونظام بث البوابة</p>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200 text-xs font-bold gap-1">
                    <button
                      type="button"
                      onClick={() => setJobFilterType('all')}
                      className={`px-3 py-1.5 rounded-md transition-all ${jobFilterType === 'all' ? 'bg-amber-600 text-slate-950 font-extrabold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      الكل ({jobVacancies.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setJobFilterType('دوام كامل')}
                      className={`px-3 py-1.5 rounded-md transition-all ${jobFilterType === 'دوام كامل' ? 'bg-amber-600 text-slate-950 font-extrabold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      دوام كامل
                    </button>
                    <button
                      type="button"
                      onClick={() => setJobFilterType('دوام جزئي')}
                      className={`px-3 py-1.5 rounded-md transition-all ${jobFilterType === 'دوام جزئي' ? 'bg-amber-600 text-slate-950 font-extrabold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      دوام جزئي
                    </button>
                    <button
                      type="button"
                      onClick={() => setJobFilterType('عن بعد')}
                      className={`px-3 py-1.5 rounded-md transition-all ${jobFilterType === 'عن بعد' ? 'bg-amber-600 text-slate-950 font-extrabold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      عن بعد
                    </button>
                  </div>
                </div>

                {/* Job Cards */}
                {jobVacancies.filter(j => jobFilterType === 'all' || j.type === jobFilterType).length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm">
                    <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-slate-800">لا توجد شواغر معلنة حالياً تطابق هذا التصنيف</h3>
                    <p className="text-[11px] text-slate-500 mt-1">تواصل مع إدارة شؤون الموظفين للاستفسار عن الفرص غير المدرجة.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {jobVacancies
                      .filter(j => jobFilterType === 'all' || j.type === jobFilterType)
                      .map((job) => {
                        const isSelected = selectedJobForApply?.id === job.id;
                        return (
                          <div 
                            key={job.id} 
                            className={`bg-white rounded-xl border p-5 transition-all shadow-sm flex flex-col justify-between gap-4 hover:border-amber-500/50 ${
                              isSelected ? 'ring-2 ring-amber-500 border-amber-500' : 'border-slate-200'
                            }`}
                          >
                            <div className="space-y-3">
                              {/* Card Header title info */}
                              <div className="flex flex-wrap justify-between items-start gap-2">
                                <div className="space-y-1">
                                  <strong className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">{job.title}</strong>
                                  <span className="text-[10px] text-slate-500 font-bold block">{job.department}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-1 rounded">
                                    📍 {job.location}
                                  </span>
                                  <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-1 rounded">
                                    ⏱️ {job.type}
                                  </span>
                                </div>
                              </div>

                              {/* Description */}
                              <p className="text-xs text-slate-600 leading-relaxed font-sans">{job.description}</p>

                              {/* Requirements bullets list */}
                              <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-100 text-xs">
                                <span className="font-bold text-slate-800 block mb-2">الشروط والمتطلبات الأساسية للوظيفة:</span>
                                <ul className="space-y-1.5 list-disc list-inside text-slate-600 text-[11px] pr-2.5 leading-relaxed">
                                  {job.requirements.map((req, rid) => (
                                    <li key={rid} className="list-item">{req}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            {/* Card Footer actions */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-t border-slate-100 pt-3.5">
                              <div className="flex items-center gap-1 text-slate-500 font-sans text-xs">
                                <span>الراتب المتوقع:</span>
                                <strong className="text-slate-900 font-bold font-mono">{job.salary}</strong>
                              </div>
                              
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedJobForApply(job);
                                  setApplyFeedback(null);
                                  // Scroll apply form into view on mobile
                                  const formElement = document.getElementById('applicant-submission-card');
                                  if (formElement) {
                                    formElement.scrollIntoView({ behavior: 'smooth' });
                                  }
                                }}
                                className={`text-xs px-5 py-2 rounded-lg font-black transition ${
                                  isSelected 
                                    ? 'bg-amber-500 text-slate-950 shadow-sm' 
                                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                                }`}
                              >
                                {isSelected ? '✓ معروض بنموذج التقديم اليساري' : 'التقدم لهذه الوظيفة الآن ←'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Left Section: Live Application Form - 4 cols */}
              <div id="applicant-submission-card" className="lg:col-span-4 space-y-6">
                
                {/* Official WhatsApp Jobs Channel Callout Card */}
                {socialWhatsappChannel && (
                  <div className="bg-emerald-950/40 text-emerald-100 rounded-2xl border-2 border-emerald-500/30 p-5 shadow-xl space-y-3 relative overflow-hidden transition-all hover:bg-emerald-950/50">
                    <div className="absolute top-0 left-0 bg-emerald-500 text-slate-950 font-black text-[9px] px-2.5 py-1 rounded-br-xl uppercase tracking-wider">
                      بث فوري
                    </div>
                    <div className="flex items-center gap-2.5 pt-1">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center p-1.5 border border-emerald-500/20 text-emerald-400 relative">
                        <span className="absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75 animate-ping top-1 right-1"></span>
                        <MessageSquare className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white">قناة الوظائف الرسمية بالواتساب</h4>
                        <p className="text-[10px] text-emerald-400 font-bold">مكتب سما المملكة للتوظيف</p>
                      </div>
                    </div>
                    <p className="text-[11px] leading-relaxed text-emerald-200 text-right font-sans">
                      تابع قناة مكتب سما المملكه وظائف وتوفير وتوظيف الأيدي العاملة (لجميع مدن المملكه العربية السعودية) في واتساب لتلقي إشعارات الفرص الحصرية والتوظيف الذاتي أولاً بأول!
                    </p>
                    <a 
                      href={socialWhatsappChannel} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-2.5 rounded-xl text-xs shadow-md transition duration-150 flex items-center justify-center gap-2 cursor-pointer text-center"
                    >
                      <span>انضم لقناة الوظائف في واتساب 🚀</span>
                    </a>
                  </div>
                )}

                <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-5 shadow-lg space-y-4">
                  <div className="border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <Plus className="w-5 h-5 text-amber-500" />
                      <span>تقديم طلب توظيف فوري</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1">يُرجى اختيار وظيفة من القائمة اليمينية لتعبئة بيانات المترشح</p>
                  </div>

                  {selectedJobForApply ? (
                    <form onSubmit={handleJobApplySubmit} className="space-y-3.5 text-xs">
                      {/* Selected job summary info pill */}
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-amber-500/20 text-right">
                        <span className="text-[9px] text-amber-500 font-bold block mb-0.5">الوظيفة المحددة حالياً:</span>
                        <strong className="text-white text-xs block">{selectedJobForApply.title}</strong>
                        <span className="text-[9px] text-slate-400 font-mono block mt-1">{selectedJobForApply.department}</span>
                      </div>

                      {/* Full Name */}
                      <div className="space-y-1 text-right">
                        <label className="block text-slate-300 font-bold text-[10px]">الاسم الكامل للمترشح (الرباعي):</label>
                        <input
                          type="text"
                          required
                          value={applyApplicantName}
                          onChange={(e) => setApplyApplicantName(e.target.value)}
                          placeholder="مثال: صالح بن عبد العزيز السالم"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-[11px] text-white focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
                        />
                      </div>

                      {/* Phone Number */}
                      <div className="space-y-1 text-right">
                        <label className="block text-slate-300 font-bold text-[10px]">رقم هاتف التواصل:</label>
                        <input
                          type="tel"
                          required
                          value={applyApplicantPhone}
                          onChange={(e) => setApplyApplicantPhone(e.target.value)}
                          placeholder="مثال: 0501234567"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-[11px] text-white font-mono focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
                        />
                      </div>

                      {/* Email address */}
                      <div className="space-y-1 text-right">
                        <label className="block text-slate-300 font-bold text-[10px]">البريد الإلكتروني:</label>
                        <input
                          type="email"
                          value={applyApplicantEmail}
                          onChange={(e) => setApplyApplicantEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-[11px] text-white font-mono focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
                        />
                      </div>

                      {/* Qualification */}
                      <div className="space-y-1 text-right">
                        <label className="block text-slate-300 font-bold text-[10px]">مستوى التأهيل العلمي / الشهادة:</label>
                        <select
                          value={applyQualification}
                          onChange={(e) => setApplyQualification(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-[11px] text-white focus:outline-none focus:border-amber-500"
                        >
                          <option value="">-- اختر الشهادة العلمية --</option>
                          <option value="ثانوية عامة">ثانوية عامة أو ما يعادلها</option>
                          <option value="دبلوم فني">دبلوم متوسط أو دبلوم فني</option>
                          <option value="بكالوريوس">بكالوريوس / إجازة جامعية</option>
                          <option value="ماجستير أو دكتوراه">الدراسات العليا (ماجستير/دكتوراه)</option>
                          <option value="أخرى / خبرة مهنية">أخرى / خبرة مهنية متكافئة</option>
                        </select>
                      </div>

                      {/* Experience Years */}
                      <div className="space-y-1 text-right">
                        <div className="flex justify-between items-center">
                          <label className="block text-slate-300 font-bold text-[10px]">عدد سنوات الخبرة المتعلقة بمجال الوظيفة:</label>
                          <span className="font-mono text-amber-500 font-bold text-xs">{applyExperienceYears} {applyExperienceYears >= 3 ? 'سنوات' : 'سنة'}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="15"
                          step="1"
                          value={applyExperienceYears}
                          onChange={(e) => setApplyExperienceYears(Number(e.target.value))}
                          className="w-full accent-amber-500"
                        />
                      </div>

                      {/* Motivation cover note */}
                      <div className="space-y-1 text-right">
                        <label className="block text-slate-300 font-bold text-[10px]">رسالة تغطية أو مهارات تفضل إبرازها (اختياري):</label>
                        <textarea
                          rows={2}
                          value={applyNotes}
                          onChange={(e) => setApplyNotes(e.target.value)}
                          placeholder="اكتب هنا ما يجعلك مؤهلاً لنيل هذه الوظيفة..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-[11px] text-white focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
                        />
                      </div>

                      {applyFeedback && (
                        <div className={`p-3 rounded-lg text-[11px] font-sans ${applyFeedback.success ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-400' : 'bg-red-950/80 border border-red-900/60 text-red-400'}`}>
                          {applyFeedback.msg}
                        </div>
                      )}

                      {/* Submit Application button */}
                      <button
                        type="submit"
                        disabled={isJobApplying}
                        className={`w-full text-slate-950 font-black py-3 rounded-lg text-xs tracking-wide transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          isJobApplying 
                            ? 'bg-amber-600/30 text-amber-500/55 cursor-not-allowed' 
                            : 'bg-amber-500 hover:bg-amber-400 shadow-md shadow-amber-500/10 active:scale-98'
                        }`}
                      >
                        {isJobApplying ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>جاري تسجيل وحفظ ملف المرشح...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5 text-slate-950" />
                            <span>إرسال طلب التوظيف للمكتب</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedJobForApply(null)}
                        className="w-full bg-slate-800/80 hover:bg-slate-755 text-slate-400 text-[10px] py-1.5 rounded-lg border border-slate-850"
                      >
                        إلغاء التقديم
                      </button>
                    </form>
                  ) : (
                    <div className="p-10 text-center text-slate-500 bg-slate-950/30 rounded-xl border border-slate-850/60 font-sans">
                      <Users className="w-8 h-8 text-slate-700 mx-auto mb-2.5" />
                      <p className="text-[11px] leading-relaxed">يرجى الاختيار والضغط على زر <strong className="text-slate-350">"التقدم لهذه الوظيفة الآن"</strong> بأحد البطاقات الشاغرة يميناً لبدء ملء وتدقيق استمارة التوظيف الفورية بملقماتنا.</p>
                    </div>
                  )}

                  {/* Anti Fraud Security Message */}
                  <p className="text-[9px] text-slate-500 leading-relaxed text-center font-sans tracking-wide">
                    🛡️ مكتب سما المملكة لا يطلب أي معلومات بنكية أو رسوم مادية مقابل فرصة التقديم للوظائف نهائياً.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: ADMIN & OPERATIONS CONTROL PANEL ==================== */}
        {activeTab === 'admin' && isAdminAuthenticated && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Admin Header Toolbar */}
            <div className="bg-white p-5 rounded-xl shadow-md border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-7 h-7 text-amber-600" />
                  <span>بوابة إدارة وعمليات مكتب سما المملكة المالية</span>
                </h2>
                <p className="text-slate-500 text-xs mt-1">نظام حسابي ورقابي عالي الكفاءة يدعم إحصاءات المعاملات والفوترة وفق معايير ١٥% نسبة ضريبية مضافة.</p>
              </div>

              {/* Toolbar Actions */}
              <div className="flex gap-2.5 flex-wrap">
                <button
                  onClick={() => setAdminTab('stats')}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${adminTab === 'stats' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  التقارير والإخصاءات المالية
                </button>
                <button
                  onClick={() => setAdminTab('requests')}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${adminTab === 'requests' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  الطلبات الواردة من الموقع ({bookings.filter(b => b.status === 'pending').length})
                </button>
                <button
                  onClick={() => setAdminTab('ledger')}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${adminTab === 'ledger' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  المحاسبة والقيود المالية للدولة والمكتب
                </button>
                <button
                  onClick={() => setAdminTab('services')}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${adminTab === 'services' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  إدارة دليل الخدمات وأسعار العمليات
                </button>
                <button
                  onClick={() => setAdminTab('whatsapp')}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all whitespace-nowrap bg-emerald-950/20 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-900/40 ${
                    adminTab === 'whatsapp' ? 'bg-emerald-600 text-slate-950 border-emerald-500' : ''
                  }`}
                >
                  💬 إشعارات واتساب الفورية {whatsappLogs.length > 0 && `(${whatsappLogs.length})`}
                </button>
                <button
                  onClick={() => setAdminTab('jobs')}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all whitespace-nowrap bg-amber-950/20 text-amber-405 border border-amber-550/20 hover:bg-amber-900/40 ${
                    adminTab === 'jobs' ? 'bg-amber-600 text-slate-950 border-amber-500 font-extrabold shadow' : ''
                  }`}
                >
                  💼 إدارة التوظيف والوظائف ({jobVacancies.length})
                </button>
              </div>
            </div>

            {/* --- ADMIN INTERNAL VIEW 1: STATS & SUMMARY --- */}
            {adminTab === 'stats' && (
              <div className="space-y-8">
                {/* Stats grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                  
                  {/* Total Revenues */}
                  <div className="bg-white p-5 rounded-xl shadow border-r-8 border-slate-900 border-t border-b border-l border-slate-200 flex flex-col justify-between">
                    <div>
                      <span className="text-slate-500 text-xs font-bold block">إجمالي أتعاب المكتب الصافية</span>
                      <strong className="text-2xl font-black text-slate-900 mt-1.5 block font-mono">{totalOfficeRevenues.toFixed(2)} ر.س</strong>
                    </div>
                    <span className="text-[10px] text-slate-400 font-sans block mt-3">من استخلاص وبنود الخدمات فقط</span>
                  </div>

                  {/* Total Taxes */}
                  <div className="bg-white p-5 rounded-xl shadow border-r-8 border-amber-600 border-t border-b border-l border-slate-200 flex flex-col justify-between">
                    <div>
                      <span className="text-slate-500 text-xs font-bold block">مجموع ضريبة القيمة المضافة (15%)</span>
                      <strong className="text-2xl font-black text-slate-900 mt-1.5 block font-mono">{totalVATCollected.toFixed(2)} ر.س</strong>
                    </div>
                    <span className="text-[10px] text-slate-400 font-sans block mt-3">مستحقات الخزينة - هيئة الزكاة والجمارك</span>
                  </div>

                  {/* Gov payments */}
                  <div className="bg-white p-5 rounded-xl shadow border-r-8 border-blue-900 border-t border-b border-l border-slate-200 flex flex-col justify-between">
                    <div>
                      <span className="text-slate-500 text-xs font-bold block flex items-center gap-1">
                        <span>أمانات الرسوم الحكومية للدولة</span>
                      </span>
                      <strong className="text-2xl font-black text-slate-900 mt-1.5 block font-mono">{totalGovSpent.toFixed(2)} ر.س</strong>
                    </div>
                    <span className="text-[10px] text-slate-400 font-sans block mt-3">معفاة من الضريبة (مستحقات جهات الإصدار للوزارات)</span>
                  </div>

                  {/* Combined throughput */}
                  <div className="bg-amber-50 p-5 rounded-xl shadow border border-amber-200 flex flex-col justify-between">
                    <div>
                      <span className="text-amber-800 text-xs font-black block">إجمالي الحركة المالية الكلية</span>
                      <strong className="text-2xl font-black text-amber-950 mt-1.5 block font-mono">{totalOverallAccountingVolume.toFixed(2)} ر.س</strong>
                    </div>
                    <span className="text-[10px] text-slate-500 font-sans block mt-3">شاملة الرسوم والضرائب التامة</span>
                  </div>

                  {/* CSAT Customer Quality Rating Card */}
                  <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 p-5 rounded-xl shadow border-r-8 border-amber-500 border-t border-b border-l border-amber-200 flex flex-col justify-between">
                    <div>
                      <span className="text-amber-900 text-xs font-black block flex items-center gap-1.5">
                        <span>⭐ رضا العملاء عن الخدمة (CSAT)</span>
                      </span>
                      <div className="flex items-baseline gap-1 mt-1.5">
                        <strong className="text-2xl font-black text-slate-900 font-mono">{averageServiceRating}</strong>
                        <span className="text-xs text-slate-500 font-bold">/ 5.0</span>
                      </div>
                      
                      {/* Mini dynamic stars */}
                      <div className="flex items-center text-amber-500 gap-0.5 mt-1">
                        {Array.from({ length: 5 }).map((_, idx) => {
                          const avgNumeric = parseFloat(averageServiceRating);
                          return (
                            <span key={idx} className="text-sm select-none leading-none">
                              {idx < Math.round(avgNumeric) ? '★' : '☆'}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <span className="text-[10.5px] text-amber-950 font-extrabold block mt-3 leading-tight">
                      إجمالي المقيِّمين: <span className="font-mono text-xs">{totalReviewsCount}</span> طلب عملي مكتمل
                    </span>
                  </div>
                </div>

                {/* Sub row: Count charts & quick lookup lists */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Status Counts */}
                  <div className="bg-white p-5 rounded-xl shadow border border-slate-200 col-span-1">
                    <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-slate-600" />
                      <span>إحصائيات حالات المعاملات المرفوعة</span>
                    </h3>

                    <div className="space-y-3 font-sans text-xs">
                      <div className="flex justify-between items-center p-2.5 bg-yellow-50 text-yellow-800 rounded border border-yellow-100">
                        <span className="font-bold">قيد الانتظار لمراجعة الإدارة:</span>
                        <strong className="text-sm font-mono">{bookings.filter(b => b.status === 'pending').length}</strong>
                      </div>
                      <div className="flex justify-between items-center p-2.5 bg-blue-50 text-blue-800 rounded border border-blue-100">
                        <span className="font-bold">تحت المعالجة الإجرائية والتعقيب:</span>
                        <strong className="text-sm font-mono">{bookings.filter(b => b.status === 'processing').length}</strong>
                      </div>
                      <div className="flex justify-between items-center p-2.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-100">
                        <span className="font-bold">المكتملة بنجاح:</span>
                        <strong className="text-sm font-mono">{bookings.filter(b => b.status === 'completed').length}</strong>
                      </div>
                      <div className="flex justify-between items-center p-2.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                        <span>إجمالي الطلبات الكلي:</span>
                        <strong className="text-sm font-mono">{bookings.length}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Simple dynamic SVG visualizer of Service popularity in financial ledger */}
                  <div className="bg-white p-5 rounded-xl shadow border border-slate-200 lg:col-span-2">
                    <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 mb-4">
                      مقارنة الحصص الإيرادية للخدمات بالدفتر الحسابي
                    </h3>
                    
                    {transactions.length === 0 ? (
                      <p className="text-slate-400 text-xs italic text-center py-10">لا تتوفر معاملات منجزة حتى الآن لرسم المخططات الإحصائية.</p>
                    ) : (
                      <div className="space-y-4">
                        {services.map(s => {
                          const associatedTxs = transactions.filter(t => t.serviceName === s.name);
                          const revenueForThis = associatedTxs.reduce((sum, t) => sum + t.officeFee, 0);
                          const percentageOfTotal = totalOfficeRevenues > 0 ? (revenueForThis / totalOfficeRevenues) * 100 : 0;

                          return (
                            <div key={s.id} className="text-xs space-y-1">
                              <div className="flex justify-between text-slate-600">
                                <span className="font-bold">{s.name} ({associatedTxs.length} فواتير)</span>
                                <span className="font-mono text-slate-900 font-semibold">{revenueForThis.toFixed(2)} ر.س ({percentageOfTotal.toFixed(0)}%)</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div 
                                  className="bg-amber-500 h-full rounded-full transition-all" 
                                  style={{ width: `${Math.max(percentageOfTotal, 2)}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Service Performance Metrics and Booking Link Analytics Dashboard */}
                <div className="bg-white p-6 rounded-xl shadow border border-slate-200 space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-amber-650" />
                      <span>تقارير كفاءة وأداء دليـل الخدمات بالمكتب (تحليل طلبات العملاء المربوطة)</span>
                    </h3>
                    <p className="text-slate-500 text-[11px] mt-1 font-sans">
                      مؤشرات حية تقيس تجاوب وتفاعل الجمهور مع خدمات سما المملكة، وحجم المبيعات والربحية المتوقعة لكل باقة بشكل عملياتي.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-right text-xs">
                      <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-500 font-extrabold">
                        <tr>
                          <th className="p-3 text-right">اسم وباقة الخدمة</th>
                          <th className="p-3 text-right">النوع فئوياً</th>
                          <th className="p-3 text-center">مجموع الطلبات الكلي</th>
                          <th className="p-3 text-center">توزيع حالات المعاملات (انتظار / معالجة / مكتملة)</th>
                          <th className="p-3 text-center">معدل الإغلاق والجاهزية</th>
                          <th className="p-3 text-left">أتعاب المكتب المتوقعة بالطابور</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {services.map(s => {
                          const linkedRequests = bookings.filter(b => b.serviceId === s.id);
                          const totalCount = linkedRequests.length;
                          
                          const pendingCount = linkedRequests.filter(b => b.status === 'pending').length;
                          const processingCount = linkedRequests.filter(b => b.status === 'processing').length;
                          const completedCount = linkedRequests.filter(b => b.status === 'completed').length;
                          const cancelledCount = linkedRequests.filter(b => b.status === 'cancelled').length;
                          const activeCount = totalCount - cancelledCount;
                          
                          // Potential revenues calculated for non-cancelled linked bookings
                          const potentialRevenue = activeCount * s.officeFee;
                          const successRate = totalCount > 0 ? ((completedCount / (activeCount || 1)) * 100) : 0;

                          return (
                            <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-3">
                                <strong className="text-slate-900 block font-sans">{s.name}</strong>
                                <span className="text-[10px] text-slate-400 font-mono">الرمز: {s.id}</span>
                              </td>
                              <td className="p-3">
                                <span className="inline-block text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold font-sans">
                                  {s.category === 'visa' && '🛂 خدمات تأشيرات وسفر'}
                                  {s.category === 'gov' && '🏛️ تعقيب ومراجعة دائرية'}
                                  {s.category === 'transport' && '🚚 نقل ومواصلات'}
                                  {s.category === 'other' && '⚙️ خدمات عامة مخصصة'}
                                </span>
                              </td>
                              <td className="p-3 text-center font-mono font-bold text-slate-800">
                                {totalCount} طلبات
                              </td>
                              <td className="p-3">
                                <div className="flex items-center justify-center gap-1.5 text-[10px]">
                                  <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-mono font-bold" title="قيد الانتظار لمراجعة الإدارة">
                                    {pendingCount} قيد الانتظار
                                  </span>
                                  <span className="bg-blue-105 text-blue-800 px-2 py-0.5 rounded-md font-mono font-bold" title="تحت المعالجة الإجرائية والتعقيب">
                                    {processingCount} تحت التنفيذ
                                  </span>
                                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-mono font-bold animate-pulse" title="مكتملة ومصدقة بنجاح">
                                    {completedCount} مكتملة ✓
                                  </span>
                                  {cancelledCount > 0 && (
                                    <span className="bg-red-50 text-red-650 px-2 py-0.5 rounded-md font-mono font-semibold" title="قائمة الطلبات الملغاة">
                                      {cancelledCount} ملغي ✕
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                                    <div 
                                      className="bg-emerald-500 h-full rounded-full transition-all" 
                                      style={{ width: `${Math.min(successRate, 100)}%` }}
                                    ></div>
                                  </div>
                                  <span className="font-mono text-xs font-bold text-emerald-700">
                                    {Math.min(successRate, 100).toFixed(0)}%
                                  </span>
                                </div>
                              </td>
                              <td className="p-3 text-left font-mono font-black text-amber-900 text-xs">
                                {potentialRevenue.toFixed(2)} ر.س
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Developer audit info block */}
                <div className="p-4 bg-slate-150 border border-slate-200 rounded-lg text-slate-600 text-xs space-y-1">
                  <span className="font-bold block text-slate-800">سجل النشاط العام للبوابة:</span>
                  <p>• النظام يعمل بالكامل على الذاكرة التزامنية المستندة إلى المتصفح المحلي (Local & Session Storage) لسرية معلومات العهدة.</p>
                  <p>• يرجى إسناد وتعديل الحصص المالية للجهات المعفاة من الضرائب بشكل موثق من قسم إدارة تعرفة الخدمات.</p>
                </div>
              </div>
            )}

            {/* --- ADMIN INTERNAL VIEW 2: CLIENT BOOKINGS MANAGER --- */}
            {adminTab === 'requests' && (() => {
              const activeBookings = bookings.filter(b => !b.isArchived);
              const archivedBookings = bookings.filter(b => !!b.isArchived);
              const displayedBookings = bookings.filter(b => {
                if (requestsFilter === 'archived') {
                  return !!b.isArchived;
                }
                return !b.isArchived;
              });

              return (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Auto-Archiving System Status Notification banner */}
                  {showArchivedNotice && lastArchivedCount > 0 && (
                    <div className="bg-gradient-to-r from-amber-600/10 to-emerald-600/10 border-2 border-amber-500/30 rounded-xl p-4 text-slate-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-bounce-slow">
                      <div className="space-y-1 text-right">
                        <h4 className="font-extrabold text-slate-950 text-xs flex items-center gap-1.5 text-amber-955">
                          <Archive className="w-5 h-5 text-amber-600 animate-pulse" />
                          <span>تفعيل ترحيل الأرشفة التلقائية الذكية (+30 يوم)</span>
                        </h4>
                        <p className="text-[11px] text-slate-600 font-sans">
                          نظمت البوابة قاعدة البيانات بنجاح وأرّشفت <strong className="text-emerald-700 font-black">{lastArchivedCount} معاملات مكتملة/ملغية</strong> مضى عليها أكثر من ٣٠ يوماً لتعزيز كفاءة التصفح وحفظ سرعة استجابة السجلات.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mr-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setRequestsFilter('archived');
                            setShowArchivedNotice(false);
                          }}
                          className="bg-slate-950 hover:bg-slate-800 text-white font-bold text-[10px] px-3.5 py-1.5 rounded-lg shadow-sm cursor-pointer transition-all"
                        >
                          استعراض الأرشيف الآن
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowArchivedNotice(false)}
                          className="text-slate-400 hover:text-slate-700 font-bold text-xs p-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-950">إدارة طلبات المعاملات والتعقيب المرفوعة</h3>
                      <p className="text-slate-500 text-xs mt-1">طلبات العملاء تأتي من الموقع الخارجي؛ يمكنك مراجعتها، تحديث حالاتها، أو ترحيلها مباشرة كمستند فاتورة مالي.</p>
                    </div>
                    
                    {/* Compact manual trigger button */}
                    <button
                      type="button"
                      onClick={() => runAutoArchiving(true)}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold text-[11px] px-3 py-1.5 rounded-lg shadow-3xs hover:shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      title="فحص يدوي فوري لتجميع الطلبات القديمة المكتملة منذ 30 يوماً فما فوق ونقلها للأرشيف"
                    >
                      <Zap className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                      <span>تشغيل الأرشفة التلقائية يدوياً ⚙️</span>
                    </button>
                  </div>

                  {/* Clean Filter Tab Bar Controls */}
                  <div className="bg-slate-100 p-1.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      
                      {/* Active requests tab selector */}
                      <button
                        type="button"
                        onClick={() => setRequestsFilter('active')}
                        className={`px-4 py-2 rounded-lg font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                          requestsFilter === 'active' 
                            ? 'bg-white text-slate-950 shadow-xs ring-1 ring-slate-200' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Inbox className="w-4 h-4 text-slate-500" />
                        <span>الطلبات النشطة (الحديثة)</span>
                        <span className={`px-1.5 py-0.5 rounded-md font-mono text-[10px] ${requestsFilter === 'active' ? 'bg-amber-600 text-slate-950' : 'bg-slate-200 text-slate-600'}`}>
                          {activeBookings.length}
                        </span>
                      </button>

                      {/* Archived requests tab selector */}
                      <button
                        type="button"
                        onClick={() => setRequestsFilter('archived')}
                        className={`px-4 py-2 rounded-lg font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                          requestsFilter === 'archived' 
                            ? 'bg-white text-slate-950 shadow-xs ring-1 ring-slate-200' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Archive className="w-4 h-4 text-emerald-600" />
                        <span>أرشيف المعاملات المؤرشفة (+30 يوم)</span>
                        <span className={`px-1.5 py-0.5 rounded-md font-mono text-[10px] ${requestsFilter === 'archived' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                          {archivedBookings.length}
                        </span>
                      </button>

                    </div>

                    <span className="text-[10.5px] text-slate-500 font-semibold font-sans">
                      * يتم فرز الترحيل للأرشيف تلقائياً كلما مضى أكثر من ٣٠ يوماً على اكتمال المعاملة.
                    </span>
                  </div>

                  {displayedBookings.length === 0 ? (
                    <div className="text-center py-12 bg-white border border-slate-200 rounded-xl max-w-xl mx-auto space-y-3 shadow-3xs p-6 my-4">
                      {requestsFilter === 'active' ? (
                        <>
                          <div className="text-3xl">📥</div>
                          <p className="text-slate-800 font-bold text-xs">سجل المعاملات النشطة ممتاز وخالٍ بالكامل!</p>
                          <p className="text-slate-500 text-[11px] font-sans">جميع الطلبات الجديدة تمت معالجتها بسلاسة أو جرى أرشفتها تلقائياً بمرور الوقت.</p>
                        </>
                      ) : (
                        <>
                          <div className="text-3xl">🗄️</div>
                          <p className="text-slate-800 font-bold text-xs">الأرشيف الوقائي فارغ ومكتفٍ حالياً.</p>
                          <p className="text-slate-500 text-[11px] font-sans">لا توجد سجلات معاملات قديمة مضى عليها أكثر من ٣٠ يوماً كافية للمطابقة والترحيل.</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[750px] text-right text-xs">
                          <thead className="bg-[#f8fafc] border-b border-slate-200 text-slate-700 font-bold">
                            <tr>
                              <th className="p-4">العميل المستفيد وجواله</th>
                              <th className="p-4">الخدمة المطلوبة</th>
                              <th className="p-4">تاريخ المرفق</th>
                              <th className="p-4 text-center">الوضعية الحالية للطلب</th>
                              <th className="p-4 text-left">العمليات الإدارية الفورية</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150">
                            {displayedBookings.map(b => (
                              <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4">
                                  <strong className="text-slate-900 block text-sm font-sans">{b.clientName}</strong>
                                  <span className="text-slate-500 font-mono tracking-wide">{b.phoneNumber}</span>
                                  
                                  {/* Client Feedback Rating View */}
                                  {b.rating && (
                                    <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-slate-900 w-full sm:max-w-sm space-y-1">
                                      <div className="flex items-center gap-1 font-sans font-extrabold text-[11px] text-amber-900 leading-none">
                                        <span>⭐ تقييم جودة الخدمة:</span>
                                        <div className="flex items-center text-xs text-amber-500 mr-1">
                                          {Array.from({ length: 5 }).map((_, idx) => (
                                            <span key={idx} className="leading-none">
                                              {idx < (b.rating || 0) ? '★' : '☆'}
                                            </span>
                                          ))}
                                        </div>
                                        <span className="text-[10px] font-mono font-black">({b.rating}/5)</span>
                                      </div>
                                      {b.ratingComment && (
                                        <p className="text-[10px] text-slate-700 italic leading-snug">
                                          "{b.ratingComment}"
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {b.notes && (
                                    <p className="text-[11px] text-slate-500 mt-1 max-w-sm font-sans line-clamp-2" title={b.notes}>
                                      <strong>ملاحظات:</strong> {b.notes}
                                    </p>
                                  )}
                                  {b.attachedFileName && (
                                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedViewBooking(b)}
                                        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded transition-colors"
                                        title="اضغط لاستعراض أو معاينة المستند المرفق بالطلب"
                                      >
                                        <Paperclip className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                        <span className="truncate max-w-[200px]">المرفق: {b.attachedFileName}</span>
                                        <span className="text-[9px] text-slate-400 font-mono">({b.attachedFileSize})</span>
                                      </button>
                                      {b.attachedFileData && (
                                        <a
                                          href={b.attachedFileData}
                                          download={b.attachedFileName}
                                          className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-950 bg-amber-500 hover:bg-amber-600 border border-amber-600 px-2 py-1 rounded shadow-3xs hover:shadow-2xs transition-all cursor-pointer"
                                          title="تنزيل المستند مباشرة"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <Download className="w-3 h-3" />
                                          <span>تنزيل المرفق</span>
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="p-4">
                                  <div className="flex flex-col gap-1 max-w-[180px]">
                                    <select
                                      value={b.serviceId}
                                      onChange={(e) => handleUpdateBookingService(b.id, e.target.value)}
                                      className="p-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer font-sans shadow-3xs"
                                      title="ربط وتعديل ارتباط هذا الطلب بخدمة أخرى من دليل الخدمات لتتبع أدائه المالي والعملياتي"
                                    >
                                      {services.map(s => (
                                        <option key={s.id} value={s.id}>
                                          {s.name} ({s.officeFee} ر.س)
                                        </option>
                                      ))}
                                      {!services.some(s => s.id === b.serviceId) && (
                                        <option value={b.serviceId} disabled>
                                          {b.serviceName} (غير ملتصق بالدليل)
                                        </option>
                                      )}
                                    </select>
                                    <span className="text-[9px] text-slate-400 font-sans block">
                                      معرّف الحزمة: <span className="font-mono text-[8px] bg-slate-100 px-1 py-0.5 rounded text-slate-600">{b.serviceId || 'srv-none'}</span>
                                    </span>
                                  </div>
                                </td>
                                <td className="p-4 font-mono text-slate-500 text-xs">
                                  {new Date(b.date).toLocaleDateString('ar-SA')} 
                                  <span className="block text-[10px] text-slate-400 mt-0.5">
                                    {new Date(b.date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </td>
                                <td className="p-4 text-center">
                                  <select
                                    value={b.status}
                                    onChange={(e) => handleUpdateBookingStatus(b.id, e.target.value as any)}
                                    className={`p-1.5 text-xs font-bold rounded border bg-white focus:outline-none ${
                                      b.status === 'completed' ? 'text-emerald-800 border-emerald-300 bg-emerald-50' :
                                      b.status === 'processing' ? 'text-blue-800 border-blue-300 bg-blue-50' :
                                      b.status === 'cancelled' ? 'text-red-800 border-red-300 bg-red-50' :
                                      'text-amber-850 border-amber-300 bg-amber-50'
                                    }`}
                                  >
                                    <option value="pending">قيد الانتظار لمراجعة الإدارة</option>
                                    <option value="processing">تحت الإخراج والتعقيب</option>
                                    <option value="completed">مكتملة ومستحقة الدفع</option>
                                    <option value="cancelled">ملغية ومسحوبة</option>
                                  </select>
                                </td>
                                <td className="p-4 text-left space-x-reverse space-x-1.5">
                                  <button
                                    onClick={() => handlePreFillTransactionFromBooking(b)}
                                    className="bg-slate-950 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded font-black text-[11px] transition-colors"
                                    title="ترحيل بيانات الطلب لإنشاء قيد مالي"
                                  >
                                    ترحيل لدفتر الفواتير المالية
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (window.confirm('هل تريد حذف سجل الطلب هذا نهائياً من أرشيف المراجعة؟')) {
                                        const filtered = bookings.filter(item => item.id !== b.id);
                                        setBookings(filtered);
                                      }
                                    }}
                                    className="p-1 px-1.5 text-red-600 hover:text-white hover:bg-red-600 border border-red-200 rounded transition-colors"
                                    title="حذف من الأرشيف"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* --- ADMIN INTERNAL VIEW 3: ACCOUNTING JOURNAL (GENERAL LEDGER) --- */}
            {adminTab === 'ledger' && (
              <div className="space-y-8 animate-fade-in">
                
                {/* 1. Register new ledger transaction */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-md">
                  <div className="flex items-center gap-2 mb-4 text-slate-900 border-b border-slate-100 pb-2.5">
                    <PlusCircle className="w-5 h-5 text-amber-600" />
                    <h3 className="text-base font-extrabold">تسجيل وترحيل فاتورة وعملية مالية جديدة</h3>
                  </div>

                  <form onSubmit={handleAddTransactionSubmit} className="space-y-4 font-sans text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Client Name */}
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">اسم العميل بالكامل:</label>
                        <input
                          type="text"
                          required
                          value={txClientName}
                          onChange={(e) => setTxClientName(e.target.value)}
                          placeholder="مثلاً: شركة النخبة المحدودة"
                          className="w-full p-2.5 border border-slate-300 rounded focus:outline-none focus:border-slate-800 text-sm font-sans"
                        />
                      </div>

                      {/* Service Type matched */}
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">الخدمة الإجرائية للمكتب:</label>
                        <select
                          value={txServiceId}
                          onChange={(e) => handleAdminServiceSelectChange(e.target.value)}
                          className="w-full p-2.5 border border-slate-300 rounded bg-white focus:outline-none focus:border-slate-800 text-sm font-sans"
                        >
                          {services.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Gov State Fee */}
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">الرسوم والمستحقات الحكومية (ر.س):</label>
                        <input
                          type="number"
                          required
                          value={txGovFee}
                          onChange={(e) => setTxGovFee(Number(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full p-2.5 border border-slate-300 rounded focus:outline-none focus:border-slate-800 text-sm font-mono"
                        />
                      </div>

                      {/* Office administrative fee */}
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">أتعاب خدمات سما المملكة (ر.س):</label>
                        <input
                          type="number"
                          required
                          value={txOfficeFee}
                          onChange={(e) => setTxOfficeFee(Number(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full p-2.5 border border-slate-300 rounded focus:outline-none focus:border-slate-800 text-sm font-mono"
                        />
                      </div>
                    </div>

                    {/* Additional Notes for Invoice */}
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">ملاحظات المستند المالي وفترة التغطية:</label>
                      <input
                        type="text"
                        value={txNotes}
                        onChange={(e) => setTxNotes(e.target.value)}
                        placeholder="مثل: المتابعة لإصدار السجل التجاري شامل الترخيص والدفاع المدني بجدة..."
                        className="w-full p-2.5 border border-slate-300 rounded focus:outline-none focus:border-slate-800 text-sm font-sans"
                      />
                    </div>

                    {/* Pricing calculation feedback banner */}
                    <div className="bg-[#f8fafc] p-3 rounded border border-slate-205 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono items-center">
                      <div>
                        <span className="text-slate-500 font-sans">أتعاب المكتب الخاضعة:</span>
                        <strong className="block text-slate-900 text-sm">{txOfficeFee.toFixed(2)} ر.س</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans">ضريبة مضافة (15%):</span>
                        <strong className="block text-slate-950 text-sm">{(txOfficeFee * 0.15).toFixed(2)} ر.س</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-sans">جهة الرسوم (معفى ضريبياً):</span>
                        <strong className="block text-blue-900 text-sm">{txGovFee.toFixed(2)} ر.س</strong>
                      </div>
                      <div className="bg-amber-100 p-2 rounded text-center col-span-1 font-sans">
                        <span className="text-amber-850 font-bold">المجموع المقيد:</span>
                        <strong className="block text-amber-950 text-sm font-mono">{(txGovFee + txOfficeFee + (txOfficeFee * 0.15)).toFixed(2)} ر.س</strong>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm px-6 py-2.5 rounded shadow transition-colors"
                      >
                        ترحيل وترصيد الفاتورة الضريبية
                      </button>
                    </div>
                  </form>
                </div>

                {/* 2. Ledger list transactions */}
                <div className="space-y-4 font-sans">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <FileSpreadsheet className="w-5.5 h-5.5 text-slate-600" />
                      <span>دفتر قيود الحسابات والفواتير المرفوعة</span>
                    </h3>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded-lg font-mono font-bold">
                        العمليات المرحلة كلياً: {transactions.length}
                      </span>
                      {transactions.length > 0 && (
                        <>
                          <button
                            type="button"
                            onClick={handleExportTransactionsCSV}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold px-3.5 py-1.5 rounded-lg text-xs shadow-xs transition duration-150 flex items-center gap-1.5 active:scale-98 cursor-pointer"
                            title="تصدير كافة قيود الحسابات كملف CSV اكسل"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-600" />
                            <span>تصدير البيانات (CSV)</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={handleDownloadPDFReport}
                            className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-black px-3.5 py-1.5 rounded-lg text-xs shadow-sm shadow-amber-600/10 transition duration-150 flex items-center gap-1.5 active:scale-98 cursor-pointer"
                            title="تحميل كشف الحساب والتقرير الضريبى كملف PDF"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-950" />
                            <span>تحميل تقرير PDF المعتمد</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {transactions.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs bg-white border border-slate-205 rounded">
                      لا توجد فواتير ضريبية مقيدة بالدفتر المالي بعد.
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-250 rounded-xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[850px] text-right text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                              <th className="p-3">رقم الفاتورة</th>
                              <th className="p-3">العميل</th>
                              <th className="p-3">اسم الخدمة</th>
                              <th className="p-3">رسوم الدولة</th>
                              <th className="p-3">أتعاب المكتب</th>
                              <th className="p-3">الضريبة</th>
                              <th className="p-3">المجموع الكلي</th>
                              <th className="p-3">تاريخ القيد</th>
                              <th className="p-3 text-center">الإجراءات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {transactions.map(t => (
                              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 font-mono font-bold text-slate-900">{t.invoiceNumber}</td>
                                <td className="p-3 font-bold">{t.clientName}</td>
                                <td className="p-3">{t.serviceName}</td>
                                <td className="p-3 font-mono">{t.govFee.toFixed(2)} ر.س</td>
                                <td className="p-3 font-mono">{t.officeFee.toFixed(2)} ر.س</td>
                                <td className="p-3 font-mono text-slate-500">{t.tax.toFixed(2)} ر.س</td>
                                <td className="p-3 font-mono font-bold text-amber-800">{t.total.toFixed(2)} ر.س</td>
                                <td className="p-3 text-slate-500">{new Date(t.date).toLocaleDateString('ar-SA')}</td>
                                <td className="p-3 font-sans">
                                  <div className="flex justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedTx(t)}
                                      className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded text-[11px] font-bold transition flex items-center gap-1"
                                      title="معاينة وطباعة الفاتورة"
                                    >
                                      <Eye className="w-3 h-3 text-sky-600" />
                                      <span>فاتورة</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTransaction(t.id)}
                                      className="p-1 border border-slate-150 text-red-650 hover:bg-red-50 hover:text-red-700 rounded transition"
                                      title="إزالة القيد"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {adminTab === 'services' && (
              <div className="space-y-8 animate-fade-in font-sans">
                
                {/* WELCOME MESSAGE MANAGEMENT CARD */}
                <div className="bg-gradient-to-l from-slate-900 to-slate-850 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="font-extrabold text-amber-505 text-lg flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                        <span>إدارة والتحكم بالرسالة الترحيبية المميزة (للزوار والعملاء)</span>
                      </h3>
                      <p className="text-slate-400 text-xs mt-1 font-sans">
                        صياغة النص الترحيبي العريض والمثبت الذي يشاهده المستفيدون فور مراجعة دليل خدمات مكتب سما المملكة بالرئيسية.
                      </p>
                    </div>
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 font-bold px-3 py-1 rounded-full border border-amber-500/20">
                      بوابة التخصيص الفوري
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Form Input fields */}
                    <div className="lg:col-span-7 space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="block text-slate-300 font-bold text-xs font-sans">نص الرسالة الترحيبية المقترح:</label>
                        <span className="text-[10px] text-amber-400 font-mono animate-pulse bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {welcomeEditor !== welcomeMessage ? '✍️ جاري التعديل (معاينة حية)' : '✓ مستقر ومطابق'}
                        </span>
                      </div>
                      <textarea
                        value={welcomeEditor}
                        onChange={(e) => setWelcomeEditor(e.target.value)}
                        placeholder="اكتب هنا الرسالة الترحيبية المميزة للمنصة..."
                        className="w-full p-4 border border-slate-700 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm h-40 bg-slate-950 text-slate-100 leading-relaxed transition-all placeholder:text-slate-600 font-sans"
                      />
                      <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center text-[11px] text-slate-400 bg-slate-950/20 p-2.5 rounded-lg border border-slate-800">
                        <span>* التكرير والأسلوب الودي يشجع العملاء على حجز معاملاتهم بثقة أكبر.</span>
                        <div className="flex items-center gap-2 font-mono divide-x divide-slate-800">
                          <span className="text-slate-500 pr-2">تأخر الحفظ: <strong className="text-slate-300">مباشر</strong></span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setWelcomeMessage(welcomeEditor);
                            localStorage.setItem('sm_welcome_msg', welcomeEditor);
                            setSaveSuccessMsg(true);
                            setTimeout(() => setSaveSuccessMsg(false), 4000);
                          }}
                          className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-black px-6 py-2.5 rounded-lg text-xs shadow-md transition duration-150 flex items-center gap-2 active:scale-98 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>حفظ وتعميم الرسالة بالمنصة فوراً</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            const defaultMsg = 'أهلاً ومرحباً بكم في منصة مكتب سما المملكة للخدمات المتكاملة وتخليص المعاملات الإلكترونية الحكومية. نسعد بخدمتكم وتخليص كافة معاملاتكم بكل دقة وأمان وسرعة بإشراف نخبة من المختصين والمهنيين.';
                            setWelcomeEditor(defaultMsg);
                          }}
                          className="bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold px-4 py-2.5 rounded-lg text-xs border border-slate-700 transition duration-150"
                        >
                          استعادة النص الافتراضي
                        </button>
                      </div>

                      {saveSuccessMsg && (
                        <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 p-3.5 rounded-xl text-xs font-bold animate-pulse flex items-center gap-2.5 font-sans">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span>تم تحديث وتعميم الرسالة الترحيبية وعرضها بالرئيسية بنجاح! سيراها الآن جميع مستخدمي وزوار البوابة المباشرة.</span>
                        </div>
                      )}
                    </div>

                    {/* Previews panel */}
                    <div className="lg:col-span-5 bg-slate-950/60 rounded-2xl border border-slate-800 p-5 space-y-4 flex flex-col justify-between">
                      {/* Interactive Header & Mode Toggles */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-1 border-b border-slate-800/80 pb-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${welcomeEditor !== welcomeMessage ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                            <span className="text-[12px] font-bold text-slate-200">
                              {welcomeEditor !== welcomeMessage ? 'مسودة معلقة (لم تُعمم بعد)' : 'منشورة ونشطة حالياً'}
                            </span>
                          </div>
                          
                          <div className="flex rounded-lg bg-slate-900 p-1 border border-slate-850 text-[10px] font-bold">
                            <button
                              type="button"
                              onClick={() => setPreviewDevice('desktop')}
                              className={`px-3 py-1.5 rounded-md transition-all ${previewDevice === 'desktop' ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                              🖥️ سطح المكتب
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewDevice('mobile')}
                              className={`px-3 py-1.5 rounded-md transition-all ${previewDevice === 'mobile' ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                            >
                              📱 الجوال
                            </button>
                          </div>
                        </div>

                        {/* Live Readability Statistics Row */}
                        <div className="grid grid-cols-3 gap-2 text-center text-slate-400">
                          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-850/50">
                            <span className="block text-[9px] text-slate-500 font-bold mb-0.5">عدد الحروف</span>
                            <span className="font-mono text-xs text-amber-400 font-extrabold">{welcomeEditor.length}</span>
                          </div>
                          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-850/50">
                            <span className="block text-[9px] text-slate-500 font-bold mb-0.5">عدد الكلمات</span>
                            <span className="font-mono text-xs text-amber-400 font-extrabold">
                              {welcomeEditor.trim() ? welcomeEditor.trim().split(/\s+/).length : 0}
                            </span>
                          </div>
                          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-850/50">
                            <span className="block text-[9px] text-slate-500 font-bold mb-0.5">وقت القراءة المقدر</span>
                            <span className="font-mono text-xs text-amber-400 font-extrabold">
                              {Math.max(1, Math.round((welcomeEditor.trim() ? welcomeEditor.trim().split(/\s+/).length : 0) / 2.5))} ثانية
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Device Viewport simulator container */}
                      <div className="flex-1 flex items-center justify-center py-1">
                        {previewDevice === 'desktop' ? (
                          /* Desktop Browser mockup simulator frame */
                          <div className="w-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl transition-all duration-300">
                            {/* Browser Header address bar */}
                            <div className="bg-slate-950 px-3 py-2 flex items-center gap-1.5 border-b border-slate-800/60 select-none">
                              <span className="w-2 h-2 rounded-full bg-red-500/80"></span>
                              <span className="w-2 h-2 rounded-full bg-amber-500/80"></span>
                              <span className="w-2 h-2 rounded-full bg-emerald-500/80"></span>
                              <div className="bg-slate-900 text-[10px] text-slate-400 font-mono px-4 py-0.5 rounded-md mr-4 flex-1 text-center truncate select-all">
                                https://sama-kingdom.com/home
                              </div>
                            </div>
                            
                            {/* Simulated Client Page View - Desktop Layout */}
                            <div className="p-4 bg-slate-900 text-slate-200 min-h-[140px] text-right font-sans relative">
                              <div className="bg-slate-950/90 rounded-xl p-3 border border-amber-500/30 shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-1 h-full bg-amber-500"></div>
                                <div className="flex items-center gap-1.5 text-[9px] text-amber-500 font-extrabold mb-1 font-sans">
                                  <Sparkles className="w-3 h-3 text-amber-450 animate-pulse" />
                                  <span>البيان الترحيبي الخاص بالزوار والعملاء</span>
                                </div>
                                <p className="text-[10px] text-slate-100 leading-relaxed font-sans whitespace-pre-wrap select-text max-h-[120px] overflow-y-auto">
                                  {welcomeEditor || "أهلاً ومرحباً بكم مع مكتب سما المملكة للخدمات المعاملات الشاملة..."}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Mobile Simulator Frame */
                          <div className="w-[200px] bg-slate-900 border-4 border-slate-800 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 relative">
                            {/* Mobile Top Camera Notch and bar */}
                            <div className="bg-slate-950 h-5 flex items-center justify-center select-none relative">
                              <div className="w-12 h-3 bg-slate-800 rounded-full absolute -top-1.5"></div>
                              <span className="text-[7px] text-slate-500 font-mono absolute left-2">12:30 PM</span>
                            </div>
                            
                            {/* Simulated Client mobile layout screen */}
                            <div className="p-2.5 bg-slate-900 text-slate-200 min-h-[170px] text-right font-sans">
                              {/* Small URL representation */}
                              <div className="bg-slate-950 rounded text-[7px] text-slate-400 font-mono py-0.5 text-center mb-2 truncate">
                                sama-kingdom.com
                              </div>

                              <div className="bg-slate-950/95 rounded-lg p-2 border border-amber-500/30 shadow-md relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-0.5 h-full bg-amber-500"></div>
                                <div className="flex items-center gap-1 text-[7px] text-amber-500 font-bold mb-1 font-sans">
                                  <Sparkles className="w-2 h-2 text-amber-450" />
                                  <span>البيان الترحيبي</span>
                                </div>
                                <p className="text-[7px] text-slate-100 leading-normal font-sans whitespace-pre-wrap select-text max-h-[120px] overflow-y-auto">
                                  {welcomeEditor || "أهلاً ومرحباً بكم مع مكتب سما المملكة للخدمات المعاملات الشاملة..."}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-[10px] text-slate-400 font-sans leading-normal text-center p-2 bg-slate-900/40 rounded-lg border border-slate-850">
                        * يتم الحفظ التلقائي والمعاينة حية ومباشرة بدون انتظار مسبق.
                      </p>
                    </div>
                  </div>
                </div>

                {/* STATUS MESSAGES MANAGEMENT CARD */}
                <div className="bg-gradient-to-l from-slate-900 to-slate-850 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="font-extrabold text-amber-500 text-lg flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                        <span>تعديل وتخصيص رسائل حالات الطلبات والتواصل التلقائي</span>
                      </h3>
                      <p className="text-slate-400 text-xs mt-1 font-sans">
                        تحرير وتهيئة الردود والإفادات المباشرة التي تظهر للعملاء فور الاستفسار وتتبع معاملاتهم حسب الوضع المالي والعملياتي للطلب.
                      </p>
                    </div>
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 font-bold px-3 py-1 rounded-full border border-amber-500/20">
                      قنوات الحالة التفاعلية
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Status 1: Pending */}
                    <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-amber-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-550"></span>
                          رسالة حالة قيد الانتظار لمراجعة الإدارة (Pending)
                        </span>
                      </div>
                      <textarea
                        value={statusMsgPending}
                        onChange={(e) => setStatusMsgPending(e.target.value)}
                        placeholder="ماذا يظهر للعميل عندما يكون الطلب معلقاً بانتظار المراجعة الإدارية..."
                        className="w-full p-3 border border-slate-700 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs h-20 bg-slate-950 text-slate-100 leading-relaxed transition-all placeholder:text-slate-600 font-sans"
                      />
                    </div>

                    {/* Status 2: Processing */}
                    <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-blue-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          رسالة حالة قيد الإنجاز والمعالجة الفورية (Processing)
                        </span>
                      </div>
                      <textarea
                        value={statusMsgProcessing}
                        onChange={(e) => setStatusMsgProcessing(e.target.value)}
                        placeholder="ماذا يظهر للعميل أثناء سير المعاملة ومراجعة الدوائر الحكومية والمختصين..."
                        className="w-full p-3 border border-slate-700 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs h-20 bg-slate-950 text-slate-100 leading-relaxed transition-all placeholder:text-slate-600 font-sans"
                      />
                    </div>

                    {/* Status 3: Completed */}
                    <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-emerald-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          رسالة حالة اكتمال المعاملة وصدور الفاتورة (Completed)
                        </span>
                      </div>
                      <textarea
                        value={statusMsgCompleted}
                        onChange={(e) => setStatusMsgCompleted(e.target.value)}
                        placeholder="ماذا يظهر للعميل عندما تنجز المعاملة والطلب المالي بالكامل وتصبح جاهزة..."
                        className="w-full p-3 border border-slate-700 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs h-20 bg-slate-950 text-slate-100 leading-relaxed transition-all placeholder:text-slate-600 font-sans"
                      />
                    </div>

                    {/* Status 4: Cancelled */}
                    <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-red-450 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>
                          رسالة حالة الاعتذار أو إلغاء الطلب (Cancelled)
                        </span>
                      </div>
                      <textarea
                        value={statusMsgCancelled}
                        onChange={(e) => setStatusMsgCancelled(e.target.value)}
                        placeholder="ماذا يظهر للعميل في حال رفض أو تعذر إنهاء المعاملة وإلغائها لأسباب تنظيمية..."
                        className="w-full p-3 border border-slate-700 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs h-20 bg-slate-950 text-slate-100 leading-relaxed transition-all placeholder:text-slate-600 font-sans"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem('sm_status_msg_pending', statusMsgPending);
                        localStorage.setItem('sm_status_msg_processing', statusMsgProcessing);
                        localStorage.setItem('sm_status_msg_completed', statusMsgCompleted);
                        localStorage.setItem('sm_status_msg_cancelled', statusMsgCancelled);
                        setSaveSuccessStatusMsg(true);
                        setTimeout(() => setSaveSuccessStatusMsg(false), 3000);
                      }}
                      className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-black px-6 py-2.5 rounded-lg text-xs shadow-md transition duration-150 flex items-center gap-2 active:scale-98 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>حفظ وتطبيق رسائل الحالات بالمنصة فوراً</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        const defPending = 'قيد الانتظار لمراجعة الإدارة - نعتز بثقتكم وسنتولى معالجتها حالاً.';
                        const defProcessing = 'تحت المعالجة الإجرائية الآن - يتم تنفيذ المعاملة ومراجعة الجهات المختصة.';
                        const defCompleted = 'مكتملة ومستند الفاتورة جاهز - نسعد دائماً برضاكم التام.';
                        const defCancelled = 'ملغية - نرجو التواصل مع الإدارة للاستفسار والتحقق.';
                        
                        setStatusMsgPending(defPending);
                        setStatusMsgProcessing(defProcessing);
                        setStatusMsgCompleted(defCompleted);
                        setStatusMsgCancelled(defCancelled);
                      }}
                      className="bg-slate-800 hover:bg-slate-755 text-slate-305 font-bold px-4 py-2.5 rounded-lg text-xs border border-slate-700 transition duration-150"
                    >
                      استعادة الإفادات الافتراضية
                    </button>
                    
                    {saveSuccessStatusMsg && (
                      <span className="text-emerald-400 text-xs font-bold animate-pulse font-sans flex items-center gap-1.5 mr-auto">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>تم حفظ وتطبيق رسائل حالات المعاملات بنجاح!</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* BACKGROUND SETTINGS AND AI CONFIGURATION CARD */}
                <div className="bg-gradient-to-l from-slate-900 to-slate-850 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="font-extrabold text-amber-500 text-lg flex items-center gap-2">
                        <Sun className="w-5 h-5 text-amber-400" />
                        <span>التحكم بالخلفية الإيمانية وإعدادات الذكاء الاصطناعي لمكة المكرمة</span>
                      </h3>
                      <p className="text-slate-400 text-xs mt-1 font-sans">
                        تحرير وتعيين مظهر صور مكة المكرمة المهيبة بخلفية المنصة لتتناسب بذكاء مع الزوار والعملاء.
                      </p>
                    </div>
                    <span className="text-[10px] bg-sky-500/10 text-sky-400 font-bold px-3 py-1 rounded-full border border-sky-500/20">
                      إعدادات مظهر النظام
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Strategy 1: AI Auto */}
                    <div 
                      onClick={() => setBgStrategy('ai')}
                      className={`cursor-pointer group relative border rounded-xl p-4 transition-all hover:border-amber-500/50 ${
                        bgStrategy === 'ai' 
                          ? 'bg-slate-950/90 border-amber-500 ring-1 ring-amber-500 shadow-md shadow-amber-500/5' 
                          : 'bg-slate-950/30 border-slate-800'
                      }`}
                    >
                      <div className="absolute top-2.5 left-2.5 bg-amber-500/10 p-1 rounded-md text-amber-400">
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      </div>
                      <h4 className="font-extrabold text-xs text-amber-500 mb-1.5 flex items-center gap-1">
                        <span>التبديل التلقائي الذكي</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 leading-normal mb-3 font-sans">
                        تحديد وتعميم الخلفية تلقائياً بناءً على الوقت المحلي للزائر لمطابقة صلواتهم وتوقيت الديار المقدسة.
                      </p>
                      <span className="text-[9px] font-bold text-amber-400/80 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10 block text-center">
                        موصى به للزوار
                      </span>
                    </div>

                    {/* Strategy 2: Sunrise */}
                    <div 
                      onClick={() => setBgStrategy('sunrise')}
                      className={`cursor-pointer group relative border rounded-xl overflow-hidden transition-all hover:border-amber-500/50 ${
                        bgStrategy === 'sunrise' 
                          ? 'bg-slate-950/90 border-amber-500 ring-1 ring-amber-500' 
                          : 'bg-slate-950/30 border-slate-800'
                      }`}
                    >
                      <div className="h-20 bg-cover bg-center animate-fade-in" style={{ backgroundImage: `url("${makkahSunriseImg}")` }}></div>
                      <div className="p-3">
                        <h4 className="font-extrabold text-xs text-white mb-1 flex items-center gap-1">
                          <Sun className="w-3 h-3 text-amber-500" />
                          <span>شروق مكة المكرمة</span>
                        </h4>
                        <p className="text-[9px] text-slate-400 leading-normal font-sans">
                          فرض خلفية الشروق المشرق (ألوان ذهبية دافئة مناسبة لفترة الصباح الباكر والنشاط).
                        </p>
                      </div>
                    </div>

                    {/* Strategy 3: Sunset */}
                    <div 
                      onClick={() => setBgStrategy('sunset')}
                      className={`cursor-pointer group relative border rounded-xl overflow-hidden transition-all hover:border-amber-500/50 ${
                        bgStrategy === 'sunset' 
                          ? 'bg-slate-950/90 border-amber-500 ring-1 ring-amber-500' 
                          : 'bg-slate-950/30 border-slate-800'
                      }`}
                    >
                      <div className="h-20 bg-cover bg-center animate-fade-in" style={{ backgroundImage: `url("${makkahSunsetImg}")` }}></div>
                      <div className="p-3">
                        <h4 className="font-extrabold text-xs text-white mb-1 flex items-center gap-1">
                          <Sun className="w-3 h-3 text-amber-600" />
                          <span>غروب مكة المكرمة</span>
                        </h4>
                        <p className="text-[9px] text-slate-400 leading-normal font-sans">
                          فرض خلفية الغروب المهيب (أصيل مكة الكرمة الهادئ والمريح للأعصاب البصرية).
                        </p>
                      </div>
                    </div>

                    {/* Strategy 4: Night */}
                    <div 
                      onClick={() => setBgStrategy('night')}
                      className={`cursor-pointer group relative border rounded-xl overflow-hidden transition-all hover:border-amber-500/50 ${
                        bgStrategy === 'night' 
                          ? 'bg-slate-950/90 border-amber-500 ring-1 ring-amber-500' 
                          : 'bg-slate-950/30 border-slate-800'
                      }`}
                    >
                      <div className="h-20 bg-cover bg-center animate-fade-in" style={{ backgroundImage: `url("${makkahNightImg}")` }}></div>
                      <div className="p-3">
                        <h4 className="font-extrabold text-xs text-white mb-1 flex items-center gap-1">
                          <Moon className="w-3 h-3 text-indigo-400" />
                          <span>الليل والتهجد بمكة</span>
                        </h4>
                        <p className="text-[9px] text-slate-400 leading-normal font-sans">
                          فرض خلفية ليل الحرم المكي الشريف الاستثنائي المضاء بمصابيح المنارة الباهرة.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs font-sans">
                    <p className="text-slate-350">
                      💡 <span className="font-bold text-white">معلومة الإدارة:</span> يثق زوار مكتب سما المملكة بمدى اهتمامكم الدؤوب وتجهيز الخدمات بأرقى معايير التقنية السعودية المحكمة.
                    </p>
                    <div className="flex gap-2">
                      <span className="bg-amber-600 text-slate-950 text-[10px] font-black px-3 py-1 rounded">الخلفية النشطة بالنظام الآن: {getBgNameAr(bgStrategy)}</span>
                    </div>
                  </div>
                </div>

                {/* GLOBAL INTERNATIONAL PAYMENT GATEWAYS CONFIGURATION & BINDING */}
                <div className="bg-gradient-to-l from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="font-extrabold text-amber-500 text-lg flex items-center gap-2">
                        <Coins className="w-5 h-5 text-amber-400" />
                        <span>ربط وسائل وقنوات الدفع في جميع الدول (Stripe, PayPal, mada, Fawry)</span>
                      </h3>
                      <p className="text-slate-400 text-xs mt-1 font-sans">
                        أداة التحكم المركزية لربط وتنشيط قنوات الدفع لجميع الدول المصدرة للمعاملات بضمان الأمان الفيدرالي والبنكي المشترك بالمنصة.
                      </p>
                    </div>
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 font-bold px-3 py-1 rounded-full border border-amber-500/20 font-sans">
                      بوابات الدفع الدولية الموحدة
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-sans">
                    {/* Column 1: Gateways API credentials */}
                    <div className="space-y-4 text-right" dir="rtl">
                      <div className="space-y-1">
                        <label className="block text-slate-300 font-bold flex items-center gap-1.5 justify-start">
                          <span>بوابة Stripe المشفرة للفيزا والماستركارد (Stripe Secure Gateway)</span>
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        </label>
                        <input
                          type="text"
                          value={paymentGatewayStripeKey}
                          onChange={(e) => setPaymentGatewayStripeKey(e.target.value)}
                          placeholder="pk_live_..."
                          className="w-full p-3 border border-slate-700 rounded-lg focus:outline-none focus:border-amber-500 bg-slate-950 text-slate-100 font-mono tracking-wide text-xs transition-all"
                        />
                        <span className="text-[9px] text-slate-400 block font-normal leading-normal">تستخدم للتشفير الآلي وقبول البطاقات الائتمانية في غضون 195 دولة.</span>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-slate-300 font-bold flex items-center gap-1.5 justify-start">
                          <span>بوابة PayPal للتحصيل بالدولار واليورو (PayPal Payments)</span>
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        </label>
                        <input
                          type="email"
                          value={paymentGatewayPaypalEmail}
                          onChange={(e) => setPaymentGatewayPaypalEmail(e.target.value)}
                          placeholder="accounting@sama-kingdom.com"
                          className="w-full p-3 border border-slate-700 rounded-lg focus:outline-none focus:border-amber-500 bg-slate-950 text-slate-100 font-mono text-xs transition-all"
                        />
                        <span className="text-[9px] text-slate-400 block leading-normal">يتحول العميل بموجبها لبوابة تصديق PayPal الآمنة لتجنب تحويل العملات الإجرائي.</span>
                      </div>
                    </div>

                    {/* Column 2: Toggles for local checkouts */}
                    <div className="space-y-4" dir="rtl">
                      <p className="block text-slate-300 font-bold text-sm mb-1 text-right">تفعيل وتنشيط الشبكات المحلية بالبلدان المقيمة:</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-right">
                        {/* Mada toggle */}
                        <div className="bg-slate-950/40 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                          <span className="text-[11px] text-slate-350 pr-2">شاشات مدى (mada) • للعملاء بالسعودية</span>
                          <input
                            type="checkbox"
                            checked={paymentGatewayMadaActive}
                            onChange={(e) => {
                              setPaymentGatewayMadaActive(e.target.checked);
                              localStorage.setItem('sm_mada_active', String(e.target.checked));
                            }}
                            className="w-4 h-4 text-amber-500 bg-slate-950 border-slate-700 rounded focus:ring-amber-500 cursor-pointer"
                          />
                        </div>

                        {/* Fawry toggle */}
                        <div className="bg-slate-950/40 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                          <span className="text-[11px] text-slate-350 pr-2">فوري وميزة (Fawry CC) • لمصر والمنطقة</span>
                          <input
                            type="checkbox"
                            checked={paymentGatewayFawryActive}
                            onChange={(e) => {
                              setPaymentGatewayFawryActive(e.target.checked);
                              localStorage.setItem('sm_fawry_active', String(e.target.checked));
                            }}
                            className="w-4 h-4 text-amber-500 bg-slate-950 border-slate-700 rounded focus:ring-amber-500 cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="bg-slate-950/40 border border-slate-800 p-3.5 rounded-xl text-[10px] text-slate-400 leading-relaxed text-right space-y-1 font-sans">
                        <strong className="text-amber-500 text-[11px] block">المطابقة والمعايرة الدولية (Currency FX Safe):</strong>
                        <p>تتمكن الأنظمة البنكية التابعة للمكتب في استخلاص فروقات الصرف لخدمات التأشيرات واستنفاد الرسوم الإدارية لتجنب أية مشكلات تسوية دولية إجرائية فورياً.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem('sm_stripe_key', paymentGatewayStripeKey);
                        localStorage.setItem('sm_paypal_email', paymentGatewayPaypalEmail);
                        localStorage.setItem('sm_mada_active', String(paymentGatewayMadaActive));
                        localStorage.setItem('sm_fawry_active', String(paymentGatewayFawryActive));
                        alert('تم تحديث وحفظ إعدادات ربط بوابات الدفع في جميع الدول بنجاح!');
                      }}
                      className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-black px-6 py-2.5 rounded-lg text-xs shadow-md transition duration-150 flex items-center gap-2 active:scale-98 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>حفظ وربط بوابات الدفع الدولية بالمنصة</span>
                    </button>
                    
                    <span className="text-slate-400 text-[10px] mr-auto text-left font-mono">
                      Active: stripe-v3, paypal-standard, benefits-api, knet-integrated
                    </span>
                  </div>
                </div>

                {/* Add Service Section with 2 columns: left Form, right Live Preview */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Left (Span 2) - Form Block */}
                  <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-205 shadow-md">
                  <h3 className="font-extrabold text-slate-900 text-lg border-b border-slate-200 pb-3 mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-amber-100 p-1.5 rounded-lg border border-amber-200">
                        <PlusCircle className="w-5 h-5 text-amber-700" />
                      </div>
                      <span className="font-black text-slate-950">إضافة وتهيئة خدمة إدارية جديدة للمكتب</span>
                    </div>
                    <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-sans">بوابة مسؤولي النظام</span>
                  </h3>

                  {/* Form Controls - Left (Span 2) */}
                  <form onSubmit={handleAddServiceSubmit} className="space-y-6 text-xs font-sans">
                      
                      {/* Section 1: Basic Identity & Classification */}
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 space-y-4 shadow-2xs">
                        <div className="flex items-center gap-2 text-slate-900 font-extrabold pb-2 border-b border-slate-200">
                          <div className="w-6 h-6 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-mono text-xs">١</div>
                          <span className="text-sm font-black">المعلومات الأساسية والهوية التصنيفية</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-slate-800 font-bold mb-1.5">* اسم الخدمة بالكامل (أو نوع المعاملة):</label>
                            <div className="relative">
                              <input
                                type="text"
                                required
                                value={newSrvName}
                                onChange={(e) => setNewSrvName(e.target.value)}
                                placeholder="مثلاً: تأشيرة علاجية أو سياحية خاصة"
                                className="w-full pr-10 pl-3 py-2.5 border border-slate-300 rounded focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 text-sm bg-white text-slate-900 transition-colors"
                              />
                              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                                <FileText className="h-4.5 w-4.5 text-slate-400" />
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-slate-800 font-bold mb-1.5">* فئة الخدمة الرئيسية التابعة:</label>
                            <div className="relative">
                              <select
                                value={newSrvCategory}
                                onChange={(e) => setNewSrvCategory(e.target.value as any)}
                                className="w-full pr-10 pl-3 py-2.5 border border-slate-300 rounded bg-white focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 text-sm text-slate-900 transition-colors"
                              >
                                <option value="gov">خدمات تعقيب وجهات حكومية</option>
                                <option value="transport">خدمات النقل البري والجوي والشحن</option>
                                <option value="other">أخرى / مخصصة</option>
                              </select>
                              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                                <ListFilter className="h-4.5 w-4.5 text-slate-400" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          <div>
                            <label className="block text-slate-800 font-bold mb-1.5">* الرمز والأيقونة التعبيرية الممثلة للخدمة:</label>
                            <div className="relative">
                              <select
                                value={newSrvIcon}
                                onChange={(e) => setNewSrvIcon(e.target.value)}
                                className="w-full pr-10 pl-3 py-2.5 border border-slate-300 rounded bg-white focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 text-sm text-slate-900 transition-colors font-sans"
                              >
                                <option value="PlusCircle">➕ أيقونة إضافة سريعة (PlusCircle)</option>
                                <option value="FileText">📄 ملف ومعاملة إجرائية (FileText)</option>
                                <option value="Briefcase">💼 حقيبة أعمال واستقدام عمالة (Briefcase)</option>
                                <option value="Compass">🧭 بوصلة استكشاف وتوجيه (Compass)</option>
                                <option value="Users">👥 مجموعات وأفراد وعائلات (Users)</option>
                                <option value="Truck">🚚 شحن بري ونقل لوجستي (Truck)</option>
                                <option value="Plane">✈️ طيران وسفر خارجي للأفراد (Plane)</option>
                                <option value="ShieldCheck">🛡️ تأكيد وأمان وضمان وتوثيق (ShieldCheck)</option>
                                <option value="Activity">⚡ متابعة مسار وحالة المعاملة (Activity)</option>
                                <option value="FileSpreadsheet">📊 تقارير وجداول مالية (FileSpreadsheet)</option>
                                <option value="Coins">💰 رسوم وتكاليف خدماتية (Coins)</option>
                                <option value="Calendar">📅 مواعيد وحجوزات مجدولة (Calendar)</option>
                                <option value="HelpCircle">❓ استفسارات ودعم فني (HelpCircle)</option>
                                <option value="Receipt">🧾 فاتورة سداد ورسوم ضريبية (Receipt)</option>
                                <option value="Home">🏠 خدمات سكنية وإقامة بلدية (Home)</option>
                              </select>
                              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                                <span className="text-slate-500 font-bold">★</span>
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">تُعرض الأيقونة المختارة في بطاقات الخدمات على الواجهة العامة للتوضيح البصري للعملاء والمستفيدين.</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 space-y-4 shadow-2xs">
                        <div className="flex items-center gap-2 text-slate-900 font-extrabold pb-2 border-b border-slate-200">
                          <div className="w-6 h-6 rounded-md bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 font-mono text-xs font-black">٢</div>
                          <span className="text-sm font-black">الضوابط المالية وجداول التسعير الفني</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-3xs space-y-1.5 text-right">
                            <label className="block text-slate-800 font-bold text-xs flex items-center gap-1 justify-start">
                              <Coins className="w-3.5 h-3.5 text-indigo-600" />
                              <span>* أتعاب وتكاليف تعقيب المكتب (ر.س):</span>
                            </label>
                            <input
                              type="number"
                              required
                              value={newSrvOfficeFee}
                              onChange={(e) => setNewSrvOfficeFee(Number(e.target.value) || 0)}
                              placeholder="0.00"
                              className="w-full p-2.5 border border-slate-300 rounded focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 text-sm font-mono text-slate-900"
                            />
                            <div className="flex justify-between items-center text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded font-sans leading-none">
                              <span>ضريبة مضافة مقيدة (15%):</span>
                              <strong className="font-mono text-emerald-800">{(newSrvOfficeFee * 0.15).toFixed(2)} ر.س</strong>
                            </div>
                          </div>

                          <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-3xs space-y-1.5 text-right">
                            <label className="block text-slate-800 font-bold text-xs flex items-center gap-1 justify-start">
                              <Receipt className="w-3.5 h-3.5 text-blue-600" />
                              <span>* الرسوم الحكومية المستحقة للدولة (ر.س):</span>
                            </label>
                            <input
                              type="number"
                              required
                              value={newSrvGovFee}
                              onChange={(e) => setNewSrvGovFee(Number(e.target.value) || 0)}
                              placeholder="0.00"
                              className="w-full p-2.5 border border-slate-300 rounded focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 text-sm font-mono text-slate-900"
                            />
                            <div className="flex justify-between items-center text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded font-sans leading-none">
                              <span>الحالة الضريبية في سما:</span>
                              <strong className="text-blue-850 font-black">معفى من الضريبة</strong>
                            </div>
                          </div>
                        </div>

                        {/* Direct automatic fee assessment display */}
                        <div className="bg-emerald-50/65 border border-emerald-200/80 rounded-lg p-3.5 text-xs flex justify-between items-center">
                          <div className="space-y-1">
                            <h5 className="font-extrabold text-emerald-950">إقرار كلي لحاصل تكلفة الخدمة المقترحة:</h5>
                            <p className="text-[10px] text-emerald-800 leading-snug">يتكفل المستفيد بدفع هذا الإجمالي تلقائياً في دورة المعاملة شاملة أتعاب سما الإدارية والضريبة الرسمية.</p>
                          </div>
                          <div className="text-left">
                            <span className="text-[10px] text-emerald-600 font-sans block">إجمالي التكلفة الشاملة:</span>
                            <strong className="text-base text-emerald-950 font-black font-mono">{(newSrvGovFee + newSrvOfficeFee * 1.15).toFixed(2)} ر.س</strong>
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Operational Steps & Clear Descriptions */}
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 space-y-4 shadow-2xs">
                        <div className="flex items-center gap-2 text-slate-900 font-extrabold pb-2 border-b border-slate-200">
                          <div className="w-6 h-6 rounded-md bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-754 font-mono text-xs font-black">٣</div>
                          <span className="text-sm font-black">الشرح التفصيلي ودليل تفويض الإنجاز</span>
                        </div>

                        <div>
                          <label className="block text-slate-800 font-bold mb-1.5">* وصف المعاملة ومتطلبات الأوراق واللوائح التوثيقية:</label>
                          <textarea
                            required
                            value={newSrvDesc}
                            onChange={(e) => setNewSrvDesc(e.target.value)}
                            placeholder="اكتب هنا ما يغطي بالتفصيل كيفية وأبعاد تقديم الإجراء، مثلاً الأوراق والوثائق المطلوبة، الشروط السنية أو المالية، والمهلة الزمنية المتوقعة للإصدار..."
                            className="w-full p-3 border border-slate-300 rounded focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 text-sm h-28 bg-white text-slate-900 leading-relaxed transition-all placeholder:text-slate-400"
                          ></textarea>

                          <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1 font-sans">
                            <span>* يرجى إيضاح المتطلبات بدقة لتجنيب العميل الرفض من المسار الحكومي.</span>
                            <span className="font-mono font-bold">المدخلات: {newSrvDesc.length} حرف</span>
                          </div>
                        </div>
                      </div>

                      {/* Section 4: Linked Payment Methods (ربط طرق السداد المتاحة للخدمة) */}
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 space-y-4 shadow-2xs text-right">
                        <div className="flex items-center gap-2 text-slate-900 font-extrabold pb-2 border-b border-slate-200">
                          <div className="w-6 h-6 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-mono text-xs font-black">٤</div>
                          <span className="text-sm font-black">ربط طرق السداد المعتمدة للمستفيدين</span>
                        </div>

                        <p className="text-slate-500 text-[11px] leading-relaxed">حدد قنوات السداد وبوابات الدفع الإلكتروني التي ستتاح في فواتير وجداول هذه الخدمة للعملاء عند التقديم عليها:</p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          {AVAILABLE_PAYMENT_METHODS.map((pm) => {
                            const isChecked = newSrvPaymentMethods.includes(pm.id);
                            return (
                              <label
                                key={pm.id}
                                className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${
                                  isChecked 
                                    ? 'bg-emerald-50/40 border-emerald-500 shadow-3xs' 
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      if (isChecked) {
                                        setNewSrvPaymentMethods(newSrvPaymentMethods.filter(id => id !== pm.id));
                                      } else {
                                        setNewSrvPaymentMethods([...newSrvPaymentMethods, pm.id]);
                                      }
                                    }}
                                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                                  />
                                  <span className="text-xs font-bold text-slate-800">{pm.name}</span>
                                </div>
                                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded border text-slate-650">{pm.badge}</span>
                              </label>
                            );
                          })}
                        </div>
                        {newSrvPaymentMethods.length === 0 && (
                          <p className="text-[10px] text-red-650 font-bold bg-red-50 p-2 rounded-lg border border-red-150">
                            ⚠ تحذير: لم تختر أي وسيلة سداد مخصصة لهذه الخدمة! سيتمكن العميل من الدفع فقط عبر خيارات الحوالة الافتراضية.
                          </p>
                        )}
                      </div>

                      <div className="flex justify-end pt-3 border-t border-slate-200 gap-3 font-sans">
                        <button
                          type="submit"
                          className="bg-slate-950 border border-slate-900 hover:bg-slate-850 text-white font-black px-10 py-3 rounded-lg text-sm shadow-md transition duration-150 flex items-center gap-2 active:scale-98"
                        >
                          <PlusCircle className="w-5 h-5" />
                          <span>تفعيل وجدولة الخدمة بالمنصة فوراً</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Interactive Live Card Preview - Right (Span 1) */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4 font-sans border-t border-slate-200">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="font-extrabold text-slate-800 text-xs">معاينة تفاعلية حية (البطاقة الذكية للخدمة)</span>
                        <span className="text-[9px] bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded font-bold animate-pulse">مباشر</span>
                      </div>
                      
                      {/* Simulated public service card layout */}
                      <div className="bg-white rounded-xl shadow border border-slate-200 p-5 flex flex-col justify-between relative group hover:shadow-md transition-all antialiased text-right">
                        <div>
                          {/* Card Top */}
                          <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                              <RenderServiceIcon iconName={newSrvIcon} className="w-6 h-6 text-amber-700" />
                            </div>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-wider font-sans">
                              {newSrvCategory === 'visa' && 'خدمات تأشيرات'}
                              {newSrvCategory === 'gov' && 'تعقيب ومراجعة دائرية'}
                              {newSrvCategory === 'transport' && 'نقل ومواصلات'}
                              {newSrvCategory === 'other' && 'خدمات عامة'}
                            </span>
                          </div>

                          {/* Title and details */}
                          <h3 className="text-base font-black text-slate-900 mb-2 line-clamp-1">
                            {newSrvName.trim() || 'اسم الخدمة التجريبي'}
                          </h3>
                          <p className="text-slate-600 text-[11px] leading-relaxed mb-4 line-clamp-3 min-h-[48px]">
                            {newSrvDesc.trim() || 'الشرح والتوضيح ومسار المعاملة الحكومية وسيظهر هنا بالكامل للعملاء والمستفيدين فور رغبة الحجز...'}
                          </p>
                        </div>

                        <div className="border-t border-slate-250 pt-4 mt-2 space-y-2 text-xs">
                          <div className="flex justify-between font-sans">
                            <span className="text-slate-500">رسوم جهات الدولة:</span>
                            <span className="font-bold text-slate-950 font-mono">{newSrvGovFee.toFixed(2)} ر.س</span>
                          </div>
                          <div className="flex justify-between font-sans">
                            <span className="text-slate-500">أتعاب المكتب المعيارية:</span>
                            <span className="font-bold text-slate-950 font-mono">{(newSrvOfficeFee * 1.15).toFixed(2)} ر.س</span>
                          </div>
                          <div className="flex justify-between text-slate-400 text-[10px] pr-2 border-r-2 border-slate-200 font-sans">
                            <span>شامل ضريبة مضافة:</span>
                            <span className="font-mono font-bold text-slate-700">{(newSrvOfficeFee * 0.15).toFixed(2)} ر.س</span>
                          </div>
                          <div className="flex justify-between border-t border-dashed border-slate-150 pt-2 font-black text-amber-800 text-sm font-sans">
                            <span>التكلفة الإجمالية:</span>
                            <span className="font-mono font-bold text-amber-950">{(newSrvGovFee + newSrvOfficeFee * 1.15).toFixed(2)} ر.س</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#f1f5f9] border border-slate-200 p-3 rounded-lg text-[10px] text-slate-600 space-y-1 font-sans">
                      <strong className="text-slate-900 block font-bold mb-1">💡 إرشادات الإعداد الفني للخدمات الجديد:</strong>
                      <p>١. الأمانات المعفاة هي مدفوعات الدولة المباشرة عبر منابر (أبشر، قوى، بلدي).</p>
                      <p>٢. يلتزم تطبيق الفاتورة بالضريبة السائدة ١٥٪ على أتعاب تعقيب المكتب فحسب.</p>
                    </div>
                  </div>
                </div>

                {/* Directory listing and search tools */}
                <div className="space-y-5 bg-slate-50/70 border border-slate-200 rounded-2xl p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                      <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                        <ListFilter className="w-5 h-5 text-amber-600" />
                        <span>دليل الخدمات وباقات العمليات النشطة بالمكتب</span>
                      </h3>
                      <p className="text-slate-500 text-[11px] mt-1 font-sans">
                        ابحث وقارن ورتب جميع المعاملات المهيأة على منصة مكتب سما المملكة بمرونة تامة ونمط عصري.
                      </p>
                    </div>

                    {/* Summary indicator */}
                    <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-3xs font-sans self-start md:self-auto">
                      إجمالي الخدمات: <strong className="text-slate-900">{services.length} خدمات</strong>
                    </span>
                  </div>

                  {/* Highly polished control bar with filters, search and sorting */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-end font-sans">
                    
                    {/* Search box - 5 cols */}
                    <div className="lg:col-span-5 space-y-1.5">
                      <label className="block text-slate-700 font-extrabold text-[11px]">ابحث باسم الخدمة أو الشرح التفصيلي:</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={servicesSearchQuery}
                          onChange={(e) => setServicesSearchQuery(e.target.value)}
                          placeholder="اكتب المعاملة التي تبحث عنها هنا..."
                          className="w-full pr-10 pl-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-xs bg-white text-slate-900 placeholder:text-slate-400 font-sans shadow-3xs transition-all"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <Search className="h-4 w-4 text-slate-400" />
                        </div>
                        {servicesSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setServicesSearchQuery('')}
                            className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-700 font-bold"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Category Filter - 4 cols */}
                    <div className="lg:col-span-4 space-y-1.5">
                      <label className="block text-slate-700 font-extrabold text-[11px]">تصفية بحسب فئة المعاملات:</label>
                      <div className="relative">
                        <select
                          value={servicesFilterCategory}
                          onChange={(e) => setServicesFilterCategory(e.target.value as any)}
                          className="w-full pr-8 pl-3 py-2 border border-slate-300 rounded-xl bg-white text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-3xs appearance-none transition-all"
                        >
                          <option value="all">📁 جميع الفئات والتخصصات بالمكتب</option>
                          <option value="visa">🛂 خدمات تأشيرات وسفر</option>
                          <option value="gov">🏛️ تعقيب ومراجعة دائرية</option>
                          <option value="transport">🚚 نقل ومواصلات وشحن</option>
                          <option value="other">⚙️ خدمات عامة أخرى</option>
                        </select>
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                          ▼
                        </div>
                      </div>
                    </div>

                    {/* Sorting Selection - 3 cols */}
                    <div className="lg:col-span-3 space-y-1.5">
                      <label className="block text-slate-700 font-extrabold text-[11px]">ترتيب عرض قائمة التحكم:</label>
                      <div className="relative">
                        <select
                          value={servicesSortKey}
                          onChange={(e) => setServicesSortKey(e.target.value as any)}
                          className="w-full pr-8 pl-3 py-2 border border-slate-300 rounded-xl bg-white text-xs text-slate-900 font-bold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-3xs appearance-none transition-all"
                        >
                          <option value="name-asc">🔤 اسم الخدمة (أ - ي)</option>
                          <option value="name-desc">🔤 اسم الخدمة (ي - أ)</option>
                          <option value="total-desc">💰 التكلفة: الأعلى أولاً</option>
                          <option value="total-asc">💰 التكلفة: الأقل أولاً</option>
                        </select>
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                          <ArrowUpDown className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Indicator showing filters applied */}
                  {(servicesSearchQuery || servicesFilterCategory !== 'all') && (
                    <div className="flex justify-between items-center text-[10px] bg-amber-500/5 text-amber-800 border border-amber-500/10 rounded-lg py-1.5 px-3 font-sans">
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>تم تطبيق الفرز المتطور بنجاح.</span>
                      </div>
                      <button 
                        onClick={() => {
                          setServicesSearchQuery('');
                          setServicesFilterCategory('all');
                          setServicesSortKey('name-asc');
                        }}
                        className="font-bold underline hover:text-amber-950 transition-colors"
                      >
                        إعادة تهيئة الافتراضي ✕
                      </button>
                    </div>
                  )}

                  {/* Main Render Grid of cards */}
                  {(() => {
                    const filteredAndSortedServices = services.filter(s => {
                      const matchesSearch = servicesSearchQuery.trim() === '' || 
                        s.name.toLowerCase().includes(servicesSearchQuery.toLowerCase()) ||
                        s.description.toLowerCase().includes(servicesSearchQuery.toLowerCase());
                      const matchesCategory = servicesFilterCategory === 'all' || s.category === servicesFilterCategory;
                      return matchesSearch && matchesCategory;
                    }).sort((a, b) => {
                      const costA = a.govFee + a.officeFee * 1.15;
                      const costB = b.govFee + b.officeFee * 1.15;
                      if (servicesSortKey === 'name-asc') return a.name.localeCompare(b.name, 'ar');
                      if (servicesSortKey === 'name-desc') return b.name.localeCompare(a.name, 'ar');
                      if (servicesSortKey === 'total-asc') return costA - costB;
                      if (servicesSortKey === 'total-desc') return costB - costA;
                      return 0;
                    });

                    if (filteredAndSortedServices.length === 0) {
                      return (
                        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3 shadow-3xs animate-fade-in">
                          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto">
                            <Search className="w-6 h-6" />
                          </div>
                          <h4 className="font-extrabold text-slate-700 text-sm">لم يتم العثور على أي نتائج مطابقة</h4>
                          <p className="text-slate-400 text-xs font-sans max-w-sm mx-auto leading-normal">
                            لم نجد خدمة تابعة لـ <strong className="text-slate-700">"{servicesSearchQuery}"</strong> أو الفئة المذكورة. يرجى مراجعة التهجئة أو التصفية مجدداً.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setServicesSearchQuery('');
                              setServicesFilterCategory('all');
                            }}
                            className="bg-slate-900 text-white font-bold text-[10px] px-3.5 py-1.5 rounded-lg hover:bg-slate-800 transition-all font-sans"
                          >
                            عرض كافة الخدمات النشطة
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredAndSortedServices.map(s => {
                          const isEditing = editingService && editingService.id === s.id;

                          if (isEditing && editingService) {
                            const taxTotal = editingService.officeFee * 0.15;
                            const combineTotal = editingService.govFee + editingService.officeFee + taxTotal;

                            return (
                              <form 
                                key={s.id} 
                                onSubmit={handleUpdateServiceSubmit}
                                className="bg-amber-50/40 border-2 border-amber-400 rounded-2xl p-5 shadow-inner space-y-4 text-xs font-sans animate-fade-in"
                              >
                                <div className="flex justify-between items-center border-b border-amber-200 pb-2.5">
                                  <span className="font-black text-amber-950 text-sm flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4 text-amber-600 animate-spin" />
                                    <span>تحديث المعاملة: {s.name}</span>
                                  </span>
                                  <button 
                                    type="button" 
                                    onClick={() => setEditingService(null)}
                                    className="text-slate-500 hover:text-slate-800 font-extrabold text-sm"
                                  >
                                    ✕
                                  </button>
                                </div>

                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-slate-700 font-bold mb-1">اسم الخدمة المعروض:</label>
                                    <input
                                      type="text"
                                      required
                                      value={editingService.name}
                                      onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 bg-white"
                                    />
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-slate-700 font-bold mb-1">الرسوم الحكومية (ر.س):</label>
                                      <input
                                        type="number"
                                        required
                                        value={editingService.govFee}
                                        onChange={(e) => setEditingService({ ...editingService, govFee: Number(e.target.value) || 0 })}
                                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 font-mono bg-white"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-slate-700 font-bold mb-1">أتعاب المكتب (ر.س):</label>
                                      <input
                                        type="number"
                                        required
                                        value={editingService.officeFee}
                                        onChange={(e) => setEditingService({ ...editingService, officeFee: Number(e.target.value) || 0 })}
                                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 font-mono bg-white"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-slate-900 font-bold mb-1">فئة الخدمة:</label>
                                      <select
                                        value={editingService.category}
                                        onChange={(e) => setEditingService({ ...editingService, category: e.target.value as any })}
                                        className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-xs text-slate-900 font-medium"
                                      >
                                        <option value="visa">خدمات تأشيرات</option>
                                        <option value="gov">تعقيب ومراجعة دائرية</option>
                                        <option value="transport">نقل ومواصلات</option>
                                        <option value="other">خدمات عامة</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-slate-700 font-bold mb-1">الأيقونة البصرية:</label>
                                      <select
                                        value={editingService.icon}
                                        onChange={(e) => setEditingService({ ...editingService, icon: e.target.value })}
                                        className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-xs"
                                      >
                                        <option value="FileText">ملف ومعاملة (FileText)</option>
                                        <option value="Briefcase">حقيبة أعمال واستقدام (Briefcase)</option>
                                        <option value="Compass">بوصلة استكشاف وتوجيه (Compass)</option>
                                        <option value="Users">مجموعات وأفراد وعائلات (Users)</option>
                                        <option value="Truck">شحن بري ونقل لوجستي (Truck)</option>
                                        <option value="Plane">طيران وسفر خارجي (Plane)</option>
                                        <option value="ShieldCheck">تأكيد وأمان وضمان (ShieldCheck)</option>
                                        <option value="Activity">متابعة مسار وحالة (Activity)</option>
                                        <option value="FileSpreadsheet">تقارير وجداول معاملات (FileSpreadsheet)</option>
                                        <option value="Coins">رسوم وتكلفة مالية (Coins)</option>
                                        <option value="Calendar">مواعيد وحجوزات مجدولة (Calendar)</option>
                                        <option value="HelpCircle">استفسارات ودعم فني (HelpCircle)</option>
                                        <option value="Receipt">فاتورة وضريبة (Receipt)</option>
                                        <option value="Home">خدمات سكنية وإقامة (Home)</option>
                                      </select>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-slate-700 font-bold mb-1">الشرح التفصيلي للعميل:</label>
                                    <textarea
                                      required
                                      value={editingService.description}
                                      onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 h-16 bg-white"
                                    ></textarea>
                                  </div>

                                  {/* Link Payment Methods when editing */}
                                  <div className="space-y-1.5 text-right border-t border-amber-200/50 pt-2.5">
                                    <label className="block text-slate-850 font-bold mb-1 flex items-center justify-start gap-1">
                                      <span>💳 طرق السداد والدفع المرتبطة بالخدمة:</span>
                                    </label>
                                    <div className="grid grid-cols-2 gap-1.5 p-2 bg-amber-500/5 border border-amber-200/60 rounded-lg">
                                      {AVAILABLE_PAYMENT_METHODS.map((pm) => {
                                        const methods = editingService.paymentMethods || [];
                                        const isChecked = methods.includes(pm.id);
                                        return (
                                          <label
                                            key={pm.id}
                                            className="flex items-center gap-1.5 text-[10px] select-none cursor-pointer p-1"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={() => {
                                                const updatedMethods = isChecked
                                                  ? methods.filter(id => id !== pm.id)
                                                  : [...methods, pm.id];
                                                setEditingService({
                                                  ...editingService,
                                                  paymentMethods: updatedMethods
                                                });
                                              }}
                                              className="w-3.5 h-3.5 rounded text-amber-600 border-slate-300 focus:ring-amber-500"
                                            />
                                            <span className="font-black text-slate-800">{pm.badge}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  <div className="bg-amber-100/40 p-3 rounded-lg border border-amber-200 text-[10px] font-mono select-none border-t pt-2.5 mt-2">
                                    <span className="block text-amber-900 font-bold mb-1">الاحتساب الضريبي للعميل (15%):</span>
                                    <div className="space-y-0.5 text-slate-650 font-semibold">
                                      <p className="flex justify-between"><span>أتعاب سما المعتمدة:</span> <span>{editingService.officeFee.toFixed(2)} ر.س</span></p>
                                      <p className="flex justify-between"><span>الضريبة المضافة:</span> <span>{taxTotal.toFixed(2)} ر.س</span></p>
                                      <p className="flex justify-between border-t border-amber-200 pt-0.5 text-slate-900 font-extrabold"><span>المجموع الكلي المقدر بالدليل:</span> <span>{combineTotal.toFixed(2)} ر.س</span></p>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex gap-2 justify-end pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditingService(null)}
                                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg border border-slate-300 transition text-xs"
                                  >
                                    إلغاء
                                  </button>
                                  <button
                                    type="submit"
                                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-lg shadow-sm transition text-xs"
                                  >
                                    حفظ التعديلات بالمكتب
                                  </button>
                                </div>
                              </form>
                            );
                          }

                          const taxTotal = s.officeFee * 0.15;
                          const combineTotal = s.govFee + s.officeFee + taxTotal;

                          // Dynamic badge layout styling for elegant visuals
                          let badgeStyle = "bg-slate-50 text-slate-750 border-slate-150";
                          if (s.category === 'visa') badgeStyle = "bg-purple-50 text-purple-700 border-purple-100";
                          else if (s.category === 'gov') badgeStyle = "bg-amber-50 text-amber-700 border-amber-100";
                          else if (s.category === 'transport') badgeStyle = "bg-blue-50 text-blue-700 border-blue-100";
                          else if (s.category === 'other') badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-100";

                          return (
                            <div 
                              key={s.id} 
                              className="group relative bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between overflow-hidden"
                            >
                              {/* Aesthetic corner color banner depending on category */}
                              <div className={`absolute top-0 right-0 left-0 h-1.5 ${
                                s.category === 'visa' ? 'bg-purple-500' :
                                s.category === 'gov' ? 'bg-amber-500' :
                                s.category === 'transport' ? 'bg-blue-500' : 'bg-emerald-500'
                              }`}></div>

                              <div>
                                <div className="flex justify-between items-start mb-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-xl border transition-colors ${
                                      s.category === 'visa' ? 'bg-purple-50 border-purple-100 text-purple-700' :
                                      s.category === 'gov' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                                      s.category === 'transport' ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                    }`}>
                                      {renderServiceIcon(s.icon, "w-6 h-6")}
                                    </div>
                                    <div>
                                      <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-amber-800 transition-colors leading-tight mb-1">{s.name}</h4>
                                      <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badgeStyle} font-sans`}>
                                        {s.category === 'visa' && '🛂 خدمات تأشيرات'}
                                        {s.category === 'gov' && '🏛️ تعقيب ومراجعة دائرية'}
                                        {s.category === 'transport' && '🚚 نقل ومواصلات'}
                                        {s.category === 'other' && '⚙️ خدمات عامة مخصصة'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Action button triggers list */}
                                  <div className="flex gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                                    <button
                                      type="button"
                                      onClick={() => setEditingService(s)}
                                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/60 rounded-lg text-[10px] font-bold transition-all"
                                      title="تعديل تفاصيل وأسعار الخدمة"
                                    >
                                      تعديل الأسعار
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteService(s.id)}
                                      className="p-1.5 border border-slate-100 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors"
                                      title="إزالة وإخفاء الخدمة"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                <p className="text-slate-600 text-xs leading-relaxed mb-5 min-h-[40px] font-sans line-clamp-3">
                                  {s.description}
                                </p>
                              </div>

                              {/* Financial ledger summary block with great visual cues */}
                              <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 text-xs font-mono space-y-2 mt-auto">
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-500 font-sans flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                    <span>رسوم الدولة (مدفوعة ومباشرة):</span>
                                  </span> 
                                  <strong className="text-slate-900 font-bold">{s.govFee.toFixed(2)} ر.س</strong>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-500 font-sans flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                    <span>أتعاب المعاملة لدى سما:</span>
                                  </span> 
                                  <strong className="text-slate-900 font-bold">{s.officeFee.toFixed(2)} ر.س</strong>
                                </div>
                                <div className="flex justify-between items-center text-[11px] text-slate-500 pr-2 border-r-2 border-slate-200 select-none">
                                  <span className="font-sans">مشمول ضريبة مضافة (15%):</span>
                                  <span>{taxTotal.toFixed(2)} ر.س</span>
                                </div>
                                
                                <div className="flex justify-between items-center border-t border-dashed border-slate-200 pt-2 font-black text-amber-900 text-[13px] font-sans">
                                  <span className="flex items-center gap-1">
                                    <Coins className="w-4 h-4 text-amber-600" />
                                    <span>المجموع الشامل التقديري:</span>
                                  </span>
                                  <strong className="font-mono text-amber-950 text-sm">{combineTotal.toFixed(2)} ر.س</strong>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* SOCIAL MEDIA CHANNELS MANAGEMENT CARD */}
                <div className="bg-gradient-to-l from-slate-900 to-slate-850 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-6 mt-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="font-extrabold text-amber-500 text-lg flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                        <span>تهيئة وربط قنوات التواصل الاجتماعي الرسمية بمكتب سما المملكة</span>
                      </h3>
                      <p className="text-slate-400 text-xs mt-1 font-sans">
                        تحرير وتحديث الروابط النشطة للحسابات والشبكات الاجتماعية للمكتب. تظهر هذه الروابط فوراً في تذييل المنصة (Footer) لمساعدة المراجعين والعملاء.
                      </p>
                    </div>
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 font-bold px-3 py-1 rounded-full border border-amber-500/20">
                      قنوات للتواصل والربط الحقيقي
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs text-right">
                    
                    {/* Facebook */}
                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-1.5 step-card">
                      <label className="block text-slate-300 font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-blue-600">
                          <Facebook className="w-4 h-4" />
                          <span>رابط صفحة الفيسبوك (Facebook):</span>
                        </span>
                        <span className="text-[10.5px] text-slate-500 font-mono">Facebook</span>
                      </label>
                      <input
                        type="url"
                        value={socialFacebook}
                        onChange={(e) => setSocialFacebook(e.target.value)}
                        placeholder="https://facebook.com/your_page"
                        className="w-full p-2.5 border border-slate-700 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-950 text-slate-100 font-sans leading-relaxed text-right"
                      />
                    </div>

                    {/* Twitter / X */}
                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-1.5 step-card">
                      <label className="block text-slate-300 font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-amber-550">
                          <Twitter className="w-4 h-4" />
                          <span>رابط حساب تويتر / منصة X:</span>
                        </span>
                        <span className="text-[10.5px] text-slate-500 font-mono">X.com</span>
                      </label>
                      <input
                        type="url"
                        value={socialTwitter}
                        onChange={(e) => setSocialTwitter(e.target.value)}
                        placeholder="https://x.com/your_username"
                        className="w-full p-2.5 border border-slate-700 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-950 text-slate-100 font-sans leading-relaxed text-right"
                      />
                    </div>

                    {/* Instagram */}
                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-1.5 step-card">
                      <label className="block text-slate-300 font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-pink-500">
                          <Instagram className="w-4 h-4" />
                          <span>رابط حساب إنستغرام الرسمي:</span>
                        </span>
                        <span className="text-[10.5px] text-slate-500 font-mono">Instagram</span>
                      </label>
                      <input
                        type="url"
                        value={socialInstagram}
                        onChange={(e) => setSocialInstagram(e.target.value)}
                        placeholder="https://instagram.com/your_username"
                        className="w-full p-2.5 border border-slate-700 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-950 text-slate-100 font-sans leading-relaxed text-right"
                      />
                    </div>

                    {/* Snapchat */}
                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-1.5 step-card">
                      <label className="block text-slate-300 font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-amber-450">
                          <span className="text-sm">👻</span>
                          <span>رابط حساب سناب شات:</span>
                        </span>
                        <span className="text-[10.5px] text-slate-500 font-mono">Snapchat</span>
                      </label>
                      <input
                        type="url"
                        value={socialSnapchat}
                        onChange={(e) => setSocialSnapchat(e.target.value)}
                        placeholder="https://snapchat.com/add/your_username"
                        className="w-full p-2.5 border border-slate-700 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-950 text-slate-100 font-sans leading-relaxed text-right"
                      />
                    </div>

                    {/* LinkedIn */}
                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-1.5 step-card">
                      <label className="block text-slate-300 font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-blue-500">
                          <Linkedin className="w-4 h-4" />
                          <span>رابط حساب لينكد إن للمؤسسة:</span>
                        </span>
                        <span className="text-[10.5px] text-slate-500 font-mono">LinkedIn</span>
                      </label>
                      <input
                        type="url"
                        value={socialLinkedin}
                        onChange={(e) => setSocialLinkedin(e.target.value)}
                        placeholder="https://linkedin.com/company/your_company"
                        className="w-full p-2.5 border border-slate-700 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-950 text-slate-100 font-sans leading-relaxed text-right"
                      />
                    </div>

                    {/* WhatsApp */}
                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-1.5 step-card">
                      <label className="block text-slate-300 font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-emerald-500">
                          <MessageSquare className="w-4 h-4" />
                          <span>رابط واتساب المباشر للخدمة:</span>
                        </span>
                        <span className="text-[10.5px] text-slate-500 font-mono">WhatsApp Call</span>
                      </label>
                      <input
                        type="url"
                        value={socialWhatsapp}
                        onChange={(e) => setSocialWhatsapp(e.target.value)}
                        placeholder="https://wa.me/966XXXXXXXXX"
                        className="w-full p-2.5 border border-slate-700 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-950 text-slate-100 font-sans leading-relaxed text-right"
                      />
                    </div>

                    {/* WhatsApp Jobs Channel */}
                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-1.5 step-card md:col-span-2 lg:col-span-3">
                      <label className="block text-slate-300 font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <MessageSquare className="w-4 h-4 text-emerald-400" />
                          <span>قناة مكتب سما المملكة وظائف وتوظيف الأيدي العاملة في واتساب (رابط القناة الرسمي):</span>
                        </span>
                        <span className="text-[10.5px] text-slate-500 font-mono">WhatsApp Channel</span>
                      </label>
                      <input
                        type="url"
                        value={socialWhatsappChannel}
                        onChange={(e) => setSocialWhatsappChannel(e.target.value)}
                        placeholder="https://whatsapp.com/channel/..."
                        className="w-full p-2.5 border border-slate-700 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-950 text-slate-100 font-sans leading-relaxed text-right"
                      />
                    </div>

                    {/* Custom Office Domain Link */}
                    <div className="bg-slate-950/40 p-4 rounded-xl border border-amber-500/30 space-y-1.5 step-card md:col-span-2 lg:col-span-1.5 text-right font-sans">
                      <label className="block text-slate-300 font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-amber-500">
                          <ExternalLink className="w-4 h-4 text-amber-500" />
                          <span>رابط الموقع المخصص للمكتب (اسم النطاق):</span>
                        </span>
                        <span className="text-[10.5px] text-slate-500 font-mono">Website Domain</span>
                      </label>
                      <input
                        type="text"
                        value={officeDomain}
                        onChange={(e) => setOfficeDomain(e.target.value)}
                        placeholder="sama-almamlakah.online"
                        className="w-full p-2.5 border border-slate-700 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-950 text-slate-100 font-sans leading-relaxed text-right font-mono text-sm"
                      />
                      <p className="text-[10px] text-slate-400 pt-1">سيظهر هذا الرابط بشكل ممتاز ومبهر وجذاب في بنر دليل النفاذ والمشاركة والـ QR لجميع المراجعين.</p>
                    </div>

                    {/* Toggle Verified QR URL Banner */}
                    <div className="bg-slate-950/40 p-4 rounded-xl border border-amber-500/30 space-y-1.5 step-card md:col-span-2 lg:col-span-1.5 text-right flex flex-col justify-between font-sans">
                      <div>
                        <label className="block text-slate-300 font-bold flex items-center justify-between mb-1">
                          <span className="flex items-center gap-1.5 text-amber-550">
                            <QrCode className="w-4 h-4 text-amber-500" />
                            <span>تفعيل وعرض بنر الـ QR والرابط المطور:</span>
                          </span>
                        </label>
                        <p className="text-[10px] text-slate-400 mb-2">تحديد ما إذا كان بنر النفاذ الرقمي المبتكر برابط الموقع الموثق والباركود يظهر للزوار في الصفحة الرئيسية.</p>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-start gap-4 pt-1">
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="radio"
                            checked={showBrandedUrlBanner === true}
                            onChange={() => setShowBrandedUrlBanner(true)}
                            className="w-4 h-4 text-amber-600 border-slate-700 focus:ring-amber-500 bg-slate-950"
                          />
                          <span className="text-[11px] font-bold text-slate-100">إظهار بنر الرابط المطور في الرئيسية</span>
                        </label>

                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="radio"
                            checked={showBrandedUrlBanner === false}
                            onChange={() => setShowBrandedUrlBanner(false)}
                            className="w-4 h-4 text-slate-700 border-slate-700 focus:ring-amber-500 bg-slate-950"
                          />
                          <span className="text-[11px] font-bold text-slate-300">إخفاء البنر</span>
                        </label>
                      </div>
                    </div>

                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem('sm_social_facebook', socialFacebook);
                        localStorage.setItem('sm_social_twitter', socialTwitter);
                        localStorage.setItem('sm_social_instagram', socialInstagram);
                        localStorage.setItem('sm_social_snapchat', socialSnapchat);
                        localStorage.setItem('sm_social_linkedin', socialLinkedin);
                        localStorage.setItem('sm_social_whatsapp', socialWhatsapp);
                        localStorage.setItem('sm_social_whatsapp_channel', socialWhatsappChannel);
                        localStorage.setItem('sm_office_domain', officeDomain);
                        localStorage.setItem('sm_show_branded_url_banner', String(showBrandedUrlBanner));
                        setSaveSuccessSocialLinks(true);
                        setTimeout(() => setSaveSuccessSocialLinks(false), 4000);
                      }}
                      className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-black px-6 py-2.5 rounded-lg text-xs shadow-md transition duration-150 flex items-center gap-2 active:scale-98 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>حفظ وتطبيق روابط صفحات التواصل الاجتماعي والربط المخصص</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSocialFacebook('https://facebook.com/SamakingdomOffice');
                        setSocialTwitter('https://x.com/sama_almamlakah');
                        setSocialInstagram('https://instagram.com/sama_almamlakah');
                        setSocialSnapchat('https://snapchat.com/add/sama_mamlakah');
                        setSocialLinkedin('https://linkedin.com/company/sama-almamlakah');
                        setSocialWhatsapp('https://wa.me/967778259418');
                        setSocialWhatsappChannel('https://whatsapp.com/channel/0029Vb6XdRxLNSaBok90XK2C');
                      }}
                      className="bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold px-4 py-2.5 rounded-lg text-xs border border-slate-700 transition duration-150"
                    >
                      تصفير للروابط الافتراضية
                    </button>

                    {saveSuccessSocialLinks && (
                      <span className="text-emerald-400 text-xs font-bold animate-pulse font-sans flex items-center gap-1.5 mr-auto">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>تم تحديث وتثبيت كافة روابط التواصل بنجاح! سيراها الزوار في تذييل البوابة المباشرة.</span>
                      </span>
                    )}
                  </div>
                </div>

              </div>
            )}
            
            {adminTab === 'whatsapp' && (
              <div className="space-y-8 animate-fade-in font-sans">
                
                {/* WHATSAPP OVERVIEW & STATISTICS CARD */}
                <div className="bg-white p-6 rounded-xl shadow border border-slate-200">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-emerald-600" />
                        <span>بوابة إشعار العملاء والربط التلقائي بـ WhatsApp</span>
                      </h3>
                      <p className="text-slate-500 text-xs mt-1">
                        يقوم النظام الذكي تلقائياً بإرسال رسائل WhatsApp مخصصة إلى جوال العميل فور تغيير حالة المعاملة إلى <strong className="text-emerald-700 font-bold">"مكتملة ومستند الفاتورة جاهز"</strong> أو <strong className="text-red-700 font-bold">"ملغية"</strong> عبر البوابة الرقمية النشطة.
                      </p>
                    </div>
                    <div className="flex gap-2.5">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full select-none">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>بوابة WhatsApp النشطة: متصلة (MOCK_API)</span>
                      </span>
                    </div>
                  </div>

                  {/* Operational statistics */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">إجمالي الإشعارات الصادرة</span>
                        <strong className="text-xl font-black text-slate-900 font-mono mt-0.5 block">{whatsappLogs.length}</strong>
                      </div>
                      <Send className="w-5 h-5 text-slate-400" />
                    </div>

                    <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-emerald-800 font-bold block">نسبة نجاح التوصيل الفوري</span>
                        <strong className="text-xl font-black text-emerald-950 font-mono mt-0.5 block">
                          {whatsappLogs.length > 0 
                            ? `${Math.round((whatsappLogs.filter(l => l.success).length / whatsappLogs.length) * 100)}%` 
                            : '100%'
                          }
                        </strong>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">إرسال يدوي / تجريبي</span>
                        <strong className="text-xl font-black text-slate-900 font-mono mt-0.5 block">
                          {whatsappLogs.filter(l => l.message.includes('[إرسال تجريبي]')).length || 0}
                        </strong>
                      </div>
                      <Sparkles className="w-5 h-5 text-amber-500" />
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">متوسط زمن الاستجابة</span>
                        <strong className="text-xl font-black text-slate-900 font-mono mt-0.5 block">{waGatewayType === 'mock' ? '240ms' : '650ms'}</strong>
                      </div>
                      <Activity className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* ACTIVE WHATSAPP API GATEWAY & CREDENTIALS SECTION */}
                <div className="bg-white p-6 rounded-xl shadow border border-slate-200 space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <Lock className="w-5 h-5 text-emerald-600" />
                      <span>إعدادات وربط مزود خدمة الـ WhatsApp Business API الحقيقي</span>
                    </h3>
                    <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                      اختر طريقة وقنوات الإرسال المباشرة لعملائك. يدعم مكتب سما المملكة كلاً من بوابة <strong className="text-emerald-700 font-bold">Twilio</strong> العالمية وبوابة <strong className="text-emerald-750 font-bold">UltraMsg</strong> الفورية، كما يدعم خيار محاكاة الإرسال للأغراض التدريبية والتجريبية.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Gateway Selector Radio Cards */}
                    <div className="md:col-span-1 space-y-3">
                      <label className="block text-xs font-black text-slate-700">مزوّد الخدمة النشط حالياً:</label>
                      <div className="space-y-2.5">
                        
                        {/* Mock Radio Box */}
                        <label className={`block p-3 rounded-lg border cursor-pointer transition-all ${waGatewayType === 'mock' ? 'bg-slate-50 border-slate-900 ring-1 ring-slate-900' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                          <div className="flex items-center gap-2.5">
                            <input 
                              type="radio" 
                              name="waGatewayType" 
                              value="mock" 
                              checked={waGatewayType === 'mock'} 
                              onChange={(e) => setWaGatewayType(e.target.value)}
                              className="accent-slate-900" 
                            />
                            <div className="text-right">
                              <span className="block font-bold text-xs text-slate-800">بوابة محاكاة افتراضية</span>
                              <span className="text-[10px] text-slate-450 block">محاكاة إجرائية آمنة بدون إرسال حقيقي</span>
                            </div>
                          </div>
                        </label>

                        {/* Twilio Radio Box */}
                        <label className={`block p-3 rounded-lg border cursor-pointer transition-all ${waGatewayType === 'twilio' ? 'bg-emerald-50/20 border-emerald-600 ring-1 ring-emerald-600' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                          <div className="flex items-center gap-2.5">
                            <input 
                              type="radio" 
                              name="waGatewayType" 
                              value="twilio" 
                              checked={waGatewayType === 'twilio'} 
                              onChange={(e) => setWaGatewayType(e.target.value)}
                              className="accent-emerald-600" 
                            />
                            <div className="text-right">
                              <span className="block font-bold text-xs text-slate-800">بوابة Twilio WhatsApp (العالمية)</span>
                              <span className="text-[10px] text-slate-450 block">ربط معتمد يحتاج لتوثيق المنصات</span>
                            </div>
                          </div>
                        </label>

                        {/* UltraMsg Radio Box */}
                        <label className={`block p-3 rounded-lg border cursor-pointer transition-all ${waGatewayType === 'ultramsg' ? 'bg-emerald-50/20 border-emerald-600 ring-1 ring-emerald-600' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                          <div className="flex items-center gap-2.5">
                            <input 
                              type="radio" 
                              name="waGatewayType" 
                              value="ultramsg" 
                              checked={waGatewayType === 'ultramsg'} 
                              onChange={(e) => setWaGatewayType(e.target.value)}
                              className="accent-emerald-600" 
                            />
                            <div className="text-right">
                              <span className="block font-bold text-xs text-slate-800">بوابة UltraMsg (الإرسال الفوري)</span>
                              <span className="text-[10px] text-slate-450 block">إرسال لحظي ومباشر من رقم جوالك الخاص</span>
                            </div>
                          </div>
                        </label>

                      </div>
                    </div>

                    {/* Gateway Key Forms */}
                    <div className="md:col-span-2 bg-slate-50 border border-slate-150 rounded-xl p-5 space-y-4">
                      
                      {waGatewayType === 'mock' && (
                        <div className="space-y-3 text-right">
                          <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-slate-500" />
                            <span>تفاصيل بوابة المحاكاة والدعم الافتراضي:</span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed font-sans font-medium">
                            تم تفعيل قنوات المحاكاة الآمنة بشكل تلقائي ومجاني لكافة عمليات البوابة. لن يتطلب هذا الخيار إدخال أي تفاصيل أو حجز اشتراكات مدفوعة، وسيتم محاكاة توجيه الإشعارات إلى لوحة السجلات الفورية للمكتب بشكل سليم.
                          </p>
                          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-[10.5px] text-amber-800 font-sans leading-relaxed font-semibold">
                            💡 لتفعيل الإرسال الحقيقي إلى هواتف ومستقبلي المعاملات، يرجى ملء وتعديل خيار <strong>Twilio</strong> أو <strong>UltraMsg</strong> من القائمة المجاورة وحفظ البيانات.
                          </div>
                        </div>
                      )}

                      {waGatewayType === 'twilio' && (
                        <div className="space-y-4 text-right animate-fade-in text-xs">
                          <div className="text-xs font-black text-slate-800 border-b border-slate-200 pb-1.5 flex justify-between items-center">
                            <span>🔑 تفاصيل الاتصال ببوابة Twilio API:</span>
                            <span className="text-[10px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-mono">E.164 REQUIRED</span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="block text-slate-600 font-bold">معرّف الحساب (Account SID):</label>
                              <input 
                                type="text" 
                                value={twilioAccountSid} 
                                onChange={(e) => setTwilioAccountSid(e.target.value)}
                                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                className="w-full p-2 border border-slate-200 rounded focus:outline-none focus:border-emerald-600 font-mono text-left block text-[11px] bg-white text-slate-900"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-slate-600 font-bold">رمز التوثيق السري (Auth Token):</label>
                              <input 
                                type="password" 
                                value={twilioAuthToken} 
                                onChange={(e) => setTwilioAuthToken(e.target.value)}
                                placeholder="••••••••••••••••••••••••••••••••"
                                className="w-full p-2 border border-slate-200 rounded focus:outline-none focus:border-emerald-600 font-mono text-left block text-[11px] bg-white text-slate-900"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-slate-600 font-bold">رقم WhatsApp المعتمد لدى الإرسال (Sender Number):</label>
                            <input 
                              type="text" 
                              value={twilioSender} 
                              onChange={(e) => setTwilioSender(e.target.value)}
                              placeholder="whatsapp:+14155238886"
                              className="w-full p-2 border border-slate-200 rounded focus:outline-none focus:border-emerald-600 font-mono text-left block text-[11px] bg-white text-slate-900"
                            />
                            <p className="text-[9.5px] text-slate-450 leading-tight">
                              * أدخل رقم المرسل المخصص لك بالواتساب مع البادئة (whatsapp+). للبيئة التجريبية، استخدم رقم Twilio الموحد: <code className="bg-slate-200 text-slate-800 px-1 rounded font-mono font-bold">whatsapp:+14155238886</code>
                            </p>
                          </div>
                        </div>
                      )}

                      {waGatewayType === 'ultramsg' && (
                        <div className="space-y-4 text-right animate-fade-in text-xs">
                          <div className="text-xs font-black text-slate-800 border-b border-slate-200 pb-1.5 flex justify-between items-center">
                            <span>🚀 تفاصيل الاتصال بـ UltraMsg Gateway:</span>
                            <span className="text-[10px] bg-emerald-105 text-emerald-800 px-2 py-0.5 rounded font-black">INSTANT DELIVERY</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="block text-slate-600 font-bold">معرف المثيل (Instance ID):</label>
                              <input 
                                type="text" 
                                value={ultramsgInstanceId} 
                                onChange={(e) => setUltramsgInstanceId(e.target.value)}
                                placeholder="instance12345"
                                className="w-full p-2 border border-slate-200 rounded focus:outline-none focus:border-emerald-600 font-mono text-left block text-[11px] bg-white text-slate-900"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-slate-600 font-bold">رمز الاتصال بالبوابة (Token):</label>
                              <input 
                                type="password" 
                                value={ultramsgToken} 
                                onChange={(e) => setUltramsgToken(e.target.value)}
                                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                className="w-full p-2 border border-slate-200 rounded focus:outline-none focus:border-emerald-600 font-mono text-left block text-[11px] bg-white text-slate-900"
                              />
                            </div>
                          </div>
                          
                          <p className="text-[10px] text-slate-450 font-sans leading-relaxed">
                            💡 بوابة <strong>UltraMsg</strong> تتميز بقدرتها على بث أي محتوى فوري ومباشر دون تقييد بقوالب معتمدة مسبقاً، وذلك من خلال مسح كود الـ QR الخاص بجوال المنصة في لوحة تحكم حساب UltraMsg الخاص بكم.
                          </p>
                        </div>
                      )}

                      {/* Saving action */}
                      <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            localStorage.setItem('sm_wa_gateway_type', waGatewayType);
                            localStorage.setItem('sm_twilio_account_sid', twilioAccountSid);
                            localStorage.setItem('sm_twilio_auth_token', twilioAuthToken);
                            localStorage.setItem('sm_twilio_sender', twilioSender);
                            localStorage.setItem('sm_ultramsg_instance_id', ultramsgInstanceId);
                            localStorage.setItem('sm_ultramsg_token', ultramsgToken);
                            
                            setSaveSuccessWaCreds(true);
                            setTimeout(() => setSaveSuccessWaCreds(false), 3500);
                          }}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded transition-all cursor-pointer flex items-center gap-1 shadow active:scale-98"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>حفظ وتنشيط بوابة الإرسال المحددة ⚡</span>
                        </button>

                        {saveSuccessWaCreds && (
                          <span className="text-emerald-700 font-extrabold text-[10.5px] animate-pulse flex items-center gap-1">
                            ✓ تم تثبيت وتنشيط بوابة الواتساب المحددة بنجاح في النظام!
                          </span>
                        )}
                      </div>

                    </div>
                  </div>
                </div>

                {/* TEMPLATE CUSTOMIZATION SECTION */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Template Pending Editing Card */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-amber-100 pb-3">
                      <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                        <span>قالب رسالة استلام المعاملة وبدء الانتظار</span>
                      </h4>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">Pending</span>
                    </div>

                    <div>
                      <label className="block text-slate-700 text-xs font-bold mb-1.5">نص قالب الرسالة:</label>
                      <textarea
                        value={whatsappTemplatePending}
                        onChange={(e) => setWhatsappTemplatePending(e.target.value)}
                        className="w-full text-xs p-3 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 leading-relaxed font-sans h-28"
                        placeholder="اكتب قالب الرسالة هنا..."
                      />
                      <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px] text-slate-500">
                        <span className="font-bold">إدراج رمز سريع:</span>
                        <button type="button" onClick={() => setWhatsappTemplatePending(prev => prev + '{name}')} className="px-1.5 py-0.5 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-350 text-indigo-700 rounded transition font-mono font-bold" title="إدراج اسم العميل">{"{name}"}</button>
                        <button type="button" onClick={() => setWhatsappTemplatePending(prev => prev + '{service}')} className="px-1.5 py-0.5 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-350 text-indigo-700 rounded transition font-mono font-bold" title="إدراج اسم الخدمة">{"{service}"}</button>
                        <button type="button" onClick={() => setWhatsappTemplatePending(prev => prev + '{status}')} className="px-1.5 py-0.5 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-350 text-indigo-700 rounded transition font-mono font-bold" title="إدراج وصف الحالة">{"{status}"}</button>
                        <button type="button" onClick={() => setWhatsappTemplatePending(prev => prev + '{phone}')} className="px-1.5 py-0.5 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-350 text-indigo-700 rounded transition font-mono font-bold" title="إدراج رقم الجوال">{"{phone}"}</button>
                        <button type="button" onClick={() => setWhatsappTemplatePending(prev => prev + '{bookingId}')} className="px-1.5 py-0.5 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-350 text-indigo-700 rounded transition font-mono font-bold" title="إدراج رقم المعاملة">{"{bookingId}"}</button>
                      </div>
                    </div>

                    {/* Live Preview */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs leading-normal">
                      <span className="font-extrabold text-[10px] text-slate-500 block mb-1">🔍 معاينة حية للمحتوى الصادر:</span>
                      <p className="text-slate-700 italic pr-3 border-r-2 border-slate-300">
                        {whatsappTemplatePending
                          .replace(/{name}/g, 'خالد عبد الكريم الخالد')
                          .replace(/{service}/g, 'استقدام عمالة منزلية')
                          .replace(/{status}/g, 'قيد الانتظار لمراجعة الإدارة')
                          .replace(/{phone}/g, '0543210987')
                          .replace(/{bookingId}/g, 'REQ-10903')
                        }
                      </p>
                    </div>
                  </div>

                  {/* Template Processing Editing Card */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-indigo-100 pb-3">
                      <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                        <span>قالب رسالة بدء معالجة المعاملة والتعقيب</span>
                      </h4>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">Processing</span>
                    </div>

                    <div>
                      <label className="block text-slate-700 text-xs font-bold mb-1.5">نص قالب الرسالة:</label>
                      <textarea
                        value={whatsappTemplateProcessing}
                        onChange={(e) => setWhatsappTemplateProcessing(e.target.value)}
                        className="w-full text-xs p-3 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 leading-relaxed font-sans h-28"
                        placeholder="اكتب قالب الرسالة هنا..."
                      />
                      <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px] text-slate-500">
                        <span className="font-bold">إدراج رمز سريع:</span>
                        <button type="button" onClick={() => setWhatsappTemplateProcessing(prev => prev + '{name}')} className="px-1.5 py-0.5 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-350 text-indigo-700 rounded transition font-mono font-bold" title="إدراج اسم العميل">{"{name}"}</button>
                        <button type="button" onClick={() => setWhatsappTemplateProcessing(prev => prev + '{service}')} className="px-1.5 py-0.5 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-350 text-indigo-700 rounded transition font-mono font-bold" title="إدراج اسم الخدمة">{"{service}"}</button>
                        <button type="button" onClick={() => setWhatsappTemplateProcessing(prev => prev + '{status}')} className="px-1.5 py-0.5 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-350 text-indigo-700 rounded transition font-mono font-bold" title="إدراج وصف الحالة">{"{status}"}</button>
                        <button type="button" onClick={() => setWhatsappTemplateProcessing(prev => prev + '{phone}')} className="px-1.5 py-0.5 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-350 text-indigo-700 rounded transition font-mono font-bold" title="إدراج رقم الجوال">{"{phone}"}</button>
                        <button type="button" onClick={() => setWhatsappTemplateProcessing(prev => prev + '{bookingId}')} className="px-1.5 py-0.5 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-350 text-indigo-700 rounded transition font-mono font-bold" title="إدراج رقم المعاملة">{"{bookingId}"}</button>
                      </div>
                    </div>

                    {/* Live Preview */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs leading-normal">
                      <span className="font-extrabold text-[10px] text-slate-500 block mb-1">🔍 معاينة حية للمحتوى الصادر:</span>
                      <p className="text-slate-700 italic pr-3 border-r-2 border-slate-300">
                        {whatsappTemplateProcessing
                          .replace(/{name}/g, 'زياد بن نايف النفيعي')
                          .replace(/{service}/g, 'تجديد رخصة بلدية تجارية')
                          .replace(/{status}/g, 'تحت المعالجة والتعقيب الإجرائي')
                          .replace(/{phone}/g, '0567123409')
                          .replace(/{bookingId}/g, 'REQ-72013')
                        }
                      </p>
                    </div>
                  </div>
                  
                  {/* Template Completed Editing Card */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-emerald-100 pb-3">
                      <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        <span>قالب رسالة اكتمال المعاملة والطلب</span>
                      </h4>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">Completed</span>
                    </div>

                    <div>
                      <label className="block text-slate-700 text-xs font-bold mb-1.5">نص قالب الرسالة:</label>
                      <textarea
                        value={whatsappTemplateCompleted}
                        onChange={(e) => setWhatsappTemplateCompleted(e.target.value)}
                        className="w-full text-xs p-3 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 leading-relaxed font-sans h-28"
                        placeholder="اكتب قالب الرسالة هنا..."
                      />
                      <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px] text-slate-500">
                        <span className="font-bold">إدراج رمز سريع:</span>
                        <button type="button" onClick={() => setWhatsappTemplateCompleted(prev => prev + '{name}')} className="px-1.5 py-0.5 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-350 text-indigo-700 rounded transition font-mono font-bold" title="إدراج اسم العميل">{"{name}"}</button>
                        <button type="button" onClick={() => setWhatsappTemplateCompleted(prev => prev + '{service}')} className="px-1.5 py-0.5 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-350 text-indigo-700 rounded transition font-mono font-bold" title="إدراج اسم الخدمة">{"{service}"}</button>
                        <button type="button" onClick={() => setWhatsappTemplateCompleted(prev => prev + '{status}')} className="px-1.5 py-0.5 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-350 text-indigo-700 rounded transition font-mono font-bold" title="إدراج وصف الحالة">{"{status}"}</button>
                        <button type="button" onClick={() => setWhatsappTemplateCompleted(prev => prev + '{phone}')} className="px-1.5 py-0.5 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-350 text-indigo-700 rounded transition font-mono font-bold" title="إدراج رقم الجوال">{"{phone}"}</button>
                        <button type="button" onClick={() => setWhatsappTemplateCompleted(prev => prev + '{bookingId}')} className="px-1.5 py-0.5 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-350 text-indigo-700 rounded transition font-mono font-bold" title="إدراج رقم المعاملة">{"{bookingId}"}</button>
                      </div>
                    </div>

                    {/* Pre-computation of real time preview with a dummy user */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs leading-normal">
                      <span className="font-extrabold text-[10px] text-slate-500 block mb-1">🔍 معاينة حية للمحتوى الصادر:</span>
                      <p className="text-slate-700 italic pr-3 border-r-2 border-slate-300">
                        {whatsappTemplateCompleted
                          .replace(/{name}/g, 'عبد الرحمن سفيان الحركان')
                          .replace(/{service}/g, 'تأشيرة عمل مهندس')
                          .replace(/{status}/g, 'مكتملة ومستند الفاتورة جاهز')
                          .replace(/{phone}/g, '0501234567')
                          .replace(/{bookingId}/g, 'REQ-48192')
                        }
                      </p>
                    </div>
                  </div>

                  {/* Template Cancelled Editing Card */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-red-100 pb-3">
                      <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                        <span>قالب رسالة إلغاء المعاملة والطلب</span>
                      </h4>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">Cancelled</span>
                    </div>

                    <div>
                      <label className="block text-slate-700 text-xs font-bold mb-1.5">نص قالب الرسالة:</label>
                      <textarea
                        value={whatsappTemplateCancelled}
                        onChange={(e) => setWhatsappTemplateCancelled(e.target.value)}
                        className="w-full text-xs p-3 border border-slate-200 rounded-lg focus:outline-none focus:border-red-650 focus:ring-1 focus:ring-red-655 leading-relaxed font-sans h-28"
                        placeholder="اكتب قالب الرسالة هنا..."
                      />
                      <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px] text-slate-500">
                        <span className="font-bold">إدراج رمز سريع:</span>
                        <button type="button" onClick={() => setWhatsappTemplateCancelled(prev => prev + '{name}')} className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-50 border border-slate-200 text-slate-780 rounded transition font-mono font-bold" title="إدراج اسم العميل">{"{name}"}</button>
                        <button type="button" onClick={() => setWhatsappTemplateCancelled(prev => prev + '{service}')} className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-50 border border-slate-200 text-slate-780 rounded transition font-mono font-bold" title="إدراج اسم الخدمة">{"{service}"}</button>
                        <button type="button" onClick={() => setWhatsappTemplateCancelled(prev => prev + '{status}')} className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-50 border border-slate-200 text-slate-780 rounded transition font-mono font-bold" title="إدراج وصف الحالة">{"{status}"}</button>
                        <button type="button" onClick={() => setWhatsappTemplateCancelled(prev => prev + '{phone}')} className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-50 border border-slate-200 text-slate-780 rounded transition font-mono font-bold" title="إدراج رقم الجوال">{"{phone}"}</button>
                        <button type="button" onClick={() => setWhatsappTemplateCancelled(prev => prev + '{bookingId}')} className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-50 border border-slate-200 text-slate-780 rounded transition font-mono font-bold" title="إدراج رقم المعاملة">{"{bookingId}"}</button>
                      </div>
                    </div>

                    {/* Pre-computation of real time preview with a dummy user */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs leading-normal">
                      <span className="font-extrabold text-[10px] text-slate-500 block mb-1">🔍 معاينة حية للمحتوى الصادر:</span>
                      <p className="text-slate-700 italic pr-3 border-r-2 border-slate-300">
                        {whatsappTemplateCancelled
                          .replace(/{name}/g, 'سارة بنت حمود الطويرقي')
                          .replace(/{service}/g, 'تأشيرة زيارة عائلية')
                          .replace(/{status}/g, 'ملغية من النظام')
                          .replace(/{phone}/g, '0559876543')
                          .replace(/{bookingId}/g, 'REQ-38291')
                        }
                      </p>
                    </div>
                  </div>

                </div>

                {/* TOKENS CHEAT SHEET & RESET BUTTONS */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                  <div>
                    <span className="font-extrabold text-slate-900 block mb-2">🏷️ رموز الاختصارات المدعومة داخل القوالب:</span>
                    <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                      <span className="bg-indigo-50 border border-indigo-150 text-indigo-700 px-2.5 py-1 rounded" title="الاسم الكامل للعميل">{"{name}"} : اسم العميل</span>
                      <span className="bg-indigo-50 border border-indigo-150 text-indigo-700 px-2.5 py-1 rounded" title="اسم الخدمة المختارة">{"{service}"} : نوع الخدمة</span>
                      <span className="bg-indigo-50 border border-indigo-150 text-indigo-700 px-2.5 py-1 rounded" title="رقم جوال المستفيد">{"{phone}"} : رقم الجوال</span>
                      <span className="bg-indigo-50 border border-indigo-150 text-indigo-700 px-2.5 py-1 rounded" title="توصيف حالة الطلب">{"{status}"} : وصف الحالة</span>
                      <span className="bg-indigo-50 border border-indigo-150 text-indigo-700 px-2.5 py-1 rounded" title="رقم المعاملة الفريد">{"{bookingId}"} : رقم المعاملة</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 w-full md:w-auto self-end">
                    <button
                      type="button"
                      onClick={() => {
                        setWhatsappTemplatePending('السلام عليكم ورحمة الله وبركاته، الأخ/الأخت {name} المحترم. يسعدنا إبلاغكم بأنه تم استلام معاملتكم رقم {bookingId} لطلب ({service}) بنجاح، وهي الآن قيد المراجعة والانتظار من الإدارة. شكراً لثقتكم بمكتب سما المملكة.');
                        setWhatsappTemplateProcessing('السلام عليكم ورحمة الله وبركاته، الأخ/الأخت {name} المحترم. نفيدكم علماً بأن معاملتكم رقم {bookingId} لطلب ({service}) قد دخلت حيز المراجعة والمعالجة الإجرائية من فريق التعقيب بالمكتب. سنوافيكم بالنتائج فوراً.');
                        setWhatsappTemplateCompleted('السلام عليكم ورحمة الله وبركاته، الأخ/الأخت {name} المحترم. يسعدنا إبلاغكم بأن معاملتكم لطلب ({service}) قد اكتملت بنجاح ومستند الفاتورة جاهز. شكراً لثقتكم بمكتب سما المملكة للخدمات المتكاملة.');
                        setWhatsappTemplateCancelled('السلام عليكم ورحمة الله وبركاته، الأخ/الأخت {name} المحترم. نود إبلاغكم بأنه تم إلغاء معاملتكم رقم {bookingId} لطلب ({service}). لمزيد من الاستفسارات يرجى الاتصال بإدارة المكتب. شكراً لتفهمكم.');
                        setSaveSuccessWaTemplate(true);
                        setTimeout(() => setSaveSuccessWaTemplate(false), 3000);
                      }}
                      className="px-3 border border-slate-300 text-slate-800 font-bold py-2 bg-white hover:bg-slate-100 rounded-xl transition text-xs flex-1 md:flex-initial"
                    >
                      استعادة الافتراضي
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSaveSuccessWaTemplate(true);
                        setTimeout(() => setSaveSuccessWaTemplate(false), 3000);
                      }}
                      className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-500 font-black rounded-xl border border-slate-700 transition shadow text-xs flex items-center justify-center gap-1.5 flex-1 md:flex-initial"
                    >
                      {saveSuccessWaTemplate ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                          <span className="text-emerald-400">تم حفظ القوالب بنجاح!</span>
                        </>
                      ) : (
                        <span>حفظ التعديلات والتخصيص</span>
                      )}
                    </button>
                  </div>
                </div>

                {/* LIVE DYNAMIC TEST CONSOLE SECTION */}
                <div className="bg-gradient-to-l from-slate-900 to-slate-850 p-6 rounded-xl text-white shadow-xl border border-slate-800 space-y-4">
                  <div>
                    <h3 className="font-extrabold text-amber-500 text-sm flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>بوابة الاختبار والتحقق التلقائي المباشر (Simulator Dispatch Console)</span>
                    </h3>
                    <p className="text-slate-400 text-xs mt-1 font-sans">
                      اختبر بث البوابة الرقمية في أي وقت! اختر معاملة من المعاملات النشطة بالنظام ثم حدد حالة الإرسال للبث لترى النتيجة الصادرة والـ Response الآتي من Gateway API بصورة واقعية.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="block text-slate-300 font-bold mb-1.5 text-xs">١. اختر معاملة مرجعية للفحص:</label>
                      <select
                        value={testConsoleBookingId}
                        onChange={(e) => setTestConsoleBookingId(e.target.value)}
                        className="w-full p-2.5 bg-slate-950 text-slate-100 border border-slate-750 rounded-xl focus:outline-none focus:border-amber-500 text-xs"
                      >
                        {bookings.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.clientName} ({b.serviceName}) - {b.phoneNumber}
                          </option>
                        ))}
                        {bookings.length === 0 && (
                          <option value="">لا يوجد أي معاملات متاحة للتجربة</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-bold mb-1.5 text-xs">٢. اختر حالة البث المنشودة:</label>
                      <select
                        value={testConsoleTemplateType}
                        onChange={(e) => setTestConsoleTemplateType(e.target.value as any)}
                        className="w-full p-2.5 bg-slate-950 text-slate-100 border border-slate-750 rounded-xl focus:outline-none focus:border-amber-500 text-xs"
                      >
                        <option value="pending">استلام المعاملة وبدء الانتظار (Pending Template)</option>
                        <option value="processing">الدخول في المعالجة والتعقيب (Processing Template)</option>
                        <option value="completed">اكتمال ومعالجة الفاتورة (Completed Template)</option>
                        <option value="cancelled">إلغاء المعاملة وتنبيه الإلغاء (Cancelled Template)</option>
                      </select>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={handleManualTestWaDispatch}
                        disabled={testConsoleIsDispatching || !testConsoleBookingId}
                        className="w-full p-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl transition text-xs flex items-center justify-center gap-2 shadow disabled:bg-slate-700 disabled:text-slate-400"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{testConsoleIsDispatching ? 'جاري بث الإجراء للبوابة...' : 'بث واختبار الإرسال الإلكتروني الآن'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* HISTORICAL TRANSMISSION LOGS */}
                <div className="bg-white p-6 rounded-xl shadow border border-slate-200">
                  <div className="border-b border-slate-100 pb-3 mb-4 flex justify-between items-center flex-wrap gap-2">
                    <div>
                      <h4 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-emerald-600" />
                        <span>سجل بث وتوصيل إشعارات WhatsApp (تتبع البوابة)</span>
                      </h4>
                      <p className="text-[11px] text-slate-400">ملخص بكافة المعاملات الصادرة عبر بوابتنا الحسابية الافتراضية مع الحالة المرجعية للبث.</p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('هل تريد مسح سجل الإشعارات نهائياً؟')) {
                          setWhatsappLogs([]);
                        }
                      }}
                      className="text-xs text-red-600 hover:text-red-700 font-bold"
                      disabled={whatsappLogs.length === 0}
                    >
                      مسح سجل البث الكلي
                    </button>
                  </div>

                  {whatsappLogs.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 border-2 border-dashed border-slate-200 bg-slate-50 rounded-xl">
                      <MessageSquare className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="text-xs font-bold text-slate-500">سجل الإشعارات فارغ تماماً حالياً</p>
                      <p className="text-[10px] text-slate-400 mt-1">قم بتغيير حالة المستند لأي معاملة بالبوابة (إلى قيد الانتظار، تحت المعالجة، مكتمل، أو ملغى)، أو اضغط على بث واختبار الإرسال الإلكتروني بالأعلى.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-150 rounded-lg">
                      <table className="w-full min-w-[750px] text-right text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                            <th className="p-3 text-right">رقم البث / المستفيد</th>
                            <th className="p-3 text-right">المعاملة المستهدفة</th>
                            <th className="p-3 text-right">محتوى الرسالة الصادرة</th>
                            <th className="p-3 text-right">تاريخ وتوقيت الإرسال</th>
                            <th className="p-3 text-center">حالة العملية</th>
                            <th className="p-3 text-center">بوابة استجابة المطور (API)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {whatsappLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-sans">
                                <div className="font-bold text-slate-850 flex items-center gap-1.5">
                                  <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{log.clientName}</span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-500 block mt-0.5">{log.phoneNumber}</span>
                              </td>
                              
                              <td className="p-3 font-sans">
                                <span className="font-bold text-slate-800">{log.serviceName}</span>
                                <div className="text-[10px] mt-0.5 flex items-center gap-1">
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    log.status === 'completed' ? 'bg-emerald-500' :
                                    log.status === 'cancelled' ? 'bg-red-550' :
                                    log.status === 'pending' ? 'bg-amber-500' : 'bg-indigo-500'
                                  }`}></span>
                                  <span>{
                                    log.status === 'completed' ? 'تحديث: مكتمل' :
                                    log.status === 'cancelled' ? 'تحديث: ملغى' :
                                    log.status === 'pending' ? 'تحديث: قيد الانتظار' : 'تحديث: قيد المعالجة'
                                  }</span>
                                </div>
                              </td>

                              <td className="p-3 max-w-[280px]">
                                <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-150 font-sans leading-relaxed line-clamp-3 hover:line-clamp-none cursor-help transition-all" title={log.message}>
                                  {log.message}
                                </div>
                              </td>

                              <td className="p-3 font-mono text-slate-500">
                                <span>{new Date(log.sentAt).toLocaleDateString('ar-SA')}</span>
                                <span className="block text-[10px] text-slate-400 mt-0.5">
                                  {new Date(log.sentAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                              </td>

                              <td className="p-3 text-center">
                                {log.success ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>بث بنجاح</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-50 text-red-800 border border-red-200 px-2.5 py-1 rounded">
                                    <AlertCircle className="w-3 h-3 text-red-600" />
                                    <span>فشل الإرسال</span>
                                  </span>
                                )}
                              </td>

                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    alert(`الاستجابة الرسمية الآتية من بوابة WhatsApp API:\n\n${log.apiResponse}`);
                                  }}
                                  className="text-[10px] text-slate-600 border border-slate-200 bg-white hover:bg-slate-100 px-2 py-1 rounded font-mono select-none"
                                >
                                  عرض JSON Payload
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* --- ADMIN INTERNAL VIEW 6: JOB PORTAL MANAGEMENT --- */}
            {adminTab === 'jobs' && (
              <div className="space-y-8 animate-fade-in text-slate-800 animate-slide-up" dir="rtl">
                
                {/* Stats Counters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-5 rounded-xl shadow border-r-8 border-amber-500 border-t border-b border-l border-slate-200">
                    <span className="text-slate-500 text-xs font-bold block">شواغر معلنة حالياً</span>
                    <strong className="text-3xl font-black text-slate-900 font-mono block mt-1">{jobVacancies.length}</strong>
                    <span className="text-[10px] text-slate-400 block mt-1">إعلانات نشطة تقبل التقديم بالموقع المفتوح</span>
                  </div>
                  <div className="bg-white p-5 rounded-xl shadow border-r-8 border-slate-900 border-t border-b border-l border-slate-200">
                    <span className="text-slate-500 text-xs font-bold block">إجمالي طلبات المتقدمين المستلمة</span>
                    <strong className="text-3xl font-black text-slate-900 font-mono block mt-1">{jobApplications.length}</strong>
                    <span className="text-[10px] text-slate-400 block mt-1">تراكمي طلبات التوظيف المسجلة</span>
                  </div>
                  <div className="bg-white p-5 rounded-xl shadow border-r-8 border-emerald-500 border-t border-b border-l border-slate-200">
                    <span className="text-slate-500 text-xs font-bold block">معدل الإقبال المبدئي</span>
                    <strong className="text-3xl font-black text-slate-900 font-mono block mt-1">
                      {jobVacancies.length ? (jobApplications.length / jobVacancies.length).toFixed(1) : '0.0'}
                    </strong>
                    <span className="text-[10px] text-slate-400 block mt-1">متوسط المتقدمين لكل وظيفة معروضة</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  {/* Form to Create Job Vacancy: 4 cols */}
                  <div className="lg:col-span-4 space-y-4">
                    <div className="bg-white p-5 rounded-xl shadow border border-slate-200 space-y-4">
                      <div className="border-b border-slate-100 pb-3">
                        <span className="text-[10px] text-amber-600 font-extrabold uppercase tracking-widest block font-sans">لوحة تحرير الشواغر</span>
                        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5 mt-0.5">
                          <PlusCircle className="w-4.5 h-4.5 text-amber-500" />
                          <span>نشر إعلان وظيفة شاغرة جديدة</span>
                        </h3>
                      </div>

                      <form onSubmit={handleCreateJobSubmit} className="space-y-3.5 text-xs">
                        {/* Title */}
                        <div className="space-y-1 text-right">
                          <label className="block text-slate-700 font-extrabold text-[11px]">المسمى الوظيفي المعلن:</label>
                          <input
                            type="text"
                            required
                            value={newJobTitle}
                            onChange={(e) => setNewJobTitle(e.target.value)}
                            placeholder="مثال: معقب مبيعات ومسؤول علاقات"
                            className="w-full border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 text-slate-900 placeholder:text-slate-400 font-sans"
                          />
                        </div>

                        {/* Department */}
                        <div className="space-y-1 text-right">
                          <label className="block text-slate-700 font-extrabold text-[11px]">القسم الإداري:</label>
                          <input
                            type="text"
                            required
                            value={newJobDepartment}
                            onChange={(e) => setNewJobDepartment(e.target.value)}
                            placeholder="مثال: قسم شؤون الموظفين والتعقيب الموحد"
                            className="w-full border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 text-slate-900 placeholder:text-slate-400 font-sans"
                          />
                        </div>

                        {/* Locations and Contract Type info */}
                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="space-y-1 text-right">
                            <label className="block text-slate-700 font-extrabold text-[11px]">موقع العمل:</label>
                            <input
                              type="text"
                              value={newJobLocation}
                              onChange={(e) => setNewJobLocation(e.target.value)}
                              placeholder="مثل: الرياض - الملز"
                              className="w-full border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 text-slate-900 text-[11px] placeholder:text-slate-400"
                            />
                          </div>

                          <div className="space-y-1 text-right">
                            <label className="block text-slate-700 font-extrabold text-[11px]">نوع التعاقد:</label>
                            <select
                              value={newJobType}
                              onChange={(e) => setNewJobType(e.target.value)}
                              className="w-full border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 text-slate-900 text-[10px]"
                            >
                              <option value="دوام كامل">دوام كامل</option>
                              <option value="دوام جزئي">دوام جزئي</option>
                              <option value="عن بعد">عن بعد</option>
                            </select>
                          </div>
                        </div>

                        {/* Salary */}
                        <div className="space-y-1 text-right">
                          <label className="block text-slate-700 font-extrabold text-[11px]">الراتب المتوقع شهرياً:</label>
                          <input
                            type="text"
                            value={newJobSalary}
                            onChange={(e) => setNewJobSalary(e.target.value)}
                            placeholder="مثل: 5,500 - 7,500 ريال"
                            className="w-full border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 text-slate-900 placeholder:text-slate-400"
                          />
                        </div>

                        {/* Description */}
                        <div className="space-y-1 text-right">
                          <label className="block text-slate-700 font-extrabold text-[11px]">الوصف العام للوظيفة ومسؤولياتها:</label>
                          <textarea
                            rows={3}
                            value={newJobDescription}
                            onChange={(e) => setNewJobDescription(e.target.value)}
                            placeholder="تختص بفرز ومراجعة استقدام العمالة المنزلية وتخليص سجل التجارة والبلديات..."
                            className="w-full border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 text-slate-900 placeholder:text-slate-400 font-sans leading-relaxed"
                          />
                        </div>

                        {/* Requirements (lines bullet breaks) */}
                        <div className="space-y-1 text-right">
                          <div className="flex justify-between items-center">
                            <label className="block text-slate-700 font-extrabold text-[11px]">المتطلبات والشروط (كل شرط في سطر مستقل):</label>
                          </div>
                          <textarea
                            rows={4}
                            value={newJobRequirements}
                            onChange={(e) => setNewJobRequirements(e.target.value)}
                            placeholder="الشرط الأول&#10;الشرط الثاني&#10;الشرط الثالث"
                            className="w-full border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 text-slate-900 font-mono placeholder:text-slate-400 text-[10px] leading-relaxed"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3 rounded-lg text-xs leading-none transition shadow"
                        >
                          حفظ وتثبيت ونشر الإعلان فوراً بالموقع
                        </button>
                      </form>
                    </div>

                    {/* 📱 Social Sync & Webhook Autoposting Card */}
                    <div className="bg-white p-5 rounded-xl shadow border border-slate-200 mt-5 space-y-4">
                      <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                        <div>
                          <span className="text-[10px] text-emerald-650 bg-emerald-50 font-black px-2 py-0.5 rounded uppercase tracking-wider block w-max font-sans">
                            ربط القنوات الاجتماعي الذكي
                          </span>
                          <h3 className="text-sm font-extrabold text-slate-900 mt-1 flex items-center gap-1.5">
                            <Zap className="w-4 h-4 text-emerald-500 fill-emerald-500 animate-pulse" />
                            <span>مزامنة منشورات فيسبوك وواتساب 🤖</span>
                          </h3>
                        </div>
                        <span className="flex h-2.5 w-2.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                      </div>

                      {/* Micro-Tabs */}
                      <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold gap-1 select-none">
                        <button
                          type="button"
                          onClick={() => setSocialImportTab('ai')}
                          className={`w-1/2 text-center py-1.5 rounded-md transition-all cursor-pointer ${
                            socialImportTab === 'ai' ? 'bg-emerald-500 text-slate-950 font-black shadow-sm' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          المستورد الذكي (نسخ ولصق)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSocialImportTab('webhook')}
                          className={`w-1/2 text-center py-1.5 rounded-md transition-all cursor-pointer ${
                            socialImportTab === 'webhook' ? 'bg-emerald-500 text-slate-950 font-black shadow-sm' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          ربط الويب هوك والـ Webhook
                        </button>
                      </div>

                      {socialImportTab === 'ai' ? (
                        <div className="space-y-3.5 text-xs text-right">
                          <p className="text-[11px] leading-relaxed text-slate-500 font-sans">
                            عندما تنشر إعلاناً في <strong>قناة الواتساب الرسمية</strong> أو <strong>صفحة الفيسبوك</strong>، لا داعي لإعادة إدخاله يدوياً! انسخ نص المنشور المكتوب واضغط على أي من النماذج التجريبية أدناه، ثم انقر على "مزامنة بالذكاء الاصطناعي" لتوليد البيانات ونشرها تلقائياً بالنموذج المساعد:
                          </p>

                          <form onSubmit={handleSocialImport} className="space-y-3">
                            <div>
                              <textarea
                                value={socialImportText}
                                onChange={(e) => setSocialImportText(e.target.value)}
                                placeholder="ألصق نص المنشور هنا لجلبه ومزامنته آلياً..."
                                rows={5}
                                className="w-full border border-slate-250 p-2.5 rounded-lg focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-slate-900 font-sans leading-relaxed text-right placeholder:text-slate-400 text-xs bg-slate-50/50"
                              />
                            </div>

                            {/* Presets and one-click quick fills */}
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-400 block font-bold">منشورات جاهزة للمحاكاة الفورية:</span>
                              <div className="flex flex-col gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSocialImportText(
                                    `مطلوب فورًا لمكتب سما المملكة الرقمي: معقب معاملات ميداني للعمل بقسم العلاقات العامة بفرع الرياض (حي الملز).\n\nالشروط:\n- خبرة لا تقل عن سنتين في الهيئات الحكومية والبلديات\n- رخصة قيادة سيارة سارية ومركبة خاصة\n- معرفة بإنهاء تراخيص قوى وجوازات.\n\nالراتب مجزي 7,000 ريال مع عمولات دورية.`
                                  )}
                                  className="w-full text-right p-2 rounded border border-slate-200 hover:bg-slate-50 text-[10px] text-slate-700 bg-white hover:border-emerald-500/45 transition duration-150 font-sans truncate cursor-pointer"
                                >
                                  🟢 منشور الواتس اب (معقب ميداني بالرياض)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSocialImportText(
                                    `بشرى سارة! نعلن في مكتب سما المملكة للتعقيب والخدمات الإلكترونية عن فتح باب التوظيف لوظيفة أخصائي دعم فني وخدمة عملاء للعمل عن بعد (دوام جزئي) لإنهاء الاستمارات والرد على الزوار.\n\nالمتطلبات الأساسية:\n- مؤهل دبلوم إداري أو حاسب آلي مناسب\n- سرعة فائقة في الكتابة والردود الإلكترونية واللباقة\n- لغة عربية سليمة ولباقة هاتفية وعملية\n\nالراتب المعتمد هو 4,000 ريال شهرياً.`
                                  )}
                                  className="w-full text-right p-2 rounded border border-slate-200 hover:bg-slate-50 text-[10px] text-slate-700 bg-white hover:border-emerald-500/45 transition duration-150 font-sans truncate cursor-pointer"
                                >
                                  🔵 منشور الفيسبوك (أخصائي خدمة عملاء مبيعات)
                                </button>
                              </div>
                            </div>

                            <button
                              type="submit"
                              disabled={isSocialSyncing || !socialImportText.trim()}
                              className={`w-full font-black py-3 rounded-lg text-xs leading-none transition shadow flex items-center justify-center gap-1.5 ${
                                isSocialSyncing 
                                  ? 'bg-emerald-500/55 text-slate-950 cursor-wait' 
                                  : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 cursor-pointer'
                              }`}
                            >
                              {isSocialSyncing ? (
                                <>
                                  <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-950 border-t-transparent animate-spin"></div>
                                  <span>جاري التحليل والسحب بالـ AI...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4 text-slate-950" />
                                  <span>مزامنة ونشر فوري بالذكاء الاصطناعي 🚀</span>
                                </>
                              )}
                            </button>
                          </form>
                        </div>
                      ) : (
                        <div className="space-y-3.5 text-xs text-right text-slate-700">
                          <p className="text-[11px] leading-relaxed text-slate-500">
                            يدعم مكتب سما المملكة الربط المباشر مع <strong>Zapier</strong> أو <strong>Make.com</strong> للربط التلقائي بقنوات الواتساب وصفحات الفيسبوك برمجياً (عند نشر أي منشور يتم ترحيله تلقائياً بويب هوك مؤمن):
                          </p>

                          <div className="space-y-2 bg-slate-950 text-slate-300 p-3 rounded-xl border border-slate-800 font-mono text-[10.5px] overflow-x-auto relative leading-relaxed">
                            <span className="absolute top-2 left-2 bg-emerald-500 text-slate-950 text-[8px] font-black px-1.5 py-0.5 rounded">
                              URL الويب هوك
                            </span>
                            <div className="font-semibold text-emerald-400 select-all mb-1 mt-3">
                              https://sama-almamlakah.online/api/webhook/jobs/be2b68cb
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Method: <strong className="text-white">POST</strong><br />
                              Secret: <strong className="text-white">sec_sama_wa_fb_sync_778259418</strong>
                            </div>
                          </div>

                          <div className="border border-slate-150 rounded-xl overflow-hidden bg-slate-50 p-2.5">
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-[10px] font-bold text-slate-800">سجل إشارات الربط الأخيرة Live:</span>
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black px-1.5 py-0.2 rounded">
                                متصل ونشط
                              </span>
                            </div>
                            <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                              {webhookLogs.map((log, idx) => (
                                <div key={idx} className="flex justify-between items-center text-[9px] border-b border-dashed border-slate-200 pb-1.5 last:border-0 last:pb-0">
                                  <div className="space-y-0.5">
                                    <div className="text-slate-850 font-semibold">{log.event}</div>
                                    <div className="text-slate-400">{log.time}</div>
                                  </div>
                                  <span className="px-1.5 bg-slate-200 text-slate-700 rounded font-mono font-bold text-[8.5px]">
                                    {log.title}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="bg-amber-50 text-amber-900 border border-amber-200 rounded-xl p-3 leading-relaxed text-[10.5px]">
                            💡 <strong>نصيحة الإدارة:</strong> يمكنك محاكاة إرسال ويب هوك فوري بالضغط فوق أي من المنشورات الجاهزة في التبويب المجاور للتحقق من المزامنة الفورية أمامك مباشرة!
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Listings & Submitted Applications: 8 cols */}
                  <div className="lg:col-span-8 space-y-8">
                    
                    {/* Active Jobs Admin list */}
                    <div className="bg-white p-5 rounded-xl shadow border border-slate-200 space-y-4">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                          <Briefcase className="w-4.5 h-4.5 text-amber-500" />
                          <span>إعلانات الشواغر النشطة مع العملاء</span>
                        </h3>
                        <p className="text-[11px] text-slate-500">مراجعة تفاصيل البطاقات الوظيفية التفاعلية المنشورة وسحبها.</p>
                      </div>

                      <div className="overflow-x-auto rounded-lg border border-slate-150">
                        <table className="w-full min-w-[650px] border-collapse text-right text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                              <th className="p-3">مسمى الوظيفة المعلن</th>
                              <th className="p-3">القسم / الموقع</th>
                              <th className="p-3">الراتب / التعاقد</th>
                              <th className="p-3">تاريخ النشر</th>
                              <th className="p-3 text-center">الإجراءات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150 text-slate-850">
                            {jobVacancies.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                                  لا توجد أي بطاقات شواغر منشورة ببيانات محركات المنصة حالياً. يرجى إعداد البطاقة الأولى يميناً.
                                </td>
                              </tr>
                            ) : (
                              jobVacancies.map((vacancy) => {
                                const matchedApps = jobApplications.filter(app => app.jobId === vacancy.id);
                                return (
                                  <tr key={vacancy.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3 font-sans font-bold text-slate-900">
                                      <div>{vacancy.title}</div>
                                      <span className="text-[10px] text-amber-600 bg-amber-50 font-extrabold px-1.5 py-0.5 rounded block w-max mt-1">
                                        يتقبل طلبات المترشحين ({matchedApps.length} طلبات)
                                      </span>
                                    </td>
                                    <td className="p-3 font-sans">
                                      <div className="text-slate-750 font-medium">{vacancy.department}</div>
                                      <div className="text-[10px] text-slate-400 font-medium">📍 {vacancy.location}</div>
                                    </td>
                                    <td className="p-3 font-sans">
                                      <div className="font-bold text-slate-800 font-mono">{vacancy.salary}</div>
                                      <div className="text-[10px] text-slate-500 font-semibold">{vacancy.type}</div>
                                    </td>
                                    <td className="p-3 font-mono text-slate-500 text-[11px]">
                                      {new Date(vacancy.date).toLocaleDateString('ar-SA')}
                                    </td>
                                    <td className="p-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteJob(vacancy.id)}
                                        className="p-1 px-2.5 bg-red-50 text-red-650 hover:bg-red-600 hover:text-white rounded border border-red-100 hover:border-red-600 text-[10px] font-bold transition duration-150"
                                      >
                                        إزالة الإعلان
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Applications Received Table */}
                    <div className="bg-white p-5 rounded-xl shadow border border-slate-200 space-y-4">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5 flex-row-reverse justify-end">
                          <span className="bg-slate-900 text-amber-500 font-mono px-2 py-0.5 rounded text-[10px] font-bold">
                            {jobApplications.length} متقدم ومتقدمة بالبوابة
                          </span>
                          <span>سجلات المتقدمين وسير طلبات الانضمام</span>
                        </h3>
                        <p className="text-[11px] text-slate-500">قائمة الكفاءات الواردة وسيرهم الذاتية مع ميزة تعديل حالة الملف وإرسال الإخطارات الذكية للمترشحين.</p>
                      </div>

                      <div className="overflow-x-auto rounded-lg border border-slate-150">
                        <table className="w-full min-w-[800px] border-collapse text-right text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                              <th className="p-3">اسم المتقدم وتفاصيله</th>
                              <th className="p-3">الوظيفة المستهدفة</th>
                              <th className="p-3">التعليم والخبرة وسيرة الملف</th>
                              <th className="p-3 text-center">حالة الطلب والقرار</th>
                              <th className="p-3 font-sans">تاريخ التقديم</th>
                              <th className="p-3 text-center font-bold">التواصل والإجراءات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150 text-slate-800">
                            {jobApplications.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                                  لا توجد أي طلبات توظيف مقدمة متاح فرزها حالياً في قواعد سما المملكة.
                                </td>
                              </tr>
                            ) : (
                              jobApplications.map((app) => {
                                const currentStatus = app.status || 'قيد المراجعة';
                                return (
                                  <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3 font-sans">
                                      <div className="font-bold text-slate-900 text-xs">{app.applicantName}</div>
                                      <div className="text-[10px] font-mono text-slate-500 block mt-0.5">{app.applicantPhone}</div>
                                      {app.applicantEmail && app.applicantEmail !== 'لا يوجد' && (
                                        <div className="text-[10px] font-mono text-slate-400 block">{app.applicantEmail}</div>
                                      )}
                                    </td>
                                    <td className="p-3 font-mono">
                                      <div className="text-slate-750 font-sans font-bold text-xs">{app.jobTitle}</div>
                                      <div className="text-[9px] text-slate-400 mt-0.5">رمز الملف: #{app.id.substring(4, 9)}</div>
                                    </td>
                                    <td className="p-3 font-sans">
                                      <div className="font-semibold text-slate-800">{app.qualification}</div>
                                      <div className="text-[10px] text-amber-700 font-bold">
                                        ⚡ خبرة {app.experienceYears} {app.experienceYears >= 3 ? 'سنوات' : 'سنة/أقل'}
                                      </div>
                                      {app.notes && (
                                        <div className="mt-1 bg-slate-50 p-1.5 rounded text-[10px] text-slate-600 border border-slate-150 max-w-[200px] leading-relaxed line-clamp-2 hover:line-clamp-none transition-all cursor-help" title={app.notes}>
                                          {app.notes}
                                        </div>
                                      )}
                                    </td>
                                    <td className="p-3 text-center">
                                      <div className="flex flex-col gap-1.5 max-w-[120px] mx-auto">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border text-center ${
                                          currentStatus === 'قيد المراجعة' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                          currentStatus === 'تمت المقابلة' ? 'bg-amber-55 text-amber-800 border-amber-250' :
                                          currentStatus === 'تم القبول' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse' :
                                          currentStatus === 'مرفوض' ? 'bg-red-50 text-red-700 border-red-200' : 
                                          'bg-slate-50 text-slate-700 border-slate-200'
                                        }`}>
                                          {currentStatus}
                                        </span>
                                        <select
                                          value={currentStatus}
                                          onChange={(e) => handleUpdateJobApplicationStatus(app.id, e.target.value as any)}
                                          className="w-full border border-slate-200 text-[10px] p-1.5 rounded bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans cursor-pointer font-bold text-center"
                                        >
                                          <option value="قيد المراجعة">قيد المراجعة</option>
                                          <option value="تمت المقابلة">تمت المقابلة</option>
                                          <option value="تم القبول">تم القبول</option>
                                          <option value="مرفوض">مرفوض</option>
                                        </select>
                                      </div>
                                    </td>
                                    <td className="p-3 font-mono text-slate-500 text-[10px]">
                                      <div>{new Date(app.date).toLocaleDateString('ar-SA')}</div>
                                      <div className="text-[9px] text-slate-400 mt-0.5">
                                        {new Date(app.date).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                    </td>
                                    <td className="p-3 space-y-1.5 text-center font-sans">
                                      <div className="flex gap-1 justify-center">
                                        {/* Call button */}
                                        <a
                                          href={`tel:${app.applicantPhone}`}
                                          className="p-1 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded border border-slate-200 text-[10px] font-bold"
                                        >
                                          اتصال
                                        </a>

                                        {/* WhatsApp direct chat link */}
                                        <a
                                          href={`https://wa.me/${app.applicantPhone.replace(/^0/, '966').replace(/\+/g, '')}`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="p-1 px-1.5 bg-emerald-55 text-emerald-800 hover:bg-emerald-600 hover:text-white border border-emerald-100 rounded text-[10px] font-bold inline-block"
                                        >
                                          واتس
                                        </a>
                                      </div>

                                      {/* New dynamic notification trigger */}
                                      <button
                                        type="button"
                                        onClick={() => handleOpenNotifyModal(app)}
                                        className="p-1.5 px-1 bg-amber-50 hover:bg-amber-600 hover:text-slate-950 text-amber-800 border border-amber-100 hover:border-amber-500 rounded text-[10px] font-bold w-full transition flex items-center justify-center gap-1"
                                      >
                                        <Send className="w-3 h-3" />
                                        <span>إرسال إشعار رسمي</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleDeleteJobApplication(app.id)}
                                        className="p-1 px-1 w-full bg-red-50 hover:bg-red-650 hover:text-white text-red-750 hover:border-red-650 rounded border border-red-100 text-[9px] font-bold transition"
                                      >
                                        شطب وتصفية
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}
            
          </div>
        )}
      </main>

      {/* FOOTER GENERAL */}
      <footer className="bg-slate-950 text-slate-500 border-t border-slate-800 py-10 mt-16 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-900 w-full">
            <div className="text-right space-y-3">
              <div className="text-lg font-bold text-white mb-1">مكتب سما المملكة للخدمات المتكاملة</div>
              <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                البوابة الإلكترونية الموحدة لتقديم وتخليص المعاملات الإلكترونية الحكومية وتسهيل المتابعة على مدار الساعة. نسعد بخدمتكم وتخليص معاملاتكم بكل مهارة وأمان.
              </p>
              
              {/* Social Media Channels Row */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1.5">
                <span className="text-slate-400 text-xs font-bold ml-1.5">صفحات التواصل الاجتماعي:</span>
                
                {socialFacebook && (
                  <a 
                    href={socialFacebook} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-1 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-amber-500 transition-all text-[11px] font-bold flex items-center gap-1.5 shadow"
                    title="صفحة فيسبوك الرسمية"
                  >
                    <Facebook className="w-3.5 h-3.5 text-blue-500" />
                    <span>فيسبوك</span>
                  </a>
                )}

                {socialTwitter && (
                  <a 
                    href={socialTwitter} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-1 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-amber-500 transition-all text-[11px] font-bold flex items-center gap-1.5 shadow"
                    title="حساب تويتر / منصة X"
                  >
                    <Twitter className="w-3.5 h-3.5 text-amber-500" />
                    <span>تويتر / X</span>
                  </a>
                )}

                {socialInstagram && (
                  <a 
                    href={socialInstagram} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-1 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-amber-500 transition-all text-[11px] font-bold flex items-center gap-1.5 shadow"
                    title="حساب إنستقرام"
                  >
                    <Instagram className="w-3.5 h-3.5 text-pink-500" />
                    <span>إنستقرام</span>
                  </a>
                )}

                {socialSnapchat && (
                  <a 
                    href={socialSnapchat} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-1 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-amber-500 transition-all text-[11px] font-bold flex items-center gap-1.5 shadow"
                    title="سناب شات"
                  >
                    <span className="text-xs">👻</span>
                    <span>سناب شات</span>
                  </a>
                )}

                {socialLinkedin && (
                  <a 
                    href={socialLinkedin} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-1 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-amber-500 transition-all text-[11px] font-bold flex items-center gap-1.5 shadow"
                    title="حساب لينكد إن"
                  >
                    <Linkedin className="w-3.5 h-3.5 text-blue-500" />
                    <span>لينكد إن</span>
                  </a>
                )}

                {socialWhatsapp && (
                  <a 
                    href={socialWhatsapp} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-1 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-500 transition-all text-[11px] font-bold flex items-center gap-1.5 shadow"
                    title="التحدث معنا بالواتساب"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                    <span>واتساب مباشر</span>
                  </a>
                )}

                {socialWhatsappChannel && (
                  <a 
                    href={socialWhatsappChannel} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-1 px-2.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-800 hover:border-emerald-450 text-emerald-300 hover:text-emerald-200 transition-all text-[11px] font-bold flex items-center gap-1.5 shadow"
                    title="قناة وظائف وتوظيف الأيدي العاملة بالواتساب"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="animate-pulse">📢 قناة الوظائف</span>
                  </a>
                )}
              </div>
            </div>
            
            {/* Quick action footer tabs */}
            <div className="flex flex-col items-start md:items-end gap-3 text-xs font-bold text-slate-300 flex-shrink-0">
              <div className="flex flex-wrap gap-4 text-slate-400">
                <button onClick={() => { setActiveTab('home'); window.scrollTo(0,0); }} className="hover:text-amber-500 transition-colors">الرئيسية</button>
                <span>•</span>
                <button onClick={() => { setActiveTab('track'); window.scrollTo(0,0); }} className="hover:text-amber-500 transition-colors">الاستعلام المباشر</button>
                <span>•</span>
                <button onClick={() => { setActiveTab('jobs'); window.scrollTo(0,0); }} className="hover:text-amber-500 transition-colors">الوظائف الشاغرة</button>
                <span>•</span>
                <button onClick={() => { setActiveTab('admin'); window.scrollTo(0,0); }} className="hover:text-amber-500 transition-colors">منطقة الإدارة والعمليات</button>
              </div>
              <div className="text-[10px] text-slate-500 font-sans">مكتب التخليص الوطني المعتمد لكافة الجهات الحكومية والخاصة</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center text-[11px] gap-2 pt-2">
            <div className="flex font-mono text-slate-500 gap-1.5">
              <span>VAT: 300065432100003</span>
              <span>•</span>
              <span className="text-slate-405 font-sans hover:underline cursor-pointer flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                <span>الامتثال المفتوح ٢٠٢٦</span>
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* --- INTRATIVE MODALS & DIALOGS --- */}

      {/* Admin lock pin dialog passcode */}
      <PasscodeModal 
        isOpen={showPasscode}
        onClose={() => setShowPasscode(false)}
        onSuccess={handleAdminAuthSuccess}
      />

      {/* Invoice Details view & Printing dialog */}
      <InvoiceDetailModal 
        isOpen={isInvoiceOpen}
        onClose={() => {
          setIsInvoiceOpen(false);
          setSelectedTx(null);
        }}
        transaction={selectedTx}
      />

      {/* Global International Online Payment Modal */}
      {paymentBookingTarget && (
        <GlobalPaymentModal
          isOpen={isPaymentOpen}
          onClose={() => {
            setIsPaymentOpen(false);
            setPaymentBookingTarget(null);
          }}
          booking={paymentBookingTarget}
          totalAmountSAR={(() => {
            const currentSrv = services.find(s => s.id === paymentBookingTarget.serviceId || s.name.trim() === paymentBookingTarget.serviceName.trim());
            return currentSrv ? (currentSrv.govFee + currentSrv.officeFee * 1.15) : 345.00;
          })()}
          allowedMethods={(() => {
            const currentSrv = services.find(s => s.id === paymentBookingTarget.serviceId || s.name.trim() === paymentBookingTarget.serviceName.trim());
            return currentSrv?.paymentMethods || ['mada', 'credit_card', 'applepay', 'bank_transfer'];
          })()}
          onPaymentSuccess={handleGlobalPaymentSuccess}
        />
      )}

      {/* Job Applicant interactive Notification Dialog */}
      {selectedAppForNotify && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-4" dir="rtl">
          <div className="w-full max-w-xl bg-white border border-slate-200 p-6 rounded-xl shadow-2xl space-y-4 text-slate-800 animate-fade-in animate-slide-up">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-amber-500" />
                <div className="text-right">
                  <h4 className="font-extrabold text-slate-900 text-sm">مُرسل إشعارات التوظيف التفاعلي</h4>
                  <p className="text-[10px] text-slate-500">مكتب سما المملكة - نظام التواصل الموحد للكفاءات المهنية</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedAppForNotify(null)} 
                className="text-slate-400 hover:text-slate-900 text-sm bg-slate-100 p-1.5 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-4 text-right">
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-bold">اسم المُرشّح</span>
                  <strong className="text-slate-900 text-xs">{selectedAppForNotify.applicantName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-bold">رقم الهاتف الدولي</span>
                  <strong className="text-slate-900 font-mono text-xs">{selectedAppForNotify.applicantPhone}</strong>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-1.5 border-t border-slate-200 text-right">
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-bold">الوظيفة المغطاة</span>
                  <strong className="text-slate-900 text-xs">{selectedAppForNotify.jobTitle}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-bold">الحالة المحددة الآن</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black inline-block mt-0.5 ${
                    selectedAppForNotify.status === 'قيد المراجعة' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                    selectedAppForNotify.status === 'تمت المقابلة' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    selectedAppForNotify.status === 'تم القبول' ? 'bg-emerald-50 text-emerald-700 border border-emerald-250' :
                    selectedAppForNotify.status === 'مرفوض' ? 'bg-rose-50 text-rose-700 border border-rose-250' :
                    'bg-slate-50 text-slate-700'
                  }`}>
                    {selectedAppForNotify.status || 'قيد المراجعة'}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSendJobNotificationSubmit} className="space-y-4">
              <div className="space-y-1.5 text-right">
                <label className="block text-slate-700 font-extrabold text-[11px] flex justify-between items-center">
                  <span>صياغة وتعديل الرسالة الموجهة للمترشح:</span>
                  <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-bold">حالة: {selectedAppForNotify.status || 'قيد المراجعة'}</span>
                </label>
                <textarea
                  rows={6}
                  required
                  value={notifyMessageText}
                  onChange={(e) => setNotifyMessageText(e.target.value)}
                  placeholder="اكتب الإشعار هنا..."
                  className="w-full border border-slate-200 p-2.5 rounded-lg focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 text-slate-900 text-[11px] font-sans leading-relaxed shadow-inner"
                />
                <p className="text-[9px] text-slate-400">
                  ⚠️ سيقوم النظام بتمرير هذه الرسالة وتوثيق الإرسال باسم مكتب سما المملكة للرقم ({selectedAppForNotify.applicantPhone}) مع إضافتها لسجل محادثات البوابة وتوجيهك لواتساب للتأكيد.
                </p>
              </div>

              <div className="flex gap-2.5 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedAppForNotify(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
                >
                  تراجع وإلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSendingJobNotification}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black transition-all flex items-center gap-1.5 shadow"
                >
                  {isSendingJobNotification ? (
                    <span>جاري التوثيق والإشعار...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>إرسال وتوثيق بالواتساب ⚡</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hover Info Popup Service Details cards */}
      {infoPopupService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4" dir="rtl">
          <div className="w-full max-w-md bg-white border border-slate-900 p-6 rounded-lg shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                {renderServiceIcon(infoPopupService.icon, "w-5 h-5 text-amber-500")}
                <h4 className="font-extrabold text-slate-900 text-base">{infoPopupService.name}</h4>
              </div>
              <button 
                onClick={() => setInfoPopupService(null)} 
                className="text-slate-400 hover:text-slate-900 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed font-sans">
              <div>
                <strong className="block text-slate-800 text-xs font-bold mb-1">وصف الإجراء العام:</strong>
                <p>{infoPopupService.description}</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 space-y-1.5 font-mono">
                <p className="flex justify-between items-center bg-white p-2 rounded border border-slate-200">
                  <span className="font-sans text-slate-500 block">تكاليف الدولة (الوزارات والجهات ورسوم المصدقة):</span>
                  <strong className="text-slate-900 font-bold block">{infoPopupService.govFee.toFixed(2)} ر.س</strong>
                </p>
                <p className="flex justify-between items-center bg-white p-2 rounded border border-slate-200">
                  <span className="font-sans text-slate-500 block">أتعاب مراجعة مكتب سما المملكة الإستخلاصي:</span>
                  <strong className="text-slate-900 font-bold block">{infoPopupService.officeFee.toFixed(2)} ر.س</strong>
                </p>
                <p className="flex justify-between items-center bg-white p-2 rounded border border-slate-300">
                  <span className="font-sans text-slate-500 block">ضريبة القيمة المضافة المحسوبة (15%):</span>
                  <strong className="text-slate-700 block">{(infoPopupService.officeFee * 0.15).toFixed(2)} ر.س</strong>
                </p>
                <p className="flex justify-between items-center bg-amber-50 p-2.5 rounded border border-amber-300 font-bold leading-normal text-amber-950 font-sans text-sm">
                  <span>الإجمالي الضريبي التقريبي:</span>
                  <span className="font-mono">{(infoPopupService.govFee + infoPopupService.officeFee + (infoPopupService.officeFee * 0.15)).toFixed(2)} ر.س</span>
                </p>
              </div>

              {/* Linked Payment Methods representing service-specific billing in detailed popup */}
              <div className="space-y-1.5 text-right bg-amber-500/5 p-3 rounded-lg border border-amber-200">
                <strong className="block text-slate-800 text-xs font-black">طرق السداد والدفع المعتمدة لدى المكتب لتسوية الفواتير:</strong>
                <div className="flex flex-wrap gap-1.5 justify-start">
                  {infoPopupService.paymentMethods && infoPopupService.paymentMethods.length > 0 ? (
                    infoPopupService.paymentMethods.map(pmId => {
                      const found = AVAILABLE_PAYMENT_METHODS.find(p => p.id === pmId);
                      if (!found) return null;
                      return (
                        <div 
                          key={pmId} 
                          className="text-[10px] font-black px-2 py-1 rounded-lg bg-white border border-slate-205 text-slate-800 flex items-center gap-1 shadow-3xs hover:bg-amber-50 transition-colors"
                          title={found.name}
                        >
                          <span>{found.badge}</span>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-[10px] text-slate-500 font-bold bg-slate-150 py-1 px-2.5 rounded-md">
                      التحويل البنكي المباشر لحسابات المكتب المعتمدة 🏦
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2.5 items-start bg-blue-50/50 p-3 border border-blue-200 text-blue-800 rounded-lg text-[11px]">
                <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="font-medium leading-relaxed">
                  تحتسب الرسوم بصورة تفصيلية معلنة ولا توجد عمولات مبطنة. سيقوم مراجع الإجراء بالجهة بتسليمك إشعار الفاتورة الضريبية فور اكتمال تعميد الأوراق.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setSelectedServiceId(infoPopupService.id);
                  setInfoPopupService(null);
                  document.getElementById('booking-anchor')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full bg-slate-950 hover:bg-slate-800 text-white py-2.5 font-extrabold rounded text-xs text-center transition-colors"
              >
                المضي قدماً بطلب {infoPopupService.name}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ADMIN DOCUMENT VIEWER MODAL DIALOG --- */}
      {selectedViewBooking && selectedViewBooking.attachedFileName && selectedViewBooking.attachedFileData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" dir="rtl">
          <div className="w-full max-w-3xl bg-white border border-slate-900 p-6 rounded-xl shadow-2xl space-y-4 font-sans">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                  <Paperclip className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-950 text-base">بوابة استعراض الوثائق والمستندات الرسمية</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">طلب تعقيب رقم: #{selectedViewBooking.id.substring(3, 9)} للعميل المستفيد: <strong className="text-slate-850 font-bold">{selectedViewBooking.clientName}</strong></p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedViewBooking(null)} 
                className="text-slate-400 hover:text-slate-900 text-lg font-bold p-1 hover:bg-slate-50 rounded transition"
                title="إغلاق النافذة"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-[#f8fafc] border border-slate-200 rounded-lg p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                <div className="space-y-1">
                  <p className="text-slate-700">
                    <span className="text-slate-400">اسم الملف المرفوع:</span> <strong className="font-sans text-slate-900 select-all">{selectedViewBooking.attachedFileName}</strong>
                  </p>
                  <p className="text-slate-700">
                    <span className="text-slate-400">حجم المستند:</span> <strong className="font-mono text-slate-800">{selectedViewBooking.attachedFileSize}</strong>
                  </p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={selectedViewBooking.attachedFileData}
                    download={selectedViewBooking.attachedFileName}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded shadow-sm text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>تحميل المستند PDF (دقة كاملة)</span>
                  </a>
                </div>
              </div>

              {/* View Container Frame */}
              <div className="bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                <object
                  data={selectedViewBooking.attachedFileData}
                  type="application/pdf"
                  className="w-full h-[450px]"
                >
                  <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 bg-white h-[450px]">
                    <div className="bg-amber-50 p-3 rounded-full border border-amber-200">
                      <FileText className="w-10 h-10 text-amber-600" />
                    </div>
                    <div className="space-y-1.5">
                      <h5 className="font-black text-slate-900 text-sm">استعراض PDF التفاعلي غير مدعوم مباشرة في متصفحك</h5>
                      <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                        يتعذر إظهار المستند بصيغة PDF مدمجة بسبب قيود العرض الأمنية لبيئة التصفح الحالية. يرجى الضغط على الزر الأخضر بالأعلى لتنزيله مطلعاً عليه بمرونة تامة.
                      </p>
                    </div>
                    <a
                      href={selectedViewBooking.attachedFileData}
                      download={selectedViewBooking.attachedFileName}
                      className="bg-slate-950 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded text-xs inline-flex items-center gap-1.5 shadow transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تنزيل الملف {selectedViewBooking.attachedFileName}</span>
                    </a>
                  </div>
                </object>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedViewBooking(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2 rounded text-xs font-bold transition-colors"
              >
                إغلاق مساحة المعاينة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SERVICE DELETE CONFIRMATION DIALOG MODAL --- */}
      {serviceToDeleteCheck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in" dir="rtl">
          <div className="w-full max-w-md bg-white border border-slate-300 rounded-2xl shadow-2xl overflow-hidden font-sans transform transition-all">
            {/* Header Red Warning style */}
            <div className="bg-red-50 border-b border-red-100 p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-650 animate-pulse flex-shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-sm">تأكيد حذف الخدمة نهائياً</h4>
                <p className="text-[10px] text-red-700 font-bold mt-0.5">تنبيه ذو أهمية قصوى لمنع الفقدان المفاجئ للبيانات</p>
              </div>
            </div>

            {/* Warning Content */}
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1.5">
                <span className="text-[10px] text-slate-400 block font-bold">المعاملة المستهدفة بالحذف:</span>
                <span className="font-extrabold text-slate-850 text-sm block">{serviceToDeleteCheck.name}</span>
                <span className="inline-block text-[9px] font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded mr-0.5">
                  {serviceToDeleteCheck.category === 'visa' && '🛂 خدمات تأشيرات وسفر'}
                  {serviceToDeleteCheck.category === 'gov' && '🏛️ تعقيب ومراجعة دائرية'}
                  {serviceToDeleteCheck.category === 'transport' && '🚚 نقل ومواصلات'}
                  {serviceToDeleteCheck.category === 'other' && '⚙️ خدمات عامة أخرى'}
                </span>
              </div>

              <p className="text-slate-600 text-xs leading-relaxed">
                إن حذف هذه الخدمة سيؤدي بمفعول فوري ومستمر إلى إزالتها كلياً من كافة قوائم اختيار واستمارات حجز العملاء (الواجهات العامة والخاصة بالمستخدمين) بالإضافة إلى جميع المراجع والروابط الداخلية النشطة بلوحة تحكم النظام.
              </p>
              <p className="text-slate-750 text-xs font-bold leading-relaxed text-slate-800">
                هل تريد الاستمرار بمتابعة الحذف الفعلي لهذه الخدمة وتأكيد الإجراء، أم تود التراجع والإلغاء؟
              </p>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-900 text-[10px] font-semibold leading-relaxed">
                ⚠️ <strong className="text-amber-950 font-black">ملاحظة محاسبية:</strong> الحذف لا يؤثر على التقارير المالية والقيود المحاسبية التاريخية المسجلة مسبقاً في الدفتر المالي؛ بل يمنع الحجوزات المستقبلية فقط.
              </div>
            </div>

            {/* Action buttons */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setServiceToDeleteCheck(null)}
                className="px-4 py-2 bg-white hover:bg-slate-105 text-slate-700 font-bold rounded-xl border border-slate-300 transition text-xs"
              >
                تراجع وإلغاء
              </button>
              <button
                type="button"
                onClick={confirmDeleteService}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-md transition text-xs"
              >
                تأكيد حذف الخدمة نهائياً
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CANNOT DELETE ALERT DIALOG --- */}
      {showCannotDeleteAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 animate-fade-in" dir="rtl">
          <div className="w-full max-w-sm bg-white border border-slate-300 rounded-2xl shadow-2xl overflow-hidden font-sans transform transition-all">
            {/* Header Block */}
            <div className="bg-amber-50 border-b border-amber-100 p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-sm">إجراء غير مسموح بنظام سما</h4>
                <p className="text-[10px] text-amber-800 font-bold mt-0.5">ضوابط الحد الأدنى من الدليل النشط</p>
              </div>
            </div>

            {/* Content info */}
            <div className="p-5 space-y-3.5">
              <p className="text-slate-650 text-xs leading-normal">
                عذراً، يجب أن تحتفظ منصة مكتب سما المملكة <strong className="text-slate-900 font-bold">بخدمة واحدة نشطة على الأقل</strong> في قاعدة البيانات لتجنب تعطل لوحة استمارات الحجز الذاتية وتلف واجهة المستفيدين.
              </p>
              <p className="text-slate-500 text-[11px] leading-normal font-sans">
                💡 يرجى إضافة الخدمة البديلة الجديدة وتفعيلها أولاً، ثم العودة لإلغاء أو تعديل أو مسح هذه الخدمة الحالية بأمان تام.
              </p>
            </div>

            {/* Close footer button */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCannotDeleteAlert(false)}
                className="w-full sm:w-auto px-6 py-2 bg-slate-900 hover:bg-slate-850 text-white font-bold rounded-xl transition text-xs text-center"
              >
                حسناً، فهمت ذلك
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="fixed bottom-4 left-4 z-40 hidden md:flex flex-col items-end gap-2 font-sans">
        <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-800 rounded-2xl p-3.5 shadow-2xl space-y-3 w-72 transition-all duration-305">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <div className="bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20 text-amber-500">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            </div>
            <div>
              <span className="text-[11px] font-black text-slate-100 block">ذكاء المظهر والخلفيات الإيمانية</span>
              <span className="text-[9px] text-slate-400 block mt-0.5">تخصيص المشهد الروحي لمكة المكرمة</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[9px] text-slate-300 block pr-0.5">اختر وضع الخلفية المناسب لك:</span>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <button
                type="button"
                onClick={() => setBgStrategy('ai')}
                className={`py-1.5 px-2 rounded-lg font-bold border flex items-center justify-center gap-1 transition-all ${
                  bgStrategy === 'ai' 
                    ? 'bg-amber-600 text-slate-950 border-amber-400 shadow-sm' 
                    : 'bg-slate-950/50 hover:bg-slate-800 text-slate-200 border-slate-800'
                }`}
                title="تحديد الخلفية ديناميكياً بناءً على توقيت الزائر المحلي"
              >
                <Sparkles className="w-3 h-3 text-slate-950" />
                <span>الذكي المطور</span>
              </button>

              <button
                type="button"
                onClick={() => setBgStrategy('sunrise')}
                className={`py-1.5 px-2 rounded-lg font-bold border flex items-center justify-center gap-1 transition-all ${
                  bgStrategy === 'sunrise' 
                    ? 'bg-amber-600 text-slate-950 border-amber-400 shadow-sm' 
                    : 'bg-slate-950/50 hover:bg-slate-800 text-slate-200 border-slate-800'
                }`}
              >
                <Sun className="w-3 h-3 text-slate-950" />
                <span>شروق مكة</span>
              </button>

              <button
                type="button"
                onClick={() => setBgStrategy('sunset')}
                className={`py-1.5 px-2 rounded-lg font-bold border flex items-center justify-center gap-1 transition-all ${
                  bgStrategy === 'sunset' 
                    ? 'bg-amber-600 text-slate-950 border-amber-400 shadow-sm' 
                    : 'bg-slate-950/50 hover:bg-slate-800 text-slate-200 border-slate-800'
                }`}
              >
                <Sun className="w-3 h-3 text-slate-950" />
                <span>غروب مكة</span>
              </button>

              <button
                type="button"
                onClick={() => setBgStrategy('night')}
                className={`py-1.5 px-2 rounded-lg font-bold border flex items-center justify-center gap-1 transition-all ${
                  bgStrategy === 'night' 
                    ? 'bg-amber-600 text-slate-950 border-amber-400 shadow-sm' 
                    : 'bg-slate-950/50 hover:bg-slate-800 text-slate-200 border-slate-800'
                }`}
              >
                <Moon className="w-3 h-3 text-slate-950" />
                <span>ليل مكة</span>
              </button>
            </div>
          </div>
          
          <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-850 text-[9px] text-slate-300 leading-relaxed font-sans text-right">
            <span>الخلفية النشطة الآن:</span> <strong className="text-amber-400 font-extrabold">{getBgNameAr(bgStrategy)}</strong>
          </div>
        </div>
      </div>

      {/* Premium Toast Feedback for Booking Submissions */}
      {bookingToast && bookingToast.show && (
        <div className="fixed top-6 right-6 z-50 max-w-sm w-full bg-white text-slate-900 border-2 border-slate-900 rounded-xl shadow-2xl p-4 animate-fade-in font-sans" dir="rtl">
          <div className="flex gap-3 items-start">
            <div className={`p-2 rounded-lg flex-shrink-0 ${
              bookingToast.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
              bookingToast.type === 'error' ? 'bg-red-50 text-red-650 border border-red-105' :
              'bg-amber-100 text-amber-700'
            }`}>
              {bookingToast.type === 'success' && <CheckCircle2 className="w-5 h-5 animate-pulse" />}
              {bookingToast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-650" />}
            </div>

            <div className="flex-1 text-right">
              <div className="flex justify-between items-center gap-1">
                <h4 className="font-extrabold text-xs text-slate-950">{bookingToast.title}</h4>
                <button 
                  onClick={() => setBookingToast(null)}
                  className="text-slate-400 hover:text-slate-700 font-sans text-xs"
                >
                  ✕
                </button>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{bookingToast.message}</p>
              
              {bookingToast.type === 'success' && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setBookingToast(null);
                      setSelectedTx(null);
                      setActiveTab('track');
                      setHasSearched(true);
                      setTimeout(() => {
                        const searchInput = document.getElementById('search-phone-input') as HTMLInputElement;
                        if (searchInput) {
                          searchInput.focus();
                        }
                      }, 100);
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-amber-500 font-bold px-3 py-1.5 rounded-lg text-[10px] transition-colors flex items-center gap-1 w-full justify-center"
                  >
                    <span>استعلام ومتابعة الطلب الفورية ←</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback for Real-Time WhatsApp Notifications */}
      {waToast && waToast.show && (
        <div className="fixed bottom-6 left-6 z-50 max-w-md w-full sm:w-[440px] bg-slate-900 border border-slate-800 text-white p-4 rounded-xl shadow-2xl animate-fade-in font-sans" dir="rtl">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg flex-shrink-0 ${
              waToast.type === 'loading' ? 'bg-indigo-500/10 text-indigo-400' :
              waToast.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
              'bg-red-500/10 text-red-400'
            }`}>
              {waToast.type === 'loading' && (
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {waToast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
              {waToast.type === 'error' && <AlertCircle className="w-5 h-5" />}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black text-amber-400 tracking-wider uppercase block">
                  {waToast.type === 'loading' && 'جاري بث الإشعار الفوري...'}
                  {waToast.type === 'success' && 'البوابة الإلكترونية: تم البث بنجاح'}
                  {waToast.type === 'error' && 'البوابة الإلكترونية: خطأ في البث'}
                </span>
                <button 
                  onClick={() => setWaToast(null)}
                  className="text-slate-500 hover:text-slate-300 text-xs font-bold font-sans cursor-pointer transition-colors"
                >
                  إغلاق
                </button>
              </div>
              
              <h4 className="text-[12px] font-bold text-slate-150 mt-1">{waToast.message}</h4>
              
              <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-lg text-[10px] text-slate-400 mt-2 font-mono whitespace-pre-wrap leading-relaxed max-h-[140px] overflow-y-auto">
                <div className="border-b border-slate-900 pb-1 mb-1 font-sans font-extrabold text-slate-500 flex justify-between select-none">
                  <span>تفاصيل الرسالة المرسلة:</span>
                  <span className="text-emerald-500 text-[9px]">WhatsApp Gateway</span>
                </div>
                {waToast.details}
              </div>
            </div>
          </div>
        </div>
      )}

      </div> {/* Close scrollable main content container */}

      {/* 🟢 Floating Action Button (WhatsApp Help Chat) */}
      {socialWhatsapp && (
        <a
          href={socialWhatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 group flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-slate-950 font-black p-3.5 sm:p-4 rounded-full shadow-2xl border border-emerald-400/30 transition-all duration-300 hover:shadow-emerald-500/20 group cursor-pointer hover:-translate-y-1 select-none"
          title="تواصل معنا عبر واتساب للمساعدة الفورية"
          id="whatsapp-floating-action-button"
        >
          {/* Ripple effect/wave behind */}
          <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-75 group-hover:animate-none"></span>
          
          {/* Tooltip text - sliding out on hover/focus */}
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-out whitespace-nowrap text-xs font-bold text-slate-950 pr-0 group-hover:pr-2 block leading-none select-none">
            المساعدة الفورية (واتساب مباشر)
          </span>

          <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950 relative z-10" />
        </a>
      )}

    </div>
  );
}

