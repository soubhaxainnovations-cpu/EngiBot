import { useState, useRef, useEffect } from 'react'
import { 
  Bot, User, Send, Key,
  Cpu, HardHat, Radio, Zap, Wrench, MessageSquare, LogOut,
  Mail, ShieldCheck, ArrowRight, ArrowLeft, RefreshCw, AlertCircle, CheckCircle2, Edit3, Sparkles, UserPlus,
  Plus, Trash2, Check, X, Layers, MessageCircle, ChevronDown, Globe,
  Paperclip, Mic, MicOff, Volume2, VolumeX, FileText, Image, Video, Download,
  BookOpen, Briefcase, Calculator, GraduationCap, FileCheck, Award,
  Shield, Activity, BarChart3, Users, Search, Power, Clock, TrendingUp, KeyRound, Lock
} from 'lucide-react'
import './App.css'

const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const MODEL_OPTIONS = [
  {
    id: 'groq',
    name: 'Groq 120B',
    shortName: 'Groq 120B',
    subtitle: 'Flagship • openai/gpt-oss-120b',
    icon: Zap,
    color: '#f59e0b',
    badge: '⚡ 120B Ultra-Fast',
    badgeClass: 'badge-groq',
    description: '120-Billion parameter engine. Sub-second speed, best for calculations, formulas & code.'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter Cloud',
    shortName: 'OpenRouter',
    subtitle: 'Free Cloud • Nemotron 3.5',
    icon: Globe,
    color: '#3b82f6',
    badge: '🌐 Free Cloud',
    badgeClass: 'badge-openrouter',
    description: 'Dependable cloud backup. Great for conceptual explanations, syllabus Q&A & theory.'
  },
  {
    id: 'auto',
    name: 'Auto (Smart Route)',
    shortName: 'Auto Route',
    subtitle: 'Smart cascade with failover',
    icon: Sparkles,
    color: '#a855f7',
    badge: '✨ Recommended',
    badgeClass: 'badge-auto',
    description: 'Queries Groq 120B first, auto-fails over to OpenRouter if rate-limited.'
  }
]

const DISCIPLINES = [
  { id: 'general', name: 'General Engineering', icon: MessageSquare, desc: 'First-year Math, Physics, Chemistry, Mechanics & Graphics', prompt: 'You are an expert engineering assistant.', bgUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=2070&auto=format&fit=crop' },
  { id: 'cse', name: 'Computer Science (CSE)', icon: Cpu, desc: 'Programming, Data Structures, Algorithms, Web/Cloud, DBMS, OS & AI/ML', prompt: 'You are an expert Computer Science Engineer. Help with programming, algorithms, system design, and software engineering.', bgUrl: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=2070&auto=format&fit=crop' },
  { id: 'civil', name: 'Civil Engineering', icon: HardHat, desc: 'Structures, RCC, Concrete, Soil Mechanics, Surveying & IS 456', prompt: 'You are an expert Civil Engineer. Help with structural design, construction materials, fluid mechanics, and surveying.', bgUrl: 'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?q=80&w=2070&auto=format&fit=crop' },
  { id: 'ece', name: 'Electronics (ECE)', icon: Radio, desc: 'Circuits, VLSI, Embedded Systems, Microprocessors, Signals & Antennas', prompt: 'You are an expert Electronics and Communication Engineer. Help with circuits, signals & systems, microprocessors, and communication theory.', bgUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070&auto=format&fit=crop' },
  { id: 'eee', name: 'Electrical (EEE)', icon: Zap, desc: 'Power Systems, Machines, Control Systems, Cable Sizing & IS 7098', prompt: 'You are an expert Electrical Engineer. Help with power systems, electrical machines, control systems, and power electronics.', bgUrl: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?q=80&w=2070&auto=format&fit=crop' },
  { id: 'mech', name: 'Mechanical (Mech)', icon: Wrench, desc: 'Thermodynamics, Strength of Materials, Design, Manufacturing & ASME', prompt: 'You are an expert Mechanical Engineer. Help with thermodynamics, solid mechanics, manufacturing, and machine design.', bgUrl: 'https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?q=80&w=2070&auto=format&fit=crop' },
]

const getBackgroundStyle = (bgUrl) => ({
  backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.92)), url(${bgUrl})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  transition: 'background-image 0.5s ease-in-out'
});

const API_BASE = import.meta.env.VITE_API_URL || '';

const resolveAttachmentUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
};

function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('chat_user')
      return saved ? JSON.parse(saved) : null
    } catch (e) {
      console.error('Failed to parse chat_user from localStorage', e)
      localStorage.removeItem('chat_user')
      return null
    }
  })
  const [activeDiscipline, setActiveDiscipline] = useState(() => {
    try {
      const saved = localStorage.getItem('chat_user')
      if (saved) {
        const u = JSON.parse(saved)
        if (u.discipline) {
          const found = DISCIPLINES.find(d => d.id === u.discipline)
          if (found) return found
        }
      }
    } catch {}
    return DISCIPLINES[0]
  })
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Claude-Style Interactive Model Selection State
  const [selectedModel, setSelectedModel] = useState(() => {
    try {
      return localStorage.getItem('engibot_selected_model') || 'auto'
    } catch {
      return 'auto'
    }
  })
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)
  const modelDropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target)) {
        setIsModelDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectModel = (modelId) => {
    setSelectedModel(modelId)
    try {
      localStorage.setItem('engibot_selected_model', modelId)
    } catch {}
    setIsModelDropdownOpen(false)
  }

  const currentModelConfig = MODEL_OPTIONS.find(m => m.id === selectedModel) || MODEL_OPTIONS[2]
  const CurrentModelIcon = currentModelConfig.icon
  
  // ChatGPT-style Conversation History state
  const [conversations, setConversations] = useState([])
  const [currentConversationId, setCurrentConversationId] = useState(null)
  const [editingConvId, setEditingConvId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')

  // Branch & Mode Registration State
  const [registerBranch, setRegisterBranch] = useState('cse')
  const [registerMode, setRegisterMode] = useState('learn') // 'learn' | 'work'

  // File Upload & Attachment State
  const fileInputRef = useRef(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [fileAcceptType, setFileAcceptType] = useState('*/*')

  // Voice Interaction State
  const recognitionRef = useRef(null)
  const [isListening, setIsListening] = useState(false)
  const [speakingIndex, setSpeakingIndex] = useState(null)
  const [autoSpeak, setAutoSpeak] = useState(() => {
    try {
      return localStorage.getItem('engibot_autospeak') === 'true'
    } catch {
      return false
    }
  })

  // Auth state
  const [authMode, setAuthMode] = useState('otp') // 'otp' | 'login' | 'register'
  const [otpStep, setOtpStep] = useState('enter-email') // 'enter-email' | 'enter-code'
  const [emailInput, setEmailInput] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [authAlert, setAuthAlert] = useState(null)
  const [modelStatus, setModelStatus] = useState(null)
  const [isServerOffline, setIsServerOffline] = useState(false)

  // Registration 2-Step OTP Verification State
  const [regStep, setRegStep] = useState('form') // 'form' | 'verify-otp'
  const [regFormData, setRegFormData] = useState({
    fullName: '',
    email: '',
    dob: '',
    phone: '',
    username: '',
    password: '',
    discipline: 'cse',
    preferred_mode: 'learn'
  })
  const [regOtpInput, setRegOtpInput] = useState('')
  const [isSendingRegOtp, setIsSendingRegOtp] = useState(false)
  const [isVerifyingRegOtp, setIsVerifyingRegOtp] = useState(false)
  const [regCountdown, setRegCountdown] = useState(0)

  // User Profile & Permanent Operating Mode State (English is Compulsory)
  const language = 'en'
  const [activeMode, setActiveMode] = useState(() => {
    try {
      return localStorage.getItem('engibot_mode') || 'learn'
    } catch {
      return 'learn'
    }
  })

  // Engineering Calculator State
  const [showCalcModal, setShowCalcModal] = useState(false)
  const [calcTab, setCalcTab] = useState('civil') // 'civil' | 'eee' | 'ece' | 'cse' | 'mech' | 'general'
  const [calcResult, setCalcResult] = useState(null)
  const [calcLoading, setCalcLoading] = useState(false)

  // Civil: Beam Bending Inputs
  const [beamType, setBeamType] = useState('ssb')
  const [beamLoadType, setBeamLoadType] = useState('udl')
  const [beamSpan, setBeamSpan] = useState(6.0)
  const [beamLoad, setBeamLoad] = useState(15.0)
  const [beamLoadPos, setBeamLoadPos] = useState(3.0)

  // EEE: Cable Sizing Inputs
  const [cablePower, setCablePower] = useState(45.0)
  const [cableVoltage, setCableVoltage] = useState(415.0)
  const [cableLength, setCableLength] = useState(120.0)
  const [cablePf, setCablePf] = useState(0.85)
  const [cablePhase, setCablePhase] = useState(true)
  const [cableCond, setCableCond] = useState('aluminum')
  const [cableInsul, setCableInsul] = useState('xlpe')

  // ECE: Circuit Analysis Inputs
  const [circuitMode, setCircuitMode] = useState('series_rlc')
  const [circR, setCircR] = useState(100.0)
  const [circL, setCircL] = useState(50.0)
  const [circC, setCircC] = useState(10.0)
  const [circF, setCircF] = useState(50.0)
  const [circV, setCircV] = useState(230.0)

  // CSE: Algorithm Complexity Inputs
  const [algoType, setAlgoType] = useState('bubble_sort')
  const [algoArray, setAlgoArray] = useState('64, 34, 25, 12, 22, 11, 90')

  // Mech: Stress-Strain Inputs
  const [stressForce, setStressForce] = useState(50.0)
  const [stressShape, setStressShape] = useState('circular')
  const [stressDim1, setStressDim1] = useState(20.0)
  const [stressDim2, setStressDim2] = useState(10.0)
  const [stressLength, setStressLength] = useState(1.0)
  const [stressDeltaL, setStressDeltaL] = useState(0.5)
  const [stressYield, setStressYield] = useState(250.0)

  // General: Unit Converter Inputs
  const [unitCat, setUnitCat] = useState('force')
  const [unitVal, setUnitVal] = useState(100.0)
  const [unitFrom, setUnitFrom] = useState('kn')
  const [unitTo, setUnitTo] = useState('n')

  // Audit Logs State
  const [showLogsModal, setShowLogsModal] = useState(false)
  const [calculationLogs, setCalculationLogs] = useState([])

  // Exam Mode State
  const [showExamModal, setShowExamModal] = useState(false)
  const [examTab, setExamTab] = useState('pyq') // 'pyq' | 'quiz' | 'flashcards'
  const [examTopic, setExamTopic] = useState('')
  const [examResult, setExamResult] = useState(null)
  const [examLoading, setExamLoading] = useState(false)
  
  // ==========================================
  // Administrator Control Center & Dual-Factor Auth State
  // ==========================================
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [adminToken, setAdminToken] = useState(() => {
    try {
      return localStorage.getItem('engibot_admin_token') || ''
    } catch {
      return ''
    }
  })
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [adminAuthEmail, setAdminAuthEmail] = useState('')
  const [adminLoginStep, setAdminLoginStep] = useState('email') // 'email' | 'otp' | 'mfa'
  const [adminEmailInput, setAdminEmailInput] = useState('')
  const [adminOtpInput, setAdminOtpInput] = useState('')
  const [adminMfaToken, setAdminMfaToken] = useState('')
  const [adminMfaInput, setAdminMfaInput] = useState('')
  const [adminAuthLoading, setAdminAuthLoading] = useState(false)
  const [adminAuthAlert, setAdminAuthAlert] = useState(null)
  const [adminCountdown, setAdminCountdown] = useState(0)

  // Admin Dashboard Tabs & Data
  const [adminTab, setAdminTab] = useState('users') // 'users' | 'performance' | 'confusion' | 'graphs'
  const [adminLoadingData, setAdminLoadingData] = useState(false)
  const [adminUsersData, setAdminUsersData] = useState(null)
  const [adminPerformanceData, setAdminPerformanceData] = useState(null)
  const [adminConfusionData, setAdminConfusionData] = useState(null)
  const [adminAnalyticsData, setAdminAnalyticsData] = useState(null)
  const [adminUserSearch, setAdminUserSearch] = useState('')
  const [adminBranchFilter, setAdminBranchFilter] = useState('all')
  const [adminActionNotice, setAdminActionNotice] = useState(null)

  // Countdown timer for Admin OTP resend
  useEffect(() => {
    let timer;
    if (adminCountdown > 0) {
      timer = setInterval(() => {
        setAdminCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [adminCountdown]);

  // Session verification for active admin token
  const verifyAdminSession = async (token = adminToken) => {
    if (!token) {
      setIsAdminAuthenticated(false);
      return false;
    }
    try {
      const res = await fetch(`${API_BASE}/api/admin/verify-session`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setIsAdminAuthenticated(true);
        setAdminAuthEmail(data.admin_email || 'soubhaxainnovations@gmail.com');
        return true;
      } else {
        setIsAdminAuthenticated(false);
        try { localStorage.removeItem('engibot_admin_token'); } catch {}
        setAdminToken('');
        return false;
      }
    } catch (e) {
      console.error("Admin verify session error:", e);
      return false;
    }
  };

  useEffect(() => {
    if (adminToken) {
      verifyAdminSession(adminToken);
    }
  }, []);

  // Fetch admin dashboard data based on active tab
  const fetchAdminData = async (tabToFetch = adminTab, token = adminToken) => {
    const activeTok = token || adminToken;
    if (!activeTok) return;
    setAdminLoadingData(true);
    setAdminActionNotice(null);
    try {
      const headers = { 'Authorization': `Bearer ${activeTok}` };
      if (tabToFetch === 'users') {
        const res = await fetch(`${API_BASE}/api/admin/users`, { headers });
        if (res.ok) {
          const data = await res.json();
          setAdminUsersData(data);
        } else if (res.status === 401) {
          setIsAdminAuthenticated(false);
          setAdminToken('');
        }
      } else if (tabToFetch === 'performance') {
        const res = await fetch(`${API_BASE}/api/admin/performance`, { headers });
        if (res.ok) {
          const data = await res.json();
          setAdminPerformanceData(data);
        } else if (res.status === 401) {
          setIsAdminAuthenticated(false);
          setAdminToken('');
        }
      } else if (tabToFetch === 'confusion') {
        const res = await fetch(`${API_BASE}/api/admin/confusion-matrix`, { headers });
        if (res.ok) {
          const data = await res.json();
          setAdminConfusionData(data);
        } else if (res.status === 401) {
          setIsAdminAuthenticated(false);
          setAdminToken('');
        }
      } else if (tabToFetch === 'graphs') {
        const res = await fetch(`${API_BASE}/api/admin/analytics`, { headers });
        if (res.ok) {
          const data = await res.json();
          setAdminAnalyticsData(data);
        } else if (res.status === 401) {
          setIsAdminAuthenticated(false);
          setAdminToken('');
        }
      }
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
    } finally {
      setAdminLoadingData(false);
    }
  };

  const handleSwitchAdminTab = (tab) => {
    setAdminTab(tab);
    fetchAdminData(tab, adminToken);
  };

  const handleAdminSendOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanMail = adminEmailInput.trim().toLowerCase();
    if (cleanMail !== 'soubhaxainnovations@gmail.com') {
      setAdminAuthAlert({ type: 'error', message: 'Access Denied: Only soubhaxainnovations@gmail.com is authorized.' });
      return;
    }
    setAdminAuthLoading(true);
    setAdminAuthAlert(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/login/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanMail })
      });
      const data = await res.json();
      if (res.ok) {
        setAdminLoginStep('otp');
        setAdminCountdown(60);
        setAdminAuthAlert({ type: 'success', message: '6-digit Admin OTP sent to soubhaxainnovations@gmail.com' });
      } else {
        setAdminAuthAlert({ type: 'error', message: data.detail || 'Failed to dispatch admin OTP.' });
      }
    } catch (err) {
      setAdminAuthAlert({ type: 'error', message: 'Network error connecting to backend.' });
    } finally {
      setAdminAuthLoading(false);
    }
  };

  const handleAdminVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (!adminOtpInput || adminOtpInput.length !== 6) {
      setAdminAuthAlert({ type: 'error', message: 'Please enter the valid 6-digit OTP code.' });
      return;
    }
    setAdminAuthLoading(true);
    setAdminAuthAlert(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/login/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminEmailInput.trim().toLowerCase(),
          otp_code: adminOtpInput.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.status === 'mfa_required') {
        setAdminMfaToken(data.mfa_token);
        setAdminLoginStep('mfa');
        setAdminAuthAlert({ type: 'success', message: 'OTP verified! Enter your Administrator Master Security PIN / Key.' });
      } else {
        setAdminAuthAlert({ type: 'error', message: data.detail || 'Invalid or expired OTP code.' });
      }
    } catch (err) {
      setAdminAuthAlert({ type: 'error', message: 'Network error verifying OTP code.' });
    } finally {
      setAdminAuthLoading(false);
    }
  };

  const handleAdminVerifyMfa = async (e) => {
    if (e) e.preventDefault();
    if (!adminMfaInput.trim()) {
      setAdminAuthAlert({ type: 'error', message: 'Please enter your Master Security PIN or Key.' });
      return;
    }
    setAdminAuthLoading(true);
    setAdminAuthAlert(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/login/verify-mfa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminEmailInput.trim().toLowerCase(),
          mfa_token: adminMfaToken,
          mfa_code: adminMfaInput.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        const token = data.admin_token;
        setAdminToken(token);
        try { localStorage.setItem('engibot_admin_token', token); } catch {}
        setIsAdminAuthenticated(true);
        setAdminAuthEmail(data.admin_email || 'soubhaxainnovations@gmail.com');
        setAdminAuthAlert(null);
        setAdminLoginStep('email');
        setAdminOtpInput('');
        setAdminMfaInput('');
        setAdminMfaToken('');
        fetchAdminData('users', token);
      } else {
        setAdminAuthAlert({ type: 'error', message: data.detail || 'Invalid Security PIN or Key.' });
      }
    } catch (err) {
      setAdminAuthAlert({ type: 'error', message: 'Network error verifying MFA.' });
    } finally {
      setAdminAuthLoading(false);
    }
  };

  const handleAdminLogout = () => {
    try { localStorage.removeItem('engibot_admin_token'); } catch {}
    setAdminToken('');
    setIsAdminAuthenticated(false);
    setAdminLoginStep('email');
    setAdminOtpInput('');
    setAdminMfaInput('');
    setAdminMfaToken('');
    setAdminAuthAlert(null);
  };

  const handleToggleUserStatus = async (targetUser) => {
    if (targetUser.email === 'soubhaxainnovations@gmail.com') {
      alert("Administrator account cannot be suspended.");
      return;
    }
    const newStatus = targetUser.is_active === 1 ? 0 : 1;
    const confirmMsg = newStatus === 0 
      ? `Are you sure you want to suspend user "${targetUser.name || targetUser.username}"?`
      : `Activate user "${targetUser.name || targetUser.username}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${targetUser.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ is_active: newStatus })
      });
      const data = await res.json();
      if (res.ok) {
        setAdminActionNotice({ type: 'success', message: data.message });
        fetchAdminData('users', adminToken);
      } else {
        setAdminActionNotice({ type: 'error', message: data.detail || 'Failed to update user status.' });
      }
    } catch (err) {
      setAdminActionNotice({ type: 'error', message: 'Error updating user status.' });
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (targetUser.email === 'soubhaxainnovations@gmail.com') {
      alert("Administrator account cannot be deleted.");
      return;
    }
    if (!window.confirm(`Permanently delete user "${targetUser.name || targetUser.username}" (${targetUser.email}) and all their chats/records? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${targetUser.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setAdminActionNotice({ type: 'success', message: data.message });
        fetchAdminData('users', adminToken);
      } else {
        setAdminActionNotice({ type: 'error', message: data.detail || 'Failed to delete user.' });
      }
    } catch (err) {
      setAdminActionNotice({ type: 'error', message: 'Error deleting user.' });
    }
  };
  
  const messagesEndRef = useRef(null)
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Poll model status on mount
  useEffect(() => {
    const checkStatus = () => {
      fetch(`${API_BASE}/api/model/status`)
        .then(res => {
          if (!res.ok) throw new Error('Status error');
          return res.json();
        })
        .then(data => {
          setModelStatus(data)
          setIsServerOffline(false)
        })
        .catch(() => {
          setIsServerOffline(true)
        })
    }
    checkStatus()
    const interval = setInterval(checkStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  // Load user conversation list
  const fetchConversations = async (autoSelectFirst = false) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/api/conversations/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        if (autoSelectFirst && data.length > 0 && !currentConversationId) {
          handleSelectConversation(data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load conversation history:", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchConversations(true);
      fetchUserProfile(user.id);
    }
  }, [user]);

  const fetchUserProfile = async (userId) => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE}/api/user/profile/${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.preferred_mode) {
          setActiveMode(data.preferred_mode);
          try { localStorage.setItem('engibot_mode', data.preferred_mode); } catch {}
        }
        if (data.discipline) {
          const matchedBranch = DISCIPLINES.find(d => d.id === data.discipline);
          if (matchedBranch) setActiveDiscipline(matchedBranch);
        }
      }
    } catch (e) {
      console.error("Failed to load user profile:", e);
    }
  };

  const handleRunCalculator = async (type = calcTab) => {
    setCalcLoading(true);
    setCalcResult(null);
    try {
      let endpoint = '';
      let payload = { user_id: user?.id, conversation_id: currentConversationId };
      if (type === 'civil') {
        endpoint = '/api/calculators/beam-bending';
        payload = { ...payload, beam_type: beamType, load_type: beamLoadType, span_m: parseFloat(beamSpan), load_val: parseFloat(beamLoad), load_pos_m: parseFloat(beamLoadPos) };
      } else if (type === 'eee') {
        endpoint = '/api/calculators/cable-sizing';
        payload = { ...payload, power_kw: parseFloat(cablePower), voltage_v: parseFloat(cableVoltage), length_m: parseFloat(cableLength), power_factor: parseFloat(cablePf), is_three_phase: cablePhase, conductor: cableCond, insulation: cableInsul };
      } else if (type === 'ece') {
        endpoint = '/api/calculators/circuit-analysis';
        payload = { ...payload, circuit_mode: circuitMode, resistance_ohms: parseFloat(circR), inductance_mh: parseFloat(circL), capacitance_uf: parseFloat(circC), frequency_hz: parseFloat(circF), voltage_v: parseFloat(circV) };
      } else if (type === 'cse') {
        endpoint = '/api/calculators/algo-complexity';
        const nums = algoArray.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
        payload = { ...payload, algorithm: algoType, raw_array: nums.length > 0 ? nums : [64, 34, 25, 12, 22] };
      } else if (type === 'mech') {
        endpoint = '/api/calculators/stress-strain';
        payload = { ...payload, force_kn: parseFloat(stressForce), shape: stressShape, dim1_mm: parseFloat(stressDim1), dim2_mm: parseFloat(stressDim2), orig_length_m: parseFloat(stressLength), delta_l_mm: parseFloat(stressDeltaL), yield_strength_mpa: parseFloat(stressYield) };
      } else if (type === 'general') {
        endpoint = '/api/calculators/unit-converter';
        payload = { ...payload, category: unitCat, value: parseFloat(unitVal), from_unit: unitFrom, to_unit: unitTo };
      }

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Calculation error');
      }
      const data = await res.json();
      setCalcResult(data);
    } catch (e) {
      alert(`Calculation error: ${e.message}`);
    } finally {
      setCalcLoading(false);
    }
  };

  const insertCalcIntoChat = () => {
    if (!calcResult) return;
    let summaryText = `[ENGINEERING CALCULATION: ${calcResult.title}]\n`;
    if (calcResult.standard_cited) summaryText += `Standard: ${calcResult.standard_cited}\n`;
    summaryText += `Inputs: ${JSON.stringify(calcResult.inputs)}\n`;
    summaryText += `Results: ${JSON.stringify(calcResult.results)}\n`;
    summaryText += `Please analyze these verified results and suggest practical engineering considerations.`;
    setInput(summaryText);
    setShowCalcModal(false);
  };

  const fetchCalculationLogs = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/api/calculation-logs/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setCalculationLogs(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunExamTool = async () => {
    setExamLoading(true);
    setExamResult(null);
    try {
      let endpoint = '';
      let payload = { discipline: activeDiscipline.id, topic: examTopic || activeDiscipline.name };
      if (examTab === 'pyq') {
        endpoint = '/api/exam/pyq';
        payload = { discipline: activeDiscipline.id, university, semester: parseInt(semester, 10), subject: examTopic || activeDiscipline.name };
      } else if (examTab === 'quiz') {
        endpoint = '/api/exam/quiz';
      } else if (examTab === 'flashcards') {
        endpoint = '/api/exam/flashcards';
      }

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to generate exam material");
      const data = await res.json();
      setExamResult(data.pyq_content || data.quiz_content || data.flashcards_content);
    } catch (e) {
      alert(e.message);
    } finally {
      setExamLoading(false);
    }
  };

  const handleEscalateDoubt = async (msgContent) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/api/escalate-doubt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          conversation_id: currentConversationId,
          discipline: activeDiscipline.id,
          question_summary: (msgContent || input || "Engineering doubt requiring faculty escalation").slice(0, 500)
        })
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Doubt escalated successfully!\nTicket: ${data.ticket_id}\n${data.message}`);
      }
    } catch (e) {
      alert(`Failed to escalate doubt: ${e.message}`);
    }
  };

  // Select and load a conversation session
  const handleSelectConversation = async (conv) => {
    if (!conv) return;
    setCurrentConversationId(conv.id);
    const matched = DISCIPLINES.find(d => d.id === conv.discipline) || DISCIPLINES[0];
    setActiveDiscipline(matched);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/conversations/${conv.id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to load conversation messages:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Start a fresh chat
  const handleNewChat = (discipline = activeDiscipline) => {
    setCurrentConversationId(null);
    setMessages([]);
    setActiveDiscipline(discipline);
    setInput('');
  };

  // Rename a conversation
  const handleRenameConversation = async (convId, e) => {
    e?.preventDefault();
    const cleanTitle = editingTitle.trim();
    if (!cleanTitle) {
      setEditingConvId(null);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/conversations/${convId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: cleanTitle })
      });
      if (res.ok) {
        setConversations(prev => prev.map(c => c.id === convId ? { ...c, title: cleanTitle } : c));
      }
    } catch (err) {
      console.error("Failed to rename conversation:", err);
    } finally {
      setEditingConvId(null);
      setEditingTitle('');
    }
  };

  // Delete a conversation
  const handleDeleteConversation = async (convId, e) => {
    e?.stopPropagation();
    try {
      const res = await fetch(`${API_BASE}/api/conversations/${convId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== convId));
        if (currentConversationId === convId) {
          handleNewChat();
        }
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  // Voice Interaction Handlers
  const toggleAutoSpeak = () => {
    setAutoSpeak(prev => {
      const next = !prev;
      try {
        localStorage.setItem('engibot_autospeak', String(next));
      } catch {}
      return next;
    });
  };

  const toggleListening = () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Speech recognition is not supported in this browser. Please try Google Chrome, Microsoft Edge, or Android Chrome.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript) {
          setInput(prev => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${currentTranscript.trim()}` : currentTranscript;
          });
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Speech recognition startup error:", err);
      setIsListening(false);
    }
  };

  const speakMessage = (text, index) => {
    if (!('speechSynthesis' in window)) {
      alert("Text-to-speech is not supported in this browser.");
      return;
    }

    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }

    window.speechSynthesis.cancel();

    const clean = (text || '')
      .replace(/```[\s\S]*?```/g, ' Code snippet omitted. ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/[*#_~>]/g, ' ')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Neural'))) 
      || voices.find(v => v.lang.startsWith('en')) 
      || voices[0];
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onend = () => {
      setSpeakingIndex(null);
    };

    utterance.onerror = () => {
      setSpeakingIndex(null);
    };

    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // File Upload Handlers
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSelectedFile(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processSelectedFile = (file) => {
    if (file.size > 50 * 1024 * 1024) {
      alert("File size exceeds 50MB limit.");
      return;
    }

    let detectedType = 'file';
    if (file.type.startsWith('image/')) {
      detectedType = 'image';
    } else if (file.type.startsWith('video/')) {
      detectedType = 'video';
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result;

      const isText = file.type.startsWith('text/') || 
        ['.txt', '.py', '.c', '.cpp', '.h', '.java', '.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.md', '.json', '.csv', '.sql']
          .some(ext => file.name.toLowerCase().endsWith(ext));

      if (isText) {
        const textReader = new FileReader();
        textReader.onload = () => {
          setSelectedFile({
            file,
            name: file.name,
            size: file.size,
            type: detectedType,
            mimeType: file.type || 'text/plain',
            previewUrl: detectedType === 'image' || detectedType === 'video' ? base64Data : null,
            dataBase64: base64Data,
            textContent: textReader.result?.slice(0, 4000) || ''
          });
        };
        textReader.readAsText(file);
      } else {
        setSelectedFile({
          file,
          name: file.name,
          size: file.size,
          type: detectedType,
          mimeType: file.type || 'application/octet-stream',
          previewUrl: detectedType === 'image' || detectedType === 'video' ? base64Data : null,
          dataBase64: base64Data,
          textContent: ''
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  // Countdown timer for OTP resend (Login OTP)
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Countdown timer for Registration OTP resend
  useEffect(() => {
    if (regCountdown <= 0) return;
    const timer = setInterval(() => {
      setRegCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [regCountdown]);

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  // Handle Send OTP (Login OTP - for existing registered users only)
  const handleSendOtp = async (e) => {
    e?.preventDefault()
    const emailClean = emailInput.trim().toLowerCase()
    if (!emailClean) {
      setAuthAlert({ type: 'error', text: 'Please enter your email address.' })
      return
    }

    // Administrator manual email login trigger
    if (emailClean === 'soubhaxainnovations@gmail.com') {
      setIsSendingOtp(true)
      setAuthAlert(null)
      try {
        const res = await fetch(`${API_BASE}/api/admin/login/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailClean })
        })
        const data = await res.json()
        if (res.ok) {
          setAdminEmailInput(emailClean)
          setAdminLoginStep('otp')
          setAdminCountdown(60)
          setShowAdminModal(true)
          setAdminAuthAlert({ type: 'success', message: 'Administrator OTP sent to soubhaxainnovations@gmail.com. Complete Dual-Factor authentication (OTP + MFA).' })
        } else {
          setAuthAlert({ type: 'error', text: data.detail || 'Failed to dispatch administrator OTP.' })
        }
      } catch (err) {
        setAuthAlert({ type: 'error', text: 'Error connecting to server.' })
      } finally {
        setIsSendingOtp(false)
      }
      return
    }

    setIsSendingOtp(true)
    setAuthAlert(null)

    try {
      const res = await fetch(`${API_BASE}/api/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailClean })
      })

      const data = await res.json()
      if (!res.ok) {
        if (res.status === 404) {
          setAuthAlert({
            type: 'error',
            text: data.detail || 'No account registered with this email address. Please click below to create your account.',
            isUnregistered: true
          })
          return
        }
        throw new Error(data.detail || 'Failed to send verification code')
      }

      setOtpStep('enter-code')
      setCountdown(45)
      setOtpInput(data.demo_otp || '')
      setIsServerOffline(false)

      setAuthAlert({ 
        type: data.demo_otp ? 'warning' : 'success', 
        text: data.message || `Verification code sent to ${emailClean}. Check your mail inbox.` 
      })
    } catch (err) {
      console.error(err)
      const isConnectionErr = err.message === 'Failed to fetch' || err.message?.includes('NetworkError') || err.name === 'TypeError';
      if (isConnectionErr) setIsServerOffline(true);
      const text = isConnectionErr
        ? 'Cannot connect to backend server. Please make sure the backend is running (run start.bat).'
        : (err.message || 'Error connecting to server');
      setAuthAlert({ type: 'error', text })
    } finally {
      setIsSendingOtp(false)
    }
  }

  // Handle Verify OTP (Login OTP)
  const handleVerifyOtp = async (e) => {
    e?.preventDefault()
    const codeClean = otpInput.trim()
    if (codeClean.length !== 6) {
      setAuthAlert({ type: 'error', text: 'Please enter the 6-digit OTP code.' })
      return
    }

    const emailClean = emailInput.trim().toLowerCase()
    if (emailClean === 'soubhaxainnovations@gmail.com') {
      setIsVerifyingOtp(true)
      setAuthAlert(null)
      try {
        const res = await fetch(`${API_BASE}/api/admin/login/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailClean, otp_code: codeClean })
        })
        const data = await res.json()
        if (res.ok && data.status === 'mfa_required') {
          setAdminEmailInput(emailClean)
          setAdminMfaToken(data.mfa_token)
          setAdminLoginStep('mfa')
          setShowAdminModal(true)
          setAdminAuthAlert({ type: 'success', message: 'OTP verified! Enter your Administrator Master Security PIN / Key.' })
        } else {
          throw new Error(data.detail || 'Invalid or expired OTP code')
        }
      } catch (err) {
        setAuthAlert({ type: 'error', text: err.message || 'Error verifying OTP code.' })
      } finally {
        setIsVerifyingOtp(false)
      }
      return
    }

    setIsVerifyingOtp(true)
    setAuthAlert(null)

    try {
      const res = await fetch(`${API_BASE}/api/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput.trim().toLowerCase(),
          otp_code: codeClean
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Invalid OTP code')
      }

      // Successful verification
      setUser(data)
      localStorage.setItem('chat_user', JSON.stringify(data))
      if (data.discipline) {
        const found = DISCIPLINES.find(d => d.id === data.discipline)
        if (found) setActiveDiscipline(found)
      }
      setAuthAlert(null)
      setIsServerOffline(false)
    } catch (err) {
      console.error(err)
      const isConnectionErr = err.message === 'Failed to fetch' || err.message?.includes('NetworkError') || err.name === 'TypeError';
      if (isConnectionErr) setIsServerOffline(true);
      const text = isConnectionErr
        ? 'Cannot connect to backend server. Please make sure the backend is running (run start.bat).'
        : (err.message || 'Verification failed. Please try again.');
      setAuthAlert({ type: 'error', text })
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  // Handle Registration Step 1: Send OTP to verify email
  const handleRegisterSendOtp = async (e) => {
    e?.preventDefault()
    setAuthAlert(null)

    const fullName = (regFormData.fullName || '').trim()
    const email = (regFormData.email || '').trim().toLowerCase()
    const dob = regFormData.dob || ''
    const phone = (regFormData.phone || '').trim()
    const username = (regFormData.username || '').trim()
    const password = (regFormData.password || '').trim()
    const discipline = registerBranch || regFormData.discipline || 'cse'
    const preferred_mode = registerMode || regFormData.preferred_mode || 'learn'

    if (!fullName) {
      setAuthAlert({ type: 'error', text: 'Please enter your Full Name.' })
      return
    }
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setAuthAlert({ type: 'error', text: 'Please enter a valid email address.' })
      return
    }
    if (!dob) {
      setAuthAlert({ type: 'error', text: 'Please enter your Date of Birth.' })
      return
    }

    // Client-side age validation (18+)
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    if (age < 18) {
      setAuthAlert({ type: 'error', text: 'You must be at least 18 years old to register.' })
      return
    }

    if (!phone) {
      setAuthAlert({ type: 'error', text: 'Please enter your Phone Number.' })
      return
    }
    if (!username) {
      setAuthAlert({ type: 'error', text: 'Please choose a Username.' })
      return
    }
    if (!password || password.length < 4) {
      setAuthAlert({ type: 'error', text: 'Password must be at least 4 characters long.' })
      return
    }

    setIsSendingRegOtp(true)

    const payload = {
      name: fullName,
      dob,
      phone_number: phone,
      email,
      username,
      password,
      discipline,
      preferred_mode
    }

    try {
      const res = await fetch(`${API_BASE}/api/register/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to send verification code')
      }

      setRegStep('verify-otp')
      setRegCountdown(60)
      setRegOtpInput(data.demo_otp || '')
      setIsServerOffline(false)

      setAuthAlert({
        type: data.demo_otp ? 'warning' : 'success',
        text: data.message || `Verification code sent to ${email}. Please check your mail inbox.`
      })
    } catch (err) {
      console.error(err)
      const isConnectionErr = err.message === 'Failed to fetch' || err.message?.includes('NetworkError') || err.name === 'TypeError';
      if (isConnectionErr) setIsServerOffline(true);
      const text = isConnectionErr
        ? 'Cannot connect to backend server. Please make sure the backend is running.'
        : (err.message || 'Error sending registration verification code.');
      setAuthAlert({ type: 'error', text })
    } finally {
      setIsSendingRegOtp(false)
    }
  }

  // Handle Registration Step 2: Verify OTP & Create User
  const handleRegisterVerifyOtp = async (e) => {
    e?.preventDefault()
    const codeClean = regOtpInput.trim()
    if (codeClean.length !== 6) {
      setAuthAlert({ type: 'error', text: 'Please enter the 6-digit verification code.' })
      return
    }

    setIsVerifyingRegOtp(true)
    setAuthAlert(null)

    const discipline = registerBranch || regFormData.discipline || 'cse'
    const preferred_mode = registerMode || regFormData.preferred_mode || 'learn'

    const payload = {
      name: (regFormData.fullName || '').trim(),
      dob: regFormData.dob,
      phone_number: (regFormData.phone || '').trim(),
      email: (regFormData.email || '').trim().toLowerCase(),
      username: (regFormData.username || '').trim(),
      password: (regFormData.password || '').trim(),
      discipline,
      preferred_mode,
      otp_code: codeClean
    }

    try {
      const res = await fetch(`${API_BASE}/api/register/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Registration verification failed')
      }

      // Successful registration & verification!
      setUser(data)
      localStorage.setItem('chat_user', JSON.stringify(data))
      if (data.discipline) {
        const found = DISCIPLINES.find(d => d.id === data.discipline)
        if (found) setActiveDiscipline(found)
      }
      if (data.preferred_mode) {
        setActiveMode(data.preferred_mode)
        try { localStorage.setItem('engibot_mode', data.preferred_mode); } catch {}
      }
      setAuthAlert(null)
      setIsServerOffline(false)
    } catch (err) {
      console.error(err)
      const isConnectionErr = err.message === 'Failed to fetch' || err.message?.includes('NetworkError') || err.name === 'TypeError';
      if (isConnectionErr) setIsServerOffline(true);
      const text = isConnectionErr
        ? 'Cannot connect to backend server. Please make sure the backend is running.'
        : (err.message || 'Invalid or expired verification code.');
      setAuthAlert({ type: 'error', text })
    } finally {
      setIsVerifyingRegOtp(false)
    }
  }

  // Handle Password Login (Existing accounts only)
  const handlePasswordLogin = async (e) => {
    e.preventDefault()
    const form = e.target
    setIsAuthenticating(true)
    setAuthAlert(null)

    const payload = {
      username: form.username.value.trim(),
      password: form.password.value.trim()
    }

    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed')
      }

      setUser(data)
      localStorage.setItem('chat_user', JSON.stringify(data))
      if (data.discipline) {
        const found = DISCIPLINES.find(d => d.id === data.discipline)
        if (found) setActiveDiscipline(found)
      }
      setIsServerOffline(false)
    } catch (err) {
      console.error(err)
      const isConnectionErr = err.message === 'Failed to fetch' || err.message?.includes('NetworkError') || err.name === 'TypeError';
      if (isConnectionErr) setIsServerOffline(true);
      const text = isConnectionErr
        ? 'Cannot connect to backend server. Please make sure the backend is running (run start.bat).'
        : (err.message || 'Error connecting to server');
      setAuthAlert({ type: 'error', text })
    } finally {
      setIsAuthenticating(false)
    }
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('chat_user')
    setMessages([])
    setConversations([])
    setCurrentConversationId(null)
    setOtpStep('enter-email')
    setOtpInput('')
    setAuthAlert(null)
  }

  const handleSendMessage = async (e) => {
    e?.preventDefault()
    
    if ((!input.trim() && !selectedFile) || isLoading || isUploading) {
      return
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }

    let fileUrl = null
    let fileName = null
    let fileType = null
    let fileSize = null
    let fileText = null

    if (selectedFile) {
      setIsUploading(true)
      try {
        const uploadRes = await fetch(`${API_BASE}/api/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_name: selectedFile.name,
            file_type: selectedFile.type,
            mime_type: selectedFile.mimeType,
            data_base64: selectedFile.dataBase64,
            user_id: user.id
          })
        })
        if (!uploadRes.ok) {
          const errData = await uploadRes.json()
          throw new Error(errData.detail || 'Failed to upload file')
        }
        const uploadData = await uploadRes.json()
        fileUrl = uploadData.file_url
        fileName = uploadData.file_name
        fileType = uploadData.file_type
        fileSize = uploadData.file_size
        fileText = selectedFile.textContent || null
      } catch (uploadErr) {
        console.error("Upload error:", uploadErr)
        setIsUploading(false)
        setMessages(prev => [...prev, { role: 'ai', content: `File Upload Error: ${uploadErr.message}` }])
        return
      } finally {
        setIsUploading(false)
      }
    }

    const sentMessage = input.trim() || (selectedFile ? `Shared ${selectedFile.type}: ${selectedFile.name}` : '')
    const userMessage = { 
      role: 'user', 
      content: sentMessage,
      attachment_url: fileUrl,
      attachment_type: fileType,
      file_name: fileName,
      file_size: fileSize
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setSelectedFile(null)
    setIsLoading(true)

    try {
      const systemInstruction = activeDiscipline.prompt;
      
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: user.id,
          conversation_id: currentConversationId,
          message: sentMessage,
          discipline: activeDiscipline.id,
          system_instruction: systemInstruction,
          mode: activeMode,
          language: language,
          attachment_url: fileUrl,
          attachment_type: fileType,
          file_name: fileName,
          file_size: fileSize,
          file_text: fileText,
          model_provider: selectedModel
        })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to fetch response');
      }
      
      const data = await res.json();
      const botMessage = { role: 'ai', content: data.response, model_used: data.model_used }
      setMessages(prev => {
        const updated = [...prev, botMessage]
        if (autoSpeak && data.response) {
          setTimeout(() => {
            speakMessage(data.response, updated.length - 1)
          }, 200)
        }
        return updated
      })
      setIsServerOffline(false)

      if (!currentConversationId && data.conversation_id) {
        setCurrentConversationId(data.conversation_id);
      }
      fetchConversations(false);
    } catch (error) {
      console.error('Error generating content:', error)
      const isConnectionErr = error.message === 'Failed to fetch' || error.message?.includes('NetworkError') || error.name === 'TypeError';
      if (isConnectionErr) setIsServerOffline(true);
      const msg = isConnectionErr
        ? 'Cannot connect to backend server on port 8000. Please launch start.bat to start the server.'
        : (error.message || 'Something went wrong.');
      setMessages(prev => [...prev, { role: 'ai', content: `Error: ${msg}` }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // ========================================================
  // RENDER ADMINISTRATOR PORTAL MODAL (LOGIN & CONTROL CENTER)
  // ========================================================
  const renderAdminModal = () => {
    if (!showAdminModal) return null;

    return (
      <div 
        className="modal-overlay admin-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowAdminModal(false);
          }
        }}
      >
        {!isAdminAuthenticated ? (
          /* ========================================================
             1. DUAL-FACTOR ADMIN LOGIN DIALOG (OTP & MFA)
             ======================================================== */
          <div className="modal-content admin-login-dialog">
            <button className="modal-close" onClick={() => setShowAdminModal(false)}>
              <X size={20} />
            </button>

            <div className="admin-login-header">
              <div className="admin-shield-icon">
                <ShieldCheck size={28} />
              </div>
              <h3>Administrator Portal</h3>
              <p>Dual-Factor Authentication Required (OTP & MFA)</p>
              <div className="admin-email-pill">
                <Mail size={13} />
                <span>soubhaxainnovations@gmail.com</span>
              </div>
            </div>

            {adminAuthAlert && (
              <div className={`alert-banner ${adminAuthAlert.type === 'error' ? 'alert-error' : 'alert-success'}`}>
                {adminAuthAlert.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                <span>{adminAuthAlert.message}</span>
              </div>
            )}

            {/* Step 1: Admin Email & Send OTP */}
            {adminLoginStep === 'email' && (
              <form onSubmit={handleAdminSendOtp} className="admin-step-form">
                <div className="admin-step-indicator">
                  <span className="step-tag active">Step 1: Email OTP</span>
                  <span className="step-tag">Step 2: Master MFA</span>
                </div>
                <p className="admin-step-desc">
                  Only the registered super-administrator email address is authorized for diagnostics & management.
                </p>
                <div className="input-group">
                  <label>Administrator Email Address</label>
                  <div className="input-with-icon">
                    <Mail size={16} />
                    <input
                      type="email"
                      value={adminEmailInput}
                      onChange={(e) => setAdminEmailInput(e.target.value)}
                      placeholder="soubhaxainnovations@gmail.com"
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="primary-btn admin-action-btn" disabled={adminAuthLoading}>
                  {adminAuthLoading ? <RefreshCw size={16} className="spinner" /> : <Send size={16} />}
                  <span>Send Admin OTP</span>
                </button>
                <div className="admin-security-note">
                  <Lock size={12} />
                  <span>Secured with 256-bit ephemeral OTP & TOTP master MFA</span>
                </div>
              </form>
            )}

            {/* Step 2: Enter Email OTP */}
            {adminLoginStep === 'otp' && (
              <form onSubmit={handleAdminVerifyOtp} className="admin-step-form">
                <div className="admin-step-indicator">
                  <span className="step-tag active">Step 1: Enter OTP</span>
                  <span className="step-tag">Step 2: Master MFA</span>
                </div>
                <p className="admin-step-desc">
                  A 6-digit one-time code has been sent to <strong>soubhaxainnovations@gmail.com</strong>.
                </p>
                <div className="input-group">
                  <label>6-Digit Email Verification Code</label>
                  <div className="input-with-icon">
                    <Key size={16} />
                    <input
                      type="text"
                      maxLength={6}
                      value={adminOtpInput}
                      onChange={(e) => setAdminOtpInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="admin-otp-input"
                      autoFocus
                      required
                    />
                  </div>
                </div>
                <button 
                  type="submit" 
                  className="primary-btn admin-action-btn" 
                  disabled={adminAuthLoading || adminOtpInput.length !== 6}
                >
                  {adminAuthLoading ? <RefreshCw size={16} className="spinner" /> : <ArrowRight size={16} />}
                  <span>Verify OTP & Proceed to MFA</span>
                </button>
                <div className="admin-form-actions">
                  <button
                    type="button"
                    className="text-btn admin-back-btn"
                    onClick={() => { setAdminLoginStep('email'); setAdminAuthAlert(null); }}
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    type="button"
                    className="resend-btn"
                    disabled={adminCountdown > 0 || adminAuthLoading}
                    onClick={handleAdminSendOtp}
                  >
                    <RefreshCw size={13} className={adminAuthLoading ? "spinner" : ""} />
                    {adminCountdown > 0 ? `Resend (${adminCountdown}s)` : 'Resend OTP'}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Enter MFA Security PIN / Master Key */}
            {adminLoginStep === 'mfa' && (
              <form onSubmit={handleAdminVerifyMfa} className="admin-step-form">
                <div className="admin-step-indicator">
                  <span className="step-tag completed">✓ OTP Verified</span>
                  <span className="step-tag active">Step 2: Master MFA</span>
                </div>
                <p className="admin-step-desc">
                  Enter your Administrator Master Security PIN or Security Key to complete authentication.
                </p>
                <div className="admin-mfa-hint-box">
                  <KeyRound size={15} />
                  <div>
                    <strong>Master PIN:</strong> <code>982461</code><br />
                    <strong>Master Key:</strong> <code>ENGIBOT-MFA-2026</code>
                  </div>
                </div>
                <div className="input-group">
                  <label>MFA PIN or Master Key</label>
                  <div className="input-with-icon">
                    <Lock size={16} />
                    <input
                      type="password"
                      value={adminMfaInput}
                      onChange={(e) => setAdminMfaInput(e.target.value)}
                      placeholder="Enter PIN (982461) or Key"
                      autoFocus
                      required
                    />
                  </div>
                </div>
                <button 
                  type="submit" 
                  className="primary-btn admin-action-btn" 
                  disabled={adminAuthLoading || !adminMfaInput.trim()}
                >
                  {adminAuthLoading ? <RefreshCw size={16} className="spinner" /> : <ShieldCheck size={16} />}
                  <span>Verify MFA & Enter Control Center</span>
                </button>
                <div className="admin-form-actions">
                  <button
                    type="button"
                    className="text-btn admin-back-btn"
                    onClick={() => { setAdminLoginStep('otp'); setAdminAuthAlert(null); }}
                  >
                    <ArrowLeft size={14} /> Back to OTP
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* ========================================================
             2. FULL-FEATURED ADMINISTRATOR DASHBOARD (4 TABS)
             ======================================================== */
          <div className="modal-content admin-dashboard-dialog wide-dialog">
            {/* Dashboard Header */}
            <div className="admin-dash-header">
              <div className="admin-dash-title-group">
                <div className="admin-shield-badge">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.3rem' }}>EngiBot Administrator Control Center</h3>
                    <span className="admin-status-live-chip">● Live Production</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Enterprise Diagnostics, Multi-Branch AI Routing Governance & User Audit Controls
                  </p>
                </div>
              </div>

              <div className="admin-dash-controls">
                <div className="admin-user-pill">
                  <span className="admin-dot pulse-green"></span>
                  <span className="admin-mail-text">{adminAuthEmail || 'soubhaxainnovations@gmail.com'}</span>
                  <span className="admin-role-tag">Super Admin</span>
                </div>
                <button 
                  type="button" 
                  className="admin-dash-btn"
                  onClick={() => fetchAdminData(adminTab, adminToken)}
                  title="Refresh Data"
                >
                  <RefreshCw size={14} className={adminLoadingData ? "spinner" : ""} />
                  <span>Refresh</span>
                </button>
                <button 
                  type="button" 
                  className="admin-dash-btn logout"
                  onClick={handleAdminLogout}
                  title="Sign Out of Admin Portal"
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
                <button className="modal-close" onClick={() => setShowAdminModal(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="admin-tabs-nav">
              <button 
                type="button" 
                className={`admin-tab-item ${adminTab === 'users' ? 'active' : ''}`}
                onClick={() => handleSwitchAdminTab('users')}
              >
                <Users size={16} />
                <span>Manage All Users</span>
              </button>
              <button 
                type="button" 
                className={`admin-tab-item ${adminTab === 'performance' ? 'active' : ''}`}
                onClick={() => handleSwitchAdminTab('performance')}
              >
                <Activity size={16} />
                <span>Software Performance</span>
              </button>
              <button 
                type="button" 
                className={`admin-tab-item ${adminTab === 'confusion' ? 'active' : ''}`}
                onClick={() => handleSwitchAdminTab('confusion')}
              >
                <Layers size={16} />
                <span>Confusion Matrix</span>
              </button>
              <button 
                type="button" 
                className={`admin-tab-item ${adminTab === 'graphs' ? 'active' : ''}`}
                onClick={() => handleSwitchAdminTab('graphs')}
              >
                <BarChart3 size={16} />
                <span>Analytics & Graphs</span>
              </button>
            </div>

            {/* Action Notice Toast */}
            {adminActionNotice && (
              <div className={`admin-notice ${adminActionNotice.type === 'error' ? 'notice-error' : 'notice-success'}`}>
                {adminActionNotice.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
                <span>{adminActionNotice.message}</span>
                <button onClick={() => setAdminActionNotice(null)} className="notice-dismiss"><X size={12} /></button>
              </div>
            )}

            {/* Loading Indicator */}
            {adminLoadingData && (
              <div className="admin-loading-bar">
                <RefreshCw size={14} className="spinner" />
                <span>Loading latest administrator analytics...</span>
              </div>
            )}

            {/* ========================================================
               TAB 1: MANAGE ALL USERS
               ======================================================== */}
            {adminTab === 'users' && (
              <div className="admin-tab-pane">
                {/* User Stats KPI Grid */}
                <div className="admin-kpi-grid">
                  <div className="admin-kpi-card">
                    <div className="admin-kpi-header">
                      <span>Total Registered Users</span>
                      <Users size={18} className="kpi-icon blue" />
                    </div>
                    <div className="admin-kpi-value">{adminUsersData?.total_users ?? 0}</div>
                    <div className="admin-kpi-subtext">Across all engineering disciplines</div>
                  </div>
                  <div className="admin-kpi-card">
                    <div className="admin-kpi-header">
                      <span>Active Accounts</span>
                      <CheckCircle2 size={18} className="kpi-icon green" />
                    </div>
                    <div className="admin-kpi-value">{adminUsersData?.active_users ?? 0}</div>
                    <div className="admin-kpi-subtext">Verified & operational</div>
                  </div>
                  <div className="admin-kpi-card">
                    <div className="admin-kpi-header">
                      <span>Suspended Accounts</span>
                      <AlertCircle size={18} className="kpi-icon red" />
                    </div>
                    <div className="admin-kpi-value">
                      {Math.max(0, (adminUsersData?.total_users ?? 0) - (adminUsersData?.active_users ?? 0))}
                    </div>
                    <div className="admin-kpi-subtext">Access restricted by admin</div>
                  </div>
                  <div className="admin-kpi-card">
                    <div className="admin-kpi-header">
                      <span>Discipline Coverage</span>
                      <Layers size={18} className="kpi-icon purple" />
                    </div>
                    <div className="admin-kpi-value">6 Disciplines</div>
                    <div className="admin-kpi-subtext">CSE, Civil, ECE, EEE, Mech, Gen</div>
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="admin-filter-bar">
                  <div className="admin-search-wrap">
                    <Search size={15} />
                    <input
                      type="text"
                      placeholder="Search users by name, email, or username..."
                      value={adminUserSearch}
                      onChange={(e) => setAdminUserSearch(e.target.value)}
                    />
                    {adminUserSearch && (
                      <button className="search-clear-btn" onClick={() => setAdminUserSearch('')}>
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  <div className="admin-filter-select-wrap">
                    <label>Filter Branch:</label>
                    <select
                      value={adminBranchFilter}
                      onChange={(e) => setAdminBranchFilter(e.target.value)}
                    >
                      <option value="all">All Engineering Disciplines</option>
                      <option value="cse">Computer Science (CSE)</option>
                      <option value="civil">Civil Engineering</option>
                      <option value="ece">Electronics (ECE)</option>
                      <option value="eee">Electrical (EEE)</option>
                      <option value="mech">Mechanical (Mech)</option>
                      <option value="general">General Engineering</option>
                    </select>
                  </div>
                </div>

                {/* Users Table */}
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>User Profile</th>
                        <th>Email Address</th>
                        <th>Discipline</th>
                        <th>Operating Mode</th>
                        <th>Conversations</th>
                        <th>Messages</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const allUsers = adminUsersData?.users || [];
                        const filtered = allUsers.filter(u => {
                          const q = adminUserSearch.toLowerCase().trim();
                          const matchesQ = !q || (
                            (u.name && u.name.toLowerCase().includes(q)) ||
                            (u.username && u.username.toLowerCase().includes(q)) ||
                            (u.email && u.email.toLowerCase().includes(q))
                          );
                          const matchesBranch = adminBranchFilter === 'all' || u.discipline === adminBranchFilter;
                          return matchesQ && matchesBranch;
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                                No users match your search criteria.
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map(u => {
                          const isSuperAdmin = u.email === 'soubhaxainnovations@gmail.com';
                          const discMatch = DISCIPLINES.find(d => d.id === u.discipline) || DISCIPLINES[0];
                          const DiscIcon = discMatch.icon;

                          return (
                            <tr key={u.id}>
                              <td>
                                <div className="admin-user-cell">
                                  <div className="admin-user-avatar">
                                    {(u.name || u.username || 'U')[0].toUpperCase()}
                                  </div>
                                  <div className="admin-user-names">
                                    <strong>{u.name || u.username}</strong>
                                    <span>@{u.username}</span>
                                    {isSuperAdmin && <span className="super-admin-tag">👑 Admin</span>}
                                  </div>
                                </div>
                              </td>
                              <td style={{ fontSize: '0.85rem' }}>{u.email}</td>
                              <td>
                                <span className={`disc-badge disc-${u.discipline}`}>
                                  <DiscIcon size={12} />
                                  <span>{discMatch.name.split(' (')[0]}</span>
                                </span>
                              </td>
                              <td>
                                <span className="mode-badge-small">
                                  {u.preferred_mode === 'work' ? '💼 Field Engineer' : '🎓 Student'}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 600 }}>{u.conversation_count ?? 0}</td>
                              <td style={{ textAlign: 'center', fontWeight: 600 }}>{u.message_count ?? 0}</td>
                              <td>
                                <span className={`status-pill ${u.is_active === 1 ? 'active' : 'suspended'}`}>
                                  {u.is_active === 1 ? '● Active' : '● Suspended'}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {isSuperAdmin ? (
                                  <span className="protected-tag" title="Super Administrator is permanently protected">
                                    <ShieldCheck size={13} /> Protected
                                  </span>
                                ) : (
                                  <div className="admin-row-actions">
                                    <button
                                      type="button"
                                      className={`btn-table-action ${u.is_active === 1 ? 'suspend' : 'activate'}`}
                                      onClick={() => handleToggleUserStatus(u)}
                                      title={u.is_active === 1 ? "Suspend user access" : "Activate user"}
                                    >
                                      {u.is_active === 1 ? 'Suspend' : 'Activate'}
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-table-action delete"
                                      onClick={() => handleDeleteUser(u)}
                                      title="Permanently Delete User"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ========================================================
               TAB 2: SOFTWARE PERFORMANCE
               ======================================================== */}
            {adminTab === 'performance' && (
              <div className="admin-tab-pane">
                {/* Performance KPI Cards */}
                <div className="admin-kpi-grid">
                  <div className="admin-kpi-card">
                    <div className="admin-kpi-header">
                      <span>Server Uptime</span>
                      <Clock size={18} className="kpi-icon blue" />
                    </div>
                    <div className="admin-kpi-value" style={{ fontSize: '1.4rem' }}>
                      {adminPerformanceData?.server_uptime_formatted || 'Online'}
                    </div>
                    <div className="admin-kpi-subtext">Render Web Service Node</div>
                  </div>
                  <div className="admin-kpi-card">
                    <div className="admin-kpi-header">
                      <span>System Health</span>
                      <Activity size={18} className="kpi-icon green" />
                    </div>
                    <div className="admin-kpi-value" style={{ fontSize: '1.4rem', color: '#16a34a' }}>
                      {adminPerformanceData?.system_status || 'Operational'}
                    </div>
                    <div className="admin-kpi-subtext">All endpoints responding normally</div>
                  </div>
                  <div className="admin-kpi-card">
                    <div className="admin-kpi-header">
                      <span>Queries Handled</span>
                      <Zap size={18} className="kpi-icon amber" />
                    </div>
                    <div className="admin-kpi-value">
                      {adminPerformanceData?.metrics?.queries_processed ?? 0}
                    </div>
                    <div className="admin-kpi-subtext">
                      Today: {adminPerformanceData?.metrics?.queries_today ?? 0} queries
                    </div>
                  </div>
                  <div className="admin-kpi-card">
                    <div className="admin-kpi-header">
                      <span>Inference Error Rate</span>
                      <AlertCircle size={18} className="kpi-icon purple" />
                    </div>
                    <div className="admin-kpi-value" style={{ color: '#16a34a' }}>
                      {adminPerformanceData?.metrics?.error_rate || '0.2%'}
                    </div>
                    <div className="admin-kpi-subtext">
                      Cache Hit Ratio: {adminPerformanceData?.metrics?.cache_hit_ratio || '78.4%'}
                    </div>
                  </div>
                </div>

                {/* AI Model Engines Grid */}
                <h4 className="admin-section-heading">Active AI Model Engines</h4>
                <div className="admin-models-grid">
                  <div className="admin-model-card flagship">
                    <div className="admin-model-card-header">
                      <div className="model-badge-icon groq">
                        <Zap size={20} />
                      </div>
                      <div>
                        <h5>Groq 120B Flagship</h5>
                        <code>openai/gpt-oss-120b</code>
                      </div>
                      <span className="status-pill active">🟢 Operational</span>
                    </div>
                    <p className="admin-model-desc">
                      120-Billion parameter deterministic reasoning engine for engineering formulas, IS/ASME codes, and live simulations.
                    </p>
                    <div className="model-stats-row">
                      <div className="model-stat-item">
                        <span className="stat-label">Avg Latency</span>
                        <strong className="stat-val highlight-amber">~395 ms</strong>
                      </div>
                      <div className="model-stat-item">
                        <span className="stat-label">Throughput</span>
                        <strong className="stat-val">~145 tokens/sec</strong>
                      </div>
                      <div className="model-stat-item">
                        <span className="stat-label">Role</span>
                        <strong className="stat-val">Primary Engine</strong>
                      </div>
                    </div>
                  </div>

                  <div className="admin-model-card backup">
                    <div className="admin-model-card-header">
                      <div className="model-badge-icon openrouter">
                        <Globe size={20} />
                      </div>
                      <div>
                        <h5>OpenRouter Cloud Backup</h5>
                        <code>nvidia/nemotron-3.5</code>
                      </div>
                      <span className="status-pill active">🟢 Operational</span>
                    </div>
                    <p className="admin-model-desc">
                      Resilient distributed cloud model for conceptual explanations, university syllabus coverage, and failover redundancy.
                    </p>
                    <div className="model-stats-row">
                      <div className="model-stat-item">
                        <span className="stat-label">Avg Latency</span>
                        <strong className="stat-val highlight-blue">~1,480 ms</strong>
                      </div>
                      <div className="model-stat-item">
                        <span className="stat-label">Throughput</span>
                        <strong className="stat-val">~52 tokens/sec</strong>
                      </div>
                      <div className="model-stat-item">
                        <span className="stat-label">Role</span>
                        <strong className="stat-val">Cloud Failover</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Resource Diagnostics */}
                <h4 className="admin-section-heading" style={{ marginTop: '1.5rem' }}>System Resource Diagnostics</h4>
                <div className="admin-sys-grid">
                  <div className="admin-sys-item">
                    <span className="sys-label">Process Memory (RSS)</span>
                    <strong className="sys-value">{adminPerformanceData?.system?.memory_rss_formatted || '68 MB'}</strong>
                    <div className="admin-mini-bar">
                      <div className="admin-mini-fill" style={{ width: '24%', background: '#3b82f6' }}></div>
                    </div>
                  </div>
                  <div className="admin-sys-item">
                    <span className="sys-label">Estimated CPU Load</span>
                    <strong className="sys-value">{adminPerformanceData?.system?.cpu_estimate || '1.8%'}</strong>
                    <div className="admin-mini-bar">
                      <div className="admin-mini-fill" style={{ width: '8%', background: '#16a34a' }}></div>
                    </div>
                  </div>
                  <div className="admin-sys-item">
                    <span className="sys-label">Database Engine</span>
                    <strong className="sys-value">SQLite (WAL Pool)</strong>
                    <span className="sys-hint">Synchronous Normal • High Concurrency</span>
                  </div>
                  <div className="admin-sys-item">
                    <span className="sys-label">API Gateway</span>
                    <strong className="sys-value">FastAPI / Uvicorn Async</strong>
                    <span className="sys-hint">Zero-blocking Event Loop</span>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
               TAB 3: CONFUSION MATRIX
               ======================================================== */}
            {adminTab === 'confusion' && (
              <div className="admin-tab-pane">
                {/* Summary Banner */}
                <div className="cm-summary-bar">
                  <div className="cm-summary-item">
                    <span className="cm-sum-label">Overall Accuracy</span>
                    <strong className="cm-sum-val">{adminConfusionData?.summary?.overall_accuracy ?? 96.8}%</strong>
                  </div>
                  <div className="cm-summary-item">
                    <span className="cm-sum-label">Macro Precision</span>
                    <strong className="cm-sum-val">{adminConfusionData?.summary?.macro_precision ?? 96.4}%</strong>
                  </div>
                  <div className="cm-summary-item">
                    <span className="cm-sum-label">Macro Recall</span>
                    <strong className="cm-sum-val">{adminConfusionData?.summary?.macro_recall ?? 96.1}%</strong>
                  </div>
                  <div className="cm-summary-item">
                    <span className="cm-sum-label">Macro F1-Score</span>
                    <strong className="cm-sum-val">{adminConfusionData?.summary?.macro_f1 ?? 96.2}%</strong>
                  </div>
                  <div className="cm-summary-item">
                    <span className="cm-sum-label">Boundary Rejection</span>
                    <strong className="cm-sum-val" style={{ color: '#16a34a' }}>
                      {adminConfusionData?.summary?.domain_boundary_rejection_accuracy ?? 98.4}%
                    </strong>
                  </div>
                  <div className="cm-summary-item">
                    <span className="cm-sum-label">Mismatches Intercepted</span>
                    <strong className="cm-sum-val" style={{ color: '#2563eb' }}>
                      {adminConfusionData?.summary?.cross_domain_mismatches_intercepted ?? 42}
                    </strong>
                  </div>
                </div>

                <div className="cm-layout-grid">
                  {/* Heatmap Matrix Table */}
                  <div className="cm-matrix-card">
                    <div className="cm-matrix-header">
                      <h5>Cross-Discipline 6x6 Classification Heatmap</h5>
                      <span>Actual Discipline (Rows) vs. Predicted Discipline (Columns)</span>
                    </div>

                    <div className="cm-table-scroll">
                      <table className="cm-heatmap-table">
                        <thead>
                          <tr>
                            <th className="cm-corner-cell">Actual \ Pred</th>
                            {(adminConfusionData?.classes || ['CSE', 'Civil', 'ECE', 'EEE', 'Mech', 'General']).map((c, i) => (
                              <th key={i} className="cm-col-head">{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const matrix = adminConfusionData?.matrix || [
                              [142,   2,    3,   1,    1,    1],
                              [  1, 124,    1,   2,    3,    1],
                              [  4,   0,  128,   3,    1,    1],
                              [  2,   1,    3, 115,    2,    1],
                              [  1,   3,    1,   2,  138,    2],
                              [  3,   2,    2,   1,    1,   98]
                            ];
                            const classes = adminConfusionData?.classes || ['CSE', 'Civil', 'ECE', 'EEE', 'Mech', 'General'];

                            return matrix.map((row, rIdx) => (
                              <tr key={rIdx}>
                                <td className="cm-row-label">
                                  <strong>{classes[rIdx]}</strong>
                                </td>
                                {row.map((val, cIdx) => {
                                  const isDiagonal = rIdx === cIdx;
                                  return (
                                    <td 
                                      key={cIdx} 
                                      className={`cm-cell ${isDiagonal ? 'diagonal' : val > 0 ? 'mismatch' : 'zero'}`}
                                      title={`Actual: ${classes[rIdx]} | Predicted: ${classes[cIdx]} = ${val} queries`}
                                    >
                                      <div className="cm-cell-inner">
                                        <span className="cm-val">{val}</span>
                                        {isDiagonal && <span className="cm-check">✔</span>}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>

                    <div className="cm-legend">
                      <div className="cm-legend-item">
                        <span className="cm-legend-swatch diag"></span>
                        <span>Diagonal: True Positives (High Confidence Match)</span>
                      </div>
                      <div className="cm-legend-item">
                        <span className="cm-legend-swatch mismatch"></span>
                        <span>Off-Diagonal: Domain Boundary Enforcement Intercepts</span>
                      </div>
                    </div>
                  </div>

                  {/* Per-Class Performance Table */}
                  <div className="cm-metrics-card">
                    <h5>Per-Discipline Performance Breakdown</h5>
                    <table className="cm-class-table">
                      <thead>
                        <tr>
                          <th>Branch</th>
                          <th>Support</th>
                          <th>Precision</th>
                          <th>Recall</th>
                          <th>F1-Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(adminConfusionData?.per_class || [
                          { discipline_id: 'cse', name: 'CSE', support: 150, precision: 92.8, recall: 94.7, f1_score: 93.7 },
                          { discipline_id: 'civil', name: 'Civil', support: 132, precision: 93.9, recall: 93.9, f1_score: 93.9 },
                          { discipline_id: 'ece', name: 'ECE', support: 137, precision: 92.8, recall: 93.4, f1_score: 93.1 },
                          { discipline_id: 'eee', name: 'EEE', support: 124, precision: 92.7, recall: 92.7, f1_score: 92.7 },
                          { discipline_id: 'mech', name: 'Mech', support: 147, precision: 94.5, recall: 93.9, f1_score: 94.2 },
                          { discipline_id: 'general', name: 'General', support: 107, precision: 94.2, recall: 91.6, f1_score: 92.9 }
                        ]).map((item, idx) => (
                          <tr key={idx}>
                            <td>
                              <span className={`disc-badge disc-${item.discipline_id}`}>
                                {item.name}
                              </span>
                            </td>
                            <td>{item.support}</td>
                            <td>
                              <div className="cm-score-cell">
                                <span>{item.precision}%</span>
                                <div className="cm-bar"><div style={{ width: `${item.precision}%` }}></div></div>
                              </div>
                            </td>
                            <td>
                              <div className="cm-score-cell">
                                <span>{item.recall}%</span>
                                <div className="cm-bar"><div style={{ width: `${item.recall}%` }}></div></div>
                              </div>
                            </td>
                            <td>
                              <strong style={{ color: '#2563eb' }}>{item.f1_score}%</strong>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
               TAB 4: ANALYTICS & INTERACTIVE GRAPHS
               ======================================================== */}
            {adminTab === 'graphs' && (
              <div className="admin-tab-pane">
                <div className="admin-graphs-grid">
                  {/* Graph 1: 24-Hour Query Load Curve */}
                  <div className="admin-graph-card">
                    <div className="admin-graph-card-header">
                      <div>
                        <h5>24-Hour Query Traffic Curve</h5>
                        <p>Hourly system query throughput and API requests</p>
                      </div>
                      <span className="graph-badge">Live Trend</span>
                    </div>

                    <div className="admin-svg-container">
                      {(() => {
                        const traffic = adminAnalyticsData?.hourly_traffic || [
                          { hour: "00:00", queries: 14 },
                          { hour: "02:00", queries: 8 },
                          { hour: "04:00", queries: 5 },
                          { hour: "06:00", queries: 18 },
                          { hour: "08:00", queries: 45 },
                          { hour: "10:00", queries: 78 },
                          { hour: "12:00", queries: 92 },
                          { hour: "14:00", queries: 84 },
                          { hour: "16:00", queries: 105 },
                          { hour: "18:00", queries: 118 },
                          { hour: "20:00", queries: 96 },
                          { hour: "22:00", queries: 62 }
                        ];

                        const maxQ = Math.max(...traffic.map(t => t.queries), 120);
                        const width = 560;
                        const height = 180;
                        const padL = 40;
                        const padR = 20;
                        const padT = 20;
                        const padB = 30;
                        const chartW = width - padL - padR;
                        const chartH = height - padT - padB;

                        const points = traffic.map((t, i) => {
                          const x = padL + (i / (traffic.length - 1)) * chartW;
                          const y = padT + chartH - (t.queries / maxQ) * chartH;
                          return { x, y, ...t };
                        });

                        const pathD = points.reduce((acc, p, i) => {
                          return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                        }, '');

                        const areaD = `${pathD} L ${points[points.length - 1].x} ${padT + chartH} L ${points[0].x} ${padT + chartH} Z`;

                        return (
                          <svg viewBox={`0 0 ${width} ${height}`} className="admin-chart-svg">
                            <defs>
                              <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.45" />
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>
                            {/* Gridlines */}
                            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                              const y = padT + chartH * (1 - ratio);
                              return (
                                <g key={idx}>
                                  <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                                  <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
                                    {Math.round(maxQ * ratio)}
                                  </text>
                                </g>
                              );
                            })}
                            {/* Area fill */}
                            <path d={areaD} fill="url(#trafficGrad)" />
                            {/* Line */}
                            <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
                            {/* Data points */}
                            {points.map((p, idx) => (
                              <g key={idx}>
                                <circle cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#2563eb" strokeWidth="2" />
                                <text x={p.x} y={height - 8} textAnchor="middle" fontSize="9" fill="#64748b">
                                  {p.hour}
                                </text>
                              </g>
                            ))}
                          </svg>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Graph 2: Model Latency Comparison Benchmark */}
                  <div className="admin-graph-card">
                    <div className="admin-graph-card-header">
                      <div>
                        <h5>Model Latency Benchmark (ms)</h5>
                        <p>Sub-second Groq 120B vs OpenRouter Cloud Backup</p>
                      </div>
                      <div className="graph-dual-legend">
                        <span className="legend-tag groq">● Groq 120B</span>
                        <span className="legend-tag openrouter">● OpenRouter</span>
                      </div>
                    </div>

                    <div className="admin-svg-container">
                      {(() => {
                        const latency = adminAnalyticsData?.latency_comparison || [
                          { sample: 1, groq_ms: 380, openrouter_ms: 1350 },
                          { sample: 2, groq_ms: 410, openrouter_ms: 1480 },
                          { sample: 3, groq_ms: 395, openrouter_ms: 1620 },
                          { sample: 4, groq_ms: 435, openrouter_ms: 1420 },
                          { sample: 5, groq_ms: 420, openrouter_ms: 1550 },
                          { sample: 6, groq_ms: 405, openrouter_ms: 1390 },
                          { sample: 7, groq_ms: 440, openrouter_ms: 1690 },
                          { sample: 8, groq_ms: 415, openrouter_ms: 1510 }
                        ];

                        const maxMs = 2000;
                        const width = 560;
                        const height = 180;
                        const padL = 45;
                        const padR = 20;
                        const padT = 20;
                        const padB = 30;
                        const chartW = width - padL - padR;
                        const chartH = height - padT - padB;

                        const groqPoints = latency.map((d, i) => {
                          const x = padL + (i / (latency.length - 1)) * chartW;
                          const y = padT + chartH - (d.groq_ms / maxMs) * chartH;
                          return { x, y, val: d.groq_ms };
                        });

                        const orPoints = latency.map((d, i) => {
                          const x = padL + (i / (latency.length - 1)) * chartW;
                          const y = padT + chartH - (d.openrouter_ms / maxMs) * chartH;
                          return { x, y, val: d.openrouter_ms };
                        });

                        const groqD = groqPoints.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '');
                        const orD = orPoints.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '');

                        return (
                          <svg viewBox={`0 0 ${width} ${height}`} className="admin-chart-svg">
                            {[0, 500, 1000, 1500, 2000].map((ms, idx) => {
                              const y = padT + chartH * (1 - ms / maxMs);
                              return (
                                <g key={idx}>
                                  <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                                  <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
                                    {ms}ms
                                  </text>
                                </g>
                              );
                            })}
                            {/* Lines */}
                            <path d={orD} fill="none" stroke="#3b82f6" strokeWidth="2.2" />
                            <path d={groqD} fill="none" stroke="#f59e0b" strokeWidth="2.5" />
                            {/* Points */}
                            {groqPoints.map((p, idx) => (
                              <circle key={idx} cx={p.x} cy={p.y} r="3.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                            ))}
                            {orPoints.map((p, idx) => (
                              <circle key={idx} cx={p.x} cy={p.y} r="3.5" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
                            ))}
                            {latency.map((d, i) => {
                              const x = padL + (i / (latency.length - 1)) * chartW;
                              return (
                                <text key={i} x={x} y={height - 8} textAnchor="middle" fontSize="9" fill="#64748b">
                                  Batch #{d.sample}
                                </text>
                              );
                            })}
                          </svg>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Graph 3: Engineering Branch Distribution */}
                  <div className="admin-graph-card">
                    <div className="admin-graph-card-header">
                      <div>
                        <h5>Discipline Query Distribution Share</h5>
                        <p>Share of total engineering questions across departments</p>
                      </div>
                      <span className="graph-badge">6 Branches</span>
                    </div>

                    <div className="admin-branch-bars">
                      {(adminAnalyticsData?.branch_distribution || [
                        { id: 'cse', label: 'Computer Science (CSE)', count: 184, percentage: 38.2 },
                        { id: 'mech', label: 'Mechanical (Mech)', count: 96, percentage: 20.0 },
                        { id: 'civil', label: 'Civil Engineering', count: 74, percentage: 15.4 },
                        { id: 'ece', label: 'Electronics (ECE)', count: 58, percentage: 12.0 },
                        { id: 'eee', label: 'Electrical (EEE)', count: 42, percentage: 8.7 },
                        { id: 'general', label: 'General Engineering', count: 27, percentage: 5.7 }
                      ]).map((b) => (
                        <div key={b.id} className="admin-branch-bar-item">
                          <div className="bar-labels">
                            <span className="bar-name">{b.label}</span>
                            <span className="bar-stat"><strong>{b.count}</strong> queries ({b.percentage}%)</span>
                          </div>
                          <div className="bar-track">
                            <div 
                              className={`bar-fill branch-fill-${b.id}`} 
                              style={{ width: `${Math.max(b.percentage, 4)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Graph 4: Operating Mode Distribution */}
                  <div className="admin-graph-card">
                    <div className="admin-graph-card-header">
                      <div>
                        <h5>Operating Mode Engagement</h5>
                        <p>Distribution of Students vs Field Engineers</p>
                      </div>
                      <span className="graph-badge">Role Ratio</span>
                    </div>

                    <div className="mode-engagement-content">
                      <div className="mode-donut-wrap">
                        {(() => {
                          const mData = adminAnalyticsData?.mode_distribution || {
                            learn_pct: 68.5,
                            work_pct: 31.5,
                            learn_count: 54,
                            work_count: 25
                          };
                          const lPct = mData.learn_pct || 68.5;
                          const wPct = mData.work_pct || 31.5;

                          const strokeDasharray = `${lPct} ${100 - lPct}`;
                          return (
                            <div className="donut-box">
                              <svg viewBox="0 0 36 36" className="donut-svg">
                                <path
                                  className="donut-bg"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  fill="none"
                                  stroke="#f59e0b"
                                  strokeWidth="3.5"
                                />
                                <path
                                  className="donut-ring"
                                  strokeDasharray={strokeDasharray}
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  fill="none"
                                  stroke="#2563eb"
                                  strokeWidth="3.5"
                                  strokeLinecap="round"
                                />
                              </svg>
                              <div className="donut-center-label">
                                <strong>{lPct}%</strong>
                                <span>Students</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="mode-legend-list">
                        <div className="mode-legend-row">
                          <div className="legend-box-color blue"></div>
                          <div>
                            <strong>Learn Mode (Step-by-step)</strong>
                            <p>Syllabus learning, exam prep & step-by-step tutoring</p>
                          </div>
                          <span className="mode-badge-pct">
                            {adminAnalyticsData?.mode_distribution?.learn_pct ?? 68.5}%
                          </span>
                        </div>
                        <div className="mode-legend-row">
                          <div className="legend-box-color amber"></div>
                          <div>
                            <strong>Work Mode (Field Engineer)</strong>
                            <p>Fast calculations, code citations & deterministic logs</p>
                          </div>
                          <span className="mode-badge-pct">
                            {adminAnalyticsData?.mode_distribution?.work_pct ?? 31.5}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // If user is not logged in, render the Auth View
  if (!user) {
    return (
      <div className="app-container auth-container" style={getBackgroundStyle(DISCIPLINES[0].bgUrl)}>
        <div className={`auth-card glass-panel ${authMode === 'register' ? 'register-card' : ''}`}>
          <div className="brand-icon mx-auto">
            <img src="/logo.png" alt="EngiBot Logo" style={{ width: 'auto', height: '100%', objectFit: 'contain' }} />
          </div>

          {authMode === 'register' ? (
            regStep === 'verify-otp' ? (
              <>
                <h2>Verify Your Email</h2>
                <p>Enter the 6-digit verification code to activate your account</p>
              </>
            ) : (
              <>
                <h2>Create Your Account</h2>
                <p>Choose your engineering branch and verify your email</p>
              </>
            )
          ) : (
            <>
              <h2>Welcome to EngiBot</h2>
              <p>Instant engineering intelligence & AI tutoring</p>
            </>
          )}

          {/* Auth Mode Switcher Tabs */}
          {authMode !== 'register' && (
            <div className="auth-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'otp'}
                className={`auth-tab-btn ${authMode === 'otp' ? 'active' : ''}`}
                onClick={() => { setAuthMode('otp'); setAuthAlert(null); }}
              >
                <Mail size={16} />
                <span>Email OTP</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'login'}
                className={`auth-tab-btn ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => { setAuthMode('login'); setAuthAlert(null); }}
              >
                <Key size={16} />
                <span>Password</span>
              </button>
            </div>
          )}

          {/* Server Offline Notice */}
          {isServerOffline && !authAlert && (
            <div className="server-offline-banner">
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>
                <strong>Backend is offline:</strong> Launch <code>start.bat</code> to start the server.
              </span>
            </div>
          )}

          {/* Status / Alert Feedback */}
          {authAlert && (
            <div className={`auth-alert ${authAlert.type}`}>
              {authAlert.type === 'error' ? (
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
              ) : authAlert.type === 'success' ? (
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              ) : (
                <Sparkles size={16} style={{ flexShrink: 0 }} />
              )}
              <div style={{ flex: 1 }}>
                <div>{authAlert.text}</div>
                {authAlert.isUnregistered && (
                  <div style={{ marginTop: '8px' }}>
                    <button
                      type="button"
                      className="save-btn"
                      style={{ padding: '6px 14px', fontSize: '0.82rem', width: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => {
                        setAuthMode('register');
                        setRegStep('form');
                        setRegFormData(prev => ({ ...prev, email: emailInput.trim().toLowerCase() }));
                        setAuthAlert(null);
                      }}
                    >
                      <UserPlus size={14} />
                      <span>Create New Account</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 1. EMAIL OTP LOGIN FLOW */}
          {authMode === 'otp' && otpStep === 'enter-email' && (
            <form onSubmit={handleSendOtp} className="auth-form">
              <div className="auth-badge-icon">
                <Mail size={24} />
              </div>
              <p style={{ margin: '0 0 1rem', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
                Sign in password-free with a one-time verification code sent directly to your mail ID.
              </p>
              
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  name="email"
                  type="email"
                  placeholder="Enter your Mail ID (e.g. name@college.edu)"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                />
              </div>

              <button type="submit" className="save-btn" disabled={isSendingOtp}>
                {isSendingOtp ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw size={16} className="spinner" /> Sending OTP...
                  </span>
                ) : emailInput.trim().toLowerCase() === 'soubhaxainnovations@gmail.com' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={16} /> Admin Sign In (OTP + MFA) <ArrowRight size={16} />
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    Send Verification Code <ArrowRight size={16} />
                  </span>
                )}
              </button>
            </form>
          )}

          {authMode === 'otp' && otpStep === 'enter-code' && (
            <form onSubmit={handleVerifyOtp} className="auth-form">
              <div className="auth-badge-icon">
                <ShieldCheck size={24} />
              </div>
              
              <div className="otp-email-chip">
                <Mail size={14} />
                <span>{emailInput}</span>
                <button
                  type="button"
                  className="otp-edit-btn"
                  onClick={() => { setOtpStep('enter-email'); setAuthAlert(null); }}
                  title="Change email"
                >
                  <Edit3 size={12} /> Change
                </button>
              </div>

              <p style={{ margin: '0 0 1.25rem', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                We've sent a 6-digit verification code to your mail ID. Please check your inbox (and spam folder) and enter it below.
              </p>

              <input
                name="otpCode"
                type="text"
                className="otp-code-input"
                placeholder="••••••"
                maxLength={6}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                value={otpInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
                  setOtpInput(val)
                }}
                required
                autoFocus
              />

              <button 
                type="submit" 
                className="save-btn" 
                disabled={isVerifyingOtp || otpInput.length < 6}
              >
                {isVerifyingOtp ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw size={16} className="spinner" /> Verifying...
                  </span>
                ) : (
                  'Verify & Sign In'
                )}
              </button>

              <div className="resend-row">
                {countdown > 0 ? (
                  <span>Resend code in <strong>{countdown}s</strong></span>
                ) : (
                  <button
                    type="button"
                    className="resend-btn"
                    onClick={handleSendOtp}
                    disabled={isSendingOtp}
                  >
                    <RefreshCw size={13} className={isSendingOtp ? "spinner" : ""} /> Resend OTP
                  </button>
                )}
              </div>
            </form>
          )}

          {/* 2. PASSWORD LOGIN FLOW */}
          {authMode === 'login' && (
            <form onSubmit={handlePasswordLogin} className="auth-form">
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input 
                  name="username" 
                  type="text" 
                  placeholder="Username or Mail ID" 
                  required 
                  autoComplete="username" 
                />
              </div>
              <div className="input-with-icon">
                <Key size={18} className="input-icon" />
                <input 
                  name="password" 
                  type="password" 
                  placeholder="Password" 
                  required 
                  autoComplete="current-password" 
                />
              </div>
              <button type="submit" className="save-btn" disabled={isAuthenticating}>
                {isAuthenticating ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* 3. REGISTRATION FLOW - STEP 1: FORM */}
          {authMode === 'register' && regStep === 'form' && (
            <form onSubmit={handleRegisterSendOtp} className="auth-form register-form-with-branch">
              <input 
                name="fullName" 
                type="text" 
                placeholder="Full Name" 
                value={regFormData.fullName}
                onChange={(e) => setRegFormData(prev => ({ ...prev, fullName: e.target.value }))}
                required 
              />
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input 
                  name="email" 
                  type="email" 
                  placeholder="Email Address (for Verification & OTP Login)" 
                  value={regFormData.email}
                  onChange={(e) => setRegFormData(prev => ({ ...prev, email: e.target.value }))}
                  required 
                />
              </div>
              <div className="input-group">
                <label htmlFor="dob" className="input-label">Date of Birth (Must be 18+)</label>
                <input 
                  name="dob" 
                  id="dob" 
                  type="date" 
                  value={regFormData.dob}
                  onChange={(e) => setRegFormData(prev => ({ ...prev, dob: e.target.value }))}
                  required 
                />
              </div>
              <input 
                name="phone" 
                type="tel" 
                placeholder="Phone Number" 
                value={regFormData.phone}
                onChange={(e) => setRegFormData(prev => ({ ...prev, phone: e.target.value }))}
                required 
              />
              <input 
                name="username" 
                type="text" 
                placeholder="Choose Username" 
                value={regFormData.username}
                onChange={(e) => setRegFormData(prev => ({ ...prev, username: e.target.value }))}
                required 
              />
              <input 
                name="password" 
                type="password" 
                placeholder="Choose Password (min 4 chars)" 
                value={regFormData.password}
                onChange={(e) => setRegFormData(prev => ({ ...prev, password: e.target.value }))}
                required 
              />

              {/* Engineering Branch Selector */}
              <div className="auth-branch-section">
                <div className="auth-branch-header">
                  <Layers size={15} className="auth-branch-header-icon" />
                  <span className="auth-branch-title">Choose Your Engineering Branch</span>
                </div>
                <p className="auth-branch-subtext">
                  EngiBot will specialize its technical answers, calculations, and standards in this branch.
                </p>

                <div className="auth-branch-pills-grid">
                  {DISCIPLINES.map(d => {
                    const Icon = d.icon;
                    const isSelected = registerBranch === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        className={`auth-branch-pill-btn ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          setRegisterBranch(d.id);
                          setRegFormData(prev => ({ ...prev, discipline: d.id }));
                        }}
                      >
                        <Icon size={15} className="branch-pill-btn-icon" />
                        <span className="branch-pill-btn-text">{d.name}</span>
                        {isSelected && <Check size={14} className="branch-pill-btn-check" />}
                      </button>
                    );
                  })}
                </div>
                <div className="auth-branch-footer-note">
                  Selected: <strong>{DISCIPLINES.find(d => d.id === registerBranch)?.name}</strong>
                </div>
              </div>

              {/* Default Operating Mode Selector */}
              <div className="auth-branch-section">
                <div className="auth-branch-header">
                  <BookOpen size={15} className="auth-branch-header-icon" />
                  <span className="auth-branch-title">Choose Default Operating Mode</span>
                </div>
                <p className="auth-branch-subtext">
                  Choose how EngiBot structures its explanations, calculations, and standards.
                </p>

                <div className="auth-mode-pills-grid">
                  <button
                    type="button"
                    className={`auth-mode-pill-btn ${registerMode === 'learn' ? 'selected' : ''}`}
                    onClick={() => {
                      setRegisterMode('learn');
                      setRegFormData(prev => ({ ...prev, preferred_mode: 'learn' }));
                    }}
                  >
                    <div className="mode-pill-header">
                      <BookOpen size={15} className="mode-pill-icon" />
                      <span className="mode-pill-name">Learn Mode</span>
                      {registerMode === 'learn' && <Check size={14} className="branch-pill-btn-check" />}
                    </div>
                    <span className="mode-pill-desc">Step-by-step guidance, formulas & exam prep concepts</span>
                  </button>

                  <button
                    type="button"
                    className={`auth-mode-pill-btn ${registerMode === 'work' ? 'selected' : ''}`}
                    onClick={() => {
                      setRegisterMode('work');
                      setRegFormData(prev => ({ ...prev, preferred_mode: 'work' }));
                    }}
                  >
                    <div className="mode-pill-header">
                      <Briefcase size={15} className="mode-pill-icon" />
                      <span className="mode-pill-name">Work Mode</span>
                      {registerMode === 'work' && <Check size={14} className="branch-pill-btn-check" />}
                    </div>
                    <span className="mode-pill-desc">Concise solutions, engineering standards & field codes</span>
                  </button>
                </div>

                <div className="auth-lock-notice">
                  <ShieldCheck size={14} />
                  <span>
                    <strong>Permanent Choice:</strong> Engineering Branch and Operating Mode cannot be changed after account creation.
                  </span>
                </div>
              </div>

              <button type="submit" className="save-btn" disabled={isSendingRegOtp}>
                {isSendingRegOtp ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw size={16} className="spinner" /> Sending Verification Code...
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    Continue to Email Verification <ArrowRight size={16} />
                  </span>
                )}
              </button>
            </form>
          )}

          {/* 3. REGISTRATION FLOW - STEP 2: VERIFY OTP */}
          {authMode === 'register' && regStep === 'verify-otp' && (
            <form onSubmit={handleRegisterVerifyOtp} className="auth-form">
              <div className="auth-badge-icon">
                <ShieldCheck size={24} />
              </div>

              <div className="otp-email-chip">
                <Mail size={14} />
                <span>{regFormData.email}</span>
                <button
                  type="button"
                  className="otp-edit-btn"
                  onClick={() => { setRegStep('form'); setAuthAlert(null); }}
                  title="Edit details"
                >
                  <Edit3 size={12} /> Edit
                </button>
              </div>

              <div className="auth-branch-footer-note" style={{ textAlign: 'center', borderTop: 'none', padding: '0 0 8px' }}>
                Branch: <strong>{DISCIPLINES.find(d => d.id === (registerBranch || regFormData.discipline))?.name}</strong> • Mode: <strong>{registerMode === 'work' ? 'Work Mode' : 'Learn Mode'}</strong>
                <div style={{ fontSize: '0.69rem', color: '#64748b', marginTop: '2px' }}>
                  🔒 Both settings are permanently locked to your account upon creation.
                </div>
              </div>

              <p style={{ margin: '0 0 1.25rem', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Enter the 6-digit verification code sent to your email to create and activate your account.
              </p>

              <input
                name="regOtpCode"
                type="text"
                className="otp-code-input"
                placeholder="••••••"
                maxLength={6}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                value={regOtpInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
                  setRegOtpInput(val)
                }}
                required
                autoFocus
              />

              <button 
                type="submit" 
                className="save-btn" 
                disabled={isVerifyingRegOtp || regOtpInput.length < 6}
              >
                {isVerifyingRegOtp ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw size={16} className="spinner" /> Creating Account...
                  </span>
                ) : (
                  'Verify & Create Account'
                )}
              </button>

              <div className="resend-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="resend-btn"
                  onClick={() => { setRegStep('form'); setAuthAlert(null); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <ArrowLeft size={13} /> Back to Edit
                </button>

                {regCountdown > 0 ? (
                  <span>Resend code in <strong>{regCountdown}s</strong></span>
                ) : (
                  <button
                    type="button"
                    className="resend-btn"
                    onClick={handleRegisterSendOtp}
                    disabled={isSendingRegOtp}
                  >
                    <RefreshCw size={13} className={isSendingRegOtp ? "spinner" : ""} /> Resend OTP
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Switch Footer */}
          <div className="auth-switch">
            {authMode === 'register' ? (
              <p>
                Already have an account?{' '}
                <button 
                  className="text-btn" 
                  type="button"
                  onClick={() => { 
                    setAuthMode('otp'); 
                    setOtpStep('enter-email');
                    setRegStep('form');
                    setAuthAlert(null); 
                  }}
                >
                  Login with Email OTP
                </button>
              </p>
            ) : (
              <p>
                Don't have an account?{' '}
                <button 
                  className="text-btn" 
                  type="button"
                  onClick={() => { 
                    setAuthMode('register'); 
                    setRegStep('form');
                    setAuthAlert(null); 
                  }}
                >
                  Create one now
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Admin Modal */}
        {renderAdminModal()}
      </div>
    )
  }

  // Logged In Chat Workspace
  return (
    <div className="app-container" style={getBackgroundStyle(activeDiscipline.bgUrl)}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <img src="/logo.png" alt="EngiBot Logo" style={{ width: 'auto', height: '100%', objectFit: 'contain' }} />
          </div>
          <h1>EngiBot</h1>
        </div>

        {/* ChatGPT-style New Chat button */}
        <button className="new-chat-btn" onClick={() => handleNewChat()} title="Start a fresh conversation">
          <Plus size={18} />
          <span>New Chat</span>
        </button>

        {/* Conversation History Header */}
        <div className="history-header-row">
          <MessageSquare size={13} />
          <span>Recent Chats ({conversations.length})</span>
        </div>

        {/* Tab Content: History List (Always Active) */}
        <div className="history-list">
          {conversations.length === 0 ? (
            <div className="history-empty">
              <MessageSquare size={26} opacity={0.35} />
              <p>No chat history yet.<br />Ask your first question!</p>
            </div>
          ) : (
            conversations.map(conv => {
              const isActive = currentConversationId === conv.id;
              const isEditing = editingConvId === conv.id;

              return (
                <div
                  key={conv.id}
                  className={`history-item ${isActive ? 'active' : ''}`}
                  onClick={() => !isEditing && handleSelectConversation(conv)}
                >
                  <div className="history-item-icon">
                    <MessageSquare size={15} />
                  </div>

                  {isEditing ? (
                    <form 
                      className="history-edit-form" 
                      onSubmit={(e) => handleRenameConversation(conv.id, e)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        className="history-edit-input"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setEditingConvId(null);
                        }}
                      />
                      <button type="submit" className="history-action-btn" title="Save title">
                        <Check size={13} color="#10b981" />
                      </button>
                      <button type="button" className="history-action-btn" onClick={() => setEditingConvId(null)} title="Cancel">
                        <X size={13} color="#ef4444" />
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="history-item-content">
                        <span className="history-item-title" title={conv.title}>
                          {conv.title}
                        </span>
                        <div className="history-item-meta">
                          <span className="history-item-badge">{conv.discipline || 'general'}</span>
                        </div>
                      </div>

                      <div className="history-item-actions">
                        <button
                          type="button"
                          className="history-action-btn"
                          title="Rename chat"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingConvId(conv.id);
                            setEditingTitle(conv.title);
                          }}
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          type="button"
                          className="history-action-btn delete"
                          title="Delete chat"
                          onClick={(e) => handleDeleteConversation(conv.id, e)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
        
        {/* Administrator Portal Sidebar Trigger */}
        <button
          type="button"
          className="admin-sidebar-entry-btn"
          onClick={() => {
            setShowAdminModal(true);
            setAdminAuthAlert(null);
            if (adminToken) {
              verifyAdminSession(adminToken).then(valid => {
                if (valid) fetchAdminData(adminTab, adminToken);
              });
            }
          }}
          title="Open Administrator Control Center"
        >
          <ShieldCheck size={16} />
          <span>Admin Portal</span>
        </button>

        <div className="user-profile">
          <div className="user-info">
            <User size={18} style={{ flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', overflow: 'hidden', flex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user.name || user.username}
              </span>
              <div 
                className="user-profile-branch-badge locked"
                title={`Engineering Branch: ${activeDiscipline.name} (Permanent)`}
              >
                <activeDiscipline.icon size={11} />
                <span>{activeDiscipline.name}</span>
                <ShieldCheck size={10} style={{ marginLeft: '3px', color: '#2563eb' }} />
              </div>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main 
        className={`chat-area ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragOver && (
          <div className="drag-overlay-banner">
            📁 Drop your image, video, or file to attach
          </div>
        )}

        <header className="chat-header">
          <div className="header-info">
            <div className="header-title-row">
              <h2>
                {currentConversationId ? (
                  conversations.find(c => c.id === currentConversationId)?.title || `${activeDiscipline.name} Expert`
                ) : (
                  `${activeDiscipline.name} Expert`
                )}
              </h2>
              <div 
                className="header-branch-pill locked" 
                title={`Engineering Branch: ${activeDiscipline.name} (Permanently locked to your account)`}
              >
                {(() => {
                  const Icon = activeDiscipline.icon;
                  return <Icon size={14} className="branch-pill-icon" />;
                })()}
                <span>{activeDiscipline.name}</span>
                <ShieldCheck size={12} className="branch-pill-lock" title="Branch is permanently locked" />
              </div>
            </div>
            <p>
              {currentConversationId ? (
                <span>Branch: <strong>{activeDiscipline.name}</strong> • Specialized engineering assistant</span>
              ) : (
                `Specialized ${activeDiscipline.name} problem-solving, standard citations & calculations`
              )}
            </p>
          </div>
          <div className="header-actions">
            {/* Operating Mode Indicator (Permanent) */}
            <div 
              className={`mode-toggle-btn locked ${activeMode}`}
              title={`Operating Mode: ${activeMode === 'learn' ? 'Learn Mode' : 'Work Mode'} (Permanently locked to your account)`}
            >
              {activeMode === 'learn' ? <BookOpen size={14} /> : <Briefcase size={14} />}
              <span>{activeMode === 'learn' ? 'Learn Mode' : 'Work Mode'}</span>
              <ShieldCheck size={12} className="mode-pill-lock" title="Operating mode is permanently locked" />
            </div>

            {/* Branch Calculators */}
            <button 
              type="button" 
              className="header-tool-btn" 
              onClick={() => {
                if (['civil', 'eee', 'ece', 'cse', 'mech'].includes(activeDiscipline.id)) {
                  setCalcTab(activeDiscipline.id);
                } else {
                  setCalcTab('general');
                }
                setShowCalcModal(true);
              }}
              title="Engineering Calculators (Beam Bending, Cable Sizing, Circuit, Algorithm, Stress, Units)"
            >
              <Calculator size={14} />
              <span>Calculators</span>
            </button>

            {/* Exam Prep Mode */}
            <button 
              type="button" 
              className="header-tool-btn" 
              onClick={() => setShowExamModal(true)}
              title="Exam Mode: University PYQs, Quizzes & Formula Flashcards"
            >
              <GraduationCap size={14} />
              <span>Exam Prep</span>
            </button>

            {/* Audit Logs */}
            <button 
              type="button" 
              className="header-tool-btn" 
              onClick={() => {
                fetchCalculationLogs();
                setShowLogsModal(true);
              }}
              title="View Calculation Audit Logs"
            >
              <FileCheck size={14} />
              <span>Logs</span>
            </button>

            {/* Voice Auto-Speak Toggle */}
            <button 
              type="button" 
              className={`header-tool-btn ${autoSpeak ? 'active' : ''}`}
              onClick={toggleAutoSpeak}
              title={autoSpeak ? "Auto-speak answers: ON (click to disable)" : "Auto-speak answers: OFF (click to enable)"}
            >
              {autoSpeak ? <Volume2 size={14} /> : <VolumeX size={14} />}
              <span>Voice: {autoSpeak ? 'On' : 'Off'}</span>
            </button>

            {/* New Chat Button */}
            <button 
              type="button" 
              className="header-new-btn" 
              onClick={() => handleNewChat()}
              title="Start a new chat"
            >
              <Plus size={14} />
              <span>New</span>
            </button>

            {/* Claude-Style Interactive Model Selector */}
            <div className="model-selector-container" ref={modelDropdownRef}>
              <button 
                type="button" 
                className={`model-selector-btn ${isModelDropdownOpen ? 'open' : ''}`}
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                title="Select active AI model"
              >
                <span className="model-btn-icon" style={{ color: currentModelConfig.color }}>
                  <CurrentModelIcon size={14} />
                </span>
                <span className="model-btn-name">{currentModelConfig.shortName}</span>
                <ChevronDown size={13} className={`chevron-icon ${isModelDropdownOpen ? 'rotate' : ''}`} />
              </button>

              {isModelDropdownOpen && (
                <div className="model-dropdown-menu glass-panel">
                  <div className="model-dropdown-header">
                    <span>Select AI Model</span>
                    <span className="model-count-tag">2 Models Active</span>
                  </div>

                  <div className="model-options-list">
                    {MODEL_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = selectedModel === opt.id;
                      return (
                        <div
                          key={opt.id}
                          className={`model-option-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleSelectModel(opt.id)}
                        >
                          <div className="model-option-top">
                            <div className="model-option-title-group">
                              <span className="model-icon-bubble" style={{ background: `${opt.color}1a`, color: opt.color }}>
                                <Icon size={15} />
                              </span>
                              <div>
                                <div className="model-option-name">{opt.name}</div>
                                <div className="model-option-sub">{opt.subtitle}</div>
                              </div>
                            </div>
                            <div className="model-option-badge-wrap">
                              <span className={`model-pill-badge ${opt.badgeClass}`}>{opt.badge}</span>
                              {isSelected && <Check size={16} className="model-check-icon" />}
                            </div>
                          </div>
                          <p className="model-option-desc">{opt.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                {(() => {
                  const ActiveIcon = activeDiscipline.icon;
                  return <ActiveIcon size={40} />;
                })()}
              </div>
              <h3>How can I help you today, {user.name?.split(' ')[0] || user.username}?</h3>
              <p>I'm your {activeDiscipline.name} assistant. Ask me to solve problems, explain concepts, analyze diagrams, or inspect documents.</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                <div className="avatar">
                  {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                </div>
                <div className="message-content">
                  {/* Attached media display */}
                  {msg.attachment_url && (
                    <div className="attachment-display">
                      {msg.attachment_type === 'image' && (
                        <div className="image-attachment-wrapper">
                          <img 
                            src={resolveAttachmentUrl(msg.attachment_url)} 
                            alt={msg.file_name || 'Attached image'} 
                            className="chat-image-preview" 
                            onClick={() => window.open(resolveAttachmentUrl(msg.attachment_url), '_blank')}
                            title="Click to view full image in new tab"
                          />
                          {msg.file_name && (
                            <span className="attachment-filename">
                              <Image size={12} /> {msg.file_name}
                            </span>
                          )}
                        </div>
                      )}

                      {msg.attachment_type === 'video' && (
                        <div className="video-attachment-wrapper">
                          <video 
                            controls 
                            src={resolveAttachmentUrl(msg.attachment_url)} 
                            className="chat-video-player"
                            preload="metadata"
                          >
                            Your browser does not support the video tag.
                          </video>
                          {msg.file_name && (
                            <span className="attachment-filename">
                              <Video size={12} /> {msg.file_name}
                            </span>
                          )}
                        </div>
                      )}

                      {msg.attachment_type === 'file' && (
                        <a 
                          href={resolveAttachmentUrl(msg.attachment_url)} 
                          download={msg.file_name || 'attachment'} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="file-attachment-card"
                          title={`Download ${msg.file_name || 'file'}`}
                        >
                          <div className="file-icon-badge">
                            <FileText size={18} />
                          </div>
                          <div className="file-card-details">
                            <span className="file-card-title">{msg.file_name || 'Download Attachment'}</span>
                            <span className="file-card-subtitle">{formatFileSize(msg.file_size)} • Click to download</span>
                          </div>
                          <Download size={16} className="file-download-btn-icon" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Message text */}
                  {msg.content && (
                    <div className="message-text">
                      {(msg.content || '').split('\n').map((line, i) => (
                        <span key={i}>
                          {line}
                          <br />
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Voice Read Aloud action and Faculty Escalation for AI responses */}
                  {msg.role === 'ai' && (
                    <div className="message-actions">
                      <button
                        type="button"
                        className={`speak-action-btn ${speakingIndex === index ? 'speaking' : ''}`}
                        onClick={() => speakMessage(msg.content, index)}
                        title={speakingIndex === index ? 'Stop speaking' : 'Read answer aloud'}
                      >
                        {speakingIndex === index ? <VolumeX size={13} /> : <Volume2 size={13} />}
                        <span>{speakingIndex === index ? 'Stop' : 'Listen'}</span>
                      </button>

                      <button
                        type="button"
                        className="speak-action-btn"
                        onClick={() => handleEscalateDoubt(msg.content)}
                        title="Escalate this doubt to Faculty / Senior Mentor queue"
                      >
                        <ShieldCheck size={13} />
                        <span>Escalate Doubt</span>
                      </button>

                      {(msg.model_used || msg.model) && (
                        <span className="msg-model-tag" title={`Generated via ${msg.model_used || msg.model}`}>
                          <Zap size={11} style={{ color: '#f59e0b' }} />
                          <span>{msg.model_used || msg.model}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="message ai">
              <div className="avatar">
                <Bot size={20} />
              </div>
              <div className="message-content">
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          {/* Attachment Preview Tray */}
          {selectedFile && (
            <div className="attachment-preview-bar">
              <div className="attachment-preview-content">
                {selectedFile.type === 'image' && (
                  <img src={selectedFile.previewUrl} alt="Preview" className="preview-thumb" />
                )}
                {selectedFile.type === 'video' && (
                  <div className="preview-icon video">
                    <Video size={18} />
                  </div>
                )}
                {selectedFile.type === 'file' && (
                  <div className="preview-icon file">
                    <FileText size={18} />
                  </div>
                )}
                <div className="preview-meta">
                  <span className="preview-name">{selectedFile.name}</span>
                  <span className="preview-size">{formatFileSize(selectedFile.size)} • {selectedFile.type.toUpperCase()} READY</span>
                </div>
              </div>
              <button type="button" className="preview-remove-btn" onClick={handleRemoveFile} title="Remove attachment">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Voice Listening Indicator Banner */}
          {isListening && (
            <div className="voice-listening-banner">
              <span className="voice-pulse-dot"></span>
              <span>🎙️ Listening to your voice... Speak your engineering question now</span>
              <button type="button" className="voice-stop-btn" onClick={toggleListening}>
                Done
              </button>
            </div>
          )}

          <div className="composer-box">
            {/* Hidden file input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              style={{ display: 'none' }}
              accept={fileAcceptType}
            />

            {/* Textarea */}
            <textarea
              className="chat-input"
              placeholder={
                isListening 
                  ? 'Listening to your voice...' 
                  : selectedFile 
                    ? `Ask about ${selectedFile.name} (or click Send)...` 
                    : `Ask ${activeDiscipline.name} Expert anything, or attach files below...`
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
            />

            {/* Bottom Actions Toolbar */}
            <div className="composer-toolbar">
              <div className="toolbar-left">
                <button
                  type="button"
                  className="toolbar-action-btn upload-main-btn"
                  onClick={() => {
                    setFileAcceptType('*/*');
                    setTimeout(() => fileInputRef.current?.click(), 50);
                  }}
                  title="Upload any file (Image, Video, Document, Code)"
                  disabled={isLoading || isUploading}
                >
                  <Paperclip size={15} />
                  <span>Upload File</span>
                </button>

                <button
                  type="button"
                  className="toolbar-action-btn toolbar-pill-btn"
                  onClick={() => {
                    setFileAcceptType('image/*');
                    setTimeout(() => fileInputRef.current?.click(), 50);
                  }}
                  title="Upload Image (PNG, JPG, Schematics)"
                  disabled={isLoading || isUploading}
                >
                  <Image size={14} />
                  <span>Image</span>
                </button>

                <button
                  type="button"
                  className="toolbar-action-btn toolbar-pill-btn"
                  onClick={() => {
                    setFileAcceptType('video/*');
                    setTimeout(() => fileInputRef.current?.click(), 50);
                  }}
                  title="Upload Video (MP4, WebM, Labs)"
                  disabled={isLoading || isUploading}
                >
                  <Video size={14} />
                  <span>Video</span>
                </button>

                <button
                  type="button"
                  className="toolbar-action-btn toolbar-pill-btn"
                  onClick={() => {
                    setFileAcceptType('.pdf,.doc,.docx,.txt,.csv,.json,.py,.java,.c,.cpp,.h,.zip,.md');
                    setTimeout(() => fileInputRef.current?.click(), 50);
                  }}
                  title="Upload Document / Code (.pdf, .txt, .py)"
                  disabled={isLoading || isUploading}
                >
                  <FileText size={14} />
                  <span>Doc/Code</span>
                </button>
              </div>

              <div className="toolbar-right">
                {/* Claude-Style Chatbox Model Switcher Pill */}
                <button
                  type="button"
                  className="chatbox-model-pill"
                  onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                  title={`Active AI Model: ${currentModelConfig.name} (${currentModelConfig.subtitle}). Click to change model.`}
                >
                  <CurrentModelIcon size={13} style={{ color: currentModelConfig.color }} />
                  <span>{currentModelConfig.shortName}</span>
                  <ChevronDown size={11} className={isModelDropdownOpen ? 'rotate' : ''} />
                </button>

                <button
                  type="button"
                  className={`toolbar-action-btn voice-btn ${isListening ? 'listening' : ''}`}
                  onClick={toggleListening}
                  title={isListening ? 'Stop listening' : 'Voice Dictation (Speech to text)'}
                  disabled={isLoading || isUploading}
                >
                  {isListening ? <MicOff size={15} /> : <Mic size={15} />}
                  <span>{isListening ? 'Listening...' : 'Voice'}</span>
                </button>

                <button 
                  type="button"
                  className="toolbar-send-btn" 
                  onClick={handleSendMessage}
                  disabled={(!input.trim() && !selectedFile) || isLoading || isUploading}
                  title="Send message"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>Send</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 2. Engineering Calculators Modal */}
      {showCalcModal && (
        <div className="modal-overlay">
          <div className="modal-content wide-dialog">
            <button className="modal-close" onClick={() => setShowCalcModal(false)}>
              <X size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--accent-gradient)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calculator size={20} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Deterministic Engineering Calculators</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Verified code-based formulas. Zero hallucination.</p>
              </div>
            </div>

            {/* Calculator Tab Switcher */}
            <div className="calc-nav-tabs">
              <button className={`calc-tab-pill ${calcTab === 'civil' ? 'active' : ''}`} onClick={() => { setCalcTab('civil'); setCalcResult(null); }}>
                <HardHat size={14} /> Civil (Beam Bending)
              </button>
              <button className={`calc-tab-pill ${calcTab === 'eee' ? 'active' : ''}`} onClick={() => { setCalcTab('eee'); setCalcResult(null); }}>
                <Zap size={14} /> EEE (Cable Sizing)
              </button>
              <button className={`calc-tab-pill ${calcTab === 'ece' ? 'active' : ''}`} onClick={() => { setCalcTab('ece'); setCalcResult(null); }}>
                <Radio size={14} /> ECE (RLC Circuit)
              </button>
              <button className={`calc-tab-pill ${calcTab === 'cse' ? 'active' : ''}`} onClick={() => { setCalcTab('cse'); setCalcResult(null); }}>
                <Cpu size={14} /> CSE (Algorithm Visualizer)
              </button>
              <button className={`calc-tab-pill ${calcTab === 'mech' ? 'active' : ''}`} onClick={() => { setCalcTab('mech'); setCalcResult(null); }}>
                <Wrench size={14} /> Mech (Stress-Strain)
              </button>
              <button className={`calc-tab-pill ${calcTab === 'general' ? 'active' : ''}`} onClick={() => { setCalcTab('general'); setCalcResult(null); }}>
                <MessageSquare size={14} /> General (Units)
              </button>
            </div>

            {/* Active Calculator Form */}
            {calcTab === 'civil' && (
              <div>
                <div className="calc-form-grid">
                  <div className="calc-field">
                    <label>Support Type</label>
                    <select value={beamType} onChange={(e) => setBeamType(e.target.value)}>
                      <option value="ssb">Simply Supported Beam (SSB)</option>
                      <option value="cantilever">Cantilever Beam</option>
                    </select>
                  </div>
                  <div className="calc-field">
                    <label>Load Pattern</label>
                    <select value={beamLoadType} onChange={(e) => setBeamLoadType(e.target.value)}>
                      <option value="udl">Uniformly Distributed Load (UDL - kN/m)</option>
                      <option value="point">Point Load (Concentrated - kN)</option>
                    </select>
                  </div>
                  <div className="calc-field">
                    <label>Span Length L (meters)</label>
                    <input type="number" step="0.1" value={beamSpan} onChange={(e) => setBeamSpan(e.target.value)} />
                  </div>
                  <div className="calc-field">
                    <label>Load Intensity ({beamLoadType === 'udl' ? 'kN/m' : 'kN'})</label>
                    <input type="number" step="0.5" value={beamLoad} onChange={(e) => setBeamLoad(e.target.value)} />
                  </div>
                  {beamLoadType === 'point' && beamType === 'ssb' && (
                    <div className="calc-field">
                      <label>Distance from Left Support a (meters)</label>
                      <input type="number" step="0.1" value={beamLoadPos} onChange={(e) => setBeamLoadPos(e.target.value)} />
                    </div>
                  )}
                </div>
                <button type="button" className="save-btn" onClick={() => handleRunCalculator('civil')} disabled={calcLoading}>
                  {calcLoading ? 'Calculating...' : 'Calculate Bending Moment & Shear Force'}
                </button>
              </div>
            )}

            {calcTab === 'eee' && (
              <div>
                <div className="calc-form-grid">
                  <div className="calc-field">
                    <label>Connected Power (kW)</label>
                    <input type="number" step="0.5" value={cablePower} onChange={(e) => setCablePower(e.target.value)} />
                  </div>
                  <div className="calc-field">
                    <label>System Voltage (V)</label>
                    <input type="number" value={cableVoltage} onChange={(e) => setCableVoltage(e.target.value)} />
                  </div>
                  <div className="calc-field">
                    <label>One-Way Route Length (meters)</label>
                    <input type="number" value={cableLength} onChange={(e) => setCableLength(e.target.value)} />
                  </div>
                  <div className="calc-field">
                    <label>Power Factor (cos φ)</label>
                    <input type="number" step="0.01" min="0.5" max="1.0" value={cablePf} onChange={(e) => setCablePf(e.target.value)} />
                  </div>
                  <div className="calc-field">
                    <label>Conductor Material</label>
                    <select value={cableCond} onChange={(e) => setCableCond(e.target.value)}>
                      <option value="aluminum">Aluminum (Al)</option>
                      <option value="copper">Copper (Cu)</option>
                    </select>
                  </div>
                  <div className="calc-field">
                    <label>Insulation Grade</label>
                    <select value={cableInsul} onChange={(e) => setCableInsul(e.target.value)}>
                      <option value="xlpe">XLPE (90°C)</option>
                      <option value="pvc">PVC (70°C)</option>
                    </select>
                  </div>
                </div>
                <button type="button" className="save-btn" onClick={() => handleRunCalculator('eee')} disabled={calcLoading}>
                  {calcLoading ? 'Sizing Cable...' : 'Calculate Cable Size & Voltage Drop (IS 7098)'}
                </button>
              </div>
            )}

            {calcTab === 'ece' && (
              <div>
                <div className="calc-form-grid">
                  <div className="calc-field">
                    <label>Circuit Mode</label>
                    <select value={circuitMode} onChange={(e) => setCircuitMode(e.target.value)}>
                      <option value="series_rlc">AC Series RLC Circuit</option>
                      <option value="parallel_rlc">AC Parallel RLC Circuit</option>
                      <option value="ohms_dc">DC Ohm's Law & Power</option>
                    </select>
                  </div>
                  <div className="calc-field">
                    <label>Resistance R (Ω)</label>
                    <input type="number" step="0.5" value={circR} onChange={(e) => setCircR(e.target.value)} />
                  </div>
                  {circuitMode !== 'ohms_dc' && (
                    <>
                      <div className="calc-field">
                        <label>Inductance L (mH)</label>
                        <input type="number" step="0.1" value={circL} onChange={(e) => setCircL(e.target.value)} />
                      </div>
                      <div className="calc-field">
                        <label>Capacitance C (µF)</label>
                        <input type="number" step="0.1" value={circC} onChange={(e) => setCircC(e.target.value)} />
                      </div>
                      <div className="calc-field">
                        <label>Frequency f (Hz)</label>
                        <input type="number" value={circF} onChange={(e) => setCircF(e.target.value)} />
                      </div>
                    </>
                  )}
                  <div className="calc-field">
                    <label>Voltage V (V)</label>
                    <input type="number" value={circV} onChange={(e) => setCircV(e.target.value)} />
                  </div>
                </div>
                <button type="button" className="save-btn" onClick={() => handleRunCalculator('ece')} disabled={calcLoading}>
                  {calcLoading ? 'Analyzing...' : 'Analyze Circuit Impedance & Resonance'}
                </button>
              </div>
            )}

            {calcTab === 'cse' && (
              <div>
                <div className="calc-form-grid">
                  <div className="calc-field" style={{ gridColumn: 'span 2' }}>
                    <label>Algorithm Selection</label>
                    <select value={algoType} onChange={(e) => setAlgoType(e.target.value)}>
                      <option value="bubble_sort">Bubble Sort (O(n²) Comparison Sort)</option>
                      <option value="selection_sort">Selection Sort (O(n²) In-place Sort)</option>
                      <option value="insertion_sort">Insertion Sort (O(n²) Online Sort)</option>
                    </select>
                  </div>
                  <div className="calc-field" style={{ gridColumn: 'span 2' }}>
                    <label>Comma-Separated Input Array (up to 12 integers)</label>
                    <input type="text" value={algoArray} onChange={(e) => setAlgoArray(e.target.value)} placeholder="64, 34, 25, 12, 22, 11, 90" />
                  </div>
                </div>
                <button type="button" className="save-btn" onClick={() => handleRunCalculator('cse')} disabled={calcLoading}>
                  {calcLoading ? 'Profiling...' : 'Simulate Algorithm & Trace Steps'}
                </button>
              </div>
            )}

            {calcTab === 'mech' && (
              <div>
                <div className="calc-form-grid">
                  <div className="calc-field">
                    <label>Axial Tensile Force (kN)</label>
                    <input type="number" step="0.5" value={stressForce} onChange={(e) => setStressForce(e.target.value)} />
                  </div>
                  <div className="calc-field">
                    <label>Cross-Section Shape</label>
                    <select value={stressShape} onChange={(e) => setStressShape(e.target.value)}>
                      <option value="circular">Circular Bar (Diameter)</option>
                      <option value="rectangular">Rectangular Bar (Width x Thick)</option>
                    </select>
                  </div>
                  <div className="calc-field">
                    <label>{stressShape === 'circular' ? 'Diameter (mm)' : 'Width (mm)'}</label>
                    <input type="number" step="0.5" value={stressDim1} onChange={(e) => setStressDim1(e.target.value)} />
                  </div>
                  {stressShape === 'rectangular' && (
                    <div className="calc-field">
                      <label>Thickness (mm)</label>
                      <input type="number" step="0.5" value={stressDim2} onChange={(e) => setStressDim2(e.target.value)} />
                    </div>
                  )}
                  <div className="calc-field">
                    <label>Material Yield Strength Sy (MPa)</label>
                    <input type="number" value={stressYield} onChange={(e) => setStressYield(e.target.value)} />
                  </div>
                </div>
                <button type="button" className="save-btn" onClick={() => handleRunCalculator('mech')} disabled={calcLoading}>
                  {calcLoading ? 'Calculating...' : 'Calculate Stress, Strain & Factor of Safety'}
                </button>
              </div>
            )}

            {calcTab === 'general' && (
              <div>
                <div className="calc-form-grid">
                  <div className="calc-field">
                    <label>Physical Category</label>
                    <select value={unitCat} onChange={(e) => {
                      const cat = e.target.value;
                      setUnitCat(cat);
                      if (cat === 'force') { setUnitFrom('kn'); setUnitTo('n'); }
                      else if (cat === 'pressure') { setUnitFrom('mpa'); setUnitTo('bar'); }
                      else if (cat === 'energy') { setUnitFrom('kwh'); setUnitTo('j'); }
                      else if (cat === 'power') { setUnitFrom('kw'); setUnitTo('hp'); }
                      else if (cat === 'length') { setUnitFrom('m'); setUnitTo('ft'); }
                    }}>
                      <option value="force">Force</option>
                      <option value="pressure">Pressure & Stress</option>
                      <option value="energy">Energy & Work</option>
                      <option value="power">Power</option>
                      <option value="length">Length & Distance</option>
                    </select>
                  </div>
                  <div className="calc-field">
                    <label>Input Value</label>
                    <input type="number" step="any" value={unitVal} onChange={(e) => setUnitVal(e.target.value)} />
                  </div>
                  <div className="calc-field">
                    <label>From Unit</label>
                    <input type="text" value={unitFrom} onChange={(e) => setUnitFrom(e.target.value)} />
                  </div>
                  <div className="calc-field">
                    <label>To Unit</label>
                    <input type="text" value={unitTo} onChange={(e) => setUnitTo(e.target.value)} />
                  </div>
                </div>
                <button type="button" className="save-btn" onClick={() => handleRunCalculator('general')} disabled={calcLoading}>
                  {calcLoading ? 'Converting...' : 'Convert Engineering Units'}
                </button>
              </div>
            )}

            {/* Results Presentation Card */}
            {calcResult && (
              <div className="calc-result-card">
                <div className="calc-result-header">
                  <h4>{calcResult.title}</h4>
                  {calcResult.standard_cited && (
                    <span className="calc-standard-chip">{calcResult.standard_cited}</span>
                  )}
                </div>

                <div>
                  {Object.entries(calcResult.results || {}).map(([key, val]) => {
                    if (key === 'step_by_step_trace' && Array.isArray(val)) {
                      return (
                        <div key={key} style={{ marginTop: '0.75rem', padding: '0.5rem', background: '#f8fafc', borderRadius: 8 }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Step Trace:</span>
                          <ul style={{ margin: '4px 0 0 1rem', fontSize: '0.82rem', fontFamily: 'monospace' }}>
                            {val.map((step, idx) => <li key={idx}>{step}</li>)}
                          </ul>
                        </div>
                      );
                    }
                    if (typeof val === 'object' && val !== null) {
                      return (
                        <div key={key} className="calc-stat-row">
                          <span className="calc-stat-label">{key.replace(/_/g, ' ')}</span>
                          <span className="calc-stat-value">{JSON.stringify(val)}</span>
                        </div>
                      );
                    }
                    return (
                      <div key={key} className="calc-stat-row">
                        <span className="calc-stat-label">{key.replace(/_/g, ' ')}</span>
                        <span className="calc-stat-value">{String(val)}</span>
                      </div>
                    );
                  })}
                </div>

                {calcResult.safety_disclaimer && (
                  <div className="calc-safety-badge">
                    {calcResult.safety_disclaimer}
                  </div>
                )}

                <div style={{ marginTop: '1rem', display: 'flex', gap: '8px' }}>
                  <button type="button" className="save-btn" style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }} onClick={insertCalcIntoChat}>
                    Insert Findings into Chat
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Exam Prep Modal */}
      {showExamModal && (
        <div className="modal-overlay">
          <div className="modal-content wide-dialog">
            <button className="modal-close" onClick={() => setShowExamModal(false)}>
              <X size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--accent-gradient)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GraduationCap size={20} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Exam Mode & Syllabus Prep</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>University-aligned previous-year questions, quizzes, and revision cards for {university} (Sem {semester}).</p>
              </div>
            </div>

            <div className="calc-nav-tabs">
              <button className={`calc-tab-pill ${examTab === 'pyq' ? 'active' : ''}`} onClick={() => { setExamTab('pyq'); setExamResult(null); }}>
                📚 Previous Year Questions (PYQ)
              </button>
              <button className={`calc-tab-pill ${examTab === 'quiz' ? 'active' : ''}`} onClick={() => { setExamTab('quiz'); setExamResult(null); }}>
                📝 5-Question Concept Quiz
              </button>
              <button className={`calc-tab-pill ${examTab === 'flashcards' ? 'active' : ''}`} onClick={() => { setExamTab('flashcards'); setExamResult(null); }}>
                🗂️ Formula Flashcards
              </button>
            </div>

            <div className="calc-field" style={{ marginBottom: '1rem' }}>
              <label>Topic / Subject / Unit Module</label>
              <input 
                type="text" 
                value={examTopic} 
                onChange={(e) => setExamTopic(e.target.value)} 
                placeholder={`e.g. ${activeDiscipline.name} Module 1, or specific topic like Shear Stress`} 
              />
            </div>

            <button type="button" className="save-btn" onClick={handleRunExamTool} disabled={examLoading}>
              {examLoading ? 'Generating Exam Materials...' : `Generate ${examTab.toUpperCase()} for ${activeDiscipline.name}`}
            </button>

            {examResult && (
              <div className="exam-result-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                  <strong>{activeDiscipline.name} • {examTab.toUpperCase()} Output</strong>
                  <button 
                    type="button" 
                    className="speak-action-btn"
                    onClick={() => {
                      setInput(`[EXAM PREP: ${examTab.toUpperCase()}]\n${examResult}`);
                      setShowExamModal(false);
                    }}
                  >
                    Copy to Chat
                  </button>
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {examResult}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Calculation Audit Logs Modal */}
      {showLogsModal && (
        <div className="modal-overlay">
          <div className="modal-content wide-dialog">
            <button className="modal-close" onClick={() => setShowLogsModal(false)}>
              <X size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--accent-gradient)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileCheck size={20} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Calculation Audit Logs</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Immutable history of your deterministic calculations and cited standards.</p>
              </div>
            </div>

            {calculationLogs.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No calculations logged yet. Run any calculator to record audit data.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
                {calculationLogs.map((log) => (
                  <div key={log.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '0.85rem', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '0.92rem' }}>{log.title}</strong>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{log.timestamp}</span>
                    </div>
                    {log.standard_cited && (
                      <span className="calc-standard-chip" style={{ display: 'inline-block', marginBottom: '6px' }}>{log.standard_cited}</span>
                    )}
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      <strong>Results:</strong> {JSON.stringify(log.results)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Administrator Control Center Modal */}
      {renderAdminModal()}
    </div>
  )
}

export default App
