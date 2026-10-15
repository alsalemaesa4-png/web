import { useEffect, useMemo, useState } from 'react'
import { useRef } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import './App.css'
import { auth, db, hasFirebaseConfig } from './lib/firebase'

const CENTRAL_API_BASE = String(import.meta.env.VITE_CENTRAL_API_BASE || 'https://api.olivegardentrading.com').trim()
const OTP_API_BASE = ''
const LANGUAGE_STORAGE_KEY = 'ogt-site-language'
const RTL_LANGUAGES = new Set(['ar'])
const DEFAULT_PHONE_ISO2 = 'sa'
const SITE_NAME = 'OGT Nexus'
const DOWNLOAD_FILE_NAME = 'OGT-Nexus-Installer.exe'
const LANGUAGE_FLAG_MAP = {
  ar: 'ae',
  en: 'us',
  fr: 'fr',
  de: 'de',
}

const initialForm = {
  firstName: '',
  lastName: '',
  phoneCountry: DEFAULT_PHONE_ISO2,
  phoneNumber: '',
  email: '',
  password: '',
}

const CONTACT_EMAIL = 'ogt@olivegardentrading.com'

function getFlagEmoji(iso2) {
  return String(iso2 || '')
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
}

const PHONE_COUNTRY_OPTIONS = [
  { iso2: 'af', dialCode: '93', country: 'Afghanistan' },
  { iso2: 'al', dialCode: '355', country: 'Albania' },
  { iso2: 'dz', dialCode: '213', country: 'Algeria' },
  { iso2: 'as', dialCode: '1684', country: 'American Samoa' },
  { iso2: 'ad', dialCode: '376', country: 'Andorra' },
  { iso2: 'ao', dialCode: '244', country: 'Angola' },
  { iso2: 'ai', dialCode: '1264', country: 'Anguilla' },
  { iso2: 'ag', dialCode: '1268', country: 'Antigua and Barbuda' },
  { iso2: 'ar', dialCode: '54', country: 'Argentina' },
  { iso2: 'am', dialCode: '374', country: 'Armenia' },
  { iso2: 'aw', dialCode: '297', country: 'Aruba' },
  { iso2: 'au', dialCode: '61', country: 'Australia' },
  { iso2: 'at', dialCode: '43', country: 'Austria' },
  { iso2: 'az', dialCode: '994', country: 'Azerbaijan' },
  { iso2: 'bs', dialCode: '1242', country: 'Bahamas' },
  { iso2: 'bh', dialCode: '973', country: 'Bahrain' },
  { iso2: 'bd', dialCode: '880', country: 'Bangladesh' },
  { iso2: 'bb', dialCode: '1246', country: 'Barbados' },
  { iso2: 'by', dialCode: '375', country: 'Belarus' },
  { iso2: 'be', dialCode: '32', country: 'Belgium' },
  { iso2: 'bz', dialCode: '501', country: 'Belize' },
  { iso2: 'bj', dialCode: '229', country: 'Benin' },
  { iso2: 'bm', dialCode: '1441', country: 'Bermuda' },
  { iso2: 'bt', dialCode: '975', country: 'Bhutan' },
  { iso2: 'bo', dialCode: '591', country: 'Bolivia' },
  { iso2: 'ba', dialCode: '387', country: 'Bosnia and Herzegovina' },
  { iso2: 'bw', dialCode: '267', country: 'Botswana' },
  { iso2: 'br', dialCode: '55', country: 'Brazil' },
  { iso2: 'io', dialCode: '246', country: 'British Indian Ocean Territory' },
  { iso2: 'vg', dialCode: '1284', country: 'British Virgin Islands' },
  { iso2: 'bn', dialCode: '673', country: 'Brunei' },
  { iso2: 'bg', dialCode: '359', country: 'Bulgaria' },
  { iso2: 'bf', dialCode: '226', country: 'Burkina Faso' },
  { iso2: 'bi', dialCode: '257', country: 'Burundi' },
  { iso2: 'kh', dialCode: '855', country: 'Cambodia' },
  { iso2: 'cm', dialCode: '237', country: 'Cameroon' },
  { iso2: 'ca', dialCode: '1', country: 'Canada' },
  { iso2: 'cv', dialCode: '238', country: 'Cape Verde' },
  { iso2: 'bq', dialCode: '599', country: 'Caribbean Netherlands' },
  { iso2: 'ky', dialCode: '1345', country: 'Cayman Islands' },
  { iso2: 'cf', dialCode: '236', country: 'Central African Republic' },
  { iso2: 'td', dialCode: '235', country: 'Chad' },
  { iso2: 'cl', dialCode: '56', country: 'Chile' },
  { iso2: 'cn', dialCode: '86', country: 'China' },
  { iso2: 'cx', dialCode: '61', country: 'Christmas Island' },
  { iso2: 'cc', dialCode: '61', country: 'Cocos Islands' },
  { iso2: 'co', dialCode: '57', country: 'Colombia' },
  { iso2: 'km', dialCode: '269', country: 'Comoros' },
  { iso2: 'cg', dialCode: '242', country: 'Congo Brazzaville' },
  { iso2: 'cd', dialCode: '243', country: 'Congo Kinshasa' },
  { iso2: 'ck', dialCode: '682', country: 'Cook Islands' },
  { iso2: 'cr', dialCode: '506', country: 'Costa Rica' },
  { iso2: 'ci', dialCode: '225', country: 'Cote d’Ivoire' },
  { iso2: 'hr', dialCode: '385', country: 'Croatia' },
  { iso2: 'cu', dialCode: '53', country: 'Cuba' },
  { iso2: 'cw', dialCode: '599', country: 'Curacao' },
  { iso2: 'cy', dialCode: '357', country: 'Cyprus' },
  { iso2: 'cz', dialCode: '420', country: 'Czech Republic' },
  { iso2: 'dk', dialCode: '45', country: 'Denmark' },
  { iso2: 'dj', dialCode: '253', country: 'Djibouti' },
  { iso2: 'dm', dialCode: '1767', country: 'Dominica' },
  { iso2: 'do', dialCode: '1', country: 'Dominican Republic' },
  { iso2: 'ec', dialCode: '593', country: 'Ecuador' },
  { iso2: 'eg', dialCode: '20', country: 'Egypt' },
  { iso2: 'sv', dialCode: '503', country: 'El Salvador' },
  { iso2: 'gq', dialCode: '240', country: 'Equatorial Guinea' },
  { iso2: 'er', dialCode: '291', country: 'Eritrea' },
  { iso2: 'ee', dialCode: '372', country: 'Estonia' },
  { iso2: 'sz', dialCode: '268', country: 'Eswatini' },
  { iso2: 'et', dialCode: '251', country: 'Ethiopia' },
  { iso2: 'fk', dialCode: '500', country: 'Falkland Islands' },
  { iso2: 'fo', dialCode: '298', country: 'Faroe Islands' },
  { iso2: 'fj', dialCode: '679', country: 'Fiji' },
  { iso2: 'fi', dialCode: '358', country: 'Finland' },
  { iso2: 'fr', dialCode: '33', country: 'France' },
  { iso2: 'gf', dialCode: '594', country: 'French Guiana' },
  { iso2: 'pf', dialCode: '689', country: 'French Polynesia' },
  { iso2: 'ga', dialCode: '241', country: 'Gabon' },
  { iso2: 'gm', dialCode: '220', country: 'Gambia' },
  { iso2: 'ge', dialCode: '995', country: 'Georgia' },
  { iso2: 'de', dialCode: '49', country: 'Germany' },
  { iso2: 'gh', dialCode: '233', country: 'Ghana' },
  { iso2: 'gi', dialCode: '350', country: 'Gibraltar' },
  { iso2: 'gr', dialCode: '30', country: 'Greece' },
  { iso2: 'gl', dialCode: '299', country: 'Greenland' },
  { iso2: 'gd', dialCode: '1473', country: 'Grenada' },
  { iso2: 'gp', dialCode: '590', country: 'Guadeloupe' },
  { iso2: 'gu', dialCode: '1671', country: 'Guam' },
  { iso2: 'gt', dialCode: '502', country: 'Guatemala' },
  { iso2: 'gg', dialCode: '44', country: 'Guernsey' },
  { iso2: 'gn', dialCode: '224', country: 'Guinea' },
  { iso2: 'gw', dialCode: '245', country: 'Guinea-Bissau' },
  { iso2: 'gy', dialCode: '592', country: 'Guyana' },
  { iso2: 'ht', dialCode: '509', country: 'Haiti' },
  { iso2: 'hn', dialCode: '504', country: 'Honduras' },
  { iso2: 'hk', dialCode: '852', country: 'Hong Kong' },
  { iso2: 'hu', dialCode: '36', country: 'Hungary' },
  { iso2: 'is', dialCode: '354', country: 'Iceland' },
  { iso2: 'in', dialCode: '91', country: 'India' },
  { iso2: 'id', dialCode: '62', country: 'Indonesia' },
  { iso2: 'ir', dialCode: '98', country: 'Iran' },
  { iso2: 'iq', dialCode: '964', country: 'Iraq' },
  { iso2: 'ie', dialCode: '353', country: 'Ireland' },
  { iso2: 'im', dialCode: '44', country: 'Isle of Man' },
  { iso2: 'il', dialCode: '972', country: 'Israel' },
  { iso2: 'it', dialCode: '39', country: 'Italy' },
  { iso2: 'jm', dialCode: '1876', country: 'Jamaica' },
  { iso2: 'jp', dialCode: '81', country: 'Japan' },
  { iso2: 'je', dialCode: '44', country: 'Jersey' },
  { iso2: 'jo', dialCode: '962', country: 'Jordan' },
  { iso2: 'kz', dialCode: '7', country: 'Kazakhstan' },
  { iso2: 'ke', dialCode: '254', country: 'Kenya' },
  { iso2: 'ki', dialCode: '686', country: 'Kiribati' },
  { iso2: 'xk', dialCode: '383', country: 'Kosovo' },
  { iso2: 'kw', dialCode: '965', country: 'Kuwait' },
  { iso2: 'kg', dialCode: '996', country: 'Kyrgyzstan' },
  { iso2: 'la', dialCode: '856', country: 'Laos' },
  { iso2: 'lv', dialCode: '371', country: 'Latvia' },
  { iso2: 'lb', dialCode: '961', country: 'Lebanon' },
  { iso2: 'ls', dialCode: '266', country: 'Lesotho' },
  { iso2: 'lr', dialCode: '231', country: 'Liberia' },
  { iso2: 'ly', dialCode: '218', country: 'Libya' },
  { iso2: 'li', dialCode: '423', country: 'Liechtenstein' },
  { iso2: 'lt', dialCode: '370', country: 'Lithuania' },
  { iso2: 'lu', dialCode: '352', country: 'Luxembourg' },
  { iso2: 'mo', dialCode: '853', country: 'Macau' },
  { iso2: 'mg', dialCode: '261', country: 'Madagascar' },
  { iso2: 'mw', dialCode: '265', country: 'Malawi' },
  { iso2: 'my', dialCode: '60', country: 'Malaysia' },
  { iso2: 'mv', dialCode: '960', country: 'Maldives' },
  { iso2: 'ml', dialCode: '223', country: 'Mali' },
  { iso2: 'mt', dialCode: '356', country: 'Malta' },
  { iso2: 'mh', dialCode: '692', country: 'Marshall Islands' },
  { iso2: 'mq', dialCode: '596', country: 'Martinique' },
  { iso2: 'mr', dialCode: '222', country: 'Mauritania' },
  { iso2: 'mu', dialCode: '230', country: 'Mauritius' },
  { iso2: 'yt', dialCode: '262', country: 'Mayotte' },
  { iso2: 'mx', dialCode: '52', country: 'Mexico' },
  { iso2: 'fm', dialCode: '691', country: 'Micronesia' },
  { iso2: 'md', dialCode: '373', country: 'Moldova' },
  { iso2: 'mc', dialCode: '377', country: 'Monaco' },
  { iso2: 'mn', dialCode: '976', country: 'Mongolia' },
  { iso2: 'me', dialCode: '382', country: 'Montenegro' },
  { iso2: 'ms', dialCode: '1664', country: 'Montserrat' },
  { iso2: 'ma', dialCode: '212', country: 'Morocco' },
  { iso2: 'mz', dialCode: '258', country: 'Mozambique' },
  { iso2: 'mm', dialCode: '95', country: 'Myanmar' },
  { iso2: 'na', dialCode: '264', country: 'Namibia' },
  { iso2: 'nr', dialCode: '674', country: 'Nauru' },
  { iso2: 'np', dialCode: '977', country: 'Nepal' },
  { iso2: 'nl', dialCode: '31', country: 'Netherlands' },
  { iso2: 'nc', dialCode: '687', country: 'New Caledonia' },
  { iso2: 'nz', dialCode: '64', country: 'New Zealand' },
  { iso2: 'ni', dialCode: '505', country: 'Nicaragua' },
  { iso2: 'ne', dialCode: '227', country: 'Niger' },
  { iso2: 'ng', dialCode: '234', country: 'Nigeria' },
  { iso2: 'nu', dialCode: '683', country: 'Niue' },
  { iso2: 'nf', dialCode: '672', country: 'Norfolk Island' },
  { iso2: 'kp', dialCode: '850', country: 'North Korea' },
  { iso2: 'mk', dialCode: '389', country: 'North Macedonia' },
  { iso2: 'mp', dialCode: '1670', country: 'Northern Mariana Islands' },
  { iso2: 'no', dialCode: '47', country: 'Norway' },
  { iso2: 'om', dialCode: '968', country: 'Oman' },
  { iso2: 'pk', dialCode: '92', country: 'Pakistan' },
  { iso2: 'pw', dialCode: '680', country: 'Palau' },
  { iso2: 'ps', dialCode: '970', country: 'Palestine' },
  { iso2: 'pa', dialCode: '507', country: 'Panama' },
  { iso2: 'pg', dialCode: '675', country: 'Papua New Guinea' },
  { iso2: 'py', dialCode: '595', country: 'Paraguay' },
  { iso2: 'pe', dialCode: '51', country: 'Peru' },
  { iso2: 'ph', dialCode: '63', country: 'Philippines' },
  { iso2: 'pl', dialCode: '48', country: 'Poland' },
  { iso2: 'pt', dialCode: '351', country: 'Portugal' },
  { iso2: 'pr', dialCode: '1', country: 'Puerto Rico' },
  { iso2: 'qa', dialCode: '974', country: 'Qatar' },
  { iso2: 're', dialCode: '262', country: 'Reunion' },
  { iso2: 'ro', dialCode: '40', country: 'Romania' },
  { iso2: 'ru', dialCode: '7', country: 'Russia' },
  { iso2: 'rw', dialCode: '250', country: 'Rwanda' },
  { iso2: 'bl', dialCode: '590', country: 'Saint Barthelemy' },
  { iso2: 'sh', dialCode: '290', country: 'Saint Helena' },
  { iso2: 'kn', dialCode: '1869', country: 'Saint Kitts and Nevis' },
  { iso2: 'lc', dialCode: '1758', country: 'Saint Lucia' },
  { iso2: 'mf', dialCode: '590', country: 'Saint Martin' },
  { iso2: 'pm', dialCode: '508', country: 'Saint Pierre and Miquelon' },
  { iso2: 'vc', dialCode: '1784', country: 'Saint Vincent and the Grenadines' },
  { iso2: 'ws', dialCode: '685', country: 'Samoa' },
  { iso2: 'sm', dialCode: '378', country: 'San Marino' },
  { iso2: 'st', dialCode: '239', country: 'Sao Tome and Principe' },
  { iso2: 'sa', dialCode: '966', country: 'Saudi Arabia' },
  { iso2: 'sn', dialCode: '221', country: 'Senegal' },
  { iso2: 'rs', dialCode: '381', country: 'Serbia' },
  { iso2: 'sc', dialCode: '248', country: 'Seychelles' },
  { iso2: 'sl', dialCode: '232', country: 'Sierra Leone' },
  { iso2: 'sg', dialCode: '65', country: 'Singapore' },
  { iso2: 'sx', dialCode: '1721', country: 'Sint Maarten' },
  { iso2: 'sk', dialCode: '421', country: 'Slovakia' },
  { iso2: 'si', dialCode: '386', country: 'Slovenia' },
  { iso2: 'sb', dialCode: '677', country: 'Solomon Islands' },
  { iso2: 'so', dialCode: '252', country: 'Somalia' },
  { iso2: 'za', dialCode: '27', country: 'South Africa' },
  { iso2: 'kr', dialCode: '82', country: 'South Korea' },
  { iso2: 'ss', dialCode: '211', country: 'South Sudan' },
  { iso2: 'es', dialCode: '34', country: 'Spain' },
  { iso2: 'lk', dialCode: '94', country: 'Sri Lanka' },
  { iso2: 'sd', dialCode: '249', country: 'Sudan' },
  { iso2: 'sr', dialCode: '597', country: 'Suriname' },
  { iso2: 'sj', dialCode: '47', country: 'Svalbard and Jan Mayen' },
  { iso2: 'se', dialCode: '46', country: 'Sweden' },
  { iso2: 'ch', dialCode: '41', country: 'Switzerland' },
  { iso2: 'sy', dialCode: '963', country: 'Syria' },
  { iso2: 'tw', dialCode: '886', country: 'Taiwan' },
  { iso2: 'tj', dialCode: '992', country: 'Tajikistan' },
  { iso2: 'tz', dialCode: '255', country: 'Tanzania' },
  { iso2: 'th', dialCode: '66', country: 'Thailand' },
  { iso2: 'tl', dialCode: '670', country: 'Timor-Leste' },
  { iso2: 'tg', dialCode: '228', country: 'Togo' },
  { iso2: 'tk', dialCode: '690', country: 'Tokelau' },
  { iso2: 'to', dialCode: '676', country: 'Tonga' },
  { iso2: 'tt', dialCode: '1868', country: 'Trinidad and Tobago' },
  { iso2: 'tn', dialCode: '216', country: 'Tunisia' },
  { iso2: 'tr', dialCode: '90', country: 'Turkey' },
  { iso2: 'tm', dialCode: '993', country: 'Turkmenistan' },
  { iso2: 'tc', dialCode: '1649', country: 'Turks and Caicos Islands' },
  { iso2: 'tv', dialCode: '688', country: 'Tuvalu' },
  { iso2: 'vi', dialCode: '1340', country: 'U.S. Virgin Islands' },
  { iso2: 'ug', dialCode: '256', country: 'Uganda' },
  { iso2: 'ua', dialCode: '380', country: 'Ukraine' },
  { iso2: 'ae', dialCode: '971', country: 'United Arab Emirates' },
  { iso2: 'gb', dialCode: '44', country: 'United Kingdom' },
  { iso2: 'us', dialCode: '1', country: 'United States' },
  { iso2: 'uy', dialCode: '598', country: 'Uruguay' },
  { iso2: 'uz', dialCode: '998', country: 'Uzbekistan' },
  { iso2: 'vu', dialCode: '678', country: 'Vanuatu' },
  { iso2: 'va', dialCode: '39', country: 'Vatican City' },
  { iso2: 've', dialCode: '58', country: 'Venezuela' },
  { iso2: 'vn', dialCode: '84', country: 'Vietnam' },
  { iso2: 'wf', dialCode: '681', country: 'Wallis and Futuna' },
  { iso2: 'eh', dialCode: '212', country: 'Western Sahara' },
  { iso2: 'ye', dialCode: '967', country: 'Yemen' },
  { iso2: 'zm', dialCode: '260', country: 'Zambia' },
  { iso2: 'zw', dialCode: '263', country: 'Zimbabwe' },
]
  .map((item) => ({
    ...item,
    code: `+${item.dialCode}`,
    flag: getFlagEmoji(item.iso2),
    label: `${getFlagEmoji(item.iso2)} +${item.dialCode}`,
  }))
  .sort((a, b) => a.country.localeCompare(b.country))

const initialUserState = {
  loading: Boolean(auth),
  verified: false,
  uid: '',
  name: '',
  email: '',
}

const initialAccountSummaryState = {
  loading: false,
  error: '',
  data: null,
}

function buildInitialPublicSiteRatingState() {
  return {
    loading: false,
    error: '',
    averageRating: 0,
    totalRatings: 0,
    maximumRating: 5,
  }
}

function buildInitialSiteRatingState() {
  return {
    loading: false,
    submitting: false,
    error: '',
    success: '',
    averageRating: 0,
    totalRatings: 0,
    userRating: 0,
    canRate: false,
    ratingLocked: false,
    maximumRating: 5,
    submittedAt: '',
    pendingValue: 0,
  }
}

function buildInitialCommunityChatState() {
  return {
    loading: false,
    ready: false,
    error: '',
    items: [],
    identity: null,
    draft: '',
    sending: false,
  }
}

const PHONE_COUNTRY_BY_ISO2 = new Map(PHONE_COUNTRY_OPTIONS.map((item) => [item.iso2, item]))
const PHONE_OPTIONS_BY_DIAL_LENGTH = [...PHONE_COUNTRY_OPTIONS].sort((a, b) => b.dialCode.length - a.dialCode.length)

function splitStoredPhoneValue(value) {
  const normalized = String(value || '').trim().replace(/[^\d+]/g, '')
  if (!normalized) {
    return {
      phoneCountry: DEFAULT_PHONE_ISO2,
      phoneNumber: '',
    }
  }

  const digits = normalized.startsWith('+') ? normalized.slice(1) : normalized
  const matched = PHONE_OPTIONS_BY_DIAL_LENGTH.find((item) => digits.startsWith(item.dialCode))
  if (!matched) {
    return {
      phoneCountry: DEFAULT_PHONE_ISO2,
      phoneNumber: digits,
    }
  }

  return {
    phoneCountry: matched.iso2,
    phoneNumber: digits.slice(matched.dialCode.length),
  }
}

function splitFullName(value) {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  }
}

function buildFullName(form) {
  return [form.firstName, form.lastName].map((item) => String(item || '').trim()).filter(Boolean).join(' ')
}

function normalizeEnglishName(value) {
  return String(value || '').replace(/[^A-Za-z]/g, '')
}

function isValidEnglishName(value) {
  return /^[A-Za-z]+$/.test(String(value || '').trim())
}

const portalContent = {
  "ar": {
    "nav": {
      "overview": "تعريف بالنظام",
      "account": "حسابي",
      "download": "تحميل التطبيق",
      "logout": "تسجيل الخروج"
    },
    "introTitle": "كل ما تحتاجه في واجهة واحدة",
    "introLead": "يمكنك متابعة الإشارات، وحالة المنصة، والتحديثات التشغيلية، ومعلومات حسابك من واجهة أوضح وأسهل في المتابعة.",
    "introCards": [
      {
        "title": "عرض موحد",
        "body": "سترى الإشارات، وبيانات الحساب، والتحديثات التشغيلية أمامك في واجهة واحدة سهلة القراءة والمتابعة."
      },
      {
        "title": "وضوح تشغيلي",
        "body": "يمكنك متابعة حالة الاتصال، والإصدار، وربط الحساب بشكل مفهوم وواضح بدون تعقيد أو مبالغة."
      },
      {
        "title": "تحكمك أولًا",
        "body": "نساعدك على فهم الإشارات والبيانات، بينما تبقى قراراتك وإجراءاتك بيدك أنت بالكامل."
      }
    ],
    "accountTitle": "محتويات الحساب",
    "accountLead": "يمكنك من هنا متابعة تفاصيل حسابك، وربط التطبيق، والاشتراك، والتنبيهات في مكان واحد أوضح.",
    "summaryLoading": "جاري تحميل ملخص الحساب من المركزي...",
    "summaryError": "تعذر تحميل بيانات الحساب من المركزي حاليًا.",
    "summaryPending": "سيظهر ملخص حسابك هنا تلقائيًا بمجرد اكتمال الربط الحي.",
    "fields": {
      "name": "الاسم",
      "email": "البريد الإلكتروني",
      "status": "الحالة",
      "version": "الإصدار",
      "session": "الجلسة",
      "device": "الجهاز",
      "clientCode": "الجهاز الحالي",
      "plan": "الخطة",
      "subscription": "الاشتراك",
      "brokerMode": "وضع الوسيط",
      "approval": "اعتماد الحساب",
      "restriction": "حالة القيود",
      "lastSeen": "آخر ظهور",
      "events": "الأحداث",
      "growth": "النمو",
      "latestNotice": "آخر إشعار",
      "latestTrade": "آخر صفقة",
      "telegram": "تيليجرام"
    },
    "values": {
      "unavailable": "غير متاح",
      "connected": "متصل",
      "offline": "غير متصل",
      "active": "نشط",
      "approved": "معتمد",
      "pending": "قيد المراجعة",
      "restricted": "مقيّد",
      "open": "طبيعي",
      "linked": "مرتبط",
      "notLinked": "غير مرتبط",
      "notLinkedYet": "لم يتم الربط بعد"
    },
    "accountCards": [
      {
        "title": "هوية الحساب",
        "lines": [
          "الاسم: {name}",
          "البريد الإلكتروني: {email}",
          "حالة البريد: {status}"
        ]
      },
      {
        "title": "ربط التطبيق",
        "lines": [
          "سيظهر هنا لاحقًا اسم الجهاز المرتبط وحالة الاتصال والإصدار المستخدم داخل التطبيق على حسابك."
        ]
      },
      {
        "title": "الاشتراك والصلاحيات",
        "lines": [
          "سيظهر هنا لاحقًا نوع الخطة، حالة الاشتراك، والصلاحيات المفعلة على الحساب."
        ]
      },
      {
        "title": "السجل والمتابعة",
        "lines": [
          "سيظهر هنا لاحقًا ملخص الصفقات، الإشعارات، والتنبيهات المرتبطة بحسابك من نفس المصدر."
        ]
      }
    ],
    "verifiedLabel": "مؤكد",
    "pendingLabel": "بانتظار التحقق"
  },
  "en": {
    "nav": {
      "overview": "System overview",
      "account": "My account",
      "download": "Download app",
      "logout": "Sign out"
    },
    "introTitle": "Everything you need in one interface",
    "introLead": "You can follow signals, platform status, operational updates, and account information from one clearer and calmer interface.",
    "introCards": [
      {
        "title": "Unified view",
        "body": "You can see signals, account information, and operational updates together in one interface that is easier to read and follow."
      },
      {
        "title": "Operational clarity",
        "body": "You can follow connection status, versioning, and account linkage in a clearer way without unnecessary complexity."
      },
      {
        "title": "Your control first",
        "body": "We help you understand the signals and data, while every decision and action remains fully yours."
      }
    ],
    "accountTitle": "Account contents",
    "accountLead": "You can use this area to follow your account details, app linkage, subscription, and alerts in one clearer place.",
    "summaryLoading": "Loading account summary from the central system...",
    "summaryError": "Unable to load account data from the central system right now.",
    "summaryPending": "Your full account summary will appear here automatically as soon as the live connection is ready.",
    "fields": {
      "name": "Name",
      "email": "Email",
      "status": "Status",
      "version": "Version",
      "session": "Session",
      "device": "Device",
      "clientCode": "Current device",
      "plan": "Plan",
      "subscription": "Subscription",
      "brokerMode": "Broker mode",
      "approval": "Approval",
      "restriction": "Restriction",
      "lastSeen": "Last seen",
      "events": "Events",
      "growth": "Growth",
      "latestNotice": "Latest notice",
      "latestTrade": "Latest trade",
      "telegram": "Telegram"
    },
    "values": {
      "unavailable": "Unavailable",
      "connected": "Connected",
      "offline": "Offline",
      "active": "Active",
      "approved": "Approved",
      "pending": "Pending review",
      "restricted": "Restricted",
      "open": "Normal",
      "linked": "Linked",
      "notLinked": "Not linked",
      "notLinkedYet": "Not linked yet"
    },
    "accountCards": [
      {
        "title": "Account identity",
        "lines": [
          "Name: {name}",
          "Email: {email}",
          "Email status: {status}"
        ]
      },
      {
        "title": "App linkage",
        "lines": [
          "Later we will show the linked device, connection status, and the app version currently used on your account."
        ]
      },
      {
        "title": "Subscription and access",
        "lines": [
          "Later we will show your plan, subscription state, and the permissions currently active on your account."
        ]
      },
      {
        "title": "History and follow-up",
        "lines": [
          "Later we will show a summary of trades, notices, and alerts connected to your account from the same source."
        ]
      }
    ],
    "verifiedLabel": "Verified",
    "pendingLabel": "Pending verification"
  },
  "fr": {
    "nav": {
      "overview": "Présentation",
      "account": "Mon compte",
      "download": "Télécharger l’application",
      "logout": "Se déconnecter"
    },
    "introTitle": "Tout ce dont vous avez besoin dans une seule interface",
    "introLead": "Vous pouvez suivre les signaux, l etat de la plateforme, les mises a jour operationnelles et les informations du compte depuis une interface plus claire.",
    "introCards": [
      {
        "title": "Vue unifiee",
        "body": "Vous voyez les signaux, les informations du compte et les mises a jour operationnelles dans une seule interface plus facile a lire et a suivre."
      },
      {
        "title": "Clarte operationnelle",
        "body": "Vous pouvez suivre l etat de connexion, la version et la liaison du compte d une facon plus claire, sans complexite inutile."
      },
      {
        "title": "Votre controle d abord",
        "body": "Nous vous aidons a comprendre les signaux et les donnees, tandis que chaque decision et chaque action restent entierement entre vos mains."
      }
    ],
    "accountTitle": "Contenu du compte",
    "accountLead": "Vous pouvez suivre ici les details du compte, la liaison de l application, l abonnement et les alertes dans un seul espace plus clair.",
    "summaryLoading": "Chargement du résumé du compte depuis le système central...",
    "summaryError": "Impossible de charger les données du compte central pour le moment.",
    "summaryPending": "Le resume complet de votre compte apparaitra ici automatiquement des que la connexion en direct sera prete.",
    "fields": {
      "name": "Nom",
      "email": "E-mail",
      "status": "Statut",
      "version": "Version",
      "session": "Session",
      "device": "Appareil",
      "clientCode": "Appareil actuel",
      "plan": "Offre",
      "subscription": "Abonnement",
      "brokerMode": "Mode broker",
      "approval": "Validation",
      "restriction": "Restriction",
      "lastSeen": "Dernière activité",
      "events": "Événements",
      "growth": "Croissance",
      "latestNotice": "Dernière notification",
      "latestTrade": "Dernière opération",
      "telegram": "Telegram"
    },
    "values": {
      "unavailable": "Indisponible",
      "connected": "Connecté",
      "offline": "Hors ligne",
      "active": "Actif",
      "approved": "Approuvé",
      "pending": "En attente",
      "restricted": "Restreint",
      "open": "Normal",
      "linked": "Lié",
      "notLinked": "Non lié",
      "notLinkedYet": "Pas encore lié"
    },
    "accountCards": [
      {
        "title": "Identité du compte",
        "lines": [
          "Nom : {name}",
          "E-mail : {email}",
          "Statut de l’e-mail : {status}"
        ]
      },
      {
        "title": "Liaison avec l’application",
        "lines": [
          "Nous afficherons ici plus tard l’appareil lié, l’état de connexion et la version de l’application utilisée sur votre compte."
        ]
      },
      {
        "title": "Abonnement et accès",
        "lines": [
          "Nous afficherons ici plus tard votre offre, l’état de l’abonnement et les autorisations actives sur votre compte."
        ]
      },
      {
        "title": "Historique et suivi",
        "lines": [
          "Nous afficherons ici plus tard un résumé des opérations, des notifications et des alertes liées à votre compte à partir de la même source."
        ]
      }
    ],
    "verifiedLabel": "Vérifié",
    "pendingLabel": "En attente de vérification"
  },
  "de": {
    "nav": {
      "overview": "Systemüberblick",
      "account": "Mein Konto",
      "download": "App herunterladen",
      "logout": "Abmelden"
    },
    "introTitle": "Alles, was Sie brauchen, in einer Oberfl?che",
    "introLead": "Sie k?nnen Signale, Plattformstatus, operative Updates und Kontoinformationen in einer klareren und ruhigeren Oberfl?che verfolgen.",
    "introCards": [
      {
        "title": "Einheitliche Ansicht",
        "body": "Sie k?nnen Signale, Kontoinformationen und operative Updates gemeinsam in einer Oberfl?che sehen, die leichter zu lesen und zu verfolgen ist."
      },
      {
        "title": "Operative Klarheit",
        "body": "Sie k?nnen Verbindungsstatus, Version und Kontoverkn?pfung klarer verfolgen, ohne unn?tige Komplexit?t."
      },
      {
        "title": "Ihre Kontrolle zuerst",
        "body": "Wir helfen Ihnen, Signale und Daten besser zu verstehen, w?hrend jede Entscheidung und Handlung vollst?ndig bei Ihnen bleibt."
      }
    ],
    "accountTitle": "Kontoinhalte",
    "accountLead": "Hier k?nnen Sie Kontodetails, App-Verkn?pfung, Abonnement und Hinweise an einem klareren Ort verfolgen.",
    "summaryLoading": "Kontozusammenfassung wird aus dem Zentralsystem geladen...",
    "summaryError": "Die Kontodaten aus dem Zentralsystem konnten derzeit nicht geladen werden.",
    "summaryPending": "Ihre vollst?ndige Konto?bersicht erscheint hier automatisch, sobald die Live-Verbindung bereit ist.",
    "fields": {
      "name": "Name",
      "email": "E-Mail",
      "status": "Status",
      "version": "Version",
      "session": "Sitzung",
      "device": "Gerät",
      "clientCode": "Aktuelles Gerät",
      "plan": "Plan",
      "subscription": "Abonnement",
      "brokerMode": "Broker-Modus",
      "approval": "Freigabe",
      "restriction": "Einschränkung",
      "lastSeen": "Zuletzt gesehen",
      "events": "Ereignisse",
      "growth": "Wachstum",
      "latestNotice": "Letzter Hinweis",
      "latestTrade": "Letzter Trade",
      "telegram": "Telegram"
    },
    "values": {
      "unavailable": "Nicht verfügbar",
      "connected": "Verbunden",
      "offline": "Offline",
      "active": "Aktiv",
      "approved": "Freigegeben",
      "pending": "In Prüfung",
      "restricted": "Eingeschränkt",
      "open": "Normal",
      "linked": "Verknüpft",
      "notLinked": "Nicht verknüpft",
      "notLinkedYet": "Noch nicht verknüpft"
    },
    "accountCards": [
      {
        "title": "Kontodaten",
        "lines": [
          "Name: {name}",
          "E-Mail: {email}",
          "E-Mail-Status: {status}"
        ]
      },
      {
        "title": "App-Verknüpfung",
        "lines": [
          "Später zeigen wir hier das verknüpfte Gerät, den Verbindungsstatus und die verwendete App-Version für Ihr Konto an."
        ]
      },
      {
        "title": "Abonnement und Zugriff",
        "lines": [
          "Später zeigen wir hier Ihren Tarif, den Abonnementstatus und die aktuell aktiven Berechtigungen Ihres Kontos an."
        ]
      },
      {
        "title": "Historie und Nachverfolgung",
        "lines": [
          "Später zeigen wir hier eine Zusammenfassung von Trades, Hinweisen und Warnungen aus derselben Quelle an, die mit Ihrem Konto verbunden sind."
        ]
      }
    ],
    "verifiedLabel": "Bestätigt",
    "pendingLabel": "Ausstehend"
  }
}

const communityChatContent = {
  ar: {
    navLabel: 'OGT Nexus chat',
    back: 'رجوع',
    title: 'OGT Nexus',
    statusLoading: 'جارٍ تحميل رسائل المجتمع...',
    empty: 'لا توجد رسائل بعد. يمكنك بدء أول رسالة من هنا.',
    placeholder: 'اكتب رسالة ...',
    send: 'إرسال',
    sending: 'جارٍ الإرسال...',
    you: 'أنت',
    team: 'فريق OGT Nexus',
    member: 'عضو',
    pending: 'قيد الإرسال',
    errors: {
      load: 'تعذر تحميل رسائل المجتمع الآن.',
      send: 'تعذر إرسال الرسالة الآن.',
      identity: 'هوية الشات لهذا الحساب لم تجهز بعد في المركزي.',
      session: 'انتهت جلسة الموقع. سجّل الدخول من جديد.',
      notAllowed: 'شات المجتمع متاح فقط للحسابات التي لديها اشتراك نشط.',
    },
  },
  en: {
    navLabel: 'OGT Nexus chat',
    back: 'Back',
    title: 'OGT Nexus',
    statusLoading: 'Loading community messages...',
    empty: 'No messages yet. You can start the first one from here.',
    placeholder: 'Write a message...',
    send: 'Send',
    sending: 'Sending...',
    you: 'You',
    team: 'OGT Nexus team',
    member: 'Member',
    pending: 'Sending',
    errors: {
      load: 'Unable to load community messages right now.',
      send: 'Unable to send the message right now.',
      identity: 'Chat identity is not ready for this account yet.',
      session: 'Your web session has expired. Please sign in again.',
      notAllowed: 'Community chat is available only for accounts with an active subscription.',
    },
  },
  fr: {
    navLabel: 'OGT Nexus chat',
    back: 'Retour',
    title: 'OGT Nexus',
    statusLoading: 'Chargement des messages du chat...',
    empty: 'Aucun message pour le moment. Vous pouvez lancer la premiere discussion ici.',
    placeholder: 'Ecrivez un message...',
    send: 'Envoyer',
    sending: 'Envoi...',
    you: 'Vous',
    team: 'Equipe OGT Nexus',
    member: 'Membre',
    pending: 'En cours',
    errors: {
      load: 'Impossible de charger les messages du chat pour le moment.',
      send: 'Impossible d envoyer le message pour le moment.',
      identity: 'L identite du chat n est pas encore prete pour ce compte.',
      session: 'La session web a expire. Reconnectez-vous.',
      notAllowed: 'Le chat communautaire est reserve aux comptes avec un abonnement actif.',
    },
  },
  de: {
    navLabel: 'OGT Nexus chat',
    back: 'Zurück',
    title: 'OGT Nexus',
    statusLoading: 'Community-Nachrichten werden geladen...',
    empty: 'Noch keine Nachrichten. Sie konnen die erste Nachricht hier starten.',
    placeholder: 'Schreiben Sie eine Nachricht...',
    send: 'Senden',
    sending: 'Wird gesendet...',
    you: 'Sie',
    team: 'OGT-Nexus-Team',
    member: 'Mitglied',
    pending: 'Wird gesendet',
    errors: {
      load: 'Community-Nachrichten konnten derzeit nicht geladen werden.',
      send: 'Die Nachricht konnte derzeit nicht gesendet werden.',
      identity: 'Die Chat-Identitat fur dieses Konto ist noch nicht bereit.',
      session: 'Die Web-Sitzung ist abgelaufen. Bitte erneut anmelden.',
      notAllowed: 'Der Community-Chat ist nur fur Konten mit aktivem Abonnement verfugbar.',
    },
  },
}

const siteRatingContent = {
  ar: {
    title: 'تقييم الموقع',
    prompt: 'قيّم تجربتك',
    submitButton: 'إرسال التقييم',
    chooseFirst: 'اختر من 1 إلى 5 نجوم أولًا.',
    loading: 'جارٍ تحميل التقييم...',
    saving: 'جارٍ حفظ تقييمك...',
    saved: 'تم إرسال تقييمك بنجاح: {rating}/5',
    thanksHigh: 'شكرًا لثقتكم',
    thanksLow: 'شكرًا لكم نحن نسعى للأفضل',
    noRatings: 'لا توجد تقييمات بعد',
    count: '{count} تقييم',
    submitError: 'تعذر حفظ تقييمك الآن.',
    loadError: 'تعذر تحميل التقييم الآن.',
  },
  en: {
    title: 'Site rating',
    prompt: 'Rate your experience',
    submitButton: 'Send rating',
    chooseFirst: 'Choose between 1 and 5 stars first.',
    loading: 'Loading rating...',
    saving: 'Saving your rating...',
    saved: 'Your rating was saved: {rating}/5',
    thanksHigh: 'Thank you for your trust.',
    thanksLow: 'Thank you. We are working to do even better.',
    noRatings: 'No ratings yet',
    count: '{count} ratings',
    submitError: 'Unable to save your rating right now.',
    loadError: 'Unable to load the rating right now.',
  },
  fr: {
    title: 'Note du site',
    prompt: 'Evaluez votre experience',
    submitButton: 'Envoyer la note',
    chooseFirst: 'Choisissez d abord entre 1 et 5 etoiles.',
    loading: 'Chargement de la note...',
    saving: 'Enregistrement de votre note...',
    saved: 'Votre note a ete enregistree : {rating}/5',
    thanksHigh: 'Merci pour votre confiance.',
    thanksLow: 'Merci. Nous cherchons toujours a faire mieux.',
    noRatings: 'Aucune note pour le moment',
    count: '{count} avis',
    submitError: 'Impossible d enregistrer votre note pour le moment.',
    loadError: 'Impossible de charger la note pour le moment.',
  },
  de: {
    title: 'Seitenbewertung',
    prompt: 'Bewerten Sie Ihre Erfahrung',
    submitButton: 'Bewertung senden',
    chooseFirst: 'Wahlen Sie zuerst 1 bis 5 Sterne aus.',
    loading: 'Bewertung wird geladen...',
    saving: 'Ihre Bewertung wird gespeichert...',
    saved: 'Ihre Bewertung wurde gespeichert: {rating}/5',
    thanksHigh: 'Vielen Dank fur Ihr Vertrauen.',
    thanksLow: 'Vielen Dank. Wir arbeiten daran, noch besser zu werden.',
    noRatings: 'Noch keine Bewertungen',
    count: '{count} Bewertungen',
    submitError: 'Ihre Bewertung konnte derzeit nicht gespeichert werden.',
    loadError: 'Die Bewertung konnte derzeit nicht geladen werden.',
  },
}

const translations = {
  "ar": {
    "languageName": "العربية",
    "brand": "OGT Nexus",
    "heroTitle": "نظام تحليل الأسواق المالية قائم على البيانات",
    "heroLines": [
      "يعتمد على معالجة إشارات السوق وعرض نتائج قابلة للتحقق بشفافية كاملة",
      "لا نقدم وعود أرباح، بل نوفر بيانات تحليلية وسجل أداء يمكن مراجعته"
    ],
    "authModes": {
      "register": "إنشاء حساب",
      "login": "تسجيل الدخول"
    },
    "trustSeal": {
      "title": "",
      "items": [
        "يعتمد النظام على تحليل بيانات السوق فقط",
        "لا يقوم بإدارة أموال المستخدمين",
        "لا ينفذ صفقات نيابةً عن المستخدم",
        "لا يطلب بيانات دخول الوسيط",
        "لا يوجد أي اتصال مباشر بحسابات التداول الخاصة بالمستخدم",
        "لمزيد من المعلومات يرجى مراسلتنا على البريد الإلكتروني\nogt@olivegardentrading.com"
      ]
    },
    "auth": {
      "registerTitle": "ابدأ حسابك على OGT Nexus",
      "registerSubtitle": "أنشئ حسابك لتتابع الإشارات والبيانات والتنظيم التشغيلي من واجهة واحدة واضحة.",
      "loginTitle": "سجّل الدخول إلى OGT Nexus",
      "loginSubtitle": "استخدم بريدك الإلكتروني وكلمة المرور للدخول إلى حسابك ومتابعة مساحتك التقنية بسهولة.",
      "firstName": "الاسم الأول",
      "lastName": "اسم العائلة",
      "firstNamePlaceholder": "First name",
      "lastNamePlaceholder": "Last name",
      "nameInvalid": "يرجى إدخال الاسم بالأحرف الإنجليزية فقط وبدون رموز.",
      "phone": "رقم الهاتف",
      "phonePlaceholder": "أدخل الرقم",
      "email": "البريد الإلكتروني",
      "emailPlaceholder": "name@example.com",
      "password": "كلمة المرور",
      "passwordPlaceholder": "6 أحرف أو أكثر",
      "createAccount": "إنشاء حساب جديد",
      "creatingAccount": "جاري إنشاء الحساب...",
      "login": "تسجيل الدخول",
      "loggingIn": "جاري تسجيل الدخول...",
      "forgotPassword": "نسيت كلمة المرور؟",
      "forgotPasswordSending": "جارٍ إرسال رابط الاستعادة...",
      "forgotPasswordEmailRequired": "أدخل بريدك الإلكتروني أولًا ثم اضغط نسيت كلمة المرور.",
      "forgotPasswordSent": "تم إرسال رابط إعادة تعيين كلمة المرور إلى {email}.",
      "verifiedSuccess": "تم التحقق من بريدك الإلكتروني بنجاح.",
      "verifyPrompt": "أدخل رمز التحقق المكوّن من 6 أرقام الذي وصلك على البريد الإلكتروني.",
      "verifyTitle": "تحقق من البريد الإلكتروني",
      "verifyDescription": "تم إنشاء الحساب باسم {name} باستخدام البريد {email}.",
      "verifyHint": "أدخل الرمز كما وصلك في البريد الوارد.",
      "verifyButton": "تأكيد الرمز",
      "verifyingButton": "جاري التحقق...",
      "resendButton": "إعادة إرسال الرمز",
      "sendingCode": "جاري الإرسال...",
      "resendCooldown": "إعادة الإرسال خلال {seconds} ث",
      "accountLoading": "جاري التحقق من حالة الحساب",
      "accountLoadingText": "نقوم الآن بقراءة حالة بريدك الإلكتروني.",
      "loginSuccess": "تم تسجيل الدخول بنجاح. نتحقق الآن من حالة البريد الإلكتروني.",
      "loginNotice": "سجّل الدخول بحسابك الحالي. إذا لم يتم تأكيد البريد بعد، ستظهر شاشة التحقق تلقائيًا.",
      "codeInvalid": "أدخل رمزًا صحيحًا من 6 أرقام.",
      "noCurrentUser": "لم يتم العثور على مستخدم مسجّل الدخول.",
      "firebaseIncomplete": "إعدادات Firebase غير مكتملة، لذلك لن يعمل النموذج حتى يكتمل الإعداد.",
      "firebaseDisabled": "إعدادات Firebase غير مكتملة حاليًا، ولا يمكن إنشاء حساب الآن.",
      "defaultPromo": "يمكنك استكشاف واجهة OGT Nexus بوضوح وبدون تشويش.",
      "logout": "تسجيل الخروج",
      "phoneCountry": "رمز الدولة",
      "phoneNumber": "رقم الهاتف",
      "phoneCountryPlaceholder": "اختر الدولة"
    },
    "welcome": {
      "hello": "مرحبًا {name}",
      "family": "مرحبًا بك في OGT Nexus"
    },
    "promo": {
      "loadingVersion": "جاري تحميل الإصدار الرسمي للتطبيق",
      "copy": "يمكنك تحميل تطبيق OGT Nexus الرسمي لمتابعة الإشارات، والحالة التقنية، ومعلومات الحساب من واجهة موحدة.",
      "releaseDate": "تاريخ الإصدار: {date}",
      "releaseDateLoading": "جاري تحميل تفاصيل الإصدار",
      "downloadNow": "تحميل التطبيق الآن"
    },
    "downloadGate": {
      "title": "تنزيل التطبيق الرسمي",
      "close": "إغلاق",
      "hideWhileDownloading": "إغلاق النافذة ومتابعة التنزيل",
      "copy": "لأمان الوصول، سنجهز رابط تنزيل التطبيق الرسمي بعد التحقق من جلستك الحالية.",
      "closeHint": "يمكنك إغلاق هذه النافذة وسيستمر التنزيل هنا في الصفحة.",
      "placeholder": "",
      "submit": "بدء التنزيل",
      "done": "إغلاق النافذة",
      "loading": "جاري تجهيز التنزيل...",
      "manifestLoading": "جاري تجهيز معلومات التنزيل...",
      "directDownloading": "جاري تنزيل ملف التثبيت...",
      "downloading": "جاري تنزيل الجزء {current} من {total}",
      "preparing": "جاري تجهيز ملف التنزيل...",
      "started": "بدأ التنزيل الآن.",
      "successHint": "إذا لم تظهر نافذة الحفظ فورًا، انتظر قليلًا ولا تغلق الصفحة.",
      "backgroundTitle": "تحميل التطبيق",
      "backgroundRunning": "بدأ التحميل في المتصفح. يمكنك متابعة قائمة التنزيلات مباشرة.",
      "backgroundDone": "بدأ التحميل في المتصفح. إذا لم تظهر النافذة فورًا، راجع قائمة التنزيلات.",
      "notReady": "رابط التنزيل غير جاهز بعد. حاول بعد قليل.",
      "invalidKey": "",
      "manifestError": "تعذر تحميل معلومات التنزيل حاليًا.",
      "incomplete": "ملف التنزيل غير مكتمل حتى الآن.",
      "chunkError": "تعذر تنزيل جزء من الملف. حاول مرة أخرى بعد قليل.",
      "startError": "تعذر بدء التنزيل حاليًا."
    },
    "errors": {
      "auth/email-already-in-use": "هذا البريد مستخدم مسبقًا. يمكنك تسجيل الدخول بدلًا من ذلك.",
      "auth/invalid-email": "صيغة البريد الإلكتروني غير صحيحة.",
      "auth/user-not-found": "هذا البريد غير مسجل حاليًا.",
      "auth/invalid-login-credentials": "البريد الإلكتروني أو كلمة المرور غير صحيحين.",
      "auth/operation-not-allowed": "إنشاء الحسابات معطّل حاليًا داخل Firebase Authentication.",
      "auth/too-many-requests": "تمت محاولات كثيرة جدًا. حاول مرة أخرى لاحقًا.",
      "auth/weak-password": "كلمة المرور ضعيفة جدًا. استخدم 6 أحرف على الأقل.",
      "fallback": "تعذر إكمال العملية الآن. حاول مرة أخرى لاحقًا.",
      "requestFallback": "تعذر تنفيذ الطلب حاليًا."
    },
    "heroCaption": "نظام تحليل بيانات الأسواق المالية",
    "heroBadges": [
      "Secure Infrastructure",
      "Real-Time Data",
      "AI-Assisted Analysis",
      "Transparency First",
      "User-Controlled Decisions"
    ],
    "heroActions": {
      "primary": "إنشاء حساب",
      "secondary": "تسجيل الدخول",
      "legal": "الشفافية والجوانب القانونية"
    },
    "whySection": {
      "title": "وظيفة النظام وآلية عمله",
      "lead": "يعتمد هذا النظام على تحليل بيانات السوق الفعلية وعرضها بصياغة قابلة للمراجعة والتحقق.",
      "cards": [
        {
          "title": "وظيفة النظام",
          "body": "يوفر النظام تحليلات مبنية على بيانات السوق الفعلية القادمة من منصات عرض وتحليل البيانات مثل MetaTrader 5 وTradingView، حيث يتم معالجة المؤشرات الفنية باستخدام نماذج رياضية لعرض احتمالات الحركة المستقبلية. يتم عرض الإشارات مع سياقها الكامل، بما في ذلك توقيت الإشارة، ظروف السوق، ونتيجتها لاحقًا ضمن سجل الأداء. لا يوفر هذا النظام أي تكامل برمجي مع الوسطاء (Brokers) أو واجهات تنفيذ الصفقات."
        },
        {
          "title": "كيف يعمل النظام",
          "body": "يعتمد النظام على جمع بيانات السوق بشكل دوري، ثم تحليلها باستخدام نماذج تعتمد على الأنماط التاريخية (مثل النماذج التسلسلية). يتم توليد الإشارات فقط عند تحقق شروط محددة ضمن النموذج، وليس بشكل عشوائي. جميع العمليات تتم على مستوى تحليل البيانات فقط، ولا يتم تنفيذ أي صفقات أو الوصول إلى حسابات المستخدمين."
        },
        {
          "title": "الشفافية والأداء",
          "body": "يتم عرض الأداء السابق بشكل شفاف وقابل للمراجعة، بما في ذلك توقيت كل إشارة، نتيجة الحركة بعد الإشارة، وإحصائيات الأداء العامة. الهدف من ذلك هو تمكين المستخدم من تقييم النظام بناءً على بيانات حقيقية، وليس على ادعاءات."
        },
        {
          "title": "إفصاح المخاطر",
          "body": "التداول في الأسواق المالية ينطوي على مخاطر عالية، وقد يؤدي إلى خسارة رأس المال جزئيًا أو كليًا. الأداء السابق لا يضمن النتائج المستقبلية. هذا النظام يقدم أدوات تحليل فقط، ويجب استخدامه ضمن فهم كامل للمخاطر."
        },
        {
          "title": "سجل الأداء",
          "body": "يتم عرض سجل الأداء التفصيلي داخل التطبيق بشكل قابل للمراجعة والمقارنة مع البيانات التاريخية."
        }
      ],
      "eyebrow": "القسم 3"
    },
    "legal": {
      "button": "الشفافية والجوانب القانونية",
      "sectionTitle": "الشفافية والجوانب القانونية",
      "sectionLead": "المعلومات المقدمة هي لأغراض تحليلية وتعليمية فقط، وتعتمد على بيانات تاريخية. المستخدم مسؤول عن قراراته، مع توفر بيانات الأداء السابقة للمراجعة والتحقق.",
      "openModal": "فتح التفاصيل القانونية",
      "close": "إغلاق",
      "links": [
        "شروط الاستخدام",
        "سياسة الخصوصية",
        "إخلاء المسؤولية عن المخاطر",
        "نطاق المنصة",
        "التواصل ومعلومات الشركة",
        "التواجد التشغيلي",
        "إشعار العلامة والملكية"
      ],
      "sections": [
        {
          "title": "شروط الاستخدام",
          "body": "المعلومات المقدمة عبر المنصة هي لأغراض تحليلية وتعليمية فقط، وتعتمد على بيانات تاريخية وسجلات قابلة للمراجعة."
        },
        {
          "title": "سياسة الخصوصية",
          "body": "نستخدم فقط البيانات الضرورية لتشغيل حسابك وتحسين تجربتك داخل المنصة، ولا نقوم ببيع بياناتك أو مشاركتها بشكل غير مشروع."
        },
        {
          "title": "إخلاء المسؤولية عن المخاطر",
          "body": "التداول في الأسواق المالية ينطوي على مخاطر عالية، وقد يؤدي إلى خسارة رأس المال جزئيًا أو كليًا. الأداء السابق لا يضمن النتائج المستقبلية. هذا النظام يقدم أدوات تحليل فقط، ويجب استخدامه ضمن فهم كامل للمخاطر."
        },
        {
          "title": "نطاق المنصة",
          "body": "لا يقوم هذا النظام بإدارة أموال المستخدمين أو تنفيذ صفقات نيابةً عنهم. لا يوجد أي اتصال مباشر بين النظام وحسابات التداول الخاصة بالمستخدم. أي قرار تداول يتم بشكل مستقل تمامًا من قبل المستخدم."
        },
        {
          "title": "التواصل ومعلومات الشركة",
          "body": "لأي استفسار، يمكنك التواصل معنا عبر البريد: ogt@olivegardentrading.com"
        },
        {
          "title": "التواجد التشغيلي",
          "body": "نعمل كمنصة رقمية، ويتم عرض مواقع التشغيل فقط في حال وجود تمثيل فعلي معتمد."
        },
        {
          "title": "إشعار العلامة والملكية",
          "body": "جميع الأسماء والمحتوى داخل المنصة مملوكة للنظام، ولا تعني أي شراكة مع جهات خارجية ما لم يتم ذكر ذلك بشكل رسمي. المستخدم مسؤول عن قراراته، مع توفر بيانات الأداء السابقة للمراجعة والتحقق."
        }
      ],
      "eyebrow": "القسم 4"
    },
    "footer": {
      "title": "الشركة والمعلومات",
      "developedByLabel": "تم التطوير بواسطة",
      "developedBy": "BULLDOZER Digital Development & AI Systems",
      "contactLabel": "بريد التواصل",
      "legalLabel": "الصفحات القانونية",
      "note": "يتم تطوير هذا النظام ضمن إطار بحثي في تحليل بيانات الأسواق المالية باستخدام تقنيات الذكاء الاصطناعي.",
      "eyebrow": "القسم 5"
    }
  },
  "en": {
    "languageName": "English",
    "brand": "OGT Nexus",
    "heroTitle": "A data-driven financial markets analysis system",
    "heroLines": [
      "Built on processing market signals and presenting results that can be verified with full transparency",
      "We do not promise profits. We provide analytical data and a performance record that can be reviewed"
    ],
    "authModes": {
      "register": "Create account",
      "login": "Sign in"
    },
    "trustSeal": {
      "title": "",
      "items": [
        "The system operates at the data-analysis layer only",
        "We do not manage user funds",
        "We do not execute trades on behalf of users",
        "We do not ask for broker login credentials",
        "There is no direct connection to users trading accounts",
        "For more information, please email us at\nogt@olivegardentrading.com"
      ]
    },
    "auth": {
      "registerTitle": "Create your OGT Nexus account",
      "registerSubtitle": "Create your account so you can follow signals, data, and operational organization from one clear interface.",
      "loginTitle": "Sign in to OGT Nexus",
      "loginSubtitle": "Use your email and password to access your account and continue through your technical workspace with ease.",
      "firstName": "First name",
      "lastName": "Last name",
      "firstNamePlaceholder": "First name",
      "lastNamePlaceholder": "Last name",
      "nameInvalid": "Please use English letters only for the name, without symbols.",
      "phone": "Phone number",
      "phonePlaceholder": "Enter number",
      "email": "Email address",
      "emailPlaceholder": "name@example.com",
      "password": "Password",
      "passwordPlaceholder": "6 characters or more",
      "createAccount": "Create a new account",
      "creatingAccount": "Creating account...",
      "login": "Sign in",
      "loggingIn": "Signing in...",
      "forgotPassword": "Forgot password?",
      "forgotPasswordSending": "Sending reset link...",
      "forgotPasswordEmailRequired": "Enter your email first, then press forgot password.",
      "forgotPasswordSent": "A password reset link was sent to {email}.",
      "verifiedSuccess": "Your email has been verified successfully.",
      "verifyPrompt": "Enter the 6-digit verification code sent to your email.",
      "verifyTitle": "Verify your email",
      "verifyDescription": "The account for {name} was created with {email}.",
      "verifyHint": "Enter the code exactly as it arrived in your inbox.",
      "verifyButton": "Confirm code",
      "verifyingButton": "Verifying...",
      "resendButton": "Resend code",
      "sendingCode": "Sending...",
      "resendCooldown": "Resend in {seconds}s",
      "accountLoading": "Checking account status",
      "accountLoadingText": "We are now reading your current email status.",
      "loginSuccess": "Signed in successfully. We are now checking your email verification status.",
      "loginNotice": "Sign in with your current account. If your email is not verified yet, the verification screen will appear automatically.",
      "codeInvalid": "Enter a valid 6-digit code.",
      "noCurrentUser": "No signed-in user was found.",
      "firebaseIncomplete": "Firebase settings are incomplete, so the form will not work until setup is finished.",
      "firebaseDisabled": "Firebase settings are incomplete, so we cannot create an account right now.",
      "defaultPromo": "You can explore the OGT Nexus interface with more clarity and less noise.",
      "logout": "Sign out",
      "phoneCountry": "Country code",
      "phoneNumber": "Phone number",
      "phoneCountryPlaceholder": "Choose country"
    },
    "welcome": {
      "hello": "Welcome {name}",
      "family": "Welcome to OGT Nexus"
    },
    "promo": {
      "loadingVersion": "Loading the official app version",
      "copy": "You can download the official OGT Nexus app to review signals, platform status, and account information in one interface.",
      "releaseDate": "Release date: {date}",
      "releaseDateLoading": "Loading release details",
      "downloadNow": "Download the app now"
    },
    "downloadGate": {
      "title": "Download the official app",
      "close": "Close",
      "hideWhileDownloading": "Close window and keep downloading",
      "copy": "For safer access, we prepare the official download link after validating your current session.",
      "closeHint": "You can close this window and the download will continue here on the page.",
      "placeholder": "",
      "submit": "Start download",
      "done": "Close window",
      "loading": "Preparing the download...",
      "manifestLoading": "Preparing the download details...",
      "directDownloading": "Downloading the installer file...",
      "downloading": "Downloading part {current} of {total}",
      "preparing": "Preparing the download file...",
      "started": "The download has started.",
      "successHint": "If the save window does not appear immediately, wait a moment and keep the page open.",
      "backgroundTitle": "App download",
      "backgroundRunning": "The download has started in your browser. You can follow it from the downloads list.",
      "backgroundDone": "The download has started in your browser. If you do not see it immediately, check your downloads list.",
      "notReady": "The download link is not ready yet. Please try again shortly.",
      "invalidKey": "",
      "manifestError": "Unable to load the download details right now.",
      "incomplete": "The download file is not complete yet.",
      "chunkError": "One file part could not be downloaded. Please try again shortly.",
      "startError": "Unable to start the download right now."
    },
    "errors": {
      "auth/email-already-in-use": "This email is already in use. You can sign in instead.",
      "auth/invalid-email": "The email format is not valid.",
      "auth/user-not-found": "This email is not registered right now.",
      "auth/invalid-login-credentials": "The email or password is incorrect.",
      "auth/operation-not-allowed": "Account creation is currently disabled in Firebase Authentication.",
      "auth/too-many-requests": "Too many attempts were made. Please try again later.",
      "auth/weak-password": "The password is too weak. Use at least 6 characters.",
      "fallback": "We could not complete the action right now. Please try again later.",
      "requestFallback": "We could not complete the request right now."
    },
    "heroCaption": "Financial Markets Data Analysis System",
    "heroBadges": [
      "Secure Infrastructure",
      "Real-Time Data",
      "AI-Assisted Analysis",
      "Transparency First",
      "User-Controlled Decisions"
    ],
    "heroActions": {
      "primary": "Create account",
      "secondary": "Sign in",
      "legal": "Transparency & Legal"
    },
    "whySection": {
      "title": "System Function and How It Works",
      "lead": "This system relies on analyzing real market data and presenting it in a format that can be reviewed and verified.",
      "cards": [
        {
          "title": "System Function",
          "body": "The system provides analysis based on real market data from data display and analysis platforms such as MetaTrader 5 and TradingView, where technical indicators are processed using mathematical models to present probabilities of future market movement. Signals are displayed with their full context, including signal timing, market conditions, and their later outcome within the performance ledger. This system does not provide any software integration with brokers or trade execution interfaces."
        },
        {
          "title": "How the System Works",
          "body": "The system collects market data on a recurring basis, then analyzes it using models based on historical patterns such as sequential models. Signals are generated only when specific model conditions are met, not at random. All operations remain at the data-analysis level only, and no trades are executed and no access is made to user trading accounts."
        },
        {
          "title": "Transparency and Performance",
          "body": "Past performance is presented in a transparent and reviewable way, including the timing of each signal, the market outcome after the signal, and overall performance statistics. The purpose is to help the user evaluate the system based on real data, not on claims."
        },
        {
          "title": "Risk Disclosure",
          "body": "Trading in financial markets involves high risk and may result in a partial or total loss of capital. Past performance does not guarantee future results. This system provides analysis tools only and should be used with a full understanding of risk."
        },
        {
          "title": "Performance Ledger",
          "body": "A detailed performance ledger is displayed inside the app in a format that can be reviewed and compared with historical data."
        }
      ],
      "eyebrow": "Section 3"
    },
    "legal": {
      "button": "Transparency & Legal",
      "sectionTitle": "Transparency & Legal",
      "sectionLead": "The information provided is for analytical and educational purposes only and is based on historical data. The user remains responsible for their decisions, with past performance data available for review and verification.",
      "openModal": "Open legal details",
      "close": "Close",
      "links": [
        "Terms of Use",
        "Privacy Policy",
        "Risk Disclaimer",
        "Platform Scope",
        "Contact / Company Info",
        "Operational Presence",
        "Brand / IP Notice"
      ],
      "sections": [
        {
          "title": "Terms of Use",
          "body": "The information provided through the platform is for analytical and educational purposes only and is based on historical data and reviewable records."
        },
        {
          "title": "Privacy Policy",
          "body": "We use only the data needed to operate your account and improve your experience inside the platform, and we do not sell or unlawfully share your data."
        },
        {
          "title": "Risk Disclaimer",
          "body": "Trading in financial markets involves high risk and may result in a partial or total loss of capital. Past performance does not guarantee future results. This system provides analysis tools only and should be used with a full understanding of risk."
        },
        {
          "title": "Platform Scope",
          "body": "This system does not manage user funds and does not execute trades on behalf of users. There is no direct connection between the system and user trading accounts. Any trading decision is made independently by the user."
        },
        {
          "title": "Contact / Company Info",
          "body": "For any inquiry, you can contact us by email: ogt@olivegardentrading.com"
        },
        {
          "title": "Operational Presence",
          "body": "We operate as a digital platform, and operational locations are shown only when there is an approved and factual presence."
        },
        {
          "title": "Brand / IP Notice",
          "body": "All names and content inside the platform belong to the system and do not imply any partnership with external parties unless officially stated. The user remains responsible for their decisions, while past performance data is available for review and verification."
        }
      ],
      "eyebrow": "Section 4"
    },
    "footer": {
      "title": "Company / Footer",
      "developedByLabel": "Developed by",
      "developedBy": "BULLDOZER Digital Development & AI Systems",
      "contactLabel": "Contact email",
      "legalLabel": "Legal pages",
      "note": "This system is being developed within a research framework for financial market data analysis using artificial intelligence techniques.",
      "eyebrow": "Section 5"
    }
  },
  "fr": {
    "languageName": "Français",
    "brand": "OGT Nexus",
    "heroTitle": "Un systeme d analyse des marches financiers base sur les donnees",
    "heroLines": [
      "Il repose sur le traitement des signaux de marche et sur la presentation de resultats verifiables avec une transparence complete",
      "Nous ne promettons pas de profits. Nous fournissons des donnees analytiques et un historique de performance pouvant etre examine"
    ],
    "authModes": {
      "register": "Créer un compte",
      "login": "Se connecter"
    },
    "trustSeal": {
      "title": "",
      "items": [
        "Le systeme fonctionne uniquement au niveau de l analyse de donnees",
        "Nous ne gerons pas les fonds des utilisateurs",
        "Nous n executons pas d ordres au nom des utilisateurs",
        "Nous ne demandons pas les identifiants du broker",
        "Il n existe aucune connexion directe avec les comptes de trading des utilisateurs",
        "Pour plus d informations, merci de nous ecrire a\nogt@olivegardentrading.com"
      ]
    },
    "auth": {
      "registerTitle": "Créez votre compte OGT Nexus",
      "registerSubtitle": "Creez votre compte pour suivre les signaux, les donnees et l organisation operationnelle depuis une interface claire.",
      "loginTitle": "Connectez-vous à OGT Nexus",
      "loginSubtitle": "Utilisez votre e-mail et votre mot de passe pour acceder a votre compte et poursuivre dans votre espace technique plus facilement.",
      "firstName": "Prenom",
      "lastName": "Nom",
      "firstNamePlaceholder": "First name",
      "lastNamePlaceholder": "Last name",
      "nameInvalid": "Veuillez utiliser uniquement des lettres anglaises pour le nom, sans symboles.",
      "phone": "Numéro de téléphone",
      "phonePlaceholder": "Entrez le numero",
      "email": "Adresse e-mail",
      "emailPlaceholder": "name@example.com",
      "password": "Mot de passe",
      "passwordPlaceholder": "6 caractères ou plus",
      "createAccount": "Créer un nouveau compte",
      "creatingAccount": "Création du compte...",
      "login": "Se connecter",
      "loggingIn": "Connexion...",
      "forgotPassword": "Mot de passe oublié ?",
      "forgotPasswordSending": "Envoi du lien de réinitialisation...",
      "forgotPasswordEmailRequired": "Saisissez d’abord votre e-mail, puis cliquez sur mot de passe oublié.",
      "forgotPasswordSent": "Un lien de réinitialisation a été envoyé à {email}.",
      "verifiedSuccess": "Votre adresse e-mail a été vérifiée avec succès.",
      "verifyPrompt": "Saisissez le code de vérification à 6 chiffres envoyé à votre e-mail.",
      "verifyTitle": "Vérifiez votre e-mail",
      "verifyDescription": "Le compte de {name} a été créé avec {email}.",
      "verifyHint": "Saisissez le code exactement comme il est arrivé dans votre boîte de réception.",
      "verifyButton": "Confirmer le code",
      "verifyingButton": "Vérification...",
      "resendButton": "Renvoyer le code",
      "sendingCode": "Envoi...",
      "resendCooldown": "Renvoyer dans {seconds}s",
      "accountLoading": "Vérification de l’état du compte",
      "accountLoadingText": "Nous consultons maintenant l’état actuel de votre e-mail.",
      "loginSuccess": "Connexion réussie. Nous vérifions maintenant l’état de validation de votre e-mail.",
      "loginNotice": "Connectez-vous avec votre compte actuel. Si votre e-mail n’est pas encore vérifié, l’écran de vérification apparaîtra automatiquement.",
      "codeInvalid": "Entrez un code valide à 6 chiffres.",
      "noCurrentUser": "Aucun utilisateur connecté n’a été trouvé.",
      "firebaseIncomplete": "La configuration Firebase est incomplète, donc le formulaire ne fonctionnera pas tant que l’installation ne sera pas terminée.",
      "firebaseDisabled": "La configuration Firebase est incomplète, nous ne pouvons donc pas créer de compte pour le moment.",
      "defaultPromo": "Vous pouvez decouvrir l interface OGT Nexus avec plus de clarte et moins de bruit.",
      "logout": "Se déconnecter",
      "phoneCountry": "Indicatif",
      "phoneNumber": "Numéro de téléphone",
      "phoneCountryPlaceholder": "Choisir le pays"
    },
    "welcome": {
      "hello": "Bienvenue {name}",
      "family": "Bienvenue sur OGT Nexus"
    },
    "promo": {
      "loadingVersion": "Chargement de la version officielle de l’application",
      "copy": "Vous pouvez telecharger l application officielle OGT Nexus pour consulter les signaux, l etat de la plateforme et les informations du compte dans une seule interface.",
      "releaseDate": "Date de sortie : {date}",
      "releaseDateLoading": "Chargement des détails de la version",
      "downloadNow": "Télécharger l’application"
    },
    "downloadGate": {
      "title": "Télécharger l’application officielle",
      "close": "Fermer",
      "hideWhileDownloading": "Fermer et poursuivre le téléchargement",
      "copy": "Pour plus de sécurité, nous préparons le lien de téléchargement officiel après validation de votre session actuelle.",
      "closeHint": "Vous pouvez fermer cette fenêtre et le téléchargement continuera ici sur la page.",
      "placeholder": "",
      "submit": "Lancer le téléchargement",
      "done": "Fermer la fenêtre",
      "loading": "Préparation du téléchargement...",
      "manifestLoading": "Préparation des détails du téléchargement...",
      "directDownloading": "Téléchargement du fichier d’installation...",
      "downloading": "Téléchargement de la partie {current} sur {total}",
      "preparing": "Préparation du fichier de téléchargement...",
      "started": "Le téléchargement a commencé.",
      "successHint": "Si la fenêtre d’enregistrement ne s’affiche pas immédiatement, patientez un instant et gardez la page ouverte.",
      "backgroundTitle": "Téléchargement de l’application",
      "backgroundRunning": "Le téléchargement a commencé dans votre navigateur. Vous pouvez le suivre depuis la liste des téléchargements.",
      "backgroundDone": "Le téléchargement a commencé dans votre navigateur. Si rien n’apparaît tout de suite, vérifiez la liste des téléchargements.",
      "notReady": "Le lien de téléchargement n’est pas encore prêt. Réessayez dans un instant.",
      "invalidKey": "",
      "manifestError": "Impossible de charger les informations de téléchargement pour le moment.",
      "incomplete": "Le fichier de téléchargement n’est pas encore complet.",
      "chunkError": "Une partie du fichier n’a pas pu être téléchargée. Réessayez dans un instant.",
      "startError": "Impossible de démarrer le téléchargement pour le moment."
    },
    "errors": {
      "auth/email-already-in-use": "Cet e-mail est déjà utilisé. Vous pouvez vous connecter à la place.",
      "auth/invalid-email": "Le format de l’adresse e-mail n’est pas valide.",
      "auth/user-not-found": "Cette adresse e-mail n’est pas enregistrée actuellement.",
      "auth/invalid-login-credentials": "L’e-mail ou le mot de passe est incorrect.",
      "auth/operation-not-allowed": "La création de compte est actuellement désactivée dans Firebase Authentication.",
      "auth/too-many-requests": "Trop de tentatives ont été effectuées. Réessayez plus tard.",
      "auth/weak-password": "Le mot de passe est trop faible. Utilisez au moins 6 caractères.",
      "fallback": "Impossible de terminer l’action pour le moment. Réessayez plus tard.",
      "requestFallback": "Impossible de terminer la requête pour le moment."
    },
    "heroCaption": "Systeme d analyse des donnees des marches financiers",
    "heroBadges": [
      "Secure Infrastructure",
      "Real-Time Data",
      "AI-Assisted Analysis",
      "Transparency First",
      "User-Controlled Decisions"
    ],
    "heroActions": {
      "primary": "Créer un compte",
      "secondary": "Se connecter",
      "legal": "Transparence et cadre legal"
    },
    "whySection": {
      "title": "Fonction du systeme et fonctionnement",
      "lead": "Ce systeme repose sur l analyse de donnees de marche reelles et sur une presentation pouvant etre verifiee et revue.",
      "cards": [
        {
          "title": "Fonction du systeme",
          "body": "Le systeme fournit des analyses basees sur des donnees de marche reelles provenant de plateformes d affichage et d analyse de donnees comme MetaTrader 5 et TradingView, ou les indicateurs techniques sont traites au moyen de modeles mathematiques pour presenter des probabilites de mouvement futur. Les signaux sont affiches avec leur contexte complet, y compris l heure du signal, les conditions du marche et leur resultat ulterieur dans l historique de performance. Ce systeme ne fournit aucune integration logicielle avec les brokers ni avec des interfaces d execution d ordres."
        },
        {
          "title": "Comment le systeme fonctionne",
          "body": "Le systeme collecte les donnees de marche de maniere periodique, puis les analyse au moyen de modeles bases sur des schemas historiques, comme les modeles sequentiels. Les signaux ne sont generes que lorsque des conditions precises du modele sont reunies, et non de facon aleatoire. Toutes les operations restent limitees a l analyse de donnees, sans execution d ordres ni acces aux comptes de trading des utilisateurs."
        },
        {
          "title": "Transparence et performance",
          "body": "Les performances passees sont presentees de facon transparente et verifiable, y compris l heure de chaque signal, le resultat du mouvement apres le signal et les statistiques generales de performance. L objectif est de permettre a l utilisateur d evaluer le systeme sur la base de donnees reelles, et non sur des affirmations."
        },
        {
          "title": "Divulgation des risques",
          "body": "Le trading sur les marches financiers comporte un risque eleve et peut entrainer une perte partielle ou totale du capital. Les performances passees ne garantissent pas les resultats futurs. Ce systeme fournit uniquement des outils d analyse et doit etre utilise avec une pleine comprehension des risques."
        },
        {
          "title": "Historique de performance",
          "body": "Un historique detaille des performances est affiche dans l application sous une forme pouvant etre revue et comparee aux donnees historiques."
        }
      ],
      "eyebrow": "Section 3"
    },
    "legal": {
      "button": "Transparence et cadre legal",
      "sectionTitle": "Transparence et cadre legal",
      "sectionLead": "Les informations fournies le sont a des fins analytiques et educatives uniquement et reposent sur des donnees historiques. L utilisateur reste responsable de ses decisions, avec des donnees de performance passees disponibles pour examen et verification.",
      "openModal": "Ouvrir les détails juridiques",
      "close": "Fermer",
      "links": [
        "Conditions d utilisation",
        "Politique de confidentialite",
        "Avertissement sur les risques",
        "Perimetre de la plateforme",
        "Contact et informations societe",
        "Presence operationnelle",
        "Notice de marque et propriete"
      ],
      "sections": [
        {
          "title": "Conditions d utilisation",
          "body": "Les informations fournies via la plateforme sont destinees uniquement a des fins analytiques et educatives et reposent sur des donnees historiques ainsi que sur des enregistrements consultables."
        },
        {
          "title": "Politique de confidentialite",
          "body": "Nous utilisons uniquement les donnees necessaires au fonctionnement de votre compte et a l amelioration de votre experience, sans vendre ni partager vos donnees de maniere illegitime."
        },
        {
          "title": "Avertissement sur les risques",
          "body": "Le trading sur les marches financiers comporte un risque eleve et peut entrainer une perte partielle ou totale du capital. Les performances passees ne garantissent pas les resultats futurs. Ce systeme fournit uniquement des outils d analyse et doit etre utilise avec une pleine comprehension des risques."
        },
        {
          "title": "Perimetre de la plateforme",
          "body": "Ce systeme ne gere pas les fonds des utilisateurs et n execute pas d ordres en leur nom. Il n existe aucune connexion directe entre le systeme et les comptes de trading des utilisateurs. Toute decision de trading est prise de maniere independante par l utilisateur."
        },
        {
          "title": "Contact et informations societe",
          "body": "Pour toute question, vous pouvez nous contacter par e-mail : ogt@olivegardentrading.com"
        },
        {
          "title": "Presence operationnelle",
          "body": "Nous operons comme une plateforme numerique et les lieux operationnels ne sont affiches que lorsqu il existe une presence reelle et approuvee."
        },
        {
          "title": "Notice de marque et propriete",
          "body": "Tous les noms et contenus de la plateforme appartiennent au systeme et ne signifient aucun partenariat avec des tiers sauf mention officielle. L utilisateur reste responsable de ses decisions, tandis que les donnees de performance passees restent disponibles pour examen et verification."
        }
      ],
      "eyebrow": "Section 4"
    },
    "footer": {
      "title": "Societe et informations",
      "developedByLabel": "Developpe par",
      "developedBy": "BULLDOZER Digital Development & AI Systems",
      "contactLabel": "E-mail de contact",
      "legalLabel": "Pages legales",
      "note": "Ce systeme est developpe dans un cadre de recherche sur l analyse des donnees des marches financiers au moyen de techniques d intelligence artificielle.",
      "eyebrow": "Section 5"
    }
  },
  "de": {
    "languageName": "Deutsch",
    "brand": "OGT Nexus",
    "heroTitle": "Ein datenbasiertes Analysesystem fuer Finanzmaerkte",
    "heroLines": [
      "Es basiert auf der Verarbeitung von Marktsignalen und der Darstellung von Ergebnissen, die mit voller Transparenz verifiziert werden koennen",
      "Wir versprechen keine Gewinne. Wir stellen analytische Daten und eine ueberpruefbare Leistungshistorie bereit"
    ],
    "authModes": {
      "register": "Konto erstellen",
      "login": "Anmelden"
    },
    "trustSeal": {
      "title": "",
      "items": [
        "Das System arbeitet ausschliesslich auf der Ebene der Datenanalyse",
        "Wir verwalten keine Nutzergelder",
        "Wir fuehren keine Trades im Namen von Nutzern aus",
        "Wir fragen keine Broker-Zugangsdaten ab",
        "Es besteht keine direkte Verbindung zu den Trading-Konten der Nutzer",
        "Fuer weitere Informationen schreiben Sie uns an\nogt@olivegardentrading.com"
      ]
    },
    "auth": {
      "registerTitle": "Erstellen Sie Ihr OGT-Nexus-Konto",
      "registerSubtitle": "Erstellen Sie Ihr Konto, damit Sie Signale, Daten und operative Abl?ufe in einer klaren Oberfl?che verfolgen k?nnen.",
      "loginTitle": "Bei OGT Nexus anmelden",
      "loginSubtitle": "Melden Sie sich mit E-Mail und Passwort an, um Ihr Konto und Ihre technische Oberfl?che einfacher zu erreichen.",
      "firstName": "Vorname",
      "lastName": "Nachname",
      "firstNamePlaceholder": "First name",
      "lastNamePlaceholder": "Last name",
      "nameInvalid": "Bitte verwenden Sie fur den Namen nur englische Buchstaben ohne Symbole.",
      "phone": "Telefonnummer",
      "phonePlaceholder": "Nummer eingeben",
      "email": "E-Mail-Adresse",
      "emailPlaceholder": "name@example.com",
      "password": "Passwort",
      "passwordPlaceholder": "6 Zeichen oder mehr",
      "createAccount": "Neues Konto erstellen",
      "creatingAccount": "Konto wird erstellt...",
      "login": "Anmelden",
      "loggingIn": "Anmeldung läuft...",
      "forgotPassword": "Passwort vergessen?",
      "forgotPasswordSending": "Zurücksetzungslink wird gesendet...",
      "forgotPasswordEmailRequired": "Geben Sie zuerst Ihre E-Mail ein und klicken Sie dann auf Passwort vergessen.",
      "forgotPasswordSent": "Ein Link zum Zurücksetzen wurde an {email} gesendet.",
      "verifiedSuccess": "Ihre E-Mail wurde erfolgreich bestätigt.",
      "verifyPrompt": "Geben Sie den 6-stelligen Bestätigungscode ein, der an Ihre E-Mail gesendet wurde.",
      "verifyTitle": "Bestätigen Sie Ihre E-Mail",
      "verifyDescription": "Das Konto für {name} wurde mit {email} erstellt.",
      "verifyHint": "Geben Sie den Code genau so ein, wie er in Ihrem Posteingang angekommen ist.",
      "verifyButton": "Code bestätigen",
      "verifyingButton": "Wird geprüft...",
      "resendButton": "Code erneut senden",
      "sendingCode": "Wird gesendet...",
      "resendCooldown": "Erneut senden in {seconds}s",
      "accountLoading": "Kontostatus wird geprüft",
      "accountLoadingText": "Wir lesen jetzt den aktuellen Status Ihrer E-Mail.",
      "loginSuccess": "Erfolgreich angemeldet. Wir prüfen jetzt den Bestätigungsstatus Ihrer E-Mail.",
      "loginNotice": "Melden Sie sich mit Ihrem aktuellen Konto an. Wenn Ihre E-Mail noch nicht bestätigt ist, erscheint die Bestätigungsansicht automatisch.",
      "codeInvalid": "Geben Sie einen gültigen 6-stelligen Code ein.",
      "noCurrentUser": "Es wurde kein angemeldeter Benutzer gefunden.",
      "firebaseIncomplete": "Die Firebase-Einstellungen sind unvollständig, daher funktioniert das Formular erst nach Abschluss der Einrichtung.",
      "firebaseDisabled": "Die Firebase-Einstellungen sind unvollständig, daher können wir derzeit kein Konto erstellen.",
      "defaultPromo": "Sie k?nnen die OGT-Nexus-Oberfl?che mit mehr Klarheit und weniger Rauschen erkunden.",
      "logout": "Abmelden",
      "phoneCountry": "Ländervorwahl",
      "phoneNumber": "Telefonnummer",
      "phoneCountryPlaceholder": "Land wählen"
    },
    "welcome": {
      "hello": "Willkommen {name}",
      "family": "Willkommen bei OGT Nexus"
    },
    "promo": {
      "loadingVersion": "Die offizielle App-Version wird geladen",
      "copy": "Sie k?nnen die offizielle OGT-Nexus-App herunterladen, um Signale, Plattformstatus und Kontoinformationen in einer Oberfl?che zu sehen.",
      "releaseDate": "Veröffentlichungsdatum: {date}",
      "releaseDateLoading": "Versionsdetails werden geladen",
      "downloadNow": "App herunterladen"
    },
    "downloadGate": {
      "title": "Offizielle App herunterladen",
      "close": "Schließen",
      "hideWhileDownloading": "Fenster schließen und weiterladen",
      "copy": "Für einen sichereren Zugriff bereiten wir den offiziellen Download-Link nach der Prüfung Ihrer aktuellen Sitzung vor.",
      "closeHint": "Sie können dieses Fenster schließen, der Download läuft hier auf der Seite weiter.",
      "placeholder": "",
      "submit": "Download starten",
      "done": "Fenster schließen",
      "loading": "Download wird vorbereitet...",
      "manifestLoading": "Download-Details werden vorbereitet...",
      "directDownloading": "Installationsdatei wird heruntergeladen...",
      "downloading": "Teil {current} von {total} wird heruntergeladen",
      "preparing": "Download-Datei wird vorbereitet...",
      "started": "Der Download wurde gestartet.",
      "successHint": "Falls das Speicherfenster nicht sofort erscheint, warten Sie einen Moment und lassen Sie die Seite geöffnet.",
      "backgroundTitle": "App-Download",
      "backgroundRunning": "Der Download wurde im Browser gestartet. Sie können ihn in der Download-Liste verfolgen.",
      "backgroundDone": "Der Download wurde im Browser gestartet. Falls nichts sofort erscheint, prüfen Sie bitte Ihre Download-Liste.",
      "notReady": "Der Download-Link ist noch nicht bereit. Bitte versuchen Sie es in Kürze erneut.",
      "invalidKey": "",
      "manifestError": "Die Download-Informationen konnten derzeit nicht geladen werden.",
      "incomplete": "Die Download-Datei ist derzeit nicht vollständig.",
      "chunkError": "Ein Teil der Datei konnte nicht geladen werden. Bitte versuchen Sie es in Kürze erneut.",
      "startError": "Der Download konnte derzeit nicht gestartet werden."
    },
    "errors": {
      "auth/email-already-in-use": "Diese E-Mail wird bereits verwendet. Sie können sich stattdessen anmelden.",
      "auth/invalid-email": "Das E-Mail-Format ist ungültig.",
      "auth/user-not-found": "Diese E-Mail ist derzeit nicht registriert.",
      "auth/invalid-login-credentials": "E-Mail oder Passwort sind nicht korrekt.",
      "auth/operation-not-allowed": "Die Kontoerstellung ist in Firebase Authentication derzeit deaktiviert.",
      "auth/too-many-requests": "Es wurden zu viele Versuche unternommen. Bitte versuchen Sie es später erneut.",
      "auth/weak-password": "Das Passwort ist zu schwach. Verwenden Sie mindestens 6 Zeichen.",
      "fallback": "Die Aktion konnte derzeit nicht abgeschlossen werden. Bitte versuchen Sie es später erneut.",
      "requestFallback": "Die Anfrage konnte derzeit nicht abgeschlossen werden."
    },
    "heroCaption": "Analysesystem fuer Finanzmarktdaten",
    "heroBadges": [
      "Secure Infrastructure",
      "Real-Time Data",
      "AI-Assisted Analysis",
      "Transparency First",
      "User-Controlled Decisions"
    ],
    "heroActions": {
      "primary": "Konto erstellen",
      "secondary": "Anmelden",
      "legal": "Transparenz und Rechtliches"
    },
    "whySection": {
      "title": "Systemfunktion und Funktionsweise",
      "lead": "Dieses System basiert auf der Analyse realer Marktdaten und deren Darstellung in einer Form, die ueberprueft und nachvollzogen werden kann.",
      "cards": [
        {
          "title": "Systemfunktion",
          "body": "Das System liefert Analysen auf Basis realer Marktdaten aus Plattformen zur Datenanzeige und -analyse wie MetaTrader 5 und TradingView. Dabei werden technische Indikatoren mit mathematischen Modellen verarbeitet, um Wahrscheinlichkeiten fuer kuenftige Marktbewegungen darzustellen. Signale werden mit ihrem vollstaendigen Kontext angezeigt, einschliesslich Signalzeitpunkt, Marktbedingungen und spaeterem Ergebnis im Leistungsprotokoll. Dieses System bietet keine softwareseitige Integration mit Brokern oder Schnittstellen zur Orderausfuehrung."
        },
        {
          "title": "Wie das System arbeitet",
          "body": "Das System sammelt Marktdaten in regelmaessigen Abstaenden und analysiert sie anschliessend mit Modellen auf Basis historischer Muster, wie zum Beispiel sequenziellen Modellen. Signale werden nur erzeugt, wenn bestimmte Modellbedingungen erfuellt sind, nicht zufaellig. Saemtliche Vorgaenge bleiben auf die Datenanalyse beschraenkt; es werden weder Trades ausgefuehrt noch Zugriffe auf Nutzerkonten vorgenommen."
        },
        {
          "title": "Transparenz und Leistung",
          "body": "Die bisherige Leistung wird transparent und nachvollziehbar dargestellt, einschliesslich des Zeitpunkts jedes Signals, des Marktresultats nach dem Signal sowie allgemeiner Leistungsstatistiken. Ziel ist es, dem Nutzer eine Bewertung des Systems auf Basis realer Daten zu ermoeglichen und nicht auf Basis von Behauptungen."
        },
        {
          "title": "Risikohinweis",
          "body": "Der Handel an den Finanzmaerkten ist mit hohem Risiko verbunden und kann zu einem teilweisen oder vollstaendigen Verlust des Kapitals fuehren. Vergangene Leistungen garantieren keine kuenftigen Ergebnisse. Dieses System stellt ausschliesslich Analysewerkzeuge bereit und sollte nur mit vollem Verstaendnis der Risiken genutzt werden."
        },
        {
          "title": "Leistungsprotokoll",
          "body": "Ein detailliertes Leistungsprotokoll wird innerhalb der App in einer Form angezeigt, die ueberprueft und mit historischen Daten verglichen werden kann."
        }
      ],
      "eyebrow": "Abschnitt 3"
    },
    "legal": {
      "button": "Transparenz und Rechtliches",
      "sectionTitle": "Transparenz und Rechtliches",
      "sectionLead": "Die bereitgestellten Informationen dienen ausschliesslich analytischen und edukativen Zwecken und beruhen auf historischen Daten. Der Nutzer bleibt fuer seine Entscheidungen verantwortlich, waehrend vergangene Leistungsdaten zur Pruefung und Verifikation verfuegbar sind.",
      "openModal": "Rechtsdetails öffnen",
      "close": "Schließen",
      "links": [
        "Nutzungsbedingungen",
        "Datenschutz",
        "Risikohinweis",
        "Plattformumfang",
        "Kontakt und Firmeninfo",
        "Operative Praesenz",
        "Marken- und IP-Hinweis"
      ],
      "sections": [
        {
          "title": "Nutzungsbedingungen",
          "body": "Die ueber die Plattform bereitgestellten Informationen dienen ausschliesslich analytischen und edukativen Zwecken und beruhen auf historischen Daten sowie nachvollziehbaren Aufzeichnungen."
        },
        {
          "title": "Datenschutz",
          "body": "Wir verwenden nur die Daten, die fur Ihr Konto und eine bessere Nutzung der Plattform erforderlich sind, und wir verkaufen oder teilen Ihre Daten nicht unrechtmassig."
        },
        {
          "title": "Risikohinweis",
          "body": "Der Handel an den Finanzmaerkten ist mit hohem Risiko verbunden und kann zu einem teilweisen oder vollstaendigen Verlust des Kapitals fuehren. Vergangene Leistungen garantieren keine kuenftigen Ergebnisse. Dieses System stellt ausschliesslich Analysewerkzeuge bereit und sollte nur mit vollem Verstaendnis der Risiken genutzt werden."
        },
        {
          "title": "Plattformumfang",
          "body": "Dieses System verwaltet keine Nutzergelder und fuehrt keine Trades im Namen von Nutzern aus. Es besteht keine direkte Verbindung zwischen dem System und den Trading-Konten der Nutzer. Jede Handelsentscheidung wird unabhaengig vom Nutzer getroffen."
        },
        {
          "title": "Kontakt und Firmeninfo",
          "body": "Bei Fragen konnen Sie uns per E-Mail kontaktieren: ogt@olivegardentrading.com"
        },
        {
          "title": "Operative Praesenz",
          "body": "Wir arbeiten als digitale Plattform, und operative Standorte werden nur angezeigt, wenn es eine tatsachliche und genehmigte Prasenz gibt."
        },
        {
          "title": "Marken- und IP-Hinweis",
          "body": "Alle Namen und Inhalte innerhalb der Plattform gehoeren zum System und bedeuten keine Partnerschaft mit externen Parteien, sofern dies nicht offiziell angegeben wird. Der Nutzer bleibt fuer seine Entscheidungen verantwortlich, waehrend vergangene Leistungsdaten zur Pruefung und Verifikation verfuegbar sind."
        }
      ],
      "eyebrow": "Abschnitt 4"
    },
    "footer": {
      "title": "Unternehmen und Informationen",
      "developedByLabel": "Entwickelt von",
      "developedBy": "BULLDOZER Digital Development & AI Systems",
      "contactLabel": "Kontakt E-Mail",
      "legalLabel": "Rechtliche Seiten",
      "note": "Dieses System wird im Rahmen eines Forschungsansatzes zur Analyse von Finanzmarktdaten unter Einsatz kuenstlicher Intelligenz entwickelt.",
      "eyebrow": "Abschnitt 5"
    }
  }
}

function resolveLanguage(candidate) {
  return Object.prototype.hasOwnProperty.call(translations, candidate) ? candidate : 'ar'
}

function formatText(template, values = {}) {
  return template.replace(/\{(.*?)\}/g, (_, key) => values[key] ?? '')
}

function formatDisplayValue(value, fallback) {
  const normalized = value === null || value === undefined ? '' : String(value).trim()
  return normalized || fallback
}

function normalizeStatusValue(value, valueLabels, fallback) {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) {
    return fallback
  }
  const statusMap = {
    active: valueLabels.active || normalized,
    approved: valueLabels.approved || normalized,
    connected: valueLabels.connected || normalized,
    online: valueLabels.connected || normalized,
    offline: valueLabels.offline || normalized,
    pending: valueLabels.pending || normalized,
    pending_review: valueLabels.pending || normalized,
    restricted: valueLabels.restricted || normalized,
    normal: valueLabels.open || normalized,
    open: valueLabels.open || normalized,
    linked: valueLabels.linked || normalized,
    unlinked: valueLabels.notLinked || normalized,
  }
  return statusMap[normalized] || value
}

function formatChatTimestamp(value, language) {
  const normalized = String(value || '').trim()
  if (!normalized) {
    return ''
  }
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) {
    return normalized
  }
  try {
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA' : language || 'en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return date.toLocaleString()
  }
}

function buildCommunityChatErrorMessage(error, dictionary, kind = 'load') {
  const normalized = String(error?.message || error || '').trim()
  if (!normalized) {
    return dictionary.errors?.[kind] || dictionary.errors?.load || 'Unexpected error.'
  }
  if (normalized === 'missing_current_user') {
    return dictionary.errors?.session || dictionary.errors?.[kind] || normalized
  }
  if (normalized === 'web_chat_identity_not_ready') {
    return dictionary.errors?.identity || dictionary.errors?.[kind] || normalized
  }
  if (normalized === 'web_chat_not_allowed_for_account') {
    return dictionary.errors?.notAllowed || dictionary.errors?.[kind] || normalized
  }
  return dictionary.errors?.[kind] || normalized
}

function normalizeCommunityChatItems(items) {
  if (!Array.isArray(items)) {
    return []
  }
  return items
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => ({
      id: String(item.id || `community-${index}-${item.created_at || ''}`),
      chat_kind: String(item.chat_kind || 'community'),
      room_key: String(item.room_key || 'global'),
      sender_kind: String(item.sender_kind || 'user'),
      sender_name: String(item.sender_name || '').trim(),
      sender_id: String(item.sender_id || item.sender_name || item.account_id || '').trim(),
      account_id: String(item.account_id || '').trim(),
      body: String(item.body || '').trim(),
      created_at: String(item.created_at || '').trim(),
      pending: Boolean(item.pending),
    }))
}

function isOwnCommunityChatMessage(item, identity) {
  const messageAccountId = String(item?.account_id || '').trim()
  const identityAccountId = String(identity?.account_id || '').trim()
  return Boolean(messageAccountId && identityAccountId && messageAccountId === identityAccountId)
}

function resolveCommunityChatSender(item, identity, dictionary) {
  if (isOwnCommunityChatMessage(item, identity)) {
    return dictionary.you
  }
  if (['admin', 'support', 'moderator'].includes(String(item?.sender_kind || '').trim().toLowerCase())) {
    return dictionary.team
  }
  return String(item?.sender_name || item?.sender_id || item?.account_id || '').trim() || dictionary.member
}

function isRetryableCentralAuthErrorMessage(message) {
  const normalized = String(message || '').trim().toLowerCase()
  if (!normalized) {
    return false
  }
  return (
    normalized.includes('missing_bearer_token') ||
    normalized.includes('firebase_token_lookup') ||
    normalized.includes('firebase_user_not_found') ||
    normalized.includes('email_not_verified') ||
    normalized.includes('firebase_uid_missing')
  )
}

function normalizeSiteRatingState(payload) {
  const maximumRating = Math.max(1, Math.min(5, Number(payload?.maximum_rating || 5) || 5))
  const averageRating = Math.max(0, Math.min(maximumRating, Number(payload?.average_rating || 0) || 0))
  const totalRatings = Math.max(0, Number(payload?.total_ratings || 0) || 0)
  const userRating = Math.max(0, Math.min(maximumRating, Number(payload?.user_rating || 0) || 0))
  return {
    loading: false,
    submitting: false,
    error: '',
    success: '',
    averageRating,
    totalRatings,
    userRating,
    canRate: Boolean(payload?.can_rate) && !userRating,
    ratingLocked: Boolean(payload?.rating_locked) || Boolean(userRating),
    maximumRating,
    submittedAt: String(payload?.submitted_at || '').trim(),
    pendingValue: 0,
  }
}

function normalizePublicSiteRatingState(payload) {
  const maximumRating = Math.max(1, Math.min(5, Number(payload?.maximum_rating || 5) || 5))
  const averageRating = Math.max(0, Math.min(maximumRating, Number(payload?.average_rating || 0) || 0))
  const totalRatings = Math.max(0, Number(payload?.total_ratings || 0) || 0)
  return {
    loading: false,
    error: '',
    averageRating,
    totalRatings,
    maximumRating,
  }
}

function buildSiteRatingErrorMessage(error, dictionary, kind = 'load') {
  const fallback = kind === 'submit' ? dictionary.submitError : dictionary.loadError
  const message = String(error?.message || error || '').trim()
  if (!message) {
    return fallback
  }
  if (message === 'missing_current_user') {
    return fallback
  }
  return fallback
}

function buildSiteRatingSuccessMessage(rating, dictionary) {
  const confirmedRating = Math.max(1, Math.min(5, Number(rating || 0) || 0))
  const confirmation = formatText(dictionary.saved, { rating: confirmedRating })
  const followUp = confirmedRating > 3 ? dictionary.thanksHigh : dictionary.thanksLow
  return `${confirmation} ${followUp}`.trim()
}

function formatSiteRatingAverage(value, language) {
  const numeric = Math.max(0, Number(value || 0) || 0)
  try {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : language || 'en', {
      minimumFractionDigits: numeric > 0 && numeric % 1 !== 0 ? 1 : 0,
      maximumFractionDigits: 1,
    }).format(numeric)
  } catch {
    return String(Math.round(numeric * 10) / 10)
  }
}

function formatSiteRatingCount(total, language, dictionary) {
  const count = Math.max(0, Number(total || 0) || 0)
  if (!count) {
    return dictionary.noRatings
  }
  const formattedCount = new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : language || 'en').format(count)
  return formatText(dictionary.count, { count: formattedCount })
}

function LanguageFlag({ code }) {
  const normalizedCode = String(code || '').trim().toLowerCase()
  return <span className={`language-menu-flag language-menu-flag--${normalizedCode || 'generic'}`} aria-hidden="true" />
}

async function callCentralWebApi(path, payload = {}) {
  const currentUser = auth?.currentUser
  if (!currentUser) {
    throw new Error('missing_current_user')
  }

  async function performRequest(forceRefresh = false) {
    const idToken = await currentUser.getIdToken(forceRefresh)
    const response = await fetch(`${CENTRAL_API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload ?? {}),
    })
    const data = await response.json().catch(() => ({}))
    return { response, data }
  }

  let result = await performRequest(false)
  if ((!result.response.ok || result.data?.status !== 'success') && isRetryableCentralAuthErrorMessage(result.data?.message)) {
    result = await performRequest(true)
  }
  if (!result.response.ok || result.data?.status !== 'success') {
    throw new Error(result.data?.message || 'request_failed')
  }
  return result.data
}

function getAuthErrorMessage(error, dictionary) {
  const code = error?.code
  if (code && dictionary.errors?.[code]) {
    return dictionary.errors[code]
  }
  return dictionary.errors?.fallback ?? 'Unexpected error.'
}

function extractFileName(value, fallback = DOWNLOAD_FILE_NAME) {
  try {
    const url = new URL(String(value || ''), window.location.origin)
    const fileName = decodeURIComponent((url.pathname.split('/').filter(Boolean).pop() || '').trim())
    return fileName || fallback
  } catch {
    return fallback
  }
}

function startBrowserDownload(fileUrl, suggestedFileName) {
  const anchor = document.createElement('a')
  anchor.href = fileUrl
  anchor.download = suggestedFileName || extractFileName(fileUrl)
  anchor.rel = 'noopener noreferrer'
  anchor.target = '_blank'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

async function callOtpApi(path, payload, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  const response = await fetch(`${OTP_API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.ok === false) {
    throw new Error(data?.message || 'request_failed')
  }
  return data
}

function App() {
  const [language, setLanguage] = useState(() => resolveLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY)))
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false)
  const [portalView, setPortalView] = useState('overview')
  const [authMode, setAuthMode] = useState('register')
  const [form, setForm] = useState(initialForm)
  const [legalModalOpen, setLegalModalOpen] = useState(false)
  const [notice, setNotice] = useState(null)
  const [noticeTone, setNoticeTone] = useState('neutral')
  const [communityChatOpen, setCommunityChatOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingPasswordReset, setIsSendingPasswordReset] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [isVerifyingCode, setIsVerifyingCode] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const [userState, setUserState] = useState(initialUserState)
  const [accountSummary, setAccountSummary] = useState(initialAccountSummaryState)
  const [publicSiteRating, setPublicSiteRating] = useState(() => buildInitialPublicSiteRatingState())
  const [siteRating, setSiteRating] = useState(() => buildInitialSiteRatingState())
  const [communityChat, setCommunityChat] = useState(() => buildInitialCommunityChatState())
  const [promoRelease, setPromoRelease] = useState({ version: '', releaseDate: '', installerUrl: '' })
  const [downloadGateOpen, setDownloadGateOpen] = useState(false)
  const [downloadAccessError, setDownloadAccessError] = useState('')
  const [downloadStatusText, setDownloadStatusText] = useState('')
  const [downloadProgressPercent, setDownloadProgressPercent] = useState(0)
  const [downloadFinished, setDownloadFinished] = useState(false)
  const [isUnlockingDownload, setIsUnlockingDownload] = useState(false)
  const [downloadTask, setDownloadTask] = useState({
    active: false,
    finished: false,
    progress: 0,
    statusText: '',
    errorText: '',
  })
  const languageMenuRef = useRef(null)
  const communityChatLogRef = useRef(null)
  const communityChatInputRef = useRef(null)
  const communityChatShouldStickRef = useRef(true)
  const communityChatPendingCounterRef = useRef(0)
  const communityChatSendingRef = useRef(false)
  const communityChatMutationRef = useRef(0)
  const communityChatHistoryRequestRef = useRef(0)

  const dictionary = useMemo(() => translations[language] ?? translations.ar, [language])
  const portalDictionary = useMemo(() => portalContent[language] ?? portalContent.ar, [language])
  const communityChatDictionary = useMemo(() => communityChatContent[language] ?? communityChatContent.ar, [language])
  const siteRatingDictionary = useMemo(() => siteRatingContent[language] ?? siteRatingContent.ar, [language])
  const isRtl = RTL_LANGUAGES.has(language)

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  }, [language])

  useEffect(() => {
    function handlePointerDown(event) {
      const menuNode = languageMenuRef.current
      if (!menuNode || menuNode.contains(event.target)) {
        return
      }
      setLanguageMenuOpen(false)
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setLanguageMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    const title = SITE_NAME
    const description =
      language === 'ar'
        ? `${SITE_NAME} منصة تقنية لعرض الإشارات والتحليل والتحديثات التشغيلية في واجهة موحدة وواضحة.`
        : language === 'fr'
          ? `${SITE_NAME} est une plateforme technique qui présente signaux, analyse et mises à jour opérationnelles dans une interface unifiée.`
          : language === 'de'
            ? `${SITE_NAME} ist eine technische Plattform für Signale, Analyse und operative Updates in einer einheitlichen Oberfläche.`
            : `${SITE_NAME} is a technical platform for signals, analysis, and operational updates inside one unified interface.`
    document.title = title

    const setMeta = (selector, attribute, value) => {
      const element = document.querySelector(selector)
      if (element) {
        element.setAttribute(attribute, value)
      }
    }

    setMeta('meta[name="description"]', 'content', description)
    setMeta('meta[property="og:title"]', 'content', title)
    setMeta('meta[property="og:description"]', 'content', description)
    setMeta('meta[property="og:site_name"]', 'content', title)
    setMeta('meta[property="og:image"]', 'content', `${window.location.origin}/logo.svg`)
    setMeta('meta[name="twitter:title"]', 'content', title)
    setMeta('meta[name="twitter:description"]', 'content', description)
    setMeta('meta[name="twitter:image"]', 'content', `${window.location.origin}/logo.svg`)

    let structuredData = document.getElementById('ogt-structured-data')
    if (!structuredData) {
      structuredData = document.createElement('script')
      structuredData.type = 'application/ld+json'
      structuredData.id = 'ogt-structured-data'
      document.head.appendChild(structuredData)
    }
    structuredData.textContent = JSON.stringify([
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        alternateName: SITE_NAME,
        url: window.location.origin,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE_NAME,
        alternateName: SITE_NAME,
        url: window.location.origin,
        logo: `${window.location.origin}/logo.svg`,
      },
    ])
  }, [language])

  useEffect(() => {
    if (!cooldownRemaining) {
      return undefined
    }
    const timer = window.setTimeout(() => {
      setCooldownRemaining((current) => (current > 0 ? current - 1 : 0))
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [cooldownRemaining])

  useEffect(() => {
    let cancelled = false

    async function loadPublicSiteRating() {
      setPublicSiteRating((current) => ({
        ...current,
        loading: true,
        error: '',
      }))
      try {
        const response = await fetch(`${CENTRAL_API_BASE}/api/v2/public/site-rating`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok || payload?.status !== 'success') {
          throw new Error(payload?.message || 'public_site_rating_failed')
        }
        if (cancelled) {
          return
        }
        setPublicSiteRating(normalizePublicSiteRatingState(payload?.data || {}))
      } catch {
        if (!cancelled) {
          setPublicSiteRating((current) => ({
            ...current,
            loading: false,
          }))
        }
      }
    }

    void loadPublicSiteRating()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!auth) {
      setUserState({ ...initialUserState, loading: false })
      return undefined
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUserState({ ...initialUserState, loading: false })
        return
      }

      const profileRef = doc(db, 'users', firebaseUser.uid)
      const profileSnap = await getDoc(profileRef).catch(() => null)
      const profile = profileSnap?.exists() ? profileSnap.data() : {}
      const displayName = firebaseUser.displayName || profile?.name || ''
      const parsedName = splitFullName(displayName)

      const normalizedPhone = splitStoredPhoneValue(profile?.phone)
      setForm((current) => ({
        ...current,
        firstName: parsedName.firstName || current.firstName,
        lastName: parsedName.lastName || current.lastName,
        phoneCountry: normalizedPhone.phoneCountry || current.phoneCountry,
        phoneNumber: normalizedPhone.phoneNumber || current.phoneNumber,
        email: firebaseUser.email || current.email,
      }))

      setUserState({
        loading: false,
        verified: Boolean(firebaseUser.emailVerified),
        uid: String(firebaseUser.uid || '').trim(),
        name: displayName,
        email: firebaseUser.email || '',
      })
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    communityChatSendingRef.current = false
    communityChatShouldStickRef.current = true
    communityChatMutationRef.current += 1
    setCommunityChat(buildInitialCommunityChatState())
    setSiteRating(buildInitialSiteRatingState())
    setCommunityChatOpen(false)
  }, [userState.uid, userState.verified])

  useEffect(() => {
    if (portalView === 'account') {
      return undefined
    }
    setCommunityChatOpen(false)
    return undefined
  }, [portalView])

  useEffect(() => {
    if (!communityChatOpen) {
      document.body.style.removeProperty('overflow')
      document.documentElement.style.removeProperty('overflow')
      return undefined
    }
    const isMobile = window.matchMedia('(max-width: 720px)').matches
    if (!isMobile) {
      document.body.style.removeProperty('overflow')
      document.documentElement.style.removeProperty('overflow')
      return undefined
    }
    const previousOverflow = document.body.style.overflow
    const previousDocumentOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
      document.documentElement.style.overflow = previousDocumentOverflow
    }
  }, [communityChatOpen])

  useEffect(() => {
    syncCommunityChatInputHeight(communityChatInputRef.current)
  }, [communityChat.draft, communityChatOpen, portalView])

  useEffect(() => {
    if (!userState.verified) {
      setAccountSummary(initialAccountSummaryState)
      setSiteRating(buildInitialSiteRatingState())
      return
    }

    let cancelled = false

    async function loadManifest() {
      try {
        const release = await fetchProtectedDownloadRelease()
        if (cancelled) {
          return
        }
        setPromoRelease({
          version: release?.version || '',
          releaseDate: release?.releaseDate || '',
          installerUrl: release?.installerUrl || '',
        })
      } catch {
        if (!cancelled) {
          setPromoRelease({ version: '', releaseDate: '', installerUrl: '' })
        }
      }
    }

    async function loadAccountSummary() {
      setAccountSummary({ loading: true, error: '', data: null })
      try {
        const currentUser = auth?.currentUser
        if (!currentUser) {
          throw new Error('missing_current_user')
        }
        const idToken = await currentUser.getIdToken()
        const response = await fetch(`${CENTRAL_API_BASE}/api/v2/web/account-summary`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({}),
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok || payload?.status !== 'success') {
          throw new Error(payload?.message || 'account_summary_failed')
        }
        if (!cancelled) {
          setAccountSummary({ loading: false, error: '', data: payload.summary || null })
        }
      } catch (error) {
        if (!cancelled) {
          setAccountSummary({ loading: false, error: error?.message || 'account_summary_failed', data: null })
        }
      }
    }

    loadManifest()
    loadAccountSummary()
    return () => {
      cancelled = true
    }
  }, [userState.verified, userState.uid])

  useEffect(() => {
    if (!userState.verified) {
      setSiteRating(buildInitialSiteRatingState())
      return undefined
    }

    let cancelled = false
    setSiteRating((current) => ({
      ...current,
      loading: true,
      error: '',
    }))

    async function loadSiteRatingState() {
      try {
        const payload = await callCentralWebApi('/api/v2/web/site-rating/state', {})
        if (cancelled) {
          return
        }
        const snapshot = payload?.data || {}
        setSiteRating(normalizeSiteRatingState(snapshot))
        setPublicSiteRating(normalizePublicSiteRatingState(snapshot))
      } catch (error) {
        if (!cancelled) {
          setSiteRating((current) => ({
            ...current,
            loading: false,
            error: buildSiteRatingErrorMessage(error, siteRatingDictionary, 'load'),
          }))
        }
      }
    }

    void loadSiteRatingState()
    return () => {
      cancelled = true
    }
  }, [userState.verified, userState.uid, siteRatingDictionary])

  useEffect(() => {
    if (!userState.verified || portalView !== 'account' || !communityChatOpen) {
      return undefined
    }

    let cancelled = false

    async function loadCommunityChatHistory(silent = false) {
      if (communityChatSendingRef.current) {
        return
      }
      const mutationToken = communityChatMutationRef.current
      const requestId = communityChatHistoryRequestRef.current + 1
      communityChatHistoryRequestRef.current = requestId
      if (!silent) {
        setCommunityChat((current) => ({
          ...current,
          loading: true,
        }))
      }
      try {
        const payload = await callCentralWebApi('/api/v2/web/community-chat/history', {})
        if (cancelled) {
          return
        }
        if (
          communityChatSendingRef.current ||
          mutationToken !== communityChatMutationRef.current ||
          requestId !== communityChatHistoryRequestRef.current
        ) {
          return
        }
        const snapshot = payload?.data || {}
        const nextItems = normalizeCommunityChatItems(snapshot.items)
        setCommunityChat((current) => ({
          ...current,
          loading: false,
          ready: true,
          error: '',
          items: nextItems,
          identity: snapshot.identity || current.identity,
        }))
      } catch (error) {
        if (cancelled) {
          return
        }
        if (mutationToken !== communityChatMutationRef.current || requestId !== communityChatHistoryRequestRef.current) {
          return
        }
        setCommunityChat((current) => {
          const normalizedMessage = String(error?.message || error || '').trim()
          const blocked = normalizedMessage === 'web_chat_not_allowed_for_account'
          return {
            ...current,
            loading: false,
            ready: blocked ? false : current.ready,
            error: buildCommunityChatErrorMessage(error, communityChatDictionary, 'load'),
            items: blocked ? [] : current.items,
            identity: blocked ? null : current.identity,
            draft: blocked ? '' : current.draft,
          }
        })
      }
    }

    void loadCommunityChatHistory(false)
    const intervalId = window.setInterval(() => {
      void loadCommunityChatHistory(true)
    }, 3000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [portalView, userState.verified, userState.uid, communityChatDictionary, communityChatOpen])

  useEffect(() => {
    const logNode = communityChatLogRef.current
    if (!logNode || !communityChatShouldStickRef.current) {
      return
    }
    logNode.scrollTop = logNode.scrollHeight
  }, [communityChat.items])

  function showNotice(message, tone = 'neutral') {
    setNotice(message)
    setNoticeTone(tone)
  }

  function handleCommunityChatLogScroll(event) {
    const logNode = event.currentTarget
    const distanceFromBottom = logNode.scrollHeight - logNode.scrollTop - logNode.clientHeight
    communityChatShouldStickRef.current = distanceFromBottom < 72
  }

  function handleCommunityChatDraftChange(event) {
    const nextValue = event.target.value
    syncCommunityChatInputHeight(event.target)
    setCommunityChat((current) => ({
      ...current,
      draft: nextValue,
      error: '',
    }))
  }

  async function handleCommunityChatSend() {
    const messageBody = String(communityChat.draft || '').trim()
    if (!messageBody || communityChat.sending || communityChatSendingRef.current || !userState.verified) {
      return
    }

    const optimisticId = `community-pending-${Date.now()}-${communityChatPendingCounterRef.current + 1}`
    communityChatPendingCounterRef.current += 1
    communityChatSendingRef.current = true
    communityChatMutationRef.current += 1
    communityChatShouldStickRef.current = true

    const optimisticIdentity = communityChat.identity || {
      account_id: auth?.currentUser?.uid || '',
      display_name: userState.name || userState.email || communityChatDictionary.you,
    }
    const optimisticItem = {
      id: optimisticId,
      chat_kind: 'community',
      room_key: 'global',
      sender_kind: 'user',
      sender_id: optimisticIdentity.display_name || userState.name || userState.email || communityChatDictionary.you,
      account_id: optimisticIdentity.account_id || auth?.currentUser?.uid || '',
      body: messageBody,
      created_at: new Date().toISOString(),
      pending: true,
    }

    setCommunityChat((current) => ({
      ...current,
      sending: true,
      error: '',
      draft: '',
      ready: true,
      identity: current.identity || optimisticIdentity,
      items: [...current.items, optimisticItem],
    }))

    try {
      const payload = await callCentralWebApi('/api/v2/web/community-chat/send', { message: messageBody })
      const result = payload?.data || {}
      const confirmedItem = normalizeCommunityChatItems([result.item])[0] || optimisticItem
      setCommunityChat((current) => {
        const hasPendingItem = current.items.some((item) => item.id === optimisticId)
        return {
          ...current,
          sending: false,
          error: '',
          ready: true,
          identity: result.identity || current.identity,
          items: hasPendingItem
            ? current.items.map((item) => (item.id === optimisticId ? confirmedItem : item))
            : [...current.items, confirmedItem],
        }
      })
    } catch (error) {
      setCommunityChat((current) => {
        const normalizedMessage = String(error?.message || error || '').trim()
        const blocked = normalizedMessage === 'web_chat_not_allowed_for_account'
        return {
          ...current,
          sending: false,
          ready: blocked ? false : current.ready,
          error: buildCommunityChatErrorMessage(error, communityChatDictionary, 'send'),
          draft: blocked ? '' : (current.draft || messageBody),
          items: current.items.filter((item) => item.id !== optimisticId),
          identity: blocked ? null : current.identity,
        }
      })
    } finally {
      communityChatSendingRef.current = false
    }
  }

  function handleCommunityChatKeyDown(event) {
    if (event.key !== 'Enter' || event.shiftKey) {
      return
    }
    if (event.nativeEvent?.isComposing) {
      return
    }
    event.preventDefault()
    if (communityChat.sending || communityChatSendingRef.current) {
      return
    }
    void handleCommunityChatSend()
  }

  async function handleSiteRatingSelect(ratingValue) {
    const nextRating = Number(ratingValue || 0)
    if (!Number.isInteger(nextRating) || nextRating < 1 || nextRating > 5) {
      return
    }
    if (
      siteRating.submitting ||
      siteRating.loading ||
      !siteRating.canRate ||
      !userState.verified ||
      siteRating.ratingLocked ||
      Boolean(siteRating.userRating)
    ) {
      return
    }
    setSiteRating((current) => ({
      ...current,
      error: '',
      success: '',
      pendingValue: nextRating,
    }))
  }

  async function handleSiteRatingSubmit() {
    const nextRating = Number(siteRating.pendingValue || 0)
    if (
      siteRating.submitting ||
      siteRating.loading ||
      !siteRating.canRate ||
      !userState.verified ||
      siteRating.ratingLocked ||
      Boolean(siteRating.userRating)
    ) {
      return
    }
    if (!Number.isInteger(nextRating) || nextRating < 1 || nextRating > 5) {
      setSiteRating((current) => ({
        ...current,
        error: siteRatingDictionary.chooseFirst,
        success: '',
      }))
      return
    }
    setSiteRating((current) => ({
      ...current,
      submitting: true,
      error: '',
      success: '',
    }))
    try {
      const payload = await callCentralWebApi('/api/v2/web/site-rating/submit', { rating: nextRating })
      const snapshot = payload?.data || {}
      setSiteRating({
        ...normalizeSiteRatingState(snapshot),
        success: buildSiteRatingSuccessMessage(nextRating, siteRatingDictionary),
      })
      setPublicSiteRating(normalizePublicSiteRatingState(snapshot))
    } catch (error) {
      setSiteRating((current) => ({
        ...current,
        submitting: false,
        error: buildSiteRatingErrorMessage(error, siteRatingDictionary, 'submit'),
        success: '',
        pendingValue: 0,
      }))
    }
  }

  function buildPhoneValue() {
    const country = PHONE_COUNTRY_BY_ISO2.get(String(form.phoneCountry || '').trim()) || PHONE_COUNTRY_BY_ISO2.get(DEFAULT_PHONE_ISO2)
    const code = country?.code || '+966'
    const number = String(form.phoneNumber || '').replace(/\D/g, '').trim()
    return `${code}${number}`
  }

  async function sendVerificationCode(user) {
    if (!user?.email) {
      throw new Error(dictionary.auth.noCurrentUser)
    }
    const idToken = await user.getIdToken()
    await callOtpApi('/api/send-email-otp', {
      source: 'website_registration',
      email: user.email,
    }, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!hasFirebaseConfig || !auth || !db) {
      showNotice(dictionary.auth.firebaseDisabled, 'error')
      return
    }

    setIsSubmitting(true)
    setNotice(null)

    try {
      if (authMode === 'register') {
        const fullName = buildFullName(form)
        if (!isValidEnglishName(form.firstName) || !isValidEnglishName(form.lastName)) {
          showNotice(dictionary.auth.nameInvalid, 'warning')
          return
        }
        const phone = buildPhoneValue()
        const credential = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password)
        const user = credential.user
        await updateProfile(user, { displayName: fullName })
        await setDoc(
          doc(db, 'users', user.uid),
          {
            name: fullName,
            phone,
            email: form.email.trim(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        )
        await sendVerificationCode(user)
        setCooldownRemaining(60)
        showNotice(dictionary.auth.verifyPrompt, 'success')
      } else {
        await signInWithEmailAndPassword(auth, form.email.trim(), form.password)
        showNotice(dictionary.auth.loginSuccess, 'success')
      }
    } catch (error) {
      showNotice(getAuthErrorMessage(error, dictionary), 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResendCode() {
    if (!auth?.currentUser || cooldownRemaining > 0) {
      return
    }
    setIsSendingCode(true)
    try {
      await sendVerificationCode(auth.currentUser)
      setCooldownRemaining(60)
      showNotice(dictionary.auth.verifyPrompt, 'success')
    } catch (error) {
      showNotice(error.message || dictionary.errors.requestFallback, 'error')
    } finally {
      setIsSendingCode(false)
    }
  }

  async function handleForgotPassword() {
    const email = String(form.email || '').trim()
    if (!email) {
      showNotice(dictionary.auth.forgotPasswordEmailRequired, 'warning')
      return
    }
    setIsSendingPasswordReset(true)
    try {
      await callOtpApi('/api/send-password-reset-email', { email })
      showNotice(formatText(dictionary.auth.forgotPasswordSent, { email }), 'success')
    } catch (error) {
      showNotice(getAuthErrorMessage(error, dictionary), 'error')
    } finally {
      setIsSendingPasswordReset(false)
    }
  }

  async function handleVerifyCode() {
    const code = verificationCode.trim()
    if (!/^\d{6}$/.test(code)) {
      showNotice(dictionary.auth.codeInvalid, 'warning')
      return
    }
    if (!auth?.currentUser) {
      showNotice(dictionary.auth.noCurrentUser, 'error')
      return
    }

    setIsVerifyingCode(true)
    try {
      const idToken = await auth.currentUser.getIdToken()
      await callOtpApi('/api/verify-email-otp', {
        email: auth.currentUser.email,
        code,
      }, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })
      await auth.currentUser.reload()
      setUserState((current) => ({ ...current, verified: true }))
      showNotice(dictionary.auth.verifiedSuccess, 'success')
    } catch (error) {
      showNotice(error.message || dictionary.errors.requestFallback, 'error')
    } finally {
      setIsVerifyingCode(false)
    }
  }

  async function handleLogout() {
    if (!auth) {
      return
    }
    await signOut(auth)
    setForm(initialForm)
    setVerificationCode('')
    setNotice(null)
    setAuthMode('register')
    setAccountSummary(initialAccountSummaryState)
    setSiteRating(buildInitialSiteRatingState())
    setPromoRelease({ version: '', releaseDate: '', installerUrl: '' })
    setDownloadGateOpen(false)
    setDownloadAccessError('')
    setPortalView('overview')
    setCommunityChatOpen(false)
  }

  function openDownloadGate() {
    setDownloadGateOpen(true)
    setDownloadAccessError('')
    if (!downloadTask.active && !downloadTask.finished) {
      setDownloadStatusText('')
      setDownloadProgressPercent(0)
      setDownloadFinished(false)
    }
  }

  function closeDownloadGate() {
    setDownloadGateOpen(false)
    setDownloadAccessError('')
  }

  async function fetchProtectedDownloadRelease() {
    const currentUser = auth?.currentUser
    if (!currentUser) {
      throw new Error('missing_current_user')
    }

    const idToken = await currentUser.getIdToken()
    const response = await fetch('/api/download-app', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      cache: 'no-store',
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || payload?.success !== true) {
      throw new Error(payload?.error || dictionary.downloadGate.notReady)
    }

    return payload?.release || {}
  }

  async function startDirectDownload(fileUrl, suggestedFileName) {
    setDownloadStatusText(dictionary.downloadGate.directDownloading)
    setDownloadProgressPercent(100)
    setDownloadTask({
      active: false,
      finished: true,
      progress: 100,
      statusText: dictionary.downloadGate.started,
      errorText: '',
    })
    startBrowserDownload(fileUrl, suggestedFileName)
    setDownloadStatusText(dictionary.downloadGate.started)
    setDownloadFinished(true)
    showNotice(dictionary.downloadGate.backgroundDone, 'success')
  }

  async function startDownloadFromManifest(manifestUrl) {
    setDownloadStatusText(dictionary.downloadGate.manifestLoading)
    setDownloadProgressPercent(8)
    setDownloadTask({
      active: true,
      finished: false,
      progress: 8,
      statusText: dictionary.downloadGate.manifestLoading,
      errorText: '',
    })
    const response = await fetch(manifestUrl, { cache: 'no-store' })
    if (!response.ok) {
      throw new Error(dictionary.downloadGate.manifestError)
    }
    const manifest = await response.json()

    if (manifest?.url) {
      await startDirectDownload(manifest.url, manifest?.file_name || DOWNLOAD_FILE_NAME)
      return
    }

    if (Array.isArray(manifest?.chunks) && manifest.chunks.length > 0) {
      const buffers = []
      const totalBytes =
        manifest.chunks.reduce((sum, chunk) => sum + (Number(typeof chunk === 'object' ? chunk?.size : 0) || 0), 0) ||
        0
      let downloadedBytes = 0
      for (const [index, chunk] of manifest.chunks.entries()) {
        setDownloadStatusText(
          formatText(dictionary.downloadGate.downloading, {
            current: index + 1,
            total: manifest.chunks.length,
          }),
        )
        const chunkPath = typeof chunk === 'string' ? chunk : chunk?.path || chunk?.url
        if (!chunkPath) {
          throw new Error(dictionary.downloadGate.incomplete)
        }
        const chunkResponse = await fetch(chunkPath, { cache: 'no-store' })
        if (!chunkResponse.ok) {
          throw new Error(dictionary.downloadGate.chunkError)
        }
        const buffer = await chunkResponse.arrayBuffer()
        buffers.push(buffer)
        downloadedBytes += Number(buffer.byteLength || 0)
        if (totalBytes > 0) {
          const ratio = downloadedBytes / totalBytes
          const nextProgress = Math.min(92, Math.max(12, Math.round(ratio * 100)))
          setDownloadProgressPercent(nextProgress)
          setDownloadTask((current) => ({
            ...current,
            active: true,
            finished: false,
            progress: nextProgress,
            statusText: formatText(dictionary.downloadGate.downloading, {
              current: index + 1,
              total: manifest.chunks.length,
            }),
            errorText: '',
          }))
        } else {
          const nextProgress = Math.min(92, Math.round(((index + 1) / manifest.chunks.length) * 100))
          setDownloadProgressPercent(nextProgress)
          setDownloadTask((current) => ({
            ...current,
            active: true,
            finished: false,
            progress: nextProgress,
            statusText: formatText(dictionary.downloadGate.downloading, {
              current: index + 1,
              total: manifest.chunks.length,
            }),
            errorText: '',
          }))
        }
      }

      setDownloadStatusText(dictionary.downloadGate.preparing)
      setDownloadProgressPercent(96)
      setDownloadTask((current) => ({
        ...current,
        active: true,
        finished: false,
        progress: 96,
        statusText: dictionary.downloadGate.preparing,
        errorText: '',
      }))
      const blob = new Blob(buffers, { type: manifest?.content_type || 'application/octet-stream' })
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = manifest?.file_name || DOWNLOAD_FILE_NAME
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => window.URL.revokeObjectURL(url), 5000)
      setDownloadStatusText(dictionary.downloadGate.started)
      setDownloadProgressPercent(100)
      setDownloadFinished(true)
      setDownloadTask({
        active: false,
        finished: true,
        progress: 100,
        statusText: dictionary.downloadGate.started,
        errorText: '',
      })
      showNotice(dictionary.downloadGate.backgroundDone, 'success')
      return
    }

    throw new Error(dictionary.downloadGate.incomplete)
  }

  async function handleDownloadSubmit(event) {
    event.preventDefault()

    setIsUnlockingDownload(true)
    setDownloadAccessError('')
    setDownloadStatusText(dictionary.downloadGate.loading)
    setDownloadProgressPercent(4)
    setDownloadFinished(false)
    setDownloadTask({
      active: true,
      finished: false,
      progress: 4,
      statusText: dictionary.downloadGate.loading,
      errorText: '',
    })

    try {
      const release = promoRelease.installerUrl ? promoRelease : await fetchProtectedDownloadRelease()
      if (!promoRelease.installerUrl) {
        setPromoRelease({
          version: release?.version || '',
          releaseDate: release?.releaseDate || '',
          installerUrl: release?.installerUrl || '',
        })
      }
      const installerUrl = String(release?.installerUrl || '').trim()

      if (!installerUrl) {
        throw new Error(dictionary.downloadGate.notReady)
      }

      if (installerUrl.endsWith('.json')) {
        await startDownloadFromManifest(installerUrl)
      } else {
        await startDirectDownload(installerUrl, extractFileName(installerUrl))
      }
    } catch (error) {
      setDownloadAccessError(error.message || dictionary.downloadGate.startError)
      setDownloadStatusText('')
      setDownloadProgressPercent(0)
      setDownloadFinished(false)
      setDownloadTask({
        active: false,
        finished: false,
        progress: 0,
        statusText: '',
        errorText: error.message || dictionary.downloadGate.startError,
      })
    } finally {
      setIsUnlockingDownload(false)
    }
  }

  const welcomeName = userState.name || userState.email || dictionary.brand
  const releaseDateLabel = promoRelease.releaseDate
    ? formatText(dictionary.promo.releaseDate, { date: promoRelease.releaseDate })
    : dictionary.promo.releaseDateLoading

  function syncCommunityChatInputHeight(inputNode) {
    if (!inputNode || typeof window === 'undefined') {
      return
    }
    const minimumHeight = 48
    const maximumHeight = window.matchMedia('(max-width: 720px)').matches ? 140 : 180
    inputNode.style.height = 'auto'
    const nextHeight = Math.min(maximumHeight, Math.max(minimumHeight, inputNode.scrollHeight))
    inputNode.style.height = `${nextHeight}px`
    inputNode.style.overflowY = inputNode.scrollHeight > maximumHeight ? 'auto' : 'hidden'
  }

  const accountStatusLabel = userState.verified ? portalDictionary.verifiedLabel : portalDictionary.pendingLabel
  const summary = accountSummary.data || {}
  const summaryUser = summary.user || {}
  const summaryAccount = summary.account || {}
  const summaryDevice = summary.device || {}
  const summaryGrowth = summary.growth || {}
  const summaryActivity = summary.activity || {}
  const summaryTelegram = summary.telegram || {}
  const fieldLabels = portalDictionary.fields
  const valueLabels = portalDictionary.values
  const unavailableLabel = valueLabels.unavailable
  const notLinkedYetLabel = valueLabels.notLinkedYet || unavailableLabel
  const appLinked = Boolean(summaryDevice.device_name || summaryDevice.laptop_id || summaryAccount.client_code || summaryAccount.app_version)
  const accountIdentityStatus = normalizeStatusValue(summaryUser.status, valueLabels, accountStatusLabel)
  const sessionLabel = formatDisplayValue(
    normalizeStatusValue(summaryDevice.session_status, valueLabels, ''),
    summaryAccount.is_connected ? valueLabels.connected : valueLabels.offline,
  )
  const approvalLabel = summaryAccount.is_approved ? valueLabels.approved : valueLabels.pending
  const restrictionLabel = summaryAccount.is_restricted ? valueLabels.restricted : valueLabels.open
  const telegramLabel = summaryTelegram.telegram_status
    ? formatDisplayValue(normalizeStatusValue(summaryTelegram.telegram_status, valueLabels, ''), unavailableLabel)
    : summaryTelegram.telegram_username || summaryTelegram.telegram_chat_id
      ? valueLabels.linked
      : valueLabels.notLinked
  const latestNoticeLabel = summaryActivity.latest_notification_title
    ? formatDisplayValue(summaryActivity.latest_notification_title, unavailableLabel)
    : unavailableLabel
  const latestTradeLabel =
    summaryActivity.latest_trade_symbol || summaryActivity.latest_trade_status
      ? [summaryActivity.latest_trade_symbol, summaryActivity.latest_trade_status].filter(Boolean).join(' / ')
      : unavailableLabel
  const accountCards = [
    {
      title: portalDictionary.accountCards[0].title,
      lines: [
        `${fieldLabels.name}: ${formatDisplayValue(summaryUser.display_name || userState.name, dictionary.brand)}`,
        `${fieldLabels.email}: ${formatDisplayValue(summaryUser.email || userState.email, unavailableLabel)}`,
        `${fieldLabels.status}: ${accountIdentityStatus}`,
      ],
    },
    {
      title: portalDictionary.accountCards[1].title,
      lines: [
        `${fieldLabels.device}: ${formatDisplayValue(summaryDevice.device_name, notLinkedYetLabel)}`,
        `${fieldLabels.clientCode}: ${formatDisplayValue(summaryDevice.laptop_id || summaryAccount.client_code, notLinkedYetLabel)}`,
        `${fieldLabels.version}: ${formatDisplayValue(summaryAccount.app_version, notLinkedYetLabel)}`,
        `${fieldLabels.session}: ${sessionLabel}`,
        `${fieldLabels.lastSeen}: ${formatDisplayValue(summaryDevice.last_seen_at || summaryAccount.last_seen_at, appLinked ? unavailableLabel : notLinkedYetLabel)}`,
      ],
    },
    {
      title: portalDictionary.accountCards[2].title,
      lines: [
        `${fieldLabels.plan}: ${formatDisplayValue(summaryAccount.subscription_plan_id, unavailableLabel)}`,
        `${fieldLabels.subscription}: ${formatDisplayValue(summaryAccount.subscription_status, unavailableLabel)}`,
        `${fieldLabels.brokerMode}: ${formatDisplayValue(summaryAccount.allowed_broker_mode, unavailableLabel)}`,
        `${fieldLabels.approval}: ${approvalLabel}`,
        `${fieldLabels.restriction}: ${restrictionLabel}`,
      ],
    },
    {
      title: portalDictionary.accountCards[3].title,
      lines: [
        `${fieldLabels.events}: ${summaryActivity.runtime_event_count ?? 0}`,
        `${fieldLabels.growth}: ${summaryGrowth.growth_percent ?? 0}%`,
        `${fieldLabels.latestNotice}: ${latestNoticeLabel}`,
        `${fieldLabels.latestTrade}: ${latestTradeLabel}`,
        `${fieldLabels.telegram}: ${telegramLabel}`,
      ],
    },
  ]
  const communityChatCanSend = Boolean(String(communityChat.draft || '').trim()) && !communityChat.sending
  const publicSiteRatingDisplayValue = publicSiteRating.totalRatings ? publicSiteRating.averageRating : 0
  const publicSiteRatingFillPercent = `${Math.max(0, Math.min(100, (publicSiteRatingDisplayValue / Math.max(1, publicSiteRating.maximumRating || 5)) * 100))}%`
  const currentLanguageFlagCode = LANGUAGE_FLAG_MAP[language] || 'generic'
  const siteRatingDisplayValue = Math.max(
    0,
    Math.min(
      5,
      Number(
        userState.verified
          ? (siteRating.pendingValue || siteRating.userRating || 0)
          : publicSiteRatingDisplayValue,
      ) || 0,
    ),
  )
  const siteRatingLocked = userState.verified && (siteRating.ratingLocked || Boolean(siteRating.userRating))
  const siteRatingPickerDisabled = siteRating.loading || siteRating.submitting || !siteRating.canRate || siteRatingLocked
  const siteRatingSubmitDisabled =
    siteRatingPickerDisabled || !Number.isInteger(Number(siteRating.pendingValue || 0)) || Number(siteRating.pendingValue || 0) < 1
  const isCommunityChatView = communityChatOpen && portalView === 'account'
  return (
    <main
      className={`landing-page ${isRtl ? 'rtl' : 'ltr'}${isCommunityChatView ? ' landing-page--community-chat-open' : ''}`}
      dir={isRtl ? 'rtl' : 'ltr'}
      lang={language}
    >
      <span className="page-glow page-glow--left" />
      <span className="page-glow page-glow--right" />

      <div className="page-topbar content-shell">
        <div className="page-topbar-side page-topbar-side--left">
          <div className="public-rating-corner" aria-label={siteRatingDictionary.title}>
            {userState.verified ? (
              <div className="public-rating-auth-shell">
                <div className="public-rating-actions" role="group" aria-label={siteRatingDictionary.prompt}>
                  <div className="public-rating-picker">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`public-rating-star ${value <= siteRatingDisplayValue ? 'is-active' : ''}`}
                        onClick={() => {
                          void handleSiteRatingSelect(value)
                        }}
                        disabled={siteRatingPickerDisabled}
                        aria-label={`${value} / 5`}
                        title={siteRatingLocked ? `${siteRating.userRating || value} / 5` : `${value} / 5`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="public-rating-submit"
                    onClick={() => {
                      void handleSiteRatingSubmit()
                    }}
                    disabled={siteRatingSubmitDisabled}
                  >
                    {siteRating.submitting ? siteRatingDictionary.saving : siteRatingDictionary.submitButton}
                  </button>
                </div>
                {siteRating.success ? <p className="public-rating-feedback is-success">{siteRating.success}</p> : null}
                {siteRating.error ? <p className="public-rating-feedback is-error">{siteRating.error}</p> : null}
              </div>
            ) : (
              <span className="public-rating-stars" aria-hidden="true">
                <span className="portal-rating-stars-base">★★★★★</span>
                <span className="portal-rating-stars-fill" style={{ width: publicSiteRatingFillPercent }}>
                  ★★★★★
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="page-topbar-side page-topbar-side--right">
          <div ref={languageMenuRef} className="language-menu">
            <button
              type="button"
              className="language-menu-button"
              aria-label="Language"
              aria-expanded={languageMenuOpen ? 'true' : 'false'}
              onClick={() => setLanguageMenuOpen((current) => !current)}
            >
              <LanguageFlag code={currentLanguageFlagCode} />
            </button>
            {languageMenuOpen ? (
              <div className="language-menu-panel">
                {Object.entries(translations).map(([code, item]) => (
                  <button
                    key={code}
                    type="button"
                    className={`language-menu-option ${code === language ? 'active' : ''}`}
                    onClick={() => {
                      setLanguage(code)
                      setLanguageMenuOpen(false)
                    }}
                  >
                    <LanguageFlag code={LANGUAGE_FLAG_MAP[code] || 'generic'} />
                    <span>{item.languageName}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <section className="hero-shell">
        <div className="image-card">
          <img src="/login-image2.png" alt={dictionary.brand} />
        </div>

        <div className="headline-block">
          <p className="eyebrow">{dictionary.brand}</p>
          <p className="hero-caption">{dictionary.heroCaption}</p>
          <div className="hero-story">
            <h1 className="hero-story-title">{dictionary.heroTitle}</h1>
            {dictionary.heroLines.map((line) => (
              <p key={line} className="hero-story-line">
                {line}
              </p>
            ))}
          </div>
          <div className="hero-badges" aria-label="Platform highlights">
            {dictionary.heroBadges?.map((badge) => (
              <span key={badge} className="hero-badge">
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section
        id="auth-card"
        className={`signup-shell${isCommunityChatView ? ' signup-shell--community-open' : ''}`}
      >
        {notice ? <div className={`notice notice--${noticeTone}`}>{notice}</div> : null}

        {userState.loading ? (
          <div className="verification-card">
            <h2>{dictionary.auth.accountLoading}</h2>
            <p>{dictionary.auth.accountLoadingText}</p>
          </div>
        ) : userState.verified ? (
          <div className="portal-shell">
            <div className="welcome-card portal-banner">
              <p>{formatText(dictionary.welcome.hello, { name: welcomeName })}</p>
              <strong>{dictionary.welcome.family}</strong>
            </div>

            <div className="portal-layout">
              <div className="portal-main">
                {portalView === 'overview' ? (
                  <div className="portal-section">
                    <div className="portal-heading">
                      <h2>{portalDictionary.introTitle}</h2>
                      <p>{portalDictionary.introLead}</p>
                    </div>
                    <div className="portal-cards">
                      {portalDictionary.introCards.map((card) => (
                        <article key={card.title} className="portal-card">
                          <h3>{card.title}</h3>
                          <p>{card.body}</p>
                        </article>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="portal-section">
                    {communityChatOpen ? (
                      <div className="portal-community-section is-open">
                        <div className="portal-chat-head">
                          <div className="portal-chat-copy">
                            <h2>{communityChatDictionary.title}</h2>
                          </div>
                          <button
                            type="button"
                            className="portal-chat-back"
                            onClick={() => setCommunityChatOpen(false)}
                          >
                            {communityChatDictionary.back}
                          </button>
                        </div>

                        {communityChat.error ? (
                          <p className="portal-chat-alert">{communityChat.error}</p>
                        ) : null}

                        <div
                          ref={communityChatLogRef}
                          className="portal-chat-log"
                          onScroll={handleCommunityChatLogScroll}
                        >
                          {communityChat.items.length ? (
                            communityChat.items.map((item) => {
                              const ownMessage = isOwnCommunityChatMessage(item, communityChat.identity)
                              const senderLabel = resolveCommunityChatSender(item, communityChat.identity, communityChatDictionary)
                              const stampParts = [
                                formatChatTimestamp(item.created_at, language),
                                item.pending ? communityChatDictionary.pending : '',
                              ].filter(Boolean)
                                return (
                                  <article
                                    key={item.id}
                                    className={`portal-chat-message${ownMessage ? ' portal-chat-message--mine' : ''}${item.pending ? ' portal-chat-message--pending' : ''}`}
                                  >
                                    <div className="portal-chat-message-head">
                                      <div className="portal-chat-meta">
                                        <strong className="portal-chat-sender">{senderLabel}</strong>
                                        <span className="portal-chat-stamp">{stampParts.join(' / ')}</span>
                                      </div>
                                    </div>
                                    <p className="portal-chat-body">{item.body}</p>
                                  </article>
                                )
                              })
                          ) : (
                            <div className="portal-chat-empty">
                              <p>{communityChat.loading ? communityChatDictionary.statusLoading : communityChatDictionary.empty}</p>
                            </div>
                          )}
                        </div>

                        <div className="portal-chat-composer">
                          <div className="portal-chat-actions">
                            <textarea
                              ref={communityChatInputRef}
                              className="portal-chat-input"
                              value={communityChat.draft}
                              onChange={handleCommunityChatDraftChange}
                              onKeyDown={handleCommunityChatKeyDown}
                              placeholder={communityChatDictionary.placeholder}
                              rows={1}
                              disabled={communityChat.sending}
                            />
                            <button
                              type="button"
                              className="portal-chat-send"
                              onClick={() => {
                                void handleCommunityChatSend()
                              }}
                              disabled={!communityChatCanSend}
                              aria-label={communityChat.sending ? communityChatDictionary.sending : communityChatDictionary.send}
                              title={communityChat.sending ? communityChatDictionary.sending : communityChatDictionary.send}
                            >
                              <span aria-hidden="true">↑</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="portal-heading">
                          <h2>{portalDictionary.accountTitle}</h2>
                          <p>{portalDictionary.accountLead}</p>
                        </div>
                        <div className="portal-cards">
                          {accountSummary.loading ? (
                            <article className="portal-card">
                              <h3>{portalDictionary.accountTitle}</h3>
                              <p>{portalDictionary.summaryLoading}</p>
                            </article>
                          ) : null}
                          {accountSummary.error ? (
                            <article className="portal-card">
                              <h3>{portalDictionary.accountTitle}</h3>
                              <p>{portalDictionary.summaryError}</p>
                              <p>{portalDictionary.summaryPending}</p>
                            </article>
                          ) : null}
                          {accountCards.map((card) => (
                            <article key={card.title} className="portal-card">
                              <h3>{card.title}</h3>
                              <div className="portal-list">
                                {card.lines.map((line) => (
                                  <p key={line}>{line}</p>
                                ))}
                              </div>
                            </article>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <aside className="portal-side">
                <button
                  type="button"
                  className={`portal-nav-button ${portalView === 'account' ? 'active' : ''}`}
                  onClick={() => {
                    setPortalView('account')
                    setCommunityChatOpen(false)
                  }}
                >
                  {portalDictionary.nav.account}
                </button>
                <button
                  type="button"
                  className={`portal-nav-button ${portalView === 'account' && communityChatOpen ? 'active' : ''}`}
                  onClick={() => {
                    setPortalView('account')
                    setCommunityChatOpen(true)
                  }}
                >
                  {communityChatDictionary.navLabel}
                </button>
                <button type="button" className="promo-download-button" onClick={openDownloadGate}>
                  {portalDictionary.nav.download}
                </button>
                <button
                  type="button"
                  className={`portal-nav-button ${portalView === 'overview' ? 'active' : ''}`}
                  onClick={() => {
                    setCommunityChatOpen(false)
                    setPortalView('overview')
                  }}
                >
                  {portalDictionary.nav.overview}
                </button>
                <div className="portal-meta-card">
                  <span>{releaseDateLabel}</span>
                  <p>{dictionary.promo.copy}</p>
                </div>
                {(downloadTask.active || downloadTask.finished || downloadTask.errorText) ? (
                  <div className={`download-inline-card ${downloadTask.errorText ? 'is-error' : ''}`}>
                    <div className="download-inline-head">
                      <strong>{dictionary.downloadGate.backgroundTitle}</strong>
                      <span>{Math.max(0, Math.min(100, downloadTask.progress || 0))}%</span>
                    </div>
                    <div className="download-progress-track" aria-hidden="true">
                      <span className="download-progress-fill" style={{ width: `${Math.max(6, downloadTask.progress || 0)}%` }} />
                    </div>
                    <p className="download-inline-copy">
                      {downloadTask.errorText
                        ? downloadTask.errorText
                        : downloadTask.finished
                          ? dictionary.downloadGate.backgroundDone
                          : dictionary.downloadGate.backgroundRunning}
                    </p>
                    {downloadTask.statusText ? <p className="download-inline-status">{downloadTask.statusText}</p> : null}
                  </div>
                ) : null}
                <button type="button" className="secondary-button" onClick={handleLogout}>
                  {portalDictionary.nav.logout}
                </button>
              </aside>
            </div>
          </div>
        ) : auth?.currentUser ? (
          <div className="verification-card">
            <h2>{dictionary.auth.verifyTitle}</h2>
            <p>{dictionary.auth.verifyPrompt}</p>
            <p>
              {formatText(dictionary.auth.verifyDescription, {
                name: userState.name || buildFullName(form) || dictionary.brand,
                email: userState.email || form.email,
              })}
            </p>
            <input
              className="code-input"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={verificationCode}
              onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
            />
            <p>{dictionary.auth.verifyHint}</p>
            <div className="verification-actions">
              <button type="button" className="submit-button" onClick={handleVerifyCode} disabled={isVerifyingCode}>
                {isVerifyingCode ? dictionary.auth.verifyingButton : dictionary.auth.verifyButton}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={handleResendCode}
                disabled={isSendingCode || cooldownRemaining > 0}
              >
                {isSendingCode
                  ? dictionary.auth.sendingCode
                  : cooldownRemaining > 0
                    ? formatText(dictionary.auth.resendCooldown, { seconds: cooldownRemaining })
                    : dictionary.auth.resendButton}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="auth-layout">
              <div className="auth-panel">
                <div className="signup-copy">
                  <div className="auth-mode-switch">
                    <button
                      type="button"
                      className={`auth-mode-button ${authMode === 'register' ? 'active' : ''}`}
                      onClick={() => setAuthMode('register')}
                    >
                      {dictionary.authModes.register}
                    </button>
                    <button
                      type="button"
                      className={`auth-mode-button ${authMode === 'login' ? 'active' : ''}`}
                      onClick={() => setAuthMode('login')}
                    >
                      {dictionary.authModes.login}
                    </button>
                  </div>
                  <h2>{authMode === 'register' ? dictionary.auth.registerTitle : dictionary.auth.loginTitle}</h2>
                  <p>{authMode === 'register' ? dictionary.auth.registerSubtitle : dictionary.auth.loginSubtitle}</p>
                </div>

                <form className="signup-form" onSubmit={handleSubmit}>
                  {authMode === 'register' ? (
                    <>
                      <label>
                        <span>{dictionary.auth.firstName}</span>
                        <input
                          type="text"
                          value={form.firstName}
                          placeholder={dictionary.auth.firstNamePlaceholder}
                          autoComplete="given-name"
                          onChange={(event) =>
                            setForm((current) => ({ ...current, firstName: normalizeEnglishName(event.target.value) }))
                          }
                          required
                        />
                      </label>

                      <label>
                        <span>{dictionary.auth.lastName}</span>
                        <input
                          type="text"
                          value={form.lastName}
                          placeholder={dictionary.auth.lastNamePlaceholder}
                          autoComplete="family-name"
                          onChange={(event) =>
                            setForm((current) => ({ ...current, lastName: normalizeEnglishName(event.target.value) }))
                          }
                          required
                        />
                      </label>

                      <label className="phone-field">
                        <span>{dictionary.auth.phone}</span>
                        <div className="phone-field__row">
                          <select
                            className="phone-country-select"
                            value={form.phoneCountry}
                            onChange={(event) => setForm((current) => ({ ...current, phoneCountry: event.target.value }))}
                            aria-label={dictionary.auth.phoneCountry}
                          >
                            {PHONE_COUNTRY_OPTIONS.map((item) => (
                              <option key={`${item.iso2}-${item.dialCode}`} value={item.iso2}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                          <input
                            className="phone-number-input"
                            type="tel"
                            value={form.phoneNumber}
                            placeholder={dictionary.auth.phonePlaceholder}
                            inputMode="numeric"
                            autoComplete="tel-national"
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                phoneNumber: event.target.value.replace(/\D/g, ''),
                              }))
                            }
                            required
                          />
                        </div>
                      </label>
                    </>
                  ) : null}

                  <label>
                    <span>{dictionary.auth.email}</span>
                    <input
                      type="email"
                      value={form.email}
                      placeholder={dictionary.auth.emailPlaceholder}
                      onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                      required
                    />
                  </label>

                  <label>
                    <span>{dictionary.auth.password}</span>
                    <input
                      type="password"
                      value={form.password}
                      placeholder={dictionary.auth.passwordPlaceholder}
                      onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                      required
                    />
                  </label>

                  <button type="submit" className="submit-button" disabled={isSubmitting || !hasFirebaseConfig}>
                    {isSubmitting
                      ? authMode === 'register'
                        ? dictionary.auth.creatingAccount
                        : dictionary.auth.loggingIn
                      : authMode === 'register'
                        ? dictionary.auth.createAccount
                        : dictionary.auth.login}
                  </button>
                  {authMode === 'login' ? (
                    <div className="auth-inline-actions">
                      <button
                        type="button"
                        className="auth-text-button"
                        onClick={handleForgotPassword}
                        disabled={isSendingPasswordReset || isSubmitting}
                      >
                        {isSendingPasswordReset ? dictionary.auth.forgotPasswordSending : dictionary.auth.forgotPassword}
                      </button>
                    </div>
                  ) : null}
                </form>

                <section className="trust-seal" aria-label={dictionary.legal.sectionTitle}>
                  <div className="trust-seal__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" role="presentation" focusable="false">
                      <path d="M12 2.75 4.75 5.6v5.22c0 5.08 3.03 9.18 7.25 10.43 4.22-1.25 7.25-5.35 7.25-10.43V5.6L12 2.75Z" />
                      <path d="m9.2 12.25 1.94 1.94 3.72-4.08" />
                    </svg>
                  </div>
                  <div className="trust-seal__content">
                    <ul className="trust-seal__list">
                      {dictionary.trustSeal.items?.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </section>
              </div>

            </div>
          </>
        )}
      </section>
      {!userState.verified ? (
        <>
          <section className="content-shell info-section">
            <div className="section-heading">
              <h2>{dictionary.whySection.title}</h2>
              <p>{dictionary.whySection.lead}</p>
            </div>
            <div className="info-grid">
              {dictionary.whySection.cards.map((card) => (
                <article key={card.title} className="info-card">
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </article>
              ))}
            </div>
          </section>

        </>
      ) : null}

      <footer className="content-shell site-footer">
        <div className="section-heading">
          <h2>{dictionary.footer.title}</h2>
          <p>{dictionary.footer.note}</p>
        </div>
        <div className="footer-grid">
          <div className="footer-card">
            <span>{dictionary.footer.developedByLabel}</span>
            <strong>{dictionary.footer.developedBy}</strong>
          </div>
          <div className="footer-card">
            <span>{dictionary.footer.contactLabel}</span>
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </div>
          <div className="footer-card">
            <span>{dictionary.footer.legalLabel}</span>
            <button type="button" className="footer-link-button" onClick={() => setLegalModalOpen(true)}>
              {dictionary.legal.button}
            </button>
          </div>
        </div>
      </footer>
      {legalModalOpen ? (
        <div className="download-gate-overlay legal-modal-overlay" role="dialog" aria-modal="true">
          <div className="download-gate-card legal-modal-card">
            <div className="download-gate-head">
              <strong>{dictionary.legal.sectionTitle}</strong>
              <button type="button" className="download-gate-close" onClick={() => setLegalModalOpen(false)}>
                {dictionary.legal.close}
              </button>
            </div>
            <p className="download-gate-copy">{dictionary.legal.sectionLead}</p>
            <div className="legal-modal-sections">
              {dictionary.legal.sections.map((section) => (
                <article key={section.title} className="legal-modal-section">
                  <h3>{section.title}</h3>
                  <p>{section.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {downloadGateOpen ? (
        <div className="download-gate-overlay" role="dialog" aria-modal="true">
          <div className="download-gate-card">
            <div className="download-gate-head">
              <strong>{dictionary.downloadGate.title}</strong>
              <button type="button" className="download-gate-close" onClick={closeDownloadGate}>
                {dictionary.downloadGate.close}
              </button>
            </div>
            <p className="download-gate-copy">{dictionary.downloadGate.copy}</p>
            <p className="download-gate-hint">{dictionary.downloadGate.closeHint}</p>
            <form className="download-gate-form" onSubmit={handleDownloadSubmit}>
              {(downloadStatusText || isUnlockingDownload || downloadFinished) ? (
                <div className="download-progress-card">
                  <div className="download-progress-head">
                    <span>{downloadStatusText || dictionary.downloadGate.loading}</span>
                    <strong>{Math.max(0, Math.min(100, downloadProgressPercent))}%</strong>
                  </div>
                  <div
                    className={`download-progress-track ${isUnlockingDownload && downloadProgressPercent < 15 ? 'is-indeterminate' : ''}`}
                    aria-hidden="true"
                  >
                    <span className="download-progress-fill" style={{ width: `${Math.max(6, downloadProgressPercent)}%` }} />
                  </div>
                  {downloadFinished ? <p className="download-progress-hint">{dictionary.downloadGate.successHint}</p> : null}
                </div>
              ) : null}
              {downloadAccessError ? <div className="download-gate-error">{downloadAccessError}</div> : null}
              <button type="submit" className="promo-download-button" disabled={isUnlockingDownload}>
                {isUnlockingDownload ? dictionary.downloadGate.loading : dictionary.downloadGate.submit}
              </button>
              {downloadTask.active ? (
                <button type="button" className="secondary-button" onClick={closeDownloadGate}>
                  {dictionary.downloadGate.hideWhileDownloading}
                </button>
              ) : null}
              {downloadFinished ? (
                <button type="button" className="secondary-button" onClick={closeDownloadGate}>
                  {dictionary.downloadGate.done}
                </button>
              ) : null}
            </form>
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default App


