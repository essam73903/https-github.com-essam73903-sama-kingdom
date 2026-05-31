export interface Service {
  id: string;
  name: string;
  description: string;
  govFee: number; // State fee (الرسوم الحكومية)
  officeFee: number; // Office fee (أتعاب المكتب)
  category: 'visa' | 'gov' | 'transport' | 'other';
  icon: string; // Lucide icon name or indicator
  paymentMethods?: string[]; // Array of linked payment methods
}

export interface BookingRequest {
  id: string;
  clientName: string;
  phoneNumber: string;
  serviceId: string;
  serviceName: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  notes: string;
  date: string; // ISO format
  attachedFileName?: string;
  attachedFileData?: string; // Base64 data URI or indicator
  attachedFileSize?: string;
  attachments?: { name: string; data: string; size: string }[];
  isArchived?: boolean;
  isPaid?: boolean;
  paidAmount?: number;
  paymentOption?: 'full' | 'half'; // chosen advance payment condition: full (100%) or half (50%)
  paymentMethod?: string;
  paymentRef?: string;
  paymentCountry?: string;
  rating?: number; // 1 to 5 stars
  ratingComment?: string; // Optional customer feedback
  adminComments?: string; // Staff/Admin internal comments and notes
  lastReminderSent?: string; // Timestamp of last auto-scheduled WhatsApp reminder
}

export interface Transaction {
  id: string;
  clientName: string;
  serviceName: string;
  govFee: number;
  officeFee: number;
  tax: number; // 15% of officeFee
  total: number; // gov + office + tax
  date: string; // ISO format
  notes?: string;
  invoiceNumber: string; // e.g., INV-2026-001
}

// Default dynamic services list based on user's requirements
export const DEFAULT_SERVICES: Service[] = [
  {
    id: 'srv-1',
    name: 'تأشيرة عمل',
    description: 'تسهيل كافة إجراءات الاستقدام وتفويض وإصدار تأشيرات العمل للأفراد والمؤسسات بسرية وسرعة فائقة.',
    govFee: 2200,
    officeFee: 550,
    category: 'visa',
    icon: 'Briefcase',
    paymentMethods: ['sadad', 'mada', 'credit_card', 'applepay', 'bank_transfer']
  },
  {
    id: 'srv-2',
    name: 'تأشيرة عمرة وحج',
    description: 'إصدار تأشيرات المعتمرين والزوار وتنسيق السكن والتنقل بأسعار متميزة تخدم ضيوف الرحمن.',
    govFee: 330,
    officeFee: 165,
    category: 'visa',
    icon: 'Compass',
    paymentMethods: ['mada', 'credit_card', 'applepay', 'paypal', 'bank_transfer']
  },
  {
    id: 'srv-3',
    name: 'تأشيرة زيارة',
    description: 'إجراءات تأشيرات الزيارة العائلية، الشخصية، التجارية، والسياحية مع متابعة القبول والتأشير.',
    govFee: 550,
    officeFee: 220,
    category: 'visa',
    icon: 'Users',
    paymentMethods: ['sadad', 'mada', 'credit_card', 'applepay', 'stcpay']
  },
  {
    id: 'srv-4',
    name: 'خدمات تعقيب',
    description: 'متابعة وإنجاز كافة المعاملات لدى الدوائر الحكومية، مكاتب العمل، الجوازات، والبلديات بكفاءة عالية.',
    govFee: 0,
    officeFee: 300,
    category: 'gov',
    icon: 'FileText',
    paymentMethods: ['bank_transfer', 'mada', 'applepay', 'stcpay']
  },
  {
    id: 'srv-5',
    name: 'نقل بري',
    description: 'توفير خدمات النقل البري الجماعي والشحن للبضائع والطرود والسيارات بين كافة مدن المملكة ودول الخليج.',
    govFee: 100,
    officeFee: 80,
    category: 'transport',
    icon: 'Truck',
    paymentMethods: ['mada', 'credit_card', 'stcpay', 'fawry', 'applepay', 'bank_transfer']
  },
  {
    id: 'srv-6',
    name: 'نقل جوي',
    description: 'حجز ومتابعة تذاكر السفر وإصدار بوالص الشحن الجوي وتسهيل معاملات المطارات والاستقبال.',
    govFee: 800,
    officeFee: 120,
    category: 'transport',
    icon: 'Plane',
    paymentMethods: ['mada', 'credit_card', 'applepay', 'paypal', 'bank_transfer']
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    clientName: 'عبد الله بن محمد العتيبي',
    serviceName: 'تأشيرة عمل',
    govFee: 2200,
    officeFee: 550,
    tax: 82.5,
    total: 2832.5,
    date: '2026-05-18T10:30:00Z',
    invoiceNumber: 'SM-2605-001',
    notes: 'استقدام سائق خاص - جاهز للتسليم'
  },
  {
    id: 'tx-2',
    clientName: 'أحمد صالح المهدي',
    serviceName: 'تأشيرة عمرة وحج',
    govFee: 330,
    officeFee: 165,
    tax: 24.75,
    total: 519.75,
    date: '2026-05-19T08:15:00Z',
    invoiceNumber: 'SM-2605-002',
    notes: 'تأشيرة ذكية لعدد ٣ أفراد عائلة قطري'
  },
  {
    id: 'tx-3',
    clientName: 'مؤسسة الرياض للتوريدات',
    serviceName: 'خدمات تعقيب',
    govFee: 0,
    officeFee: 1200,
    tax: 180,
    total: 1380,
    date: '2026-05-19T14:45:00Z',
    invoiceNumber: 'SM-2605-003',
    notes: 'تحديث السجل التجاري ونقل كفالة عمالة موحدة'
  },
  {
    id: 'tx-4',
    clientName: 'خالد بن الوليد الشمري',
    serviceName: 'نقل بري',
    govFee: 100,
    officeFee: 80,
    tax: 12,
    total: 192,
    date: '2026-05-19T17:20:00Z',
    invoiceNumber: 'SM-2605-004',
    notes: 'شحن بري للدمام مبرد'
  }
];

export const INITIAL_BOOKINGS: BookingRequest[] = [
  {
    id: 'bk-1',
    clientName: 'سفيان عبد الرحمن الحارثي',
    phoneNumber: '0501234567',
    serviceId: 'srv-1',
    serviceName: 'تأشيرة عمل',
    status: 'pending',
    notes: 'طلب تأشيرة مهندس تكنولوجيا معلومات لمؤسسة تقنية برمجيات',
    date: '2026-05-19T11:00:00Z'
  },
  {
    id: 'bk-2',
    clientName: 'فاطمة عمر الزهراني',
    phoneNumber: '0559876543',
    serviceId: 'srv-3',
    serviceName: 'تأشيرة زيارة',
    status: 'processing',
    notes: 'زيارة عائلية للوالدين بالتعاون مع وزارة الخارجية للوفود الدولية',
    date: '2026-05-19T12:30:00Z'
  },
  {
    id: 'bk-3',
    clientName: 'شركة النخب التجارية',
    phoneNumber: '0543210987',
    serviceId: 'srv-4',
    serviceName: 'خدمات تعقيب',
    status: 'completed',
    notes: 'رخصة بلدي وإصدار شهادة الدفاع المدني للمستودع الجديد',
    date: '2026-05-18T09:00:00Z'
  },
  {
    id: 'bk-old-1',
    clientName: 'عبد الرحمن بن حمد الماجد',
    phoneNumber: '0507721109',
    serviceId: 'srv-1',
    serviceName: 'تأشيرة عمل',
    status: 'completed',
    notes: 'تسوية إجراءات استقدام مهندسين من الخارج وتثبيت رخصة العمل وتحديث بيانات قوى',
    date: '2026-04-10T10:30:00Z'
  }
];

export interface JobVacancy {
  id: string;
  title: string;
  department: string;
  location: string;
  type: 'دوام كامل' | 'دوام جزئي' | 'عن بعد' | string;
  salary: string;
  description: string;
  requirements: string[];
  date: string;
  images?: string[];
  videos?: string[];
}

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  applicantName: string;
  applicantPhone: string;
  applicantEmail: string;
  qualification: string;
  notes?: string;
  experienceYears: number;
  date: string;
  status?: 'قيد المراجعة' | 'تمت المقابلة' | 'تم القبول' | 'مرفوض';
}

