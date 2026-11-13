import { useState, useRef, useEffect } from 'react'
import { 
  Bot, User, Send, Key,
  Cpu, HardHat, Radio, Zap, Wrench, MessageSquare, LogOut,
  Mail, ShieldCheck, ArrowRight, RefreshCw, AlertCircle, CheckCircle2, Edit3, Sparkles,
  Plus, Trash2, Check, X, Layers, MessageCircle,
  Paperclip, Mic, MicOff, Volume2, VolumeX, FileText, Image, Video, Download,
  BookOpen, Briefcase, Calculator, GraduationCap, FileCheck, Award
} from 'lucide-react'
import './App.css'

const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const DISCIPLINES = [
  { id: 'general', name: 'General Engineering', icon: MessageSquare, prompt: 'You are an expert engineering assistant.', bgUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=2070&auto=format&fit=crop' },
  { id: 'cse', name: 'Computer Science (CSE)', icon: Cpu, prompt: 'You are an expert Computer Science Engineer. Help with programming, algorithms, system design, and software engineering.', bgUrl: 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=2070&auto=format&fit=crop' },
  { id: 'civil', name: 'Civil Engineering', icon: HardHat, prompt: 'You are an expert Civil Engineer. Help with structural design, construction materials, fluid mechanics, and surveying.', bgUrl: 'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?q=80&w=2070&auto=format&fit=crop' },
  { id: 'ece', name: 'Electronics (ECE)', icon: Radio, prompt: 'You are an expert Electronics and Communication Engineer. Help with circuits, signals & systems, microprocessors, and communication theory.', bgUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070&auto=format&fit=crop' },
  { id: 'eee', name: 'Electrical (EEE)', icon: Zap, prompt: 'You are an expert Electrical Engineer. Help with power systems, electrical machines, control systems, and power electronics.', bgUrl: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?q=80&w=2070&auto=format&fit=crop' },
  { id: 'mech', name: 'Mechanical (Mech)', icon: Wrench, prompt: 'You are an expert Mechanical Engineer. Help with thermodynamics, solid mechanics, manufacturing, and machine design.', bgUrl: 'https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?q=80&w=2070&auto=format&fit=crop' },
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
  const [activeDiscipline, setActiveDiscipline] = useState(DISCIPLINES[0])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // ChatGPT-style Conversation History state
  const [conversations, setConversations] = useState([])
  const [currentConversationId, setCurrentConversationId] = useState(null)
  const [sidebarTab, setSidebarTab] = useState('history') // 'history' | 'branches'
  const [editingConvId, setEditingConvId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')

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

  // Persona & Curriculum Onboarding State
  const [userRole, setUserRole] = useState('student') // 'student' | 'professional'
  const [university, setUniversity] = useState('BPUT')
  const [semester, setSemester] = useState(5)
  const [experienceYears, setExperienceYears] = useState(0)
  const [activeMode, setActiveMode] = useState(() => {
    try {
      return localStorage.getItem('engibot_mode') || 'learn'
    } catch {
      return 'learn'
    }
  })
  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem('engibot_lang') || 'en'
    } catch {
      return 'en'
    }
  })
  const [showOnboardingModal, setShowOnboardingModal] = useState(false)

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
        setUserRole(data.role || 'student');
        setUniversity(data.university || 'BPUT');
        setSemester(data.semester || 5);
        setExperienceYears(data.experience_years || 0);
        if (data.preferred_mode) setActiveMode(data.preferred_mode);
        if (data.preferred_language) setLanguage(data.preferred_language);
        
        // Show onboarding if not yet marked as onboarded
        if (!localStorage.getItem(`engibot_onboarded_${userId}`)) {
          setShowOnboardingModal(true);
        }
      }
    } catch (e) {
      console.error("Failed to load user profile:", e);
    }
  };

  const handleSaveOnboarding = async (e) => {
    e?.preventDefault();
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/api/user/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          role: userRole,
          university: university,
          semester: parseInt(semester, 10),
          experience_years: parseInt(experienceYears, 10),
          preferred_mode: activeMode,
          preferred_language: language
        })
      });
      if (res.ok) {
        localStorage.setItem(`engibot_onboarded_${user.id}`, 'true');
        setShowOnboardingModal(false);
      }
    } catch (e) {
      alert("Failed to save profile: " + e.message);
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

  // Countdown timer for OTP resend
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

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  // Handle Send OTP
  const handleSendOtp = async (e) => {
    e?.preventDefault()
    const emailClean = emailInput.trim().toLowerCase()
    if (!emailClean) {
      setAuthAlert({ type: 'error', text: 'Please enter your email address.' })
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

  // Handle Verify OTP
  const handleVerifyOtp = async (e) => {
    e?.preventDefault()
    const codeClean = otpInput.trim()
    if (codeClean.length !== 6) {
      setAuthAlert({ type: 'error', text: 'Please enter the 6-digit OTP code.' })
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

  // Handle Password Login or Register
  const handlePasswordAuth = async (e) => {
    e.preventDefault()
    const form = e.target
    setIsAuthenticating(true)
    setAuthAlert(null)
    
    const payload = {}
    if (authMode === 'register') {
      payload.name = form.fullName.value.trim()
      payload.email = form.email.value.trim().toLowerCase()
      payload.dob = form.dob.value
      payload.phone_number = form.phone.value.trim()
    }
    
    payload.username = form.username.value.trim()
    payload.password = form.password.value.trim()

    try {
      const endpoint = authMode === 'login' ? '/api/login' : '/api/register'
      const res = await fetch(`${API_BASE}${endpoint}`, {
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
          file_text: fileText
        })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to fetch response');
      }
      
      const data = await res.json();
      const botMessage = { role: 'ai', content: data.response }
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

  // If user is not logged in, render the Auth View
  if (!user) {
    return (
      <div className="app-container auth-container" style={getBackgroundStyle(DISCIPLINES[0].bgUrl)}>
        <div className="auth-card glass-panel">
          <div className="brand-icon mx-auto">
            <img src="/logo.png" alt="EngiBot Logo" style={{ width: 'auto', height: '100%', objectFit: 'contain' }} />
          </div>
          <h2>Welcome to EngiBot</h2>
          <p>Instant engineering intelligence & AI tutoring</p>

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
              <span>{authAlert.text}</span>
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
            <form onSubmit={handlePasswordAuth} className="auth-form">
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

          {/* 3. REGISTRATION FLOW */}
          {authMode === 'register' && (
            <form onSubmit={handlePasswordAuth} className="auth-form">
              <input name="fullName" type="text" placeholder="Full Name" required />
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input name="email" type="email" placeholder="Email Address (for OTP Login)" required />
              </div>
              <div className="input-group">
                <label htmlFor="dob" className="input-label">Date of Birth (Must be 18+)</label>
                <input name="dob" id="dob" type="date" required />
              </div>
              <input name="phone" type="tel" placeholder="Phone Number" required />
              <input name="username" type="text" placeholder="Choose Username" required />
              <input name="password" type="password" placeholder="Choose Password" required />
              <button type="submit" className="save-btn" disabled={isAuthenticating}>
                {isAuthenticating ? 'Creating Account...' : 'Create Account'}
              </button>
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
                    setAuthAlert(null); 
                  }}
                >
                  Create one now
                </button>
              </p>
            )}
          </div>
        </div>
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

        {/* Navigation Tabs: History & Branches */}
        <div className="sidebar-tabs">
          <button 
            type="button"
            className={`sidebar-tab ${sidebarTab === 'history' ? 'active' : ''}`}
            onClick={() => setSidebarTab('history')}
          >
            <MessageSquare size={13} />
            <span>Chats ({conversations.length})</span>
          </button>
          <button 
            type="button"
            className={`sidebar-tab ${sidebarTab === 'branches' ? 'active' : ''}`}
            onClick={() => setSidebarTab('branches')}
          >
            <Layers size={13} />
            <span>Branches</span>
          </button>
        </div>

        {/* Tab Content: History List */}
        {sidebarTab === 'history' && (
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
        )}

        {/* Tab Content: Engineering Branches */}
        {sidebarTab === 'branches' && (
          <div className="discipline-list">
            {DISCIPLINES.map(discipline => (
              <button
                key={discipline.id}
                className={`discipline-btn ${activeDiscipline.id === discipline.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveDiscipline(discipline);
                  if (!currentConversationId) {
                    handleNewChat(discipline);
                  }
                }}
              >
                {(() => {
                  const Icon = discipline.icon;
                  return <Icon size={18} className="icon" />;
                })()}
                {discipline.name}
              </button>
            ))}
          </div>
        )}
        
        <div className="user-profile">
          <div className="user-info">
            <User size={18} style={{ flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', overflow: 'hidden' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user.name || user.username}
              </span>
              {user.email && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {user.email}
                </span>
              )}
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
            <h2>
              {currentConversationId ? (
                conversations.find(c => c.id === currentConversationId)?.title || `${activeDiscipline.name} Expert`
              ) : (
                `${activeDiscipline.name} Expert`
              )}
            </h2>
            <p>
              {currentConversationId ? (
                <span>Branch: <strong>{activeDiscipline.name}</strong> • Conversation active</span>
              ) : (
                `Ask anything related to ${activeDiscipline.name.toLowerCase()}`
              )}
            </p>
          </div>
          <div className="header-actions">
            {/* Mode Switch Toggle */}
            <button 
              type="button" 
              className={`mode-toggle-btn ${activeMode}`}
              onClick={() => {
                const next = activeMode === 'learn' ? 'work' : 'learn';
                setActiveMode(next);
                try { localStorage.setItem('engibot_mode', next); } catch {}
              }}
              title={activeMode === 'learn' ? "Switch to Work Mode (Dense, Standards-cited, Fast)" : "Switch to Learn Mode (Step-by-step, Theory, Quizzes)"}
            >
              {activeMode === 'learn' ? <BookOpen size={14} /> : <Briefcase size={14} />}
              <span>{activeMode === 'learn' ? 'Learn Mode' : 'Work Mode'}</span>
            </button>

            {/* Language Selector */}
            <select 
              className="lang-select" 
              value={language} 
              onChange={(e) => {
                setLanguage(e.target.value);
                try { localStorage.setItem('engibot_lang', e.target.value); } catch {}
              }}
              title="Select Response Language"
            >
              <option value="en">English (EN)</option>
              <option value="od">ଓଡ଼ିଆ (Odia)</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="te">తెలుగు (Telugu)</option>
            </select>

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

            {/* Model Badge */}
            {modelStatus && (
              <div 
                className="model-badge" 
                title={
                  modelStatus.ollama?.online 
                    ? `Active local model: ${modelStatus.ollama.target_model}` 
                    : `Cloud fallback active (${modelStatus.openrouter?.model || 'OpenRouter'}). Ollama offline.`
                }
              >
                <span className={`status-dot ${modelStatus.ollama?.online ? 'online' : 'cloud'}`}></span>
                <span>
                  {modelStatus.ollama?.online 
                    ? `Local: ${modelStatus.ollama.target_model}` 
                    : 'Cloud AI'}
                </span>
              </div>
            )}
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

      {/* 1. Onboarding & Role Modal */}
      {showOnboardingModal && (
        <div className="modal-overlay">
          <div className="modal-content medium-dialog">
            <button className="modal-close" onClick={() => setShowOnboardingModal(false)}>
              <X size={20} />
            </button>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div className="auth-badge-icon">
                <GraduationCap size={28} />
              </div>
              <h3>Welcome to EngiBot</h3>
              <p>Customize your engineering experience for university exams or field practice.</p>
            </div>

            <form onSubmit={handleSaveOnboarding}>
              <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Select Your Role
                </label>
                <div className="onboarding-role-grid">
                  <div 
                    className={`role-choice-card ${userRole === 'student' ? 'active' : ''}`}
                    onClick={() => {
                      setUserRole('student');
                      setActiveMode('learn');
                    }}
                  >
                    <GraduationCap size={24} color="#3b82f6" />
                    <h4>College Student</h4>
                    <p>Syllabus learning, PYQs, exam prep, viva practice, and quizzes.</p>
                  </div>

                  <div 
                    className={`role-choice-card ${userRole === 'professional' ? 'active' : ''}`}
                    onClick={() => {
                      setUserRole('professional');
                      setActiveMode('work');
                    }}
                  >
                    <Briefcase size={24} color="#d97706" />
                    <h4>Field Engineer</h4>
                    <p>Fast calculations, standard citations (IS/IEC/ASME), and site documentation.</p>
                  </div>
                </div>
              </div>

              {userRole === 'student' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="calc-field">
                    <label>University</label>
                    <select value={university} onChange={(e) => setUniversity(e.target.value)}>
                      <option value="BPUT">BPUT (Biju Patnaik Univ)</option>
                      <option value="VTU">VTU (Visvesvaraya Tech)</option>
                      <option value="Anna Univ">Anna University</option>
                      <option value="AKTU">AKTU (Dr. APJ Abdul Kalam)</option>
                      <option value="JNTU">JNTU</option>
                      <option value="Other">Other Technical University</option>
                    </select>
                  </div>

                  <div className="calc-field">
                    <label>Current Semester</label>
                    <select value={semester} onChange={(e) => setSemester(parseInt(e.target.value, 10))}>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div className="calc-field">
                    <label>Industry Sector</label>
                    <select defaultValue="Civil & Infrastructure">
                      <option value="Civil & Infrastructure">Civil & Infrastructure</option>
                      <option value="Power & Electrical Systems">Power & Electrical Systems</option>
                      <option value="Software & IT">Software & IT</option>
                      <option value="Electronics & Embedded">Electronics & Embedded</option>
                      <option value="Manufacturing & Mechanical">Manufacturing & Mechanical</option>
                    </select>
                  </div>

                  <div className="calc-field">
                    <label>Experience</label>
                    <select value={experienceYears} onChange={(e) => setExperienceYears(parseInt(e.target.value, 10))}>
                      <option value={1}>0 - 2 Years</option>
                      <option value={4}>3 - 5 Years</option>
                      <option value={8}>5 - 10 Years</option>
                      <option value={12}>10+ Years</option>
                    </select>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="calc-field">
                  <label>Default Operating Mode</label>
                  <select value={activeMode} onChange={(e) => setActiveMode(e.target.value)}>
                    <option value="learn">Learn Mode (Step-by-step)</option>
                    <option value="work">Work Mode (Concise & Codes)</option>
                  </select>
                </div>

                <div className="calc-field">
                  <label>Language</label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                    <option value="en">English (EN)</option>
                    <option value="od">ଓଡ଼ିଆ (Odia)</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                    <option value="te">తెలుగు (Telugu)</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="save-btn">
                Save & Start Using EngiBot
              </button>
            </form>
          </div>
        </div>
      )}

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
    </div>
  )
}

export default App
