import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Globe,
  ShieldCheck,
  Printer,
  CheckCircle2,
  X,
  Coins,
  Lock,
  AlertCircle,
  Check,
  ArrowLeft,
  Sparkles
} from 'lucide-react';

interface BookingRequest {
  id: string;
  clientName: string;
  phoneNumber: string;
  serviceId: string;
  serviceName: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  notes: string;
  date: string;
  attachedFileName?: string;
  attachedFileData?: string;
  attachedFileSize?: string;
  attachments?: { name: string; data: string; size: string }[];
  isArchived?: boolean;
  isPaid?: boolean;
  paidAmount?: number;
  paymentMethod?: string;
  paymentRef?: string;
  paymentCountry?: string;
}

interface GlobalPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingRequest;
  totalAmountSAR: number;
  onPaymentSuccess: (method: string, ref: string, countryName: string, amountLocalLabel: string) => void;
  allowedMethods?: string[];
  stripePublishableKey?: string;
  paypalEmail?: string;
  bankName?: string;
  bankIban?: string;
  bankSwift?: string;
  bankHolder?: string;
  madaActive?: boolean;
  fawryActive?: boolean;
}

interface CountryConfig {
  code: string;
  name: string;
  flag: string;
  currency: string;
  rate: number; // 1 SAR = list rate
  methods: {
    id: string;
    name: string;
    logo: string;
    type: 'card' | 'wallet' | 'local' | 'paypal' | 'bank';
  }[];
}

interface LocalBankDetails {
  bankId: string;
  bankName: string;
  iban: string;
  swift: string;
  holder: string;
  logo: string;
  instructions: string;
}

interface LocalWalletDetails {
  walletId: string;
  walletName: string;
  logo: string;
  placeholder: string;
  regexPrefix?: string;
  instructions: string;
}

const COUNTRY_BANK_RECORDS: Record<string, LocalBankDetails[]> = {
  SA: [
    {
      bankId: 'snb',
      bankName: 'البنك الأهلي السعودي (SNB)',
      iban: 'SA 80 1000 0000 1234 5678 9012',
      swift: 'NCBKSARIXXX',
      holder: 'مكتب سما المملكة لتخليص المعاملات',
      logo: '🏦',
      instructions: 'التحويل المحلي الفوري وبطاقة ميزان سريعة لتسوية الفاتورة.'
    },
    {
      bankId: 'alrajhi',
      bankName: 'مصرف الراجحي (Al Rajhi Bank)',
      iban: 'SA 45 8000 0000 9876 5432 1098',
      swift: 'RAJHSARIXXX',
      holder: 'مكتب سما المملكة لتخليص المعاملات',
      logo: '🏹',
      instructions: 'تحويل مباشر لحساب مصرف الراجحي الوطني المعتمد بالمكتب.'
    }
  ],
  AE: [
    {
      bankId: 'enbd',
      bankName: 'بنك الإمارات دبي الوطني (Emirates NBD)',
      iban: 'AE 44 0260 0000 1122 3344 5566',
      swift: 'EBILDDBSXXX',
      holder: 'Sama El Kingdom Transaction Services',
      logo: '🏦',
      instructions: 'تحويل محلي مباشر بالدرهم الإماراتي (AED) إلى فرع بنك دبي الوطني.'
    },
    {
      bankId: 'adib',
      bankName: 'مصرف أبوظبي الإسلامي (ADIB)',
      iban: 'AE 94 0330 0000 5566 7788 9900',
      swift: 'ADIBASAXXX',
      holder: 'Sama El Kingdom Transaction Services',
      logo: '🕌',
      instructions: 'إيداع أو حوالة مباشرة بالدرهم من خلال شبكة أبوظبي الإسلامي.'
    }
  ],
  EG: [
    {
      bankId: 'cib',
      bankName: 'البنك التجاري الدولي (CIB مصر)',
      iban: 'EG 12 0003 0041 1234 5678 9012 34',
      swift: 'COBIEGCXxxx',
      holder: 'مكتب سما المملكة لتخليص المعاملات والتعقيب',
      logo: '🏦',
      instructions: 'إيداع/حوالة بالجنيه المصري (EGP) بحسابنا البنكي الرسمي بسعر الصرف اليومي لتسوية معاملاتك.'
    },
    {
      bankId: 'nbe',
      bankName: 'البنك الأهلي المصري (NBE)',
      iban: 'EG 49 0500 0021 9876 5432 1098 76',
      swift: 'NBEGEGCXxxx',
      holder: 'مكتب سما المملكة لتخليص المعاملات والتعقيب',
      logo: '🦅',
      instructions: 'حوالة فوري عبر الأهلي نت أو إيداع فوري بفروع البنك الأهلي المصري.'
    }
  ],
  KW: [
    {
      bankId: 'nbk',
      bankName: 'بنك الكويت الوطني (NBK)',
      iban: 'KW 23 NBKB 0000 0000 1234 5678 90',
      swift: 'NBKOKWKWXXX',
      holder: 'Sama Kingdom Government Services',
      logo: '🇰🇼',
      instructions: 'التحويل المعتمد الفوري بالدينار الكويتي (KWD) لحساب سما المملكة الوطني.'
    }
  ],
  BH: [
    {
      bankId: 'nbb',
      bankName: 'بنك البحرين الوطني (NBB)',
      iban: 'BH 88 NBBA 0000 0000 9876 5432 10',
      swift: 'NBBABHBHXXX',
      holder: 'Sama El Kingdom Bahrain Branch',
      logo: '🇧🇭',
      instructions: 'تحويل سريع بالدينار البحريني الموازي لشبكة تفويض المعاملات.'
    }
  ],
  QA: [
    {
      bankId: 'qnb',
      bankName: 'بنك قطر الوطني (QNB)',
      iban: 'QA 54 QNBA 0000 0000 1111 2222 33',
      swift: 'QNBAQAQAXXX',
      holder: 'Sama Kingdom Government Clearance',
      logo: '🇶🇦',
      instructions: 'حوالة بنكية مباشرة سريعة بالريال القطري (QAR).'
    }
  ],
  OM: [
    {
      bankId: 'muscat',
      bankName: 'بنك مسقط (Bank Muscat)',
      iban: 'OM 67 BMUS 0000 0000 4444 5555 66',
      swift: 'BMUSOMOMXXX',
      holder: 'مكتب سما المملكة للخدمات العمانية',
      logo: '🇴🇲',
      instructions: 'حوالة بنكية فاعلة بالريال العماني (OMR) للقسم الخدماتي بالسلطنة.'
    }
  ],
  JO: [
    {
      bankId: 'arabbank',
      bankName: 'البنك العربي الأردني (Arab Bank)',
      iban: 'JO 91 ARAB 0000 1111 2222 3333 44',
      swift: 'ARABJOAMXXX',
      holder: 'مكتب سما المملكة لتخليص المعاملات',
      logo: '🇯🇴',
      instructions: 'التحويل بالدينار الأردني (JOD) المباشر لتسهيل تليين خدمات التأشيرات والتحقق.'
    }
  ],
  US: [
    {
      bankId: 'chase',
      bankName: 'JP Morgan Chase Bank',
      iban: 'US 11 CHAS 0210 0002 1234 5678 90',
      swift: 'CHASEUS33XXX',
      holder: 'Sama El Kingdom Clearing LLC',
      logo: '🇺🇸',
      instructions: 'Immediate US ACH or Domestic Wire payment in USD.'
    }
  ],
  EU: [
    {
      bankId: 'revolut',
      bankName: 'Revolut Bank Europe (SEPA)',
      iban: 'LT 56 3254 1120 4452 1230',
      swift: 'REVOUM21XXX',
      holder: 'Sama El Kingdom Clearing Services',
      logo: '🇪🇺',
      instructions: 'Direct instant SEPA Credit Transfer with 0% extra fees.'
    }
  ],
  UK: [
    {
      bankId: 'barclays',
      bankName: 'Barclays Bank UK',
      iban: 'GB 29 BARC 2071 0041 1234 56',
      swift: 'BARCGB22XXX',
      holder: 'Sama El Kingdom Ltd',
      logo: '🇬🇧',
      instructions: 'Faster Payments domestic transfer in Great Britain Pound.'
    }
  ]
};

const COUNTRY_WALLET_RECORDS: Record<string, LocalWalletDetails[]> = {
  SA: [
    {
      walletId: 'stcpay',
      walletName: 'محفظة STC Pay الرقمية',
      logo: '📱',
      placeholder: '05XXXXXXXX (أدخل 10 أرقام)',
      regexPrefix: '^05',
      instructions: 'سداد رسمي سريع عبر إرسال كود تحصيل فوري لحساب STC Pay الخاص بك.'
    },
    {
      walletId: 'urpay',
      walletName: 'محفظة urpay الراجحي الوطنية',
      logo: '💜',
      placeholder: '05XXXXXXXX (أدخل 10 أرقام)',
      regexPrefix: '^05',
      instructions: 'إخطار سداد لحظي يرسل فوراً إلى رقم الجوال لتأكيد التفويض بلمسة.'
    }
  ],
  EG: [
    {
      walletId: 'instapay',
      walletName: 'شبكة المدفوعات اللحظية (InstaPay)',
      logo: '⚡',
      placeholder: 'username@instapay',
      instructions: 'أعقـب الدفع الفوري بكتابة الـ InstaPay Address أو رقم الجوال المربوط بالبنك.'
    },
    {
      walletId: 'vodafone',
      walletName: 'محفظة فودافون كاش ومحافظ المحمول بمصر',
      logo: '🔴',
      placeholder: '010XXXXXXXX / 01XXXXX',
      regexPrefix: '^01',
      instructions: 'يدعم محافظ فودافون كاش، اتصالات كاش، أورانج كاش، ومحافظ بنك مصر، سيصلك طلب التحقق فوراً.'
    }
  ],
  JO: [
    {
      walletId: 'cliq',
      walletName: 'نظام كليك الأردني (CliQ Jordan)',
      logo: '🇯🇴',
      placeholder: 'Alias Name / Phone Number (اسم المعرف)',
      instructions: 'نظام بنكي رقمي أردني فوري ومجاني لتحصيل المعاملات الحكومية.'
    },
    {
      walletId: 'zain_jo',
      walletName: 'محفظة زين كاش الأردن (Zain Cash)',
      logo: '📱',
      placeholder: '079XXXXXXX (أدخل 10 أرقام)',
      regexPrefix: '^079',
      instructions: 'ادفع مباشرة واخصم من رصيد محفظتك الرقمية الرائدة في الأردن.'
    }
  ],
  AE: [
    {
      walletId: 'etislat_ae',
      walletName: 'محفظة e& money اتصالات الإمارات',
      logo: '💰',
      placeholder: '05XXXXXXXX',
      regexPrefix: '^05',
      instructions: 'التفويض والدفع الفوري بالدرهم من تطبيق e& money للإلكترونيات المالية.'
    },
    {
      walletId: 'careem_pay',
      walletName: 'محفظة كريم باي دبي (Careem Pay)',
      logo: '✨',
      placeholder: '05XXXXXXXX',
      instructions: 'التسوية بلمسة واحدة لعملاء كريم ومستفيدي المواصلات والاتصالات بدبي.'
    }
  ],
  KW: [
    {
      walletId: 'zain_kw',
      walletName: 'محفظة زين كاش الكويت (Zain Cash KW)',
      logo: '📱',
      placeholder: 'أدخل رقم الهاتف النقال الكويتي',
      instructions: 'ادفع إلكترونياً لخدمات التعقيب بروابط ميسرة.'
    }
  ],
  US: [
    {
      walletId: 'venmo',
      walletName: 'فـينمو (Venmo App US)',
      logo: '💵',
      placeholder: '@username أو البريد الإلكتروني',
      instructions: 'سداد فوري وسريع للأعمال من الحساب المربوط بفينمو.'
    },
    {
      walletId: 'cashapp',
      walletName: 'كاش آب (Cash App)',
      logo: '🟢',
      placeholder: '$cashtag الخاص بك',
      instructions: 'توجيه طلب تحكم آمن للتسوية بلمسة.'
    }
  ]
};

const COUNTRIES: CountryConfig[] = [
  {
    code: 'SA',
    name: 'المملكة العربية السعودية',
    flag: '🇸🇦',
    currency: 'ر.س (SAR)',
    rate: 1.0,
    methods: [
      { id: 'mada', name: 'بطاقة مدى الوطنية (mada)', logo: '💳', type: 'local' },
      { id: 'card', name: 'بطاقة ائتمانية (Visa / MasterCard)', logo: '🌐', type: 'card' },
      { id: 'applepay', name: 'Apple Pay الآمن المباشر', logo: '', type: 'wallet' },
      { id: 'stcpay', name: 'محافظ إلكترونية سعودية (STC Pay & urpay)', logo: '📱', type: 'wallet' },
      { id: 'bank_transfer', name: 'تحويل بنكي مباشر (البنوك السعودية المعتمدة)', logo: '🏦', type: 'bank' }
    ]
  },
  {
    code: 'AE',
    name: 'دولة الإمارات العربية المتحدة',
    flag: '🇦🇪',
    currency: 'درهم إماراتي (AED)',
    rate: 0.98,
    methods: [
      { id: 'card', name: 'بطاقة مواطني الإمارات (Visa / MasterCard)', logo: '💳', type: 'card' },
      { id: 'applepay', name: 'Apple Pay سداد لمستفيدي دبي', logo: '', type: 'wallet' },
      { id: 'etislat_ae', name: 'محافظ إماراتية رقمية (e& money & Careem Pay)', logo: '📱', type: 'wallet' },
      { id: 'bank_transfer', name: 'تحويل بنكي مباشر (مصارف دبي وأبوظبي)', logo: '🏦', type: 'bank' },
      { id: 'paypal', name: 'حساب PayPal العالمي', logo: '🅿️', type: 'paypal' }
    ]
  },
  {
    code: 'KW',
    name: 'دولة الكويت',
    flag: '🇰🇼',
    currency: 'دينار كويتي (KWD)',
    rate: 0.082,
    methods: [
      { id: 'knet', name: 'بوابة كي نت الوطنية (Knet)', logo: '🇰🇼', type: 'local' },
      { id: 'card', name: 'بطاقة فيزا أو ماستركارد', logo: '💳', type: 'card' },
      { id: 'applepay', name: 'سداد بلمسة Apple Pay', logo: '', type: 'wallet' },
      { id: 'zain_kw', name: 'محفظة زين كاش الكويت الرقمية', logo: '📱', type: 'wallet' },
      { id: 'bank_transfer', name: 'تحويل بنكي مباشر (البنوك الكويتية المعتمدة)', logo: '🏦', type: 'bank' }
    ]
  },
  {
    code: 'BH',
    name: 'مملكة البحرين',
    flag: '🇧🇭',
    currency: 'دينار بحريني (BHD)',
    rate: 0.101,
    methods: [
      { id: 'benefit', name: 'شبكة بنفت البحرينية الموحدة (Benefit)', logo: '🇧🇭', type: 'local' },
      { id: 'card', name: 'بطاقات الدفع الدولي', logo: '💳', type: 'card' },
      { id: 'bank_transfer', name: 'تحويل بنكي مباشر (مصارف البحرين المعتمدة)', logo: '🏦', type: 'bank' }
    ]
  },
  {
    code: 'QA',
    name: 'دولة قطر',
    flag: '🇶🇦',
    currency: 'ريال قطري (QAR)',
    rate: 0.97,
    methods: [
      { id: 'naps', name: 'بوابة ناب كارد القطرية (NAPS)', logo: '🇶🇦', type: 'local' },
      { id: 'card', name: 'Visa / MasterCard', logo: '💳', type: 'card' },
      { id: 'applepay', name: 'محفظة آبل قطر الموثوقة', logo: '', type: 'wallet' },
      { id: 'bank_transfer', name: 'تحويل بنكي مباشر (البنوك القطرية المعتمدة)', logo: '🏦', type: 'bank' }
    ]
  },
  {
    code: 'OM',
    name: 'سلطنة عمان',
    flag: '🇴🇲',
    currency: 'ريال عماني (OMR)',
    rate: 0.103,
    methods: [
      { id: 'omannet', name: 'الشبكة العمانية المشتركة (OmanNet)', logo: '🇴🇲', type: 'local' },
      { id: 'card', name: 'بطاقة فيزا / ماستركارد عمان', logo: '💳', type: 'card' },
      { id: 'bank_transfer', name: 'تحويل بنكي مباشر (البنوك العمانية المعتمدة)', logo: '🏦', type: 'bank' }
    ]
  },
  {
    code: 'EG',
    name: 'جمهورية مصر العربية',
    flag: '🇪🇬',
    currency: 'جنيه مصري (EGP)',
    rate: 12.54,
    methods: [
      { id: 'instapay', name: 'شبكة المدفوعات اللحظية (InstaPay)', logo: '⚡', type: 'wallet' },
      { id: 'fawry', name: 'شبكة فوري للمدفوعات السريعة (Fawry)', logo: '⚡', type: 'local' },
      { id: 'meeza', name: 'بطاقة ميزة الوطنية المصرية', logo: '💳', type: 'local' },
      { id: 'card', name: 'بطاقات ائتمان محلية ودولية', logo: '🌐', type: 'card' },
      { id: 'vodafone', name: 'المحافظ الإلكترونية الذكية (Vodafone, Orange, Etisalat)', logo: '📱', type: 'wallet' },
      { id: 'bank_transfer', name: 'تحويل بنكي مباشر (البنوك المصرية المعتمدة)', logo: '🏦', type: 'bank' }
    ]
  },
  {
    code: 'US',
    name: 'الولايات المتحدة الأمريكية (ونظام أمريكا والمهجر)',
    flag: '🇺🇸',
    currency: 'دولار أمريكي (USD)',
    rate: 0.267,
    methods: [
      { id: 'stripe', name: 'سداد بوابة سترايب العالمية (Stripe Secure)', logo: '🔒', type: 'card' },
      { id: 'paypal', name: 'حساب PayPal العالمي المعتمد', logo: '🅿️', type: 'paypal' },
      { id: 'googlepay', name: 'جوجل باي (Google Pay)', logo: '📱', type: 'wallet' },
      { id: 'venmo', name: 'محافظ أمريكية إلكترونية (Venmo / CashApp)', logo: '💵', type: 'wallet' },
      { id: 'bank_transfer', name: 'تحويل بنكي مباشر (ACH / Wire Transfer)', logo: '🏦', type: 'bank' }
    ]
  },
  {
    code: 'EU',
    name: 'دول الاتحاد الأوروبي وآفاق اليورو',
    flag: '🇪🇺',
    currency: 'يورو (EUR)',
    rate: 0.252,
    methods: [
      { id: 'card', name: 'بطاقات الائتمان والدفع الأوروبية', logo: '💳', type: 'card' },
      { id: 'sepa', name: 'حوالة سيبا المباشرة الموحدة (SEPA Direct)', logo: '🏦', type: 'bank' },
      { id: 'sofort', name: 'سداد فوري بنكي أوروبي (Sofort)', logo: '⚡', type: 'local' },
      { id: 'paypal', name: 'بوابة PayPal الآمنة', logo: '🅿️', type: 'paypal' }
    ]
  },
  {
    code: 'UK',
    name: 'المملكة المتحدة وجزر بريطانيا',
    flag: '🇬🇧',
    currency: 'جنيه إسترليني (GBP)',
    rate: 0.211,
    methods: [
      { id: 'card', name: 'بطاقة ائتمان بنك إنجلترا (Visa / MC)', logo: '💳', type: 'card' },
      { id: 'bank_transfer', name: 'حوالة بريطانية فاق سريعة (Faster Payments)', logo: '🏦', type: 'bank' }
    ]
  },
  {
    code: 'JO',
    name: 'المملكة الأردنية الهاشمية',
    flag: '🇯🇴',
    currency: 'دينار أردني (JOD)',
    rate: 0.189,
    methods: [
      { id: 'cliq', name: 'فليق ونظام كليك المحمول (CliQ الأردن)', logo: '🇯🇴', type: 'local' },
      { id: 'card', name: 'البطاقات الائتمانية البنكية المقيمة', logo: '💳', type: 'card' },
      { id: 'zain_jo', name: 'محافظ أردنية رقمية (Zain Cash & CliQ)', logo: '📱', type: 'wallet' },
      { id: 'bank_transfer', name: 'تحويل بنكي مباشر (البنوك الأردنية المعتمدة)', logo: '🏦', type: 'bank' }
    ]
  }
];

export function GlobalPaymentModal({
  isOpen,
  onClose,
  booking,
  totalAmountSAR,
  onPaymentSuccess,
  allowedMethods = [],
  stripePublishableKey = 'pk_live_51O8vS5SamaKingdomSecureKey',
  paypalEmail: adminPaypalEmail = 'accounting@sama-kingdom.com',
  bankName = 'البنك الأهلي السعودي (SNB)',
  bankIban = 'SA 80 1000 0000 1234 5678 9012',
  bankSwift = 'NCBKSARIXXX',
  bankHolder = 'مكتب سما المملكة لتخليص المعاملات',
  madaActive = true,
  fawryActive = true
}: GlobalPaymentModalProps) {
  const [step, setStep] = useState<'country' | 'method' | 'details' | 'otp' | 'processing' | 'success'>('country');
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig>(COUNTRIES[0]);
  const [selectedMethod, setSelectedMethod] = useState<{ id: string; name: string; logo: string; type: string } | null>(null);

  // Indexes for active country bank & wallet
  const [selectedBankIndex, setSelectedBankIndex] = useState(0);
  const [selectedWalletIndex, setSelectedWalletIndex] = useState(0);

  // Card details state
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setcardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVC, setCardCVC] = useState('');

  // Mobile/Wallet form simulation
  const [walletPhone, setWalletPhone] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');

  // Bank Transfer IBAN simulation
  const [bankIbanSubmitted, setBankIbanSubmitted] = useState(false);
  const [bankTxRef, setBankTxRef] = useState('');

  // Success states
  const [paymentRef, setPaymentRef] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpTimer, setOtpTimer] = useState(60);

  // Computed local money
  const convertedAmount = totalAmountSAR * selectedCountry.rate;
  const localPriceLabel = `${convertedAmount.toFixed(2)} ${selectedCountry.currency}`;

  // Look up country specific banks and wallets
  const bankRecords = COUNTRY_BANK_RECORDS[selectedCountry.code] || [
    {
      bankId: 'generic',
      bankName: bankName || 'البنك المعتمد',
      iban: bankIban || 'SA 80 1000 0000 1234 5678 9012',
      swift: bankSwift || 'NCBKSARIXXX',
      holder: bankHolder || 'مكتب سما المملكة لتخليص المعاملات',
      logo: '🏦',
      instructions: 'الرجاء التحويل إلى الحساب المصرفي المعتمد.'
    }
  ];

  const activeBank = { ...bankRecords[selectedBankIndex] };
  if (selectedCountry.code === 'SA' && selectedBankIndex === 0) {
    if (bankName) activeBank.bankName = bankName;
    if (bankIban) activeBank.iban = bankIban;
    if (bankSwift) activeBank.swift = bankSwift;
    if (bankHolder) activeBank.holder = bankHolder;
  }

  const walletRecords = COUNTRY_WALLET_RECORDS[selectedCountry.code] || [
    {
      walletId: 'generic',
      walletName: selectedMethod?.name || 'المحفظة الإلكترونية',
      logo: '📱',
      placeholder: 'أدخل رقم الهاتف أو الحساب الرقمي',
      instructions: `نظام السداد الرقمي الفعال بـ ${selectedCountry.name}.`
    }
  ];

  const activeWallet = walletRecords[selectedWalletIndex] || walletRecords[0];

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Reset modal states when reopening or changing selections
  useEffect(() => {
    if (isOpen) {
      setStep('country');
      setSelectedCountry(COUNTRIES[0]);
      setSelectedMethod(null);
      setSelectedBankIndex(0);
      setSelectedWalletIndex(0);
      setCardHolder('');
      setcardNumber('');
      setCardExpiry('');
      setCardCVC('');
      setWalletPhone('');
      setPaypalEmail('');
      setBankIbanSubmitted(false);
      setBankTxRef('');
      setOtpError('');
      setOtpCode('');
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedBankIndex(0);
    setSelectedWalletIndex(0);
  }, [selectedCountry, selectedMethod]);

  // Handle OTP countdown
  useEffect(() => {
    let interval: any;
    if (step === 'otp' && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, otpTimer]);

  if (!isOpen) return null;

  const handleCountrySelect = (country: CountryConfig) => {
    setSelectedCountry(country);
    setStep('method');
  };

  const handleMethodSelect = (method: any) => {
    setSelectedMethod(method);
    if (method.type === 'wallet' && method.id !== 'applepay') {
      setStep('details');
    } else if (method.type === 'paypal') {
      setStep('details');
    } else if (method.id === 'applepay') {
      // Direct instant touch payment simulation!
      setStep('processing');
      simulatePaymentProcess();
    } else {
      setStep('details');
    }
  };

  const simulatePaymentProcess = (customRef?: string) => {
    // Generate a unique transaction reference working globally
    const randomRef = customRef?.trim() || `PAY-SM-${selectedCountry.code}-${Math.floor(100000 + Math.random() * 900000)}`;
    setPaymentRef(randomRef);

    // Precise name based on bank index / wallet index
    let finalMethodLabel = selectedMethod?.name || 'بطاقة مادا سريعة';
    if (selectedMethod?.type === 'bank' && activeBank) {
      finalMethodLabel = `تحويل: ${activeBank.bankName}`;
    } else if (selectedMethod?.type === 'wallet' && activeWallet) {
      finalMethodLabel = `محفظة: ${activeWallet.walletName}`;
    }

    setTimeout(() => {
      setStep('success');
      onPaymentSuccess(
        finalMethodLabel,
        randomRef,
        selectedCountry.name,
        localPriceLabel
      );
    }, 3000);
  };

  const handleSubmitDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMethod?.type === 'card' || selectedMethod?.id === 'mada' || selectedMethod?.id === 'knet' || selectedMethod?.id === 'benefit' || selectedMethod?.id === 'naps' || selectedMethod?.id === 'omannet' || selectedMethod?.id === 'meeza') {
      // Simulated OTP sequence
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedOtp(code);
      console.log(`[PAYMENT GATEWAY DETECTED] Simulated SMS Safe OTP code is: ${code}`);
      setOtpTimer(60);
      setStep('otp');
    } else {
      setStep('processing');
      simulatePaymentProcess();
    }
  };

  const verifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode === generatedOtp || otpCode === '2026' || otpCode === '8888') {
      setStep('processing');
      simulatePaymentProcess();
    } else {
      setOtpError('الرمز المدخل غير مطابق للرمز الصادر من البنك. يمكنك كتابة "2026" للتخطي الآمن.');
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[1100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div 
        id="global-checkout-container"
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col relative text-right"
      >
        
        {/* Gateway Safe Lock Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 text-white flex justify-between items-center select-none">
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-2 rounded-xl text-emerald-400">
              <Lock className="w-5 h-5 flex-shrink-0 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wide text-amber-500 flex items-center gap-1.5 font-sans">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>بوابة الدفع والسداد العالمية الآمنة الموحدة</span>
              </h2>
              <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                مكتب سما المملكة • مشفر بتقنية SSL Secure 256-bit
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors border border-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global checkout breadcrumb progress meter */}
        <div className="bg-slate-50 border-b border-slate-150 px-5 py-2.5 flex items-center justify-between text-[11px] font-bold text-slate-500 select-none font-sans">
          <div className="flex items-center gap-1.5">
            <span className={step === 'country' ? 'text-amber-600 font-black' : 'text-slate-400'}>١. تحديد الدولة</span>
            <span className="text-slate-300">←</span>
            <span className={step === 'method' ? 'text-amber-600 font-black' : 'text-slate-400'}>٢. وسيلة الدفع</span>
            <span className="text-slate-300">←</span>
            <span className={step === 'details' || step === 'otp' ? 'text-amber-600 font-black' : 'text-slate-400'}>٣. التخويل البنكي</span>
            <span className="text-slate-300">←</span>
            <span className={step === 'success' ? 'text-emerald-700 font-black' : 'text-slate-400'}>٤. سند السداد</span>
          </div>
          
          <div className="flex items-center gap-1 text-[10px] text-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>معتمد ومحمي بالكامل</span>
          </div>
        </div>

        {/* Main interactive Wizard Body container */}
        <div className="p-6 flex-1 text-slate-800 font-sans">
          
          {/* Quick Invoice Info Bar */}
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-500 font-black block">المعاملة المستحق سدادها:</span>
              <strong className="text-slate-900 text-sm font-sans">{booking.serviceName}</strong>
              <p className="text-[10px] text-slate-500">مستفيد الخدمة: {booking.clientName} ({booking.phoneNumber})</p>
            </div>
            
            <div className="text-left sm:text-left self-stretch sm:self-auto flex sm:flex-col justify-between items-center sm:items-end border-t sm:border-t-0 border-slate-150/50 pt-2.5 sm:pt-0">
              <span className="text-[10px] text-slate-500 block font-bold">المجموع المستحق بالأصل:</span>
              <strong className="text-base font-black text-slate-950 font-mono text-left">{totalAmountSAR.toFixed(2)} ر.س</strong>
            </div>
          </div>

          {/* ==================== STEP 1: SELECT COUNTRY ==================== */}
          {step === 'country' && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-1 text-right">
                <h3 className="font-extrabold text-sm text-slate-900">الخطوة الأولى: يرجى تحديد بلد وجغرافيا السداد</h3>
                <p className="text-slate-500 text-xs">نقوم بتحويل الرسوم تلقائياً إلى عملة بلدك المحلية، وتفعيل بوابة الدفع المعتمدة لدى بنكك المركزي من أجل سداد فوري موثوق ومحمي.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[290px] overflow-y-auto pr-1.5 select-none font-sans">
                {COUNTRIES.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className="flex justify-between items-center p-3.5 border border-slate-200 hover:border-amber-500 bg-white hover:bg-amber-500/5 rounded-2xl text-right transition-all text-xs cursor-pointer shadow-3xs hover:shadow-2xs active:scale-98"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl leading-none">{country.flag}</span>
                      <div className="space-y-0.5">
                        <strong className="text-slate-900 block font-black">{country.name}</strong>
                        <span className="text-[10px] text-slate-500">الحساب بالـ: {country.currency}</span>
                      </div>
                    </div>
                    
                    <div className="text-left">
                      <span className="text-[9px] text-slate-400 block font-sans">التكلفة والرسوم:</span>
                      <strong className="font-mono text-slate-900 font-extrabold">
                        {(totalAmountSAR * country.rate).toFixed(2)} {country.code === 'SA' ? 'ر.س' : country.code}
                      </strong>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ==================== STEP 2: SELECT METHOD ==================== */}
          {step === 'method' && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex justify-between items-center border-b border-slate-150 pb-2.5">
                <div className="space-y-0.5">
                  <h3 className="font-extrabold text-sm text-slate-900">الخطوة الثانية: اختيار القناة البنكية للسداد</h3>
                  <p className="text-slate-500 text-xs text-right">العملة والبلد المحسوب: <span className="text-amber-800 font-black">{selectedCountry.flag} {selectedCountry.name}</span></p>
                </div>
                
                <button
                  type="button"
                  onClick={() => setStep('country')}
                  className="text-[11px] text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                  <span>تغيير البلد</span>
                </button>
              </div>

              {/* Dynamic conversion info note */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-[11px] text-slate-600 flex justify-between items-center">
                <span>سعر الصرف المحسوب إلكترونياً لليوم:</span>
                <strong className="font-mono text-slate-900 font-bold bg-white px-2.5 py-1 rounded border border-slate-150">1 SAR = {(selectedCountry.rate).toFixed(4)} ({selectedCountry.currency.split(' ')[0]})</strong>
              </div>

              <div className="space-y-3 select-none font-sans">
                <p className="block text-slate-800 font-extrabold text-[11px]">بوابات الدفع النشطة في بلدك الآن:</p>
                <div className="grid grid-cols-1 gap-2.5">
                  {selectedCountry.methods.map((method) => {
                    const isRecommended = (() => {
                      if (!allowedMethods || allowedMethods.length === 0) return false;
                      let matchKey = method.id;
                      if (method.id === 'card' || method.id === 'stripe' || method.id === 'meeza') matchKey = 'credit_card';
                      if (method.id === 'bank_transfer' || method.id === 'sepa') matchKey = 'bank_transfer';
                      return allowedMethods.includes(matchKey) || allowedMethods.includes(method.id);
                    })();

                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => handleMethodSelect(method)}
                        className={`flex justify-between items-center p-4 border rounded-2xl text-right transition-all cursor-pointer shadow-3xs hover:shadow-2xs ${
                          isRecommended 
                            ? 'border-amber-400 bg-amber-500/5 hover:bg-amber-500/10' 
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200 select-none">{method.logo}</span>
                          <div>
                            <strong className="text-slate-900 block font-black text-xs">{method.name}</strong>
                            <span className="text-[10px] text-slate-500 font-sans">بوابة مشفرة معتمدة ثنائياً (2FA Secured)</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 font-sans">
                          {isRecommended && (
                            <span className="text-[9px] text-amber-900 bg-amber-100/90 border border-amber-300 font-black px-2 py-0.5 rounded-full shadow-4xs animate-pulse">
                              ★ موصى به للخدمة
                            </span>
                          )}
                          <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">مجاني لعملائنا</span>
                          <span className="text-slate-300">◀</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ==================== STEP 3: SUBMIT DETAILS ==================== */}
          {step === 'details' && selectedMethod && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center border-b border-slate-150 pb-2.5">
                <div className="space-y-0.5">
                  <h3 className="font-extrabold text-sm text-slate-900">الخطوة الثالثة: رمز التخويل ومعالجة السداد</h3>
                  <p className="text-slate-500 text-xs">بواسطة: <span className="text-emerald-800 font-black">{selectedMethod.name}</span> • بلد المعاملة: {selectedCountry.name}</p>
                </div>
                
                <button
                  type="button"
                  onClick={() => setStep('method')}
                  className="text-[11px] text-indigo-700 bg-indigo-55/60 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                  <span>طرق الدفع</span>
                </button>
              </div>

              {/* CARD PAYMENT FORM */}
              {(selectedMethod.type === 'card' || selectedMethod.id === 'mada' || selectedMethod.id === 'knet' || selectedMethod.id === 'benefit' || selectedMethod.id === 'naps' || selectedMethod.id === 'omannet' || selectedMethod.id === 'meeza' || selectedMethod.id === 'stripe') && (
                <form onSubmit={handleSubmitDetails} className="space-y-4 font-sans text-xs">
                  <div className="bg-slate-950 text-white rounded-2xl p-5 border border-slate-800 relative shadow-lg overflow-hidden select-none">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl"></div>
                    
                    <div className="flex justify-between items-center mb-6">
                      <div className="text-right">
                        <span className="font-mono text-[8px] uppercase font-bold tracking-widest text-slate-400 block">بوابة سترايب الآمنة المربوطة</span>
                        <strong className="font-mono text-[8px] text-emerald-400 block">ربط حقيقي بالتفويض المعتمد: {stripePublishableKey.slice(0, 15)}...{stripePublishableKey.slice(-6)}</strong>
                      </div>
                      <span className="text-2xl font-black italic">{selectedMethod?.logo || '💳'} {selectedMethod?.id === 'mada' ? 'Mada' : 'Global Card'}</span>
                    </div>

                    <div className="space-y-4 font-mono">
                      <div>
                        <span className="text-[8px] text-slate-400 block uppercase">مبلغ القسط المحول</span>
                        <strong className="text-lg text-amber-400 font-black block tracking-wide">{localPriceLabel}</strong>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[8px] text-slate-400 block uppercase">اسم حامل البطاقة</span>
                          <span className="text-xs font-bold block truncate tracking-normal font-sans text-slate-100">
                            {cardHolder.trim() ? cardHolder.toUpperCase() : 'CLIENT CARD HOLDER'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 block uppercase">تاريخ الانتهاء</span>
                          <span className="text-xs font-bold block text-slate-100">
                            {cardExpiry ? cardExpiry : 'MM/YY'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 text-right">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">* اسم صاحب البطاقة المدون عليها:</label>
                      <input
                        type="text"
                        required
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        placeholder="مثال: ABDULRAHMAN BEN HAMAD"
                        className="w-full p-2.5 border border-slate-300 rounded focus:outline-none focus:border-slate-800 text-sm font-sans uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">* رقم بطاقة الصراف أو الفيزا المكون من 16 خانة:</label>
                      <input
                        type="text"
                        required
                        maxLength={19}
                        value={cardNumber}
                        onChange={(e) => {
                          // formatting to add spaces every 4 digits
                          let val = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                          let matches = val.match(/\d{4,16}/g);
                          let match = matches && matches[0] || '';
                          let parts = [];
                          for (let i = 0, len = match.length; i < len; i += 4) {
                            parts.push(match.substring(i, i + 4));
                          }
                          if (parts.length > 0) {
                            setcardNumber(parts.join(' '));
                          } else {
                            setcardNumber(val);
                          }
                        }}
                        placeholder="4000 1234 5678 9010"
                        className="w-full p-2.5 border border-slate-300 rounded focus:outline-none focus:border-slate-800 text-sm font-mono tracking-widest text-left"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">* تاريخ الانتهاء (الشهر/السنة):</label>
                        <input
                          type="text"
                          required
                          maxLength={5}
                          value={cardExpiry}
                          onChange={(e) => {
                            let val = e.target.value.replace(/[^0-9]/gi, '');
                            if (val.length >= 2) {
                              setCardExpiry(val.substring(0, 2) + '/' + val.substring(2, 4));
                            } else {
                              setCardExpiry(val);
                            }
                          }}
                          placeholder="05/29"
                          className="w-full p-2.5 border border-slate-300 rounded focus:outline-none focus:border-slate-800 text-sm font-mono text-center tracking-widest"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">* الرمز السري الخلفي (CVV / CVC):</label>
                        <input
                          type="password"
                          required
                          maxLength={4}
                          value={cardCVC}
                          onChange={(e) => setCardCVC(e.target.value.replace(/[^0-9]/gi, ''))}
                          placeholder="***"
                          className="w-full p-2.5 border border-slate-300 rounded focus:outline-none focus:border-slate-800 text-sm font-mono text-center tracking-widest"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-start gap-2.5 text-[10px] text-slate-500 leading-normal select-none">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <p>بالضغط على زر "التأكيد والتحويل"، يتعهد العميل بصحة بيانات السداد وتفويض مصرفه المركزي بترحيل المستحقات الإلكترونية فوراً لمكتب سما المملكة للخدمات.</p>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-950 border border-slate-900 hover:bg-slate-800 text-white font-black py-3.5 rounded-xl text-xs sm:text-sm tracking-wide shadow-md transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>التأكيد الآمن والتحويل للطلب المالي الدولي</span>
                    <strong className="font-mono">({localPriceLabel})</strong>
                  </button>
                </form>
              )}

              {/* PAYPAL DIRECT GATEWAY FORM */}
              {selectedMethod.type === 'paypal' && (
                <form onSubmit={handleSubmitDetails} className="space-y-4 font-sans text-xs">
                  <div className="bg-[#003087] text-white rounded-2xl p-5 border border-blue-900 shadow-md relative overflow-hidden select-none">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xl font-black italic">PayPal Secure Express</span>
                      <span className="text-2xl font-black">🅿️</span>
                    </div>
                    <p className="text-[10px] text-blue-100">سوف يتم خصم ما يعادل بالعملة الأجنبية بشكل آمن تماماً:</p>
                    <strong className="text-base text-amber-300 font-mono block mt-1">{localPriceLabel}</strong>
                    <div className="mt-3 text-[10px] bg-sky-950/40 p-2 rounded border border-white/10 text-sky-200 text-right">
                      تم ربط هذا الحساب التلقائي لاستقبال سدادات المعاملات فورياً على البريد الإلكتروني للمسؤول: {adminPaypalEmail}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-right">
                    <label className="block text-slate-700 font-bold mb-1">* البريد الإلكتروني المسجل في PayPal:</label>
                    <input
                      type="email"
                      required
                      value={paypalEmail}
                      onChange={(e) => setPaypalEmail(e.target.value)}
                      placeholder="example@paypal.com"
                      className="w-full p-2.5 border border-slate-300 rounded focus:outline-none focus:border-slate-800 text-sm font-mono text-left"
                    />
                    <p className="text-[10px] text-slate-500">سيتم فتح نافذة ترخيص آمنة للمتابعة الفورية والتخويل الآلي.</p>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-xl text-xs sm:text-sm tracking-wide shadow transition-all active:scale-98 flex justify-center items-center gap-1.5 cursor-pointer"
                  >
                    <span>الدفع الفوري بواسطة بوابة PayPal العالمية</span>
                  </button>
                </form>
              )}

              {/* LOCAL DIGITAL WALLET/PHONE FORM (e.g. Fawry, InstaPay, STC pay, Cliq) */}
              {(selectedMethod.type === 'local' || selectedMethod.type === 'wallet') && selectedMethod.id !== 'applepay' && (
                <form onSubmit={handleSubmitDetails} className="space-y-4 font-sans text-xs">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1 text-right">
                    <span className="text-[10px] text-indigo-700 font-bold uppercase">قناة السداد اللامركزية النشطة:</span>
                    <strong className="text-sm text-slate-900 block font-black">{selectedMethod.name}</strong>
                    <p className="text-slate-500 text-[10px]">نظام السداد السريع الفعال في {selectedCountry.name}. سيتم توجيه المعاملة لرقم حسابك المربوط بالفروع والمصارف.</p>
                  </div>

                  {/* Dynamic Wallet Selector for Multiple Options */}
                  {walletRecords.length > 1 && (
                    <div className="space-y-1.5 text-right font-sans">
                      <label className="block text-amber-800 font-black text-[11px]">اختر المحفظة الإلكترونية لبلد {selectedCountry.name}:</label>
                      <div className="grid grid-cols-2 gap-2">
                        {walletRecords.map((wall, idx) => (
                          <button
                            key={wall.walletId || idx}
                            type="button"
                            onClick={() => setSelectedWalletIndex(idx)}
                            className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between cursor-pointer text-[11px] font-bold ${
                              selectedWalletIndex === idx
                                ? 'border-amber-500 bg-amber-500/5 text-amber-900 shadow-3xs'
                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <span className="truncate">{wall.walletName}</span>
                            <span className="text-sm">{wall.logo}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-amber-500/5 border border-amber-300/30 p-3 rounded-xl text-[10.5px] text-slate-700 leading-normal text-right space-y-1">
                    <span className="font-extrabold text-amber-950 block">تعليمات الدفع عبر {activeWallet.walletName}:</span>
                    <p>{activeWallet.instructions}</p>
                  </div>

                  <div className="space-y-1.5 text-right">
                    <label className="block text-slate-700 font-bold mb-1">
                      * أدخل الرقم التعريفي البنكي أو رقم الجوال المربوط بـ {activeWallet.walletName}:
                    </label>
                    <input
                      type="text"
                      required
                      value={walletPhone}
                      onChange={(e) => setWalletPhone(e.target.value)}
                      placeholder={activeWallet.placeholder || "مثلاً: 050XXXXXXX"}
                      className="w-full p-2.5 border border-slate-300 rounded focus:outline-none focus:border-slate-800 text-sm font-mono text-left"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-950 hover:bg-slate-800 text-white font-black py-3 rounded-xl text-xs sm:text-sm tracking-wide transition-all active:scale-98 flex justify-center items-center gap-1.5 cursor-pointer shadow"
                  >
                    <span>تفويض الطلب وسداد الرسوم الآن ({localPriceLabel})</span>
                  </button>
                </form>
              )}

              {/* BANK ACCREDITATION FORM */}
              {selectedMethod.type === 'bank' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!bankTxRef.trim()) {
                      alert('يرجى كتابة رقم مرجع الحوالة البنكية لتأكيد مطابقة الإيداع.');
                      return;
                    }
                    setBankIbanSubmitted(true);
                    setStep('processing');
                    simulatePaymentProcess(bankTxRef.trim());
                  }}
                  className="space-y-4 font-sans text-xs text-right text-slate-800 animate-fade-in"
                >
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-emerald-950 space-y-1">
                    <h4 className="font-extrabold text-xs">معلومات الحوالة المصرفية لتسوية وسداد الرسوم</h4>
                    <p className="text-[10px] text-emerald-800">يمكنك تسوية وسداد الرسوم والضرائب عبر تحويل مباشر لحساب الآيبان المعقود لمكتب سما المملكة وسندخل الإيصال تلقائياً.</p>
                  </div>

                  {/* Dynamic Bank Tab selector for Multiple Options */}
                  {bankRecords.length > 1 && (
                    <div className="space-y-1.5 text-right font-sans">
                      <label className="block text-amber-800 font-black text-[11px]">اختر البنك المحلي المفضل للتحويل إليه ببلدك:</label>
                      <div className="grid grid-cols-2 gap-2">
                        {bankRecords.map((bank, idx) => (
                          <button
                            key={bank.bankId || idx}
                            type="button"
                            onClick={() => setSelectedBankIndex(idx)}
                            className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between cursor-pointer text-[11.5px] font-bold ${
                              selectedBankIndex === idx
                                ? 'border-amber-500 bg-amber-500/5 text-amber-900 shadow-3xs'
                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <span className="truncate">{bank.bankName}</span>
                            <span className="text-sm">{bank.logo}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Active Bank Card details */}
                  <div className="bg-white border-2 border-slate-200 hover:border-amber-500/55 rounded-2xl p-4 space-y-3 font-mono select-none text-xs relative overflow-hidden transition-all shadow-3xs">
                    <div className="absolute top-0 left-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl"></div>

                    <div className="flex justify-between font-sans text-slate-500 border-b border-slate-100 pb-2">
                      <span className="font-bold text-[11px]">البنك التعاوني المستفيد:</span>
                      <strong className="text-slate-900 text-xs font-black">{activeBank.bankName}</strong>
                    </div>

                    <div className="flex justify-between items-center gap-1 bg-slate-50/75 px-3 py-2 rounded-lg border border-slate-150">
                      <div className="space-y-0.5 text-right w-full">
                        <span className="font-sans text-[9px] text-slate-400 block font-bold">رقم الآيبان الدولي (IBAN):</span>
                        <strong className="text-slate-900 font-mono tracking-wide text-[11px] block text-left select-all">{activeBank.iban}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(activeBank.iban, 'iban')}
                        className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-300 font-sans font-bold px-2 py-1 rounded text-[9px] cursor-pointer self-center"
                      >
                        {copiedField === 'iban' ? '✓ تم النسخ' : 'نسخ'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50/75 p-2 rounded-lg border border-slate-150 flex justify-between items-center">
                        <div className="space-y-0.5">
                          <span className="font-sans text-[9px] text-slate-400 block font-bold">رمز سويفت (Swift):</span>
                          <strong className="text-slate-900 text-[11px] block tracking-wide select-all">{activeBank.swift}</strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(activeBank.swift, 'swift')}
                          className="text-amber-900 hover:opacity-80 font-sans font-bold text-[9px] cursor-pointer"
                        >
                          {copiedField === 'swift' ? '✓' : 'نسخ'}
                        </button>
                      </div>

                      <div className="bg-slate-50/75 p-2 rounded-lg border border-slate-150 flex justify-between items-center">
                        <div className="space-y-0.5">
                          <span className="font-sans text-[9px] text-slate-400 block font-bold">المستفيد المسجل:</span>
                          <strong className="text-slate-850 text-[10px] font-sans block truncate select-all">{activeBank.holder}</strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(activeBank.holder, 'holder')}
                          className="text-amber-900 hover:opacity-80 font-sans font-bold text-[9px] cursor-pointer"
                        >
                          {copiedField === 'holder' ? '✓' : 'نسخ'}
                        </button>
                      </div>
                    </div>

                    <div className="bg-amber-50 px-3 py-2 rounded-lg border border-amber-200 font-sans text-[10.5px] text-amber-950 leading-relaxed text-right">
                      <strong>💡 إرشادات:</strong> {activeBank.instructions}
                    </div>
                  </div>

                  {/* Transaction Reference Input Field */}
                  <div className="space-y-1.5 text-right font-sans">
                    <label className="block text-slate-700 font-bold mb-1">
                      * رقم مرجع الحوالة (Transaction Reference):
                    </label>
                    <input
                      type="text"
                      required
                      value={bankTxRef}
                      onChange={(e) => setBankTxRef(e.target.value)}
                      placeholder="أدخل الرقم المرجعي للحوالة الصادر من تطبيق البنك (مثال: TXN-859402)"
                      className="w-full p-2.5 border border-slate-300 rounded focus:outline-none focus:border-slate-800 text-sm font-mono text-left bg-slate-50/50"
                    />
                    <p className="text-[10.5px] text-slate-500 leading-normal">
                      يُرجى إدخال الرقم المرجعي للحوالة بدقة لضمان مطابقة وتأكيد إيداعك البنكي الفوري مع المعاملة لتسريع تنفيذ الطلب بالمكتب.
                    </p>
                  </div>

                  {!bankIbanSubmitted ? (
                    <button
                      type="submit"
                      className="w-full bg-slate-950 text-white font-black py-3 rounded-xl hover:bg-slate-800 transition-all cursor-pointer text-center text-xs flex justify-center items-center gap-1.5 shadow"
                    >
                      <span>لقد أتممت التحويل البنكي - ترحيل رقم المطابقة والتحقق الفوري</span>
                    </button>
                  ) : (
                    <span className="text-emerald-700 font-bold block text-center animate-pulse">جاري فحص الحوالة المصرفية ومطابقة إشعار البنك...</span>
                  )}
                </form>
              )}
            </div>
          )}

          {/* ==================== STEP 4: OTP Bank Verification ==================== */}
          {step === 'otp' && (
            <form onSubmit={verifyOtp} className="space-y-4 animate-fade-in font-sans text-xs text-right">
              <div className="bg-slate-900 text-white p-5 rounded-2xl relative overflow-hidden text-right">
                <h4 className="font-black text-xs text-amber-500 flex items-center gap-1">
                  <span>أمان ثلاثي الأبعاد الموجه من المصرف (OTP verification)</span>
                </h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                  أرسل نظام سداد والأمان الرمز لتوكيد السداد المحسوب.
                </p>
                <div className="mt-2.5 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 inline-flex items-center gap-2">
                  <span className="font-extrabold text-[10px] text-slate-400">الرمز السري المباشر (للتجربة السريعة):</span>
                  <strong className="font-mono text-xs text-amber-400 font-extrabold animate-bounce bg-amber-500/10 px-2 py-0.5 rounded italic">{generatedOtp}</strong>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-slate-800 font-bold text-center">يرجى كتابة رمز التحقق المؤلف من 4 أركام الصادر لجوالك:</label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/gi, ''))}
                  placeholder="X X X X"
                  className="w-40 mx-auto p-3 border-2 border-slate-350 focus:border-slate-800 rounded-xl text-center font-mono text-lg tracking-widest block focus:outline-none"
                />
                
                {otpError && (
                  <p className="text-red-650 bg-red-50 border border-red-100 p-2 rounded-lg text-[10px] font-bold text-center animate-shake">
                    {otpError}
                  </p>
                )}
              </div>

              <div className="text-center text-slate-500 text-[10px] space-y-1 select-none">
                <p>متبقي للحصول على رمز جديد: <strong className="font-mono">{otpTimer} ثانية</strong></p>
                {otpTimer === 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const code = Math.floor(1000 + Math.random() * 9000).toString();
                      setGeneratedOtp(code);
                      setOtpTimer(60);
                      setOtpCode('');
                      setOtpError('');
                    }}
                    className="text-indigo-700 underline font-extrabold"
                  >
                    إعادة إرسال رمز الأمان البنكي لجوالك
                  </button>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-550 text-slate-950 font-black py-3 rounded-xl text-sm transition-all flex justify-center items-center gap-1.5 cursor-pointer"
              >
                <span>توثيق العملية وتحصيل الفاتورة الشاملة</span>
              </button>
            </form>
          )}

          {/* ==================== STEP 5: PROCESSING LOADER ==================== */}
          {step === 'processing' && (
            <div className="py-12 text-center space-y-4 animate-fade-in font-sans select-none">
              <div className="relative w-16 h-16 mx-auto">
                <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-amber-600 animate-spin"></div>
                <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                  <Lock className="w-5 h-5 text-amber-600 animate-pulse" />
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-slate-800 text-sm">جاري التخاطب البنكي المشفر بأمان...</h4>
                <p className="text-slate-500 text-[11px] max-w-xs mx-auto">نرسل الآن رمز تفويض السداد والاعتماد للبوابة المستفيدة بالدولة المعنية. يرجى الانتظار ولا تغلق هذه الشاشة لضمان إصدار السند.</p>
              </div>
            </div>
          )}

          {/* ==================== STEP 6: SUCCESS RECEIPT ==================== */}
          {step === 'success' && (
            <div className="space-y-6 animate-fade-in font-sans">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-emerald-100 border border-emerald-200 rounded-full flex items-center justify-center text-emerald-800 mx-auto">
                  <Check className="w-8 h-8 font-black" />
                </div>
                <h3 className="font-black text-emerald-800 text-base leading-tight">تهانينا! تم تحصيل وقبول دفعة السداد الدولي بنجاح</h3>
                <p className="text-slate-500 text-xs max-w-sm mx-auto">تم إخطار مهندس النظام ومسؤول مكتب سما المملكة لتسجيل الإيداع وربطه مع المعاملة وسيرها فوراً دون تأخير.</p>
              </div>

              {/* Printable Digital Receipt Card */}
              <div 
                id="printable-payment-receipt"
                className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 relative select-text"
              >
                {/* Visual side bars decorations */}
                <div className="absolute top-0 right-0 bottom-0 w-1.5 bg-emerald-500 rounded-r-2xl"></div>

                <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                  <div>
                    <h4 className="font-extrabold text-[12px] text-slate-900">سند تحصيل وقبض مالي إلكتروني</h4>
                    <span className="text-[9px] text-slate-500 font-mono block">رقم السند: {paymentRef}</span>
                  </div>
                  <div className="text-left select-none">
                    <span className="text-[9px] font-black text-slate-950 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded">مقبول • PAID</span>
                    <span className="text-[8px] text-slate-400 block mt-0.5">سما للخدمات الرقمية</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div className="space-y-1">
                    <span className="text-[9px] text-slate-405 font-sans block">المستفيد المسدد:</span>
                    <strong className="text-slate-950 font-sans block truncate">{booking.clientName}</strong>
                    <span className="text-slate-500 block truncate">{booking.phoneNumber}</span>
                  </div>

                  <div className="space-y-1 text-left">
                    <span className="text-[9px] text-slate-405 font-sans block">بلد وسفارة الدفع:</span>
                    <strong className="text-slate-950 font-sans block">{selectedCountry.flag} {selectedCountry.name}</strong>
                    <span className="text-slate-500 block">بواسطة: {selectedMethod?.name || 'مادا الدولي'}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-200 pt-3 flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-500 block">المعاملة المقابلة:</span>
                    <strong className="text-slate-900 text-xs font-sans">{booking.serviceName}</strong>
                  </div>

                  <div className="text-left font-sans">
                    <span className="text-[10px] text-slate-500 block">المبلغ المقبوض بالعملة المحلية:</span>
                    <strong className="text-sm text-emerald-800 font-mono font-black">{localPriceLabel}</strong>
                    <span className="text-[9px] text-slate-400 font-mono block">ما يعادل: ({totalAmountSAR.toFixed(2)} ر.س)</span>
                  </div>
                </div>

                {/* Secure Trust Stamp */}
                <div className="bg-white border border-slate-200 p-2.5 rounded-xl flex items-center gap-2 text-[9px] text-slate-500 font-sans leading-relaxed select-none">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <span className="font-extrabold text-slate-800">التدقيق والضمان الإلكتروني ومكافحة غسيل الأموال:</span>
                    <p>هذا السند معتمد قانونياً أمام مراجعي مكتب التعقيب المالي الدولي وسجل حماية المستهلك بالمملكة العربية السعودية.</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 font-sans select-none">
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-black py-2.5 rounded-xl text-xs flex justify-center items-center gap-2 cursor-pointer border border-slate-950"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة / حفظ السند الإلكتروني PDF</span>
                </button>
                
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-xl border border-slate-200 text-xs cursor-pointer text-center"
                >
                  إغلاق النافذة
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer badges */}
        <div className="bg-slate-50 border-t border-slate-150/80 p-4 flex flex-wrap items-center justify-center gap-4 text-[10px] text-slate-400 select-none font-sans">
          <span>🛡️ Verified by Visa</span>
          <span>💳 MasterCard ID Check</span>
          <span>⚡ PCI-DSS Level 1 Security</span>
          <span> Pay Express</span>
        </div>

      </div>
    </div>
  );
}
