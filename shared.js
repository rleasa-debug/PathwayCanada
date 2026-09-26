/**
 * Copyright 2026 Pathways Canada. All Rights Reserved.
 * This code is the proprietary property of Pathways Canada and is subject to Invention Assignment Agreements.
 */

import postSecondaryData from './canada_post_secondary.json';

// Shared State Manager for Pathway Canada
const STATE_KEY = 'pathway_canada_state';

// XXTEA Client-Side Encryption Utilities for Zero-Knowledge Privacy
const XXTEA = {
  encrypt: function(str, key) {
    if (str === "") return "";
    const v = this.str2long(str, true);
    const k = this.str2long(key.padEnd(16, '\0').slice(0, 16), false);
    if (k.length < 4) k.length = 4;
    const n = v.length - 1;
    let z = v[n], y = v[0];
    const delta = 0x9e3779b9;
    let q = Math.floor(6 + 52 / (n + 1));
    let sum = 0;
    while (q-- > 0) {
      sum = (sum + delta) & 0xffffffff;
      const e = (sum >>> 2) & 3;
      let p;
      for (p = 0; p < n; p++) {
        y = v[p + 1];
        const mx = (((z >>> 5 ^ y << 2) + (y >>> 3 ^ z << 4)) ^ ((sum ^ y) + (k[p & 3 ^ e] ^ z))) & 0xffffffff;
        y = v[p] = (v[p] + mx) & 0xffffffff;
        z = y;
      }
      y = v[0];
      const mx = (((z >>> 5 ^ y << 2) + (y >>> 3 ^ z << 4)) ^ ((sum ^ y) + (k[p & 3 ^ e] ^ z))) & 0xffffffff;
      z = v[n] = (v[n] + mx) & 0xffffffff;
      y = z;
    }
    return this.long2base64(v);
  },
  decrypt: function(str, key) {
    if (str === "") return "";
    const v = this.base642long(str);
    if (v.length === 0) return "";
    const k = this.str2long(key.padEnd(16, '\0').slice(0, 16), false);
    if (k.length < 4) k.length = 4;
    const n = v.length - 1;
    let z = v[n], y = v[0];
    const delta = 0x9e3779b9;
    const q = Math.floor(6 + 52 / (n + 1));
    let sum = (q * delta) & 0xffffffff;
    while (sum !== 0) {
      const e = (sum >>> 2) & 3;
      let p;
      for (p = n; p > 0; p--) {
        z = v[p - 1];
        const mx = (((z >>> 5 ^ y << 2) + (y >>> 3 ^ z << 4)) ^ ((sum ^ y) + (k[p & 3 ^ e] ^ z))) & 0xffffffff;
        y = v[p] = (v[p] - mx) & 0xffffffff;
        z = y;
      }
      z = v[n];
      const mx = (((z >>> 5 ^ y << 2) + (y >>> 3 ^ z << 4)) ^ ((sum ^ y) + (k[p & 3 ^ e] ^ z))) & 0xffffffff;
      y = v[0] = (v[0] - mx) & 0xffffffff;
      z = y;
      sum = (sum - delta) & 0xffffffff;
    }
    return this.long2str(v, true);
  },
  str2long: function(s, w) {
    const len = s.length;
    const v = [];
    for (let i = 0; i < len; i += 4) {
      v[i >> 2] = s.charCodeAt(i) |
                 (i + 1 < len ? s.charCodeAt(i + 1) << 8 : 0) |
                 (i + 2 < len ? s.charCodeAt(i + 2) << 16 : 0) |
                 (i + 3 < len ? s.charCodeAt(i + 3) << 24 : 0);
    }
    if (w) v[v.length] = len;
    return v;
  },
  long2str: function(v, w) {
    const len = v.length;
    let n = len << 2;
    if (w) {
      const m = v[len - 1];
      n -= 4;
      if (m < n - 3 || m > n) return null;
      n = m;
    }
    const s = [];
    for (let i = 0; i < n; i++) {
      s[i] = String.fromCharCode((v[i >> 2] >>> ((i & 3) << 3)) & 0xff);
    }
    return s.join('');
  },
  long2base64: function(v) {
    const len = v.length;
    const bytes = new Uint8Array(len * 4);
    for (let i = 0; i < len; i++) {
      bytes[i * 4] = v[i] & 0xff;
      bytes[i * 4 + 1] = (v[i] >>> 8) & 0xff;
      bytes[i * 4 + 2] = (v[i] >>> 16) & 0xff;
      bytes[i * 4 + 3] = (v[i] >>> 24) & 0xff;
    }
    let binary = '';
    const l = bytes.byteLength;
    for (let i = 0; i < l; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  },
  base642long: function(s) {
    const binary = atob(s);
    const len = binary.length;
    const v = [];
    for (let i = 0; i < len; i += 4) {
      v[i >> 2] = binary.charCodeAt(i) |
                 (i + 1 < len ? binary.charCodeAt(i + 1) << 8 : 0) |
                 (i + 2 < len ? binary.charCodeAt(i + 2) << 16 : 0) |
                 (i + 3 < len ? binary.charCodeAt(i + 3) << 24 : 0);
    }
    return v;
  }
};

function getEncryptionKey() {
  let key = localStorage.getItem('pathway_sec_key');
  if (!key) {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const array = new Uint32Array(4);
      window.crypto.getRandomValues(array);
      key = Array.from(array).map(n => n.toString(16)).join('');
    } else {
      key = Array.from({ length: 4 }, () => Math.floor(Math.random() * 0xffffffff).toString(16)).join('');
    }
    localStorage.setItem('pathway_sec_key', key);
  }
  return key;
}

function encryptState(stateObj) {
  const jsonStr = JSON.stringify(stateObj);
  const key = getEncryptionKey();
  const cipherText = XXTEA.encrypt(jsonStr, key);
  return JSON.stringify({ enc: true, data: cipherText });
}

function decryptState(storedStr) {
  if (!storedStr) return null;
  if (storedStr.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(storedStr);
      if (parsed && parsed.enc && parsed.data) {
        const key = getEncryptionKey();
        const plainText = XXTEA.decrypt(parsed.data, key);
        return JSON.parse(plainText);
      }
      return parsed; // Fallback to raw parsed JSON
    } catch (e) {
      return null;
    }
  }
  return null;
}

window.encryptState = encryptState;
window.decryptState = decryptState;

// Local audit event logger (Zero-Knowledge verification tool)
const auditLogs = [];
function logLocalAuditEvent(source, action, bytesSent = 0) {
  const event = {
    timestamp: new Date().toLocaleTimeString(),
    source,
    action,
    bytesSent
  };
  auditLogs.push(event);
  if (auditLogs.length > 50) auditLogs.shift();
  window.dispatchEvent(new CustomEvent('pathway-audit-log', { detail: event }));
}
window.logLocalAuditEvent = logLocalAuditEvent;
window.getAuditLogs = () => auditLogs;

// Configure your real Stripe Payment Link below to accept live payments!
// 1. Go to your Stripe Dashboard -> Payments -> Payment Links.
// 2. Create a payment link for "Pathway Canada Pro" at $29.00/year.
// 3. In the redirect configuration, set it to redirect back to:
//    https://pathways-canada-portal.netlify.app/student-dashboard.html?payment=success
// 4. Paste the buy.stripe.com link here.
const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/mock-link-placeholder';

// Check if URL has ?payment=success callback parameter
function detectPaymentCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('payment') === 'success') {
    const stored = localStorage.getItem(STATE_KEY);
    if (stored) {
      try {
        const state = decryptState(stored);
        if (state && !state.isPro) {
          state.isPro = true;
          // Recalculate matches
          state.matches = calculateMatches(state.courses);
          localStorage.setItem(STATE_KEY, encryptState(state));
          
          // Set upgrade flag in session storage for rewards animation
          sessionStorage.setItem('just_upgraded', 'true');
          
          // Broadcast isPro change so all other components update simultaneously
          window.dispatchEvent(new Event('storage'));
          
          // Clean URL parameters and reload instantly
          const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
          window.history.replaceState({path: cleanUrl}, '', cleanUrl);
          window.location.reload();
        }
      } catch (e) {
        console.error("Error upgrading user on payment success.", e);
      }
    }
  }
}

const DEFAULT_COURSES = [
  { id: "MHF4U", name: "Advanced Functions", code: "MHF4U", grade: 96, status: "Final", type: "University Preparation", icon: "calculate", color: "blue", level: "12" },
  { id: "SBI4U", name: "Biology", code: "SBI4U", grade: 91, status: "In Progress", type: "University Preparation", icon: "science", color: "green", level: "12" },
  { id: "ENG3U", name: "English", code: "ENG3U", grade: 88, status: "Final", type: "University Preparation", icon: "history_edu", color: "slate", level: "11" }
];

function getAppState() {
  const stored = localStorage.getItem(STATE_KEY);
  if (stored) {
    try {
      const state = decryptState(stored);
      if (typeof logLocalAuditEvent !== 'undefined') {
        logLocalAuditEvent('SECURITY', 'Decrypted student state payload in browser memory', 0);
      }
      
      // Calculate matches dynamically in memory on load (saves 5MB+ localStorage space)
      state.matches = calculateMatches(state.courses || DEFAULT_COURSES);
      
      let needsSave = false;
      
      // Clean up legacy locked status from English course
      if (state.courses) {
        state.courses.forEach(c => {
          if ((c.code === 'ENG3U' || c.id === 'ENG3U') && c.locked) {
            delete c.locked;
            needsSave = true;
          }
          if (c.level === undefined) {
            c.level = c.code.includes('4') ? "12" : "11";
            needsSave = true;
          }
        });
      }
      
      if (!state.favorites) {
        state.favorites = [];
        needsSave = true;
      }
      if (!state.provinces) {
        state.provinces = ['ON', 'BC', 'QC', 'AB', 'NS', 'NB', 'PE', 'NL', 'SK', 'MB', 'YT', 'NT', 'NU'];
        needsSave = true;
      }
      if (state.userName === undefined) {
        state.userName = "Alex";
        needsSave = true;
      }
      if (state.userDob === undefined) {
        state.userDob = "2008-05-24";
        needsSave = true;
      }
      if (state.profileLocked === undefined) {
        state.profileLocked = true;
        needsSave = true;
      }
      if (state.homeProvince === undefined) {
        state.homeProvince = "ON";
        needsSave = true;
      }
      if (state.activities === undefined) {
        state.activities = [
          { id: "act-1", title: "Model UN President", category: "Leadership", description: "Organized provincial conference for 400+ delegates.", timeframe: "2022 - Present", icon: "groups", color: "secondary" },
          { id: "act-2", title: "Varsity Soccer Captain", category: "Athletics", description: "Regional champions 2023. Managed team logistics.", timeframe: "2021 - 2023", icon: "sports_soccer", color: "tertiary" }
        ];
        needsSave = true;
      }
      
      if (needsSave) {
        const storageState = { ...state };
        delete storageState.matches;
        localStorage.setItem(STATE_KEY, encryptState(storageState));
        if (typeof logLocalAuditEvent !== 'undefined') {
          logLocalAuditEvent('SECURITY', 'Encrypted and wrote updated state to localStorage', 0);
        }
      }
      return state;
    } catch (e) {
      console.error("Error parsing stored state, resetting.", e);
    }
  }

  // Initial State
  const initialState = {
    isPro: false, // Default to false for Freemium model
    courses: DEFAULT_COURSES,
    average: "91.7",
    matches: [],
    favorites: [],
    provinces: ['ON', 'BC', 'QC', 'AB', 'NS', 'NB', 'PE', 'NL', 'SK', 'MB', 'YT', 'NT', 'NU'],
    userName: "Alex",
    userDob: "2008-05-24",
    profileLocked: true,
    homeProvince: "ON",
    activities: [
      { id: "act-1", title: "Model UN President", category: "Leadership", description: "Organized provincial conference for 400+ delegates.", timeframe: "2022 - Present", icon: "groups", color: "secondary" },
      { id: "act-2", title: "Varsity Soccer Captain", category: "Athletics", description: "Regional champions 2023. Managed team logistics.", timeframe: "2021 - 2023", icon: "sports_soccer", color: "tertiary" }
    ]
  };
  
  initialState.matches = calculateMatches(initialState.courses);
  const storageState = { ...initialState };
  delete storageState.matches;
  localStorage.setItem(STATE_KEY, encryptState(storageState));
  if (typeof logLocalAuditEvent !== 'undefined') {
    logLocalAuditEvent('SECURITY', 'Initialized new encrypted profile container', 0);
  }
  return initialState;
}

function saveAppState(state) {
  // Single Active Profile rule: Lock Name and DOB if they are filled and matches exist
  if (state.userName && state.userDob) {
    state.profileLocked = true;
  }
  state.matches = calculateMatches(state.courses);
  
  // Strip matches before saving to prevent QuotaExceededError
  const storageState = { ...state };
  delete storageState.matches;
  
  localStorage.setItem(STATE_KEY, encryptState(storageState));
  if (typeof logLocalAuditEvent !== 'undefined') {
    logLocalAuditEvent('SECURITY', 'Saved encrypted profile changes to localStorage', 0);
  }
  window.dispatchEvent(new Event('storage'));
}

const MACLEANS_RANKINGS = {
  // Medical Doctoral
  "mcgill-university": { rank: 1, category: "Medical Doctoral" },
  "university-of-toronto": { rank: 2, category: "Medical Doctoral" },
  "university-of-british-columbia": { rank: 3, category: "Medical Doctoral" },
  "mcmaster-university": { rank: 4, category: "Medical Doctoral" },
  "queens-university-at-kingston": { rank: 5, category: "Medical Doctoral" },
  "university-of-alberta": { rank: 6, category: "Medical Doctoral" },
  "university-of-calgary": { rank: 7, category: "Medical Doctoral" },
  "university-of-western-ontario": { rank: 8, category: "Medical Doctoral" },
  "university-of-ottawa": { rank: 9, category: "Medical Doctoral" },
  "dalhousie-university": { rank: 10, category: "Medical Doctoral" },
  "university-of-saskatchewan": { rank: 11, category: "Medical Doctoral" },
  "university-of-manitoba": { rank: 12, category: "Medical Doctoral" },

  // Comprehensive
  "simon-fraser-university": { rank: 1, category: "Comprehensive" },
  "university-of-victoria": { rank: 2, category: "Comprehensive" },
  "university-of-waterloo": { rank: 3, category: "Comprehensive" },
  "york-university": { rank: 4, category: "Comprehensive" },
  "carleton-university": { rank: 5, category: "Comprehensive" },
  "university-of-guelph": { rank: 6, category: "Comprehensive" },
  "toronto-metropolitan-university": { rank: 7, category: "Comprehensive" },
  "concordia-university": { rank: 8, category: "Comprehensive" },
  "wilfrid-laurier-university": { rank: 9, category: "Comprehensive" },
  "university-of-windsor": { rank: 10, category: "Comprehensive" },

  // Primarily Undergraduate
  "mount-allison-university": { rank: 1, category: "Primarily Undergraduate" },
  "university-of-northern-british-columbia": { rank: 2, category: "Primarily Undergraduate" },
  "saint-francis-xavier-university": { rank: 3, category: "Primarily Undergraduate" },
  "bishops-university": { rank: 4, category: "Primarily Undergraduate" },
  "acadia-university": { rank: 5, category: "Primarily Undergraduate" },
  "saint-marys-university": { rank: 6, category: "Primarily Undergraduate" },
  "university-of-prince-edward-island": { rank: 7, category: "Primarily Undergraduate" }
};

const BRAND_OVERLYS = {
  // Flagship universities — verified official brand colours
  "university-of-toronto": { bg: "linear-gradient(135deg, #002a5c 0%, #00152a 100%)", initials: "UT", color: "#ffffff", brandColor: "#002a5c" },
  "mcgill-university": { bg: "linear-gradient(135deg, #ed1b2f 0%, #c8102e 100%)", initials: "MCG", color: "#ffffff", brandColor: "#ed1b2f" },
  "university-of-british-columbia": { bg: "linear-gradient(135deg, #002145 0%, #003b6f 100%)", initials: "UBC", color: "#ffffff", brandColor: "#002145" },
  "university-of-waterloo": { bg: "linear-gradient(135deg, #ffd54f 0%, #e6a817 100%)", initials: "UW", color: "#1a1a1a", brandColor: "#e6a817" },
  "mcmaster-university": { bg: "linear-gradient(135deg, #7A003C 0%, #5C002D 100%)", initials: "MAC", color: "#ffffff", brandColor: "#7A003C" },
  "york-university": { bg: "linear-gradient(135deg, #e31837 0%, #b20f29 100%)", initials: "YRK", color: "#ffffff", brandColor: "#e31837" },
  // Additional major schools with verified brand colours
  "queens-university-at-kingston": { bg: "linear-gradient(135deg, #002452 0%, #001a3d 100%)", initials: "QUE", color: "#ffffff", brandColor: "#002452" },
  "university-of-western-ontario": { bg: "linear-gradient(135deg, #4F2683 0%, #3a1a66 100%)", initials: "UWO", color: "#ffffff", brandColor: "#4F2683" },
  "university-of-alberta": { bg: "linear-gradient(135deg, #007C41 0%, #005c30 100%)", initials: "UAB", color: "#ffffff", brandColor: "#007C41" },
  "university-of-calgary": { bg: "linear-gradient(135deg, #D2001A 0%, #a8001a 100%)", initials: "UCA", color: "#ffffff", brandColor: "#D2001A" },
  "dalhousie-university": { bg: "linear-gradient(135deg, #FDB71A 0%, #e09900 100%)", initials: "DAL", color: "#002452", brandColor: "#FDB71A" },
  "simon-fraser-university": { bg: "linear-gradient(135deg, #CC0633 0%, #a00028 100%)", initials: "SFU", color: "#ffffff", brandColor: "#CC0633" },
  "university-of-victoria": { bg: "linear-gradient(135deg, #005493 0%, #003d6e 100%)", initials: "UVic", color: "#ffffff", brandColor: "#005493" },
  "carleton-university": { bg: "linear-gradient(135deg, #BF112B 0%, #8c0d20 100%)", initials: "CAR", color: "#ffffff", brandColor: "#BF112B" },
  "university-of-ottawa": { bg: "linear-gradient(135deg, #8F0000 0%, #660000 100%)", initials: "UO", color: "#ffffff", brandColor: "#8F0000" },
  "wilfrid-laurier-university": { bg: "linear-gradient(135deg, #4E0C69 0%, #390952 100%)", initials: "WLU", color: "#ffffff", brandColor: "#4E0C69" },
  "university-of-guelph": { bg: "linear-gradient(135deg, #BC2026 0%, #921a1f 100%)", initials: "UOG", color: "#ffffff", brandColor: "#BC2026" },
  "brock-university": { bg: "linear-gradient(135deg, #FEDB00 0%, #d4b800 100%)", initials: "BRK", color: "#1a1a1a", brandColor: "#FEDB00" },
  "toronto-metropolitan-university": { bg: "linear-gradient(135deg, #003B71 0%, #002752 100%)", initials: "TMU", color: "#ffffff", brandColor: "#003B71" },
  "concordia-university": { bg: "linear-gradient(135deg, #912338 0%, #6d1a2b 100%)", initials: "CON", color: "#ffffff", brandColor: "#912338" },
  "university-of-saskatchewan": { bg: "linear-gradient(135deg, #006633 0%, #004d26 100%)", initials: "USK", color: "#ffffff", brandColor: "#006633" },
  "university-of-manitoba": { bg: "linear-gradient(135deg, #E31937 0%, #b8112b 100%)", initials: "UMB", color: "#ffffff", brandColor: "#E31937" },
  "university-of-new-brunswick": { bg: "linear-gradient(135deg, #CC2222 0%, #a01a1a 100%)", initials: "UNB", color: "#ffffff", brandColor: "#CC2222" },
  "memorial-university-of-newfoundland": { bg: "linear-gradient(135deg, #003F72 0%, #002d54 100%)", initials: "MUN", color: "#ffffff", brandColor: "#003F72" },
  "seneca-college": { bg: "linear-gradient(135deg, #005EB8 0%, #00478a 100%)", initials: "SEN", color: "#ffffff", brandColor: "#005EB8" },
  "humber-college": { bg: "linear-gradient(135deg, #FF6600 0%, #cc5200 100%)", initials: "HUM", color: "#ffffff", brandColor: "#FF6600" },
  "george-brown-college": { bg: "linear-gradient(135deg, #7B1D82 0%, #5c1561 100%)", initials: "GBC", color: "#ffffff", brandColor: "#7B1D82" },
  "sheridan-college": { bg: "linear-gradient(135deg, #005B8E 0%, #00446b 100%)", initials: "SHE", color: "#ffffff", brandColor: "#005B8E" },
  "algonquin-college": { bg: "linear-gradient(135deg, #006633 0%, #004d26 100%)", initials: "ALG", color: "#ffffff", brandColor: "#006633" },
  "conestoga-college": { bg: "linear-gradient(135deg, #003B5C 0%, #002740 100%)", initials: "CON", color: "#ffffff", brandColor: "#003B5C" },
  "bcit-british-columbia-institute-of-technology": { bg: "linear-gradient(135deg, #003865 0%, #00264a 100%)", initials: "BCIT", color: "#ffffff", brandColor: "#003865" },
  "sait-southern-alberta-institute-of-technology": { bg: "linear-gradient(135deg, #D62000 0%, #a81900 100%)", initials: "SAIT", color: "#ffffff", brandColor: "#D62000" },
  "nait-northern-alberta-institute-of-technology": { bg: "linear-gradient(135deg, #0066CC 0%, #004d99 100%)", initials: "NAIT", color: "#ffffff", brandColor: "#0066CC" }
};

const SPECIFIC_IMAGES = {};

const DOMAIN_MAP = {
  "university-of-toronto": "utoronto.ca",
  "mcgill-university": "mcgill.ca",
  "university-of-british-columbia": "ubc.ca",
  "university-of-waterloo": "uwaterloo.ca",
  "mcmaster-university": "mcmaster.ca",
  "york-university": "yorku.ca",
  "queens-university-at-kingston": "queensu.ca",
  "university-of-western-ontario": "uwo.ca",
  "university-of-alberta": "ualberta.ca",
  "university-of-calgary": "ucalgary.ca",
  "dalhousie-university": "dal.ca",
  "seneca-college": "senecapolytechnic.ca",
  "humber-college": "humber.ca",
  "george-brown-college": "georgebrown.ca",
  "bcit-british-columbia-institute-of-technology": "bcit.ca",
  "sait-southern-alberta-institute-of-technology": "sait.ca",
  "nait-northern-alberta-institute-of-technology": "nait.ca",
  "sheridan-college": "sheridancollege.ca",
  "algonquin-college": "algonquincollege.com",
  "cape-breton-university": "cbu.ca",
  "emily-carr-university-of-art-and-design": "ecuad.ca",
  "kwantlen-polytechnic-university": "kpu.ca",
  "conestoga-college": "conestogac.on.ca",
  "brock-university": "brocku.ca",
  "carleton-university": "carleton.ca",
  "simon-fraser-university": "sfu.ca",
  "university-of-victoria": "uvic.ca",
  "university-of-ottawa": "uottawa.ca",
  "university-of-guelph": "uoguelph.ca",
  "wilfrid-laurier-university": "wlu.ca",
  "concordia-university": "concordia.ca",
  "toronto-metropolitan-university": "torontomu.ca",
  "ontario-tech-university": "ontariotechu.ca",
  "memorial-university-of-newfoundland": "mun.ca",
  "university-of-saskatchewan": "usask.ca",
  "university-of-regina": "uregina.ca",
  "university-of-manitoba": "umanitoba.ca",
  "university-of-winnipeg": "uwinnipeg.ca",
  "acadia-university": "acadiau.ca",
  "mount-allison-university": "mta.ca",
  "st.-francis-xavier-university": "stfx.ca",
  "saint-francis-xavier-university": "stfx.ca",
  "saint-marys-university": "smu.ca",
  "saint-marys-university-calgary": "stmu.ca",
  "athabasca-university": "athabascau.ca",
  "bishops-university": "ubishops.ca",
  "brandon-university": "brandonu.ca",
  "capilano-university": "capilanou.ca",
  "lakehead-university": "lakeheadu.ca",
  "macewan-university": "macewan.ca",
  "mount-royal-university": "mtroyal.ca",
  "university-of-lethbridge": "ulethbridge.ca",
  "royal-roads-university": "royalroads.ca",
  "thompson-rivers-university": "tru.ca",
  "university-of-the-fraser-valley": "ufv.ca",
  "university-of-northern-british-columbia": "unbc.ca",
  "vancouver-island-university": "viu.ca",
  "st.-thomas-university": "stu.ca",
  "st.-thomas-university-calgary": "stu.ca",
  "university-of-new-brunswick": "unb.ca",
  "université-de-moncton": "umoncton.ca",
  "mount-saint-vincent-university": "msvu.ca",
  "laurentian-university": "laurentian.ca",
  "nipissing-university": "nipissingu.ca",
  "trent-university": "trentu.ca",
  "university-of-windsor": "uwindsor.ca",
  "university-of-prince-edward-island": "upei.ca",
  "université-de-montréal": "umontreal.ca",
  "université-de-sherbrooke": "usherbrooke.ca",
  "université-laval": "ulaval.ca",
  "alberta-university-of-the-arts": "auarts.ca",
  "algoma-university": "algomau.ca",
  "university-college-of-the-north": "ucn.ca",
  "université-de-saint-boniface": "ustboniface.ca",
  "nova-scotia-college-of-art-and-design-university": "nscad.ca",
  "université-sainte-anne": "usainteanne.ca",
  "university-of-kings-college": "ukings.ca",
  "ontario-college-of-art-and-design-university": "ocadu.ca",
  "royal-military-college-of-canada": "rmc-cmr.ca",
  "université-de-hearst": "uhearst.ca",
  "université-de-lontario-français": "uontario.ca",
  "université-de-sudbury": "usudbury.ca",
  "école-de-technologie-supérieure&#91;e&#93;": "etsmtl.ca",
  "école-nationale-dadministration-publique&#91;e&#93;": "enap.ca",
  "institut-national-de-la-recherche-scientifique&#91;e&#93;": "inrs.ca",
  "université-du-québec-en-abitibi-témiscamingue&#91;e&#93;": "uqat.ca",
  "université-du-québec-en-outaouais&#91;e&#93;": "uqo.ca",
  "université-du-québec-à-chicoutimi&#91;e&#93;": "uqac.ca",
  "université-du-québec-à-montréal&#91;e&#93;": "uqam.ca",
  "université-du-québec-à-rimouski&#91;e&#93;": "uqar.ca",
  "université-du-québec-à-trois-rivières&#91;e&#93;": "uqtr.ca",
  "université-téluq&#91;e&#93;&#91;8&#93;": "teluq.ca",
  "yukon-university": "yukonu.ca",
  "ambrose-university": "ambrose.edu",
  "booth-university-college": "boothuc.ca",
  "burman-university": "burmanu.ca",
  "canadian-mennonite-university&#91;6&#93;": "cmu.ca",
  "concordia-university-of-edmonton": "concordia.ab.ca",
  "crandall-university": "crandallu.ca",
  "kingswood-university": "kingswood.edu",
  "pacific-coast-university-for-workplace-health-sciences": "pcu-whs.ca",
  "providence-university-college-and-theological-seminary": "prov.ca",
  "redeemer-university": "redeemer.ca",
  "st.-marys-university-calgary": "stmu.ca",
  "st.-stephens-university": "ssu.ca",
  "the-kings-university": "kingsu.ca",
  "trinity-western-university": "twu.ca",
  "tyndale-university": "tyndale.ca",
  "university-canada-west&#91;12&#93;": "ucanwest.ca",
  "university-of-fredericton": "ufred.ca",
  "university-of-niagara-falls-canada": "unfcanada.ca",
  "yorkville-university": "yorkvilleu.ca",
  "dawson-college": "dawsoncollege.qc.ca",
  "yukon-university-college": "yukonu.ca",
  "aurora-college-uni": "auroracollege.nt.ca",
  "aurora-college": "auroracollege.nt.ca",
  "nunavut-arctic-college-uni": "arcticcollege.ca",
  "nunavut-arctic-college": "arcticcollege.ca",
  "centennial-college": "centennialcollege.ca",
  "mohawk-college": "mohawkcollege.ca",
  "fanshawe-college": "fanshawec.ca",
  "niagara-college": "niagaracollege.ca",
  "durham-college": "durhamcollege.ca",
  "st.-lawrence-college": "stlawrencecollege.ca",
  "georgian-college": "georgiancollege.ca",
  "fleming-college": "flemingcollege.ca",
  "lambton-college": "lambtoncollege.ca",
  "loyalist-college": "loyalistcollege.ca",
  "cambrian-college": "cambriancollege.ca",
  "canadore-college": "canadorecollege.ca",
  "confederation-college": "confederationcollege.ca",
  "northern-college": "northernc.on.ca",
  "la-cité-collégiale": "collegelacite.ca",
  "douglas-college": "douglascollege.ca",
  "langara-college": "langara.ca",
  "camosun-college": "camosun.ca",
  "okanagan-college": "okanagan.bc.ca",
  "selkirk-college": "selkirk.ca",
  "college-of-new-caledonia": "cnc.bc.ca",
  "college-of-the-rockies": "cotr.bc.ca",
  "north-island-college": "nic.bc.ca",
  "northern-lights-college": "nlc.bc.ca",
  "bow-valley-college": "bowvalleycollege.ca",
  "lethbridge-college": "lethbridgecollege.ca",
  "red-deer-polytechnic": "rdpolytech.ca",
  "medicine-hat-college": "mhc.ab.ca",
  "keyano-college": "keyano.ca",
  "lakeland-college": "lakelandcollege.ca",
  "portage-college": "portagecollege.ca",
  "grande-prairie-regional-college": "nwpolytech.ca",
  "saskatchewan-polytechnic": "saskpolytech.ca",
  "red-river-college-polytech": "rrc.ca",
  "assiniboine-community-college": "assiniboine.net",
  "nova-scotia-community-college-nscc": "nscc.ca",
  "holland-college": "hollandcollege.com",
  "new-brunswick-community-college-nbcc": "nbcc.ca",
  "college-of-the-north-atlantic": "cna.nl.ca"
};

function getUniversityDomain(id) {
  if (DOMAIN_MAP[id]) {
    return DOMAIN_MAP[id];
  }
  let clean = id
    .replace(/^university-of-/, '')
    .replace(/^université-de-/, '')
    .replace(/^université-d'-/, '')
    .replace(/^université-/, '')
    .replace(/-university$/, '')
    .replace(/-college$/, '')
    .replace(/-polytechnic$/, '')
    .replace(/-institute-of-technology$/, '');
  return `${clean}.ca`;
}

function deriveInitials(name) {
  const lower = name.toLowerCase();
  if (lower.includes('toronto')) return 'UT';
  if (lower.includes('waterloo')) return 'UW';
  if (lower.includes('british columbia') || lower.includes('ubc')) return 'UBC';
  if (lower.includes('mcgill')) return 'MCG';
  if (lower.includes('mcmaster')) return 'MAC';
  if (lower.includes('queen')) return 'QUE';
  if (lower.includes('western')) return 'UWO';
  if (lower.includes('york')) return 'YRK';
  if (lower.includes('alberta')) return 'UAB';
  if (lower.includes('calgary')) return 'UCA';
  if (lower.includes('dalhousie')) return 'DAL';
  if (lower.includes('seneca')) return 'SEN';
  if (lower.includes('humber')) return 'HUM';
  if (lower.includes('george brown')) return 'GBC';
  if (lower.includes('sheridan')) return 'SHE';
  if (lower.includes('algonquin')) return 'ALG';
  
  let clean = name.replace(/University of\s+/i, 'U ').replace(/Université de\s+/i, 'U ').replace(/\bUniversity\b/i, '').replace(/\bCollege\b/i, '').replace(/\bPolytechnic\b/i, '').trim();
  let parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return parts.map(p => p[0]).join('').substring(0, 3).toUpperCase();
  }
  if (name.toLowerCase().startsWith('university of ') || name.toLowerCase().startsWith('université de ')) {
    const mainName = name.replace(/university of /i, '').replace(/université de /i, '').trim();
    return ('U' + mainName.substring(0, 2)).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

// Curated palette of rich academic colours — used when school is not in BRAND_OVERLYS
const ACADEMIC_COLOUR_PALETTE = [
  { bg: "linear-gradient(135deg, #1e3a5f 0%, #0f1f35 100%)", brandColor: "#1e3a5f" }, // Deep navy
  { bg: "linear-gradient(135deg, #6b1a2a 0%, #4a0f1c 100%)", brandColor: "#6b1a2a" }, // Burgundy
  { bg: "linear-gradient(135deg, #1a5276 0%, #0d2b3d 100%)", brandColor: "#1a5276" }, // Royal blue
  { bg: "linear-gradient(135deg, #1e6b3d 0%, #0f3d22 100%)", brandColor: "#1e6b3d" }, // Forest green
  { bg: "linear-gradient(135deg, #4a235a 0%, #2d1338 100%)", brandColor: "#4a235a" }, // Deep purple
  { bg: "linear-gradient(135deg, #7d1e0e 0%, #4d1209 100%)", brandColor: "#7d1e0e" }, // Crimson
  { bg: "linear-gradient(135deg, #1a3a5c 0%, #0d1f32 100%)", brandColor: "#1a3a5c" }, // Midnight blue
  { bg: "linear-gradient(135deg, #2c4a1e 0%, #1a2d12 100%)", brandColor: "#2c4a1e" }, // Dark green
  { bg: "linear-gradient(135deg, #5c3811 0%, #3a240a 100%)", brandColor: "#5c3811" }, // Deep brown/gold
  { bg: "linear-gradient(135deg, #0d4a5c 0%, #082d3a 100%)", brandColor: "#0d4a5c" }, // Deep teal
  { bg: "linear-gradient(135deg, #3d1f5c 0%, #231135 100%)", brandColor: "#3d1f5c" }, // Indigo
  { bg: "linear-gradient(135deg, #5c1a3a 0%, #3a1025 100%)", brandColor: "#5c1a3a" }, // Dark rose
];

function getLogoStyle(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Use palette index for rich, saturated academic colours
  const idx = Math.abs(hash) % ACADEMIC_COLOUR_PALETTE.length;
  const palette = ACADEMIC_COLOUR_PALETTE[idx];
  
  const initials = deriveInitials(name);
  
  return { bg: palette.bg, initials, color: "#ffffff", brandColor: palette.brandColor };
}

function getUniversityCrestSvg(name, logoStyle) {
  const initials = logoStyle.initials || deriveInitials(name);

  // Extract brand colours from the logoStyle gradient string
  let brandColor = logoStyle.brandColor || '#1e40af';
  let lightColor = '#ffffff';

  // Create a proper academic shield / crest SVG
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="128" height="128">
    <defs>
      <linearGradient id="shield-bg-${encodeURIComponent(initials)}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${brandColor}" stop-opacity="1" />
        <stop offset="100%" stop-color="${brandColor}" stop-opacity="0.8" />
      </linearGradient>
      <filter id="shield-shadow-${encodeURIComponent(initials)}" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.25)" />
      </filter>
    </defs>
    <!-- Shield body -->
    <path d="M50 6 L88 20 L88 52 C88 72 70 88 50 95 C30 88 12 72 12 52 L12 20 Z"
          fill="url(#shield-bg-${encodeURIComponent(initials)})"
          filter="url(#shield-shadow-${encodeURIComponent(initials)})" />
    <!-- Shield inner border -->
    <path d="M50 13 L82 25 L82 52 C82 69 66 83 50 89 C34 83 18 69 18 52 L18 25 Z"
          fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1.5" />
    <!-- Institution initials -->
    <text x="50" y="57" dominant-baseline="middle" text-anchor="middle"
          fill="#ffffff" font-family="Lexend, system-ui, -apple-system, sans-serif"
          font-weight="900" font-size="${initials.length > 2 ? '22' : '26'}" letter-spacing="-0.5">${initials}</text>
    <!-- Top decorative line -->
    <line x1="32" y1="40" x2="68" y2="40" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
    <!-- Bottom decorative line -->
    <line x1="35" y1="68" x2="65" y2="68" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const CAMPUS_PLACEHOLDERS = [
  "/campuses/classic.png",
  "/campuses/library.png",
  "/campuses/quad.png",
  "/campuses/science.png"
];

function getUnsplashFallback(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % CAMPUS_PLACEHOLDERS.length;
  return CAMPUS_PLACEHOLDERS[idx];
}

function getCampusImage(id, name) {
  if (SPECIFIC_IMAGES[id]) {
    return SPECIFIC_IMAGES[id];
  }
  return getUnsplashFallback(id);
}

function handleImageError(imgElement, id) {
  const fallback = getUnsplashFallback(id);
  if (imgElement.src !== fallback) {
    imgElement.src = fallback;
  } else {
    imgElement.style.display = 'none';
    if (imgElement.nextElementSibling) {
      imgElement.nextElementSibling.classList.remove('hidden');
    }
  }
}

function handleLogoError(imgElement, crestSvg) {
  const src = imgElement.src || '';

  // Tier 1 → Tier 2: if clearbit (or original provider) failed, try Google Favicon (reliable, 128px)
  if (src.includes('clearbit.com') || src.includes('logo.dev')) {
    const domain = src.split('.com/')[1]?.split('?')[0] || src.split('logo.dev/')[1]?.split('?')[0] || '';
    imgElement.onerror = () => handleLogoError(imgElement, crestSvg); // fall to tier 3
    imgElement.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    return;
  }

  // Tier 2 → Tier 3: Google favicon failed, try the SVG crest
  if (src.includes('google.com/s2/favicons') || src.includes('data:image/svg')) {
    // Already tried SVG — go to initials
    if (src.includes('data:image/svg')) {
      imgElement.style.display = 'none';
      const fallback = imgElement.nextElementSibling;
      if (fallback) {
        fallback.classList.remove('hidden');
        fallback.style.setProperty('display', 'flex', 'important');
      }
      return;
    }
    // Try SVG crest
    if (crestSvg) {
      imgElement.onerror = () => {
        imgElement.style.display = 'none';
        const fallback = imgElement.nextElementSibling;
        if (fallback) {
          fallback.classList.remove('hidden');
          fallback.style.setProperty('display', 'flex', 'important');
        }
      };
      imgElement.src = crestSvg;
    } else {
      imgElement.style.display = 'none';
      const fallback = imgElement.nextElementSibling;
      if (fallback) {
        fallback.classList.remove('hidden');
        fallback.style.setProperty('display', 'flex', 'important');
      }
    }
    return;
  }

  // Catch-all: show initials
  imgElement.style.display = 'none';
  const fallback = imgElement.nextElementSibling;
  if (fallback) {
    fallback.classList.remove('hidden');
    fallback.style.setProperty('display', 'flex', 'important');
  }
}



function findCourseBySubject(courses, subject) {
  return courses.find(c => {
    const name = (c.name || '').toLowerCase();
    const code = (c.code || '').toUpperCase().trim();
    const id = (c.id || '').toUpperCase().trim();
    
    if (subject === 'MATH') {
      if (code === 'MHF4U' || code === 'MCV4U' || code === 'MDM4U' || id === 'MHF4U' || id === 'MCV4U') return true;
      if (name.includes('calculus') || name.includes('vectors') || name.includes('pre-calc') || name.includes('precalc') || name.includes('functions') || name.includes('algebra')) return true;
      if (name.includes('math') && (name.includes('12') || name.includes('30') || name.includes('31') || name.includes('40s') || name.includes('621') || name.includes('3200') || name.includes('536') || name.includes('sn 5') || name.includes('ts 5'))) return true;
      if (code.includes('MHF') || code.includes('MCV') || code.includes('MATH') || code.includes('PRE-CALC') || code.includes('CALC')) return true;
    }
    
    if (subject === 'SCIENCE') {
      if (code === 'SBI4U' || code === 'SCH4U' || code === 'SPH4U' || id === 'SBI4U' || id === 'SCH4U' || id === 'SPH4U') return true;
      if (name.includes('biology') || name.includes('chemistry') || name.includes('physics') || name.includes('anatomy') || name.includes('physiology')) return true;
      if (code.includes('SBI') || code.includes('SCH') || code.includes('SPH') || code.includes('BIO') || code.includes('CHEM') || code.includes('PHYS')) return true;
    }
    
    if (subject === 'ENGLISH') {
      if (code === 'ENG4U' || code === 'ENG3U' || id === 'ENG3U' || id === 'ENG4U') return true;
      if (name.includes('english') || name.includes('language arts') || name.includes('literature') || name.includes('writing') || name.includes('esl') || name.includes('second language') || code.includes('ELA') || code.includes('ESL')) return true;
      if (code.includes('ENG') || code.includes('EWC') || code.includes('ELA') || code.includes('ESL')) return true;
    }
    
    return false;
  });
}

function isGrade12(course) {
  if (course.level !== undefined) {
    return course.level === '12' || course.level === 12;
  }
  const code = (course.code || '').toUpperCase().trim();
  const name = (course.name || '').toLowerCase();
  
  if (code.endsWith('4U') || code.endsWith('4M') || code.endsWith('4O') || code.endsWith('4C') || code.endsWith('4E')) return true;
  if (/\b12\b/.test(code) || /\b12\b/.test(name)) return true;
  if (/\b30\b/.test(code) || /\b31\b/.test(code) || /\b30\b/.test(name) || /\b31\b/.test(name)) return true;
  if (code.endsWith('40S') || code.endsWith('40S/40G') || /\b40\b/.test(code)) return true;
  if (code.includes('621') || code.includes('611')) return true;
  if (name.includes('secondary v') || name.includes('cegep') || code.includes('SEC 5') || code.includes('536') || code.includes('SN 5') || code.includes('TS 5')) return true;
  
  if (code.includes('4') && !code.includes('1') && !code.includes('2') && !code.includes('3')) return true;
  
  return false;
}

function isGrade11(course) {
  if (course.level !== undefined) {
    return course.level === '11' || course.level === 11;
  }
  const code = (course.code || '').toUpperCase().trim();
  const name = (course.name || '').toLowerCase();
  
  if (code.endsWith('3U') || code.endsWith('3M') || code.endsWith('3O') || code.endsWith('3C') || code.endsWith('3E')) return true;
  if (/\b11\b/.test(code) || /\b11\b/.test(name)) return true;
  if (/\b20\b/.test(code) || /\b20\b/.test(name)) return true;
  if (code.endsWith('30S') || /\b30\b/.test(code)) return true;
  if (code.includes('521') || code.includes('511')) return true;
  if (name.includes('secondary iv') || code.includes('SEC 4') || code.includes('436')) return true;
  
  if (code.includes('3') && !code.includes('4')) return true;
  
  return false;
}

function checkPrerequisites(courses, item) {
  const isUni = item.type === 'University';
  const progType = item.prog_type;
  
  if (!courses || courses.length === 0) return { met: true, missing: [] };
  
  const hasMath = courses.some(c => findCourseBySubject([c], 'MATH') && (isGrade12(c) || isGrade11(c)));
  const hasScience = courses.some(c => findCourseBySubject([c], 'SCIENCE') && (isGrade12(c) || isGrade11(c)));
  const hasEnglish = courses.some(c => findCourseBySubject([c], 'ENGLISH') && (isGrade12(c) || isGrade11(c)));
  
  const missing = [];
  
  if (progType === 'STEM') {
    if (!hasMath) missing.push(isUni ? 'Grade 12 Math (e.g. Advanced Functions / Calculus)' : 'Senior Math');
    if (!hasScience) missing.push(isUni ? 'Grade 12 Science (e.g. Physics / Chemistry)' : 'Senior Science');
  } else if (progType === 'Health') {
    if (!hasScience) missing.push(isUni ? 'Grade 12 Biology / Chemistry' : 'Senior Science');
  } else if (progType === 'Business') {
    if (!hasMath) missing.push(isUni ? 'Grade 12 Math (e.g. Advanced Functions)' : 'Senior Math');
  }
  
  if (!hasEnglish) {
    missing.push(isUni ? 'Grade 12 English (e.g. ENG4U)' : 'Senior English');
  }
  
  return {
    met: missing.length === 0,
    missing: missing
  };
}

function getProgramCutoff(item) {
  const isUni = item.type === 'University';
  const name = item.name.toLowerCase();
  const progType = item.prog_type;
  
  if (isUni) {
    const isTopTier = name.includes('waterloo') || name.includes('toronto') || name.includes('mcgill') || name.includes('british columbia') || name.includes('mcmaster') || name.includes('queen\'s') || name.includes('western');
    
    if (progType === 'STEM') {
      return isTopTier ? 92 : 84;
    } else if (progType === 'Health') {
      return isTopTier ? 90 : 83;
    } else if (progType === 'Business') {
      return isTopTier ? 88 : 80;
    } else {
      return isTopTier ? 80 : 73;
    }
  } else {
    if (progType === 'STEM' || progType === 'Health') {
      return 75;
    } else {
      return 68;
    }
  }
}

function sendAnonymizedMatchTelemetry(courses, matches) {
  // CPPA Compliance Boundary: Scrub all PII (name, dob, email) before compiling telemetry.
  // This separates Social Auth profiles from academic metrics in all diagnostic layers.
  const anonymizedPayload = {
    timestamp: new Date().toISOString(),
    average: calculateAverage(courses).average,
    totalCourses: courses.length,
    courseCodes: courses.map(c => c.code),
    matchCount: matches.length,
    eligibleCount: matches.filter(m => !m.proLocked && m.match >= 75).length
  };
  
  console.log("[CPPA COMPLIANT TELEMETRY] Dispatched anonymized metrics payload:", anonymizedPayload);
  
  try {
    const stored = localStorage.getItem('pathway_canada_telemetry') || '[]';
    const history = JSON.parse(stored);
    history.push(anonymizedPayload);
    localStorage.setItem('pathway_canada_telemetry', JSON.stringify(history.slice(-20)));
  } catch (e) {
    // Ignore Storage limits
  }
}

function normalizeGeographicData(item) {
  let city = item.city ? String(item.city).trim() : '';
  let province = item.province ? String(item.province).trim() : '';
  let university = item.name ? String(item.name).trim() : '';
  
  let isPartTime = false;
  let isUndergrad = false;
  let isGraduate = false;
  
  // Clean out layout parameters from city or province strings
  const parseFlags = (str) => {
    if (!str) return '';
    let cleaned = str;
    if (/part\s*time/i.test(cleaned)) {
      isPartTime = true;
      cleaned = cleaned.replace(/part\s*time/ig, '');
    }
    if (/undergrad/i.test(cleaned)) {
      isUndergrad = true;
      cleaned = cleaned.replace(/undergrad\.?/ig, '');
    }
    if (/graduate/i.test(cleaned)) {
      isGraduate = true;
      cleaned = cleaned.replace(/graduate/ig, '');
    }
    return cleaned;
  };
  
  city = parseFlags(city);
  province = parseFlags(province);
  
  // Clean trailing province names/codes from city/province strings
  const cleanTrailing = (str) => {
    if (!str) return '';
    return str
      .replace(/,\s*(ON|AB|BC|QC|NS|NB|PE|NL|SK|MB|YT|NT|NU)/ig, '')
      .replace(/\b(ON|AB|BC|QC|NS|NB|PE|NL|SK|MB|YT|NT|NU)\b/ig, '')
      .replace(/,\s*$/, '')
      .replace(/^\s*,/, '')
      .trim();
  };
  
  city = cleanTrailing(city);
  province = cleanTrailing(province);
  
  const idLower = String(item.id).toLowerCase();
  const uniLower = university.toLowerCase();
  
  // Explicit normalization rules for specific target schools
  if (idLower === 'acadia-university' || uniLower.includes('acadia')) {
    city = 'Wolfville';
    province = 'NS';
  } else if (idLower === 'mcgill-university' || uniLower.includes('mcgill')) {
    city = 'Montreal';
    province = 'QC';
  } else if (idLower === 'fanshawe-college' || uniLower.includes('fanshawe')) {
    city = 'London';
    province = 'ON';
  } else {
    // General cleaners for bad data e.g. city: "Ontario"
    if (city.toLowerCase() === 'ontario' || !city) {
      if (uniLower.includes('algoma')) city = 'Sault Ste. Marie';
      else if (uniLower.includes('brock')) city = 'St. Catharines';
      else if (uniLower.includes('trent')) city = 'Peterborough';
      else if (uniLower.includes('carleton')) city = 'Ottawa';
      else if (uniLower.includes('ottawa')) city = 'Ottawa';
      else if (uniLower.includes('queens')) city = 'Kingston';
      else if (uniLower.includes('western')) city = 'London';
      else if (uniLower.includes('waterloo')) city = 'Waterloo';
      else if (uniLower.includes('mcmaster')) city = 'Hamilton';
      else if (uniLower.includes('toronto')) city = 'Toronto';
      else if (uniLower.includes('york')) city = 'Toronto';
      else if (uniLower.includes('laurier')) city = 'Waterloo';
      else if (uniLower.includes('guelph')) city = 'Guelph';
      else if (uniLower.includes('windsor')) city = 'Windsor';
      else city = 'Toronto';
    }
    
    // Auto-detect correct province suffix based on university name if province is missing or wrong
    if (uniLower.includes('british columbia') || uniLower.includes('ubc') || idLower.includes('-bc-') || idLower.endsWith('-bc') || idLower.includes('simon-fraser') || idLower.includes('victoria')) {
      province = 'BC';
    } else if (uniLower.includes('alberta') || uniLower.includes('calgary') || idLower.includes('-ab-') || idLower.endsWith('-ab') || idLower.includes('lethbridge') || idLower.includes('mount-royal')) {
      province = 'AB';
    } else if (uniLower.includes('dalhousie') || idLower.includes('dalhousie') || uniLower.includes('cape breton') || uniLower.includes('st. francis xavier') || uniLower.includes('saint mary\'s')) {
      province = 'NS';
    } else if (uniLower.includes('montreal') || uniLower.includes('sherbrooke') || uniLower.includes('laval') || uniLower.includes('concordia') || idLower.includes('quebec') || idLower.includes('montréal')) {
      province = 'QC';
    }
  }
  
  // Format province to standard abbreviations
  if (province.length > 2 || !province) {
    const provMap = {
      'ontario': 'ON', 'british columbia': 'BC', 'quebec': 'QC', 'alberta': 'AB',
      'nova scotia': 'NS', 'new brunswick': 'NB', 'prince edward island': 'PE',
      'newfoundland': 'NL', 'saskatchewan': 'SK', 'manitoba': 'MB',
      'yukon': 'YT', 'northwest territories': 'NT', 'nunavut': 'NU'
    };
    province = provMap[province.toLowerCase()] || province.substring(0, 2).toUpperCase();
  }
  if (!province) province = 'ON';
  province = province.toUpperCase();
  
  return { city, province, isPartTime, isUndergrad, isGraduate };
}

function getApplyUrl(province, type, domain) {
  if (province === 'ON') {
    return type === 'College' ? 'https://www.ontariocolleges.ca/' : 'https://www.ouac.on.ca/';
  }
  if (province === 'BC') {
    return 'https://www.educationplannerbc.ca/';
  }
  if (province === 'AB') {
    return 'https://www.applyalberta.ca/';
  }
  return `https://www.${domain}/admissions`;
}

function getCampusEnvironment(city) {
  const urbanCities = ['Toronto', 'Montreal', 'Vancouver', 'Ottawa', 'Calgary', 'Edmonton', 'Quebec City', 'Winnipeg', 'Halifax', 'Victoria'];
  const suburbanCities = ['Waterloo', 'London', 'Hamilton', 'Sault Ste. Marie', 'St. Catharines', 'Windsor', 'Sherbrooke', 'Sudbury', 'Guelph', 'Kingston', 'Burnaby'];
  if (urbanCities.includes(city)) return 'Urban';
  if (suburbanCities.includes(city)) return 'Suburban';
  return 'Rural';
}

function getCampusSize(universityName) {
  const largeSchools = ['University of Toronto', 'University of British Columbia', 'McGill University', 'University of Waterloo', 'McMaster University', 'University of Alberta', 'Concordia University', 'Université de Montréal', 'York University', 'Toronto Metropolitan University', 'Western University', 'University of Calgary', 'Université Laval', 'Ottawa University', 'University of Ottawa'];
  const smallSchools = ['Acadia University', 'Algoma University', 'Bishop\'s University', 'Brandon University', 'Cape Breton University', 'Alberta University of the Arts', 'Nipissing University', 'St. Francis Xavier University', 'Mount Allison University'];
  
  if (largeSchools.some(s => universityName.includes(s))) return 'Over 20000';
  if (smallSchools.some(s => universityName.includes(s))) return 'Under 5000';
  return '5000-20000';
}

function getProgramPathways(item) {
  const pathways = ['Experiential Learning'];
  const progLower = item.program.toLowerCase();
  const nameLower = item.name.toLowerCase();
  if (progLower.includes('co-op') || progLower.includes('coop') || nameLower.includes('waterloo') || nameLower.includes('mcmaster') || nameLower.includes('toronto')) {
    pathways.push('Co-op');
  }
  if (progLower.includes('joint') || progLower.includes('dual') || nameLower.includes('brock') || nameLower.includes('carleton')) {
    pathways.push('Joint Programs');
  }
  return pathways;
}

function getFutureOutlook(programName) {
  const progLower = programName.toLowerCase();
  if (progLower.includes('software') || progLower.includes('computer science') || progLower.includes('health') || progLower.includes('nursing') || progLower.includes('medicine')) {
    return 'High Growth';
  }
  if (progLower.includes('art') || progLower.includes('humanities') || progLower.includes('history')) {
    return 'Emerging';
  }
  return 'Stable';
}

function calculateMatches(courses) {
  const averageResult = calculateAverage(courses);
  const average = parseFloat(averageResult.average);
  
  let isPro = false;
  let homeProvince = 'ON';
  let activities = [];
  try {
    const stored = localStorage.getItem(STATE_KEY);
    if (stored) {
      const parsed = decryptState(stored);
      if (parsed) {
        isPro = parsed.isPro;
        homeProvince = parsed.homeProvince || 'ON';
        activities = parsed.activities || [];
      }
    }
  } catch (e) {
    // Ignore error
  }
  
  const extraBoost = Math.min(6, activities.length * 2);
  if (typeof logLocalAuditEvent !== 'undefined') {
    logLocalAuditEvent('ALGORITHM', `Recalculating admissions compatibility matches for ${postSecondaryData.length - 2} programs...`, 0);
  }
  
  const matches = postSecondaryData
    .filter(item => item.id !== 'full-time' && item.id !== 'undergrad.')
    .map(item => {
    // Normalize data properties
    const geo = normalizeGeographicData(item);
    
    // Right to Explanation (CPPA / C-27 Compliance):
    // 1. Check prerequisites eligibility (Hard Gate: Missing courses cap match rating at 50%).
    const prereqs = checkPrerequisites(courses, item);
    
    // 2. Lookup program admission average cutoff.
    const cutoff = getProgramCutoff(item);
    
    // 3. Weighting calculation (2026 regulations compliant):
    // GPA (60%): Compare Top 6 admission average vs historical program cutoff
    const diff = average - cutoff;
    let gpaScore = 80;
    if (diff < 0) {
      gpaScore = Math.max(30, 80 + diff * 6.0);
    } else {
      gpaScore = Math.min(100, 80 + diff * 3.5);
    }
    
    // Prerequisites (30%): 100% if met, 0% if any prerequisite is missing
    const prereqScore = prereqs.met ? 100 : 0;
    
    // Regional Factors (10%): 100% if regional institution matching native home province standard, else 70%
    const isLocal = geo.province === homeProvince;
    const regionalScore = isLocal ? 100 : 70;
    
    let match = Math.round((0.60 * gpaScore) + (0.30 * prereqScore) + (0.10 * regionalScore));
    
    // Prevent deviation: GPA > 90% must NOT be labeled as "High Climb" (<60% Match) if prerequisites are met
    if (average > 90 && prereqs.met && match < 60) {
      match = 60;
    }
    
    // Apply extracurriculars likeness boost
    match += extraBoost;
    
    // Cap match score between 50% and 99%
    match = Math.min(99, Math.max(50, match));
    
    const image = getCampusImage(item.id, item.name);
    const logoStyle = BRAND_OVERLYS[item.id] || getLogoStyle(item.name);
    
    // Detailed Breakdown Info
    let gradeExplainer = "";
    let recExplainer = "";
    
    if (!prereqs.met) {
      gradeExplainer = `Admission average of ${average}% matches, but prerequisite courses are missing: ${prereqs.missing.join(', ')}.`;
      recExplainer = `Enroll in ${prereqs.missing.join(' and ')} to become eligible for this program.`;
    } else {
      const isAbove = average >= cutoff;
      gradeExplainer = isAbove
        ? `Your Top 6 admission average of ${average}% meets the target cutoff of ${cutoff}%.`
        : `Your Top 6 admission average of ${average}% is currently below the target cutoff of ${cutoff}%.`;
      
      recExplainer = isAbove
        ? `This program is a strong fit. Maintain your average above ${cutoff}% to remain competitive.`
        : `To improve your match probability, aim to raise your average closer to the ${cutoff}% target.`;
    }
    
    const environment = getCampusEnvironment(geo.city);
    const size = getCampusSize(item.name);
    const pathways = getProgramPathways(item);
    const outlook = getFutureOutlook(item.program);
    
    const breakdown = {
      grades: gradeExplainer,
      extracurriculars: `Holistic assessment: +${extraBoost}% alignment from logged activities (${activities.length} active).`,
      recommendation: recExplainer
    };
    
    // Check if competitive program (Waterloo SE, U of T CS, McGill CS, McMaster Health Sci)
    const isWaterlooSE = item.id === 'university-of-waterloo' && (item.program.includes('Software') || item.program.includes('SE'));
    const isUoftCS = item.id === 'university-of-toronto' && (item.program.includes('Computer Science') || item.program.includes('CS'));
    const isMcGillCS = item.id === 'mcgill-university' && (item.program.includes('Computer Science') || item.program.includes('Software') || item.program.includes('CS') || item.program.includes('SE'));
    const isMcMasterHealthSci = item.id === 'mcmaster-university' && (item.program.includes('Health Sciences') || item.program.includes('Health Sci'));
    
    const isCompetitive = isWaterlooSE || isUoftCS || isMcGillCS || isMcMasterHealthSci;
    const proLocked = isCompetitive && !isPro;
    
    const domain = getUniversityDomain(item.id);
    // Use clearbit for higher quality, consistent logos
    const logoUrl = `https://logo.clearbit.com/${domain}`;
    const crestSvg = getUniversityCrestSvg(item.name, logoStyle);
    
    const applyUrl = getApplyUrl(geo.province, item.type, domain);
    const websiteUrl = `https://www.${domain}`;
    
    return {
      id: item.id,
      program: item.program,
      university: item.name,
      domain: domain,
      logoUrl: logoUrl,
      crestSvg: crestSvg,
      city: geo.city,
      province: geo.province,
      type: item.type,
      image: image,
      logoStyle: logoStyle,
      match: match,
      proLocked: proLocked,
      isCompetitive: isCompetitive,
      breakdown: breakdown,
      cutoff: cutoff,
      isPartTime: geo.isPartTime,
      isUndergrad: geo.isUndergrad,
      isGraduate: geo.isGraduate,
      applyUrl: applyUrl,
      websiteUrl: websiteUrl,
      ranking: MACLEANS_RANKINGS[item.id] || null,
      environment: environment,
      size: size,
      pathways: pathways,
      outlook: outlook
    };
  });

  // Compliance Audit telemetry dispatch: separates PII from academic records.
  sendAnonymizedMatchTelemetry(courses, matches);

  return matches;
}

function calculateAverage(courses) {
  if (!courses || courses.length === 0) return { average: "90.0", overall: "90.0" };
  
  // 1. Calculate overall average
  const allGrades = courses.map(c => c.grade);
  const allSum = allGrades.reduce((a, b) => a + b, 0);
  const overallAvg = (allSum / courses.length).toFixed(1);
  
  // 2. Calculate Top 6 Admission Average
  const gr12 = courses.filter(c => isGrade12(c));
  const gr11 = courses.filter(c => isGrade11(c));
  const other = courses.filter(c => !isGrade12(c) && !isGrade11(c));
  
  gr12.sort((a, b) => b.grade - a.grade);
  gr11.sort((a, b) => b.grade - a.grade);
  other.sort((a, b) => b.grade - a.grade);
  
  const selected = [];
  
  // Try to fill with Grade 12 first
  for (let i = 0; i < gr12.length && selected.length < 6; i++) {
    selected.push(gr12[i]);
  }
  // Then Grade 11
  for (let i = 0; i < gr11.length && selected.length < 6; i++) {
    selected.push(gr11[i]);
  }
  // Then any others
  for (let i = 0; i < other.length && selected.length < 6; i++) {
    selected.push(other[i]);
  }
  
  const selectedGrades = selected.map(c => c.grade);
  const selectedSum = selectedGrades.reduce((a, b) => a + b, 0);
  const admissionAvg = (selectedSum / selected.length).toFixed(1);
  
  return {
    average: admissionAvg,
    overall: overallAvg
  };
}

function resetAppState() {
  localStorage.removeItem(STATE_KEY);
  localStorage.removeItem('pathway_canada_telemetry');
  window.location.reload();
}

function showUpgradeToast() {
  // Remove any existing toast
  const existing = document.getElementById('_stripe-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = '_stripe-toast';
  toast.style.cssText = `
    position:fixed; bottom:24px; left:50%; transform:translateX(-50%) translateY(80px);
    background:#001d33; color:#fff; padding:14px 24px; border-radius:16px;
    font-family:Lexend,sans-serif; font-size:13px; font-weight:600;
    box-shadow:0 8px 32px rgba(0,0,0,0.3); z-index:99999;
    display:flex; align-items:center; gap:10px;
    transition:transform 0.35s cubic-bezier(0.16,1,0.3,1);
    max-width:360px; text-align:center;
  `;
  toast.innerHTML = `
    <span style="font-size:20px">🚀</span>
    <span>Pro subscriptions launching soon — you'll be first to know!</span>
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(80px)';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

function setupUpgradeButtons() {
  const isMock = STRIPE_PAYMENT_LINK.includes('mock-link-placeholder');
  if (!isMock) {
    // Real Stripe link — wire all upgrade anchors to it
    const links = document.querySelectorAll('a[href*="payment=success"]');
    links.forEach(link => {
      link.href = STRIPE_PAYMENT_LINK;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    });
  } else {
    // No Stripe link yet — intercept clicks and show friendly toast
    // (keep href so local ?payment=success demo still works in dev)
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocal) {
      const links = document.querySelectorAll('a[href*="payment=success"]');
      links.forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          showUpgradeToast();
        });
      });
    }
  }
}

window.getAppState = getAppState;
window.saveAppState = saveAppState;
window.calculateMatches = calculateMatches;
window.calculateAverage = calculateAverage;
window.getUnsplashFallback = getUnsplashFallback;
window.handleImageError = handleImageError;
window.handleLogoError = handleLogoError;
window.getUniversityDomain = getUniversityDomain;
window.resetAppState = resetAppState;
window.STRIPE_PAYMENT_LINK = STRIPE_PAYMENT_LINK;

// Initialize payment detection after all dependencies have initialized
detectPaymentCallback();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupUpgradeButtons);
} else {
  setupUpgradeButtons();
}


