import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StatusBar,
  Alert,
  Image,
  Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SAFE_STATUS_BAR_HEIGHT = Platform.OS === 'android' ? ((StatusBar.currentHeight || 28) + 8) : 4;
const DEFAULT_API_URL = 'https://engibot-n8e6.onrender.com';
const LOCAL_WIFI_URL = 'http://192.168.1.35:8000';

// ==========================================
// 1. MODELS & DISCIPLINES (PARITY WITH WEB)
// ==========================================
const MODEL_OPTIONS = [
  {
    id: 'auto',
    name: 'Auto (Smart Route)',
    shortName: 'Auto Route',
    subtitle: 'Intelligent multi-model cascade',
    badge: '✨ Recommended',
    color: '#a855f7',
    icon: 'sparkles',
    desc: 'Auto-detects problem type. Routes calculations to Groq 120B and deep proofs to Qwen 27B / Nemotron.'
  },
  {
    id: 'groq',
    name: 'Groq 120B Flagship',
    shortName: 'Groq 120B',
    subtitle: 'Flagship • openai/gpt-oss-120b',
    badge: '⚡ 120B Ultra-Fast',
    color: '#f59e0b',
    icon: 'flash',
    desc: '120-Billion parameter engine. Sub-second speed, best for rapid calculations, formulas & code.'
  },
  {
    id: 'qwen',
    name: 'Qwen 27B Deep Reasoning',
    shortName: 'Qwen 27B',
    subtitle: 'Groq Engine • qwen/qwen3.8-27b',
    badge: '🧠 Deep Math & Logic',
    color: '#ec4899',
    icon: 'hardware-chip',
    desc: 'Specialized mathematical, algorithmic, and engineering structural derivation model.'
  },
  {
    id: 'nemotron-omni',
    name: 'Nemotron 30B Omni Reasoning',
    shortName: 'Nemotron 30B',
    subtitle: 'OpenRouter • Chain-of-Thought',
    badge: '🔬 Step-by-Step Logic',
    color: '#06b6d4',
    icon: 'git-network',
    desc: 'Active free chain-of-thought logic engine. Great for circuit theory, proofs & analysis.'
  },
  {
    id: 'nemotron-ultra',
    name: 'Nemotron 550B Ultra',
    shortName: 'Nemotron 550B',
    subtitle: 'OpenRouter • 550-Billion Scale',
    badge: '🏛️ 550B Flagship',
    color: '#10b981',
    icon: 'planet',
    desc: 'Massive 550-Billion parameter open-weights model for comprehensive engineering textbooks & systems.'
  },
  {
    id: 'cohere-code',
    name: 'Cohere Mini Code',
    shortName: 'Cohere Code',
    subtitle: 'OpenRouter • Code & Syntax',
    badge: '💻 Algorithms & Code',
    color: '#8b5cf6',
    icon: 'code-slash',
    desc: 'Optimized for Python, C++, Java, MATLAB, Verilog, SQL, and algorithm design.'
  },
  {
    id: 'openrouter',
    name: 'Nemotron 3.5 Cloud',
    shortName: 'Nemotron 3.5',
    subtitle: 'OpenRouter • Cloud Throughput',
    badge: '🌐 Cloud Throughput',
    color: '#3b82f6',
    icon: 'globe',
    desc: 'High-throughput cloud backup. Great for conceptual explanations & syllabus Q&A.'
  }
];

const DISCIPLINES = [
  { id: 'general', name: 'General Engineering', short: 'General', icon: 'chatbubbles-outline', prompt: 'You are an expert engineering assistant.' },
  { id: 'cse', name: 'Computer Science (CSE)', short: 'CSE', icon: 'hardware-chip-outline', prompt: 'You are an expert Computer Science Engineer. Help with programming, algorithms, system design, and software engineering.' },
  { id: 'civil', name: 'Civil Engineering', short: 'Civil', icon: 'construct-outline', prompt: 'You are an expert Civil Engineer. Help with structural design, construction materials, fluid mechanics, and surveying.' },
  { id: 'ece', name: 'Electronics (ECE)', short: 'ECE', icon: 'radio-outline', prompt: 'You are an expert Electronics and Communication Engineer. Help with circuits, signals & systems, microprocessors, and communication theory.' },
  { id: 'eee', name: 'Electrical (EEE)', short: 'EEE', icon: 'flash-outline', prompt: 'You are an expert Electrical Engineer. Help with power systems, electrical machines, control systems, and power electronics.' },
  { id: 'mech', name: 'Mechanical (Mech)', short: 'Mech', icon: 'settings-outline', prompt: 'You are an expert Mechanical Engineer. Help with thermodynamics, solid mechanics, manufacturing, and machine design.' },
];

const LANGUAGES = [
  { id: 'en', name: 'English' },
  { id: 'hi', name: 'Hindi (हिंदी)' },
  { id: 'od', name: 'Odia (ଓଡ଼ିଆ)' },
  { id: 'te', name: 'Telugu (తెలుగు)' },
];

const SUGGESTIONS = [
  { id: '1', title: 'Cantilever Beam Bending', desc: 'Max moment & deflection analysis', branch: 'civil', prompt: 'Calculate the maximum bending moment and deflection for a 4m cantilever steel beam with a 25 kN point load at the free end.' },
  { id: '2', title: '3-Phase Cable Sizing', desc: 'Determine wire gauge by current & drop', branch: 'eee', prompt: 'Calculate cable size for a 3-phase 415V 45 kW motor with 0.85 power factor, 120m run length, allowing max 3% voltage drop.' },
  { id: '3', title: 'B-Tree Node Insertion', desc: 'Algorithm & Big-O time complexity', branch: 'cse', prompt: 'Explain the algorithm and time complexity for inserting a key into a B-Tree of order m with split logic.' },
  { id: '4', title: 'Stress-Strain & Safety', desc: 'Tensile test & yield strength factor', branch: 'mech', prompt: 'Compute tensile stress and factor of safety for a 20mm diameter rod carrying an 80 kN axial tensile load with 250 MPa yield strength.' },
];

export default function App() {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // App Theme: 'dark' (ChatGPT dark default) | 'light'
  const [theme, setTheme] = useState('dark');
  const isDark = theme === 'dark';

  // Core Engineering Controls
  const [selectedModel, setSelectedModel] = useState('auto');
  const [activeDiscipline, setActiveDiscipline] = useState(DISCIPLINES[0]);
  const [mode, setMode] = useState('learn'); // 'learn' (Student) | 'work' (Professional)
  const [language, setLanguage] = useState('en');

  // Auth State (Same as Web: 'otp' | 'login' | 'register' | 'forgot')
  const [authMode, setAuthMode] = useState('otp');
  const [otpStep, setOtpStep] = useState('enter-email'); // 'enter-email' | 'enter-code'
  const [forgotStep, setForgotStep] = useState('request-otp'); // 'request-otp' | 'reset-password'
  const [emailInput, setEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [fullNameInput, setFullNameInput] = useState('');
  const [phoneInput] = useState('');
  const [dobInput] = useState('2001-01-01');
  const [regSemester] = useState(5);
  const [regDiscipline, setRegDiscipline] = useState('cse');
  const [countdown, setCountdown] = useState(0);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authAlert, setAuthAlert] = useState(null);

  // Chat State
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Modals & Sheets
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [modelPickerVisible, setModelPickerVisible] = useState(false);
  const [disciplinePickerVisible, setDisciplinePickerVisible] = useState(false);
  const [toolsModalVisible, setToolsModalVisible] = useState(false);
  const [calcModalVisible, setCalcModalVisible] = useState(false);
  const [examModalVisible, setExamModalVisible] = useState(false);
  const [diagramModalVisible, setDiagramModalVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState(DEFAULT_API_URL);

  // Conversations State
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);

  // Calculator Form State
  const [calcTab, setCalcTab] = useState('civil'); // 'civil' | 'eee' | 'ece' | 'cse' | 'mech' | 'general'
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcResult, setCalcResult] = useState(null);
  // Beam
  const [beamType] = useState('cantilever');
  const [beamLoadType] = useState('point');
  const [beamSpan, setBeamSpan] = useState(4.0);
  const [beamLoad, setBeamLoad] = useState(25.0);
  // Cable
  const [cableKw, setCableKw] = useState(45.0);
  const [cableVolt] = useState(415.0);
  const [cableLen, setCableLen] = useState(120.0);
  // Circuit
  const [circR, setCircR] = useState(50.0);
  const [circL, setCircL] = useState(100.0);
  const [circC] = useState(10.0);
  // Stress
  const [stressForce, setStressForce] = useState(80.0);
  const [stressDim1, setStressDim1] = useState(20.0);
  const [stressYield] = useState(250.0);
  // Unit Converter
  const [unitCategory] = useState('pressure');
  const [unitVal, setUnitVal] = useState(1.0);
  const [unitFrom] = useState('bar');
  const [unitTo] = useState('pascal');

  // Exam Prep State
  const [examTab, setExamTab] = useState('pyq'); // 'pyq' | 'quiz' | 'flashcards'
  const [examTopic, setExamTopic] = useState('Engineering Mechanics');
  const [examLoading, setExamLoading] = useState(false);
  const [examResult, setExamResult] = useState(null);

  // Diagram Studio State
  const [diagramPrompt, setDiagramPrompt] = useState('Microservices architecture diagram');
  const [diagramStyle, setDiagramStyle] = useState('schematic');
  const [diagramLoading, setDiagramLoading] = useState(false);

  const flatListRef = useRef(null);

  // Initialize stored session & preferences
  useEffect(() => {
    (async () => {
      try {
        const storedUrl = await AsyncStorage.getItem('engibot_api_url');
        if (storedUrl) {
          setApiUrl(storedUrl);
          setCustomApiUrl(storedUrl);
        }
        const storedTheme = await AsyncStorage.getItem('engibot_theme');
        if (storedTheme) setTheme(storedTheme);

        const storedModel = await AsyncStorage.getItem('engibot_selected_model');
        if (storedModel) setSelectedModel(storedModel);

        const storedMode = await AsyncStorage.getItem('engibot_mode');
        if (storedMode) setMode(storedMode);

        const storedLang = await AsyncStorage.getItem('engibot_lang');
        if (storedLang) setLanguage(storedLang);

        const storedUser = await AsyncStorage.getItem('chat_user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          if (parsed.discipline) {
            const found = DISCIPLINES.find((d) => d.id === parsed.discipline);
            if (found) setActiveDiscipline(found);
          }
        }
      } catch (e) {
        console.error('Init error:', e);
      } finally {
        setIsInitializing(false);
      }
    })();
  }, []);

  // OTP Countdown
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Load chat history when user or conversation changes
  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    const fetchHistory = async () => {
      try {
        let endpoint = `${apiUrl}/api/history/${user.id}?discipline=${activeDiscipline.id}`;
        if (currentConversationId) {
          endpoint = `${apiUrl}/api/conversations/${currentConversationId}/messages`;
        }
        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data)) {
            setMessages(data);
          }
        }
      } catch (e) {
        console.warn('Could not load history:', e.message);
      }
    };
    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [user, activeDiscipline, currentConversationId, apiUrl]);

  // Fetch past conversations list for Drawer
  const fetchConversationsList = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${apiUrl}/api/conversations/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setConversations(data);
        }
      }
    } catch (e) {
      console.warn('Could not fetch conversations:', e.message);
    }
  };

  const handleOpenDrawer = () => {
    fetchConversationsList();
    setDrawerVisible(true);
  };

  const toggleTheme = async () => {
    const nextTheme = isDark ? 'light' : 'dark';
    setTheme(nextTheme);
    await AsyncStorage.setItem('engibot_theme', nextTheme);
  };

  const toggleMode = async () => {
    const nextMode = mode === 'learn' ? 'work' : 'learn';
    setMode(nextMode);
    await AsyncStorage.setItem('engibot_mode', nextMode);
  };

  const handleSelectModel = async (modelId) => {
    setSelectedModel(modelId);
    await AsyncStorage.setItem('engibot_selected_model', modelId);
    setModelPickerVisible(false);
  };

  const handleSelectLanguage = async (langId) => {
    setLanguage(langId);
    await AsyncStorage.setItem('engibot_lang', langId);
  };

  // ==========================================
  // AUTH SYSTEM (PARITY WITH WEB)
  // ==========================================

  // 1-Tap Demo Login
  const handleDemoLogin = async () => {
    setIsAuthLoading(true);
    setAuthAlert(null);
    try {
      const res = await fetch(`${apiUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'demo', password: 'demo123' })
      });
      if (res.ok) {
        const data = await res.json();
        await AsyncStorage.setItem('chat_user', JSON.stringify(data));
        setUser(data);
        return;
      }
      // Auto-register demo account
      const regRes = await fetch(`${apiUrl}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Demo Student',
          email: 'demo@engibot.local',
          dob: '2001-01-01',
          phone_number: '9999999999',
          username: 'demo',
          password: 'demo123',
          discipline: 'general',
          role: 'student',
          preferred_mode: 'learn'
        })
      });
      if (regRes.ok) {
        const data = await regRes.json();
        await AsyncStorage.setItem('chat_user', JSON.stringify(data));
        setUser(data);
      } else {
        const regData = await regRes.json();
        throw new Error(regData.detail || 'Demo login failed');
      }
    } catch {
      // Offline fallback mock user
      const mockUser = {
        id: 9999,
        username: 'demo',
        name: 'Demo Student',
        email: 'demo@engibot.local',
        discipline: 'general',
        role: 'student',
        preferred_mode: 'learn'
      };
      await AsyncStorage.setItem('chat_user', JSON.stringify(mockUser));
      setUser(mockUser);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Auth: Email OTP Send
  const handleSendOtp = async () => {
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthAlert({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }
    setIsAuthLoading(true);
    setAuthAlert(null);
    try {
      const res = await fetch(`${apiUrl}/api/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to send OTP code.');

      setOtpStep('enter-code');
      setCountdown(45);
      if (data.demo_otp) {
        setOtpInput(data.demo_otp);
        setAuthAlert({ type: 'success', text: `Verification Code: ${data.demo_otp} (Auto-filled)` });
      } else {
        setOtpInput('');
        setAuthAlert({ type: 'success', text: `OTP code sent to ${cleanEmail}` });
      }
    } catch (err) {
      setAuthAlert({ type: 'error', text: err.message });
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Auth: Email OTP Verify
  const handleVerifyOtp = async () => {
    const cleanCode = otpInput.trim();
    if (cleanCode.length !== 6) {
      setAuthAlert({ type: 'error', text: 'Please enter the 6-digit verification code.' });
      return;
    }
    setIsAuthLoading(true);
    setAuthAlert(null);
    try {
      const res = await fetch(`${apiUrl}/api/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim().toLowerCase(), otp_code: cleanCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Invalid or expired OTP.');

      await AsyncStorage.setItem('chat_user', JSON.stringify(data));
      setUser(data);
      setAuthAlert(null);
    } catch (err) {
      setAuthAlert({ type: 'error', text: err.message });
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Auth: Password Login
  const handlePasswordLogin = async () => {
    if (!usernameInput.trim() || !passwordInput.trim()) {
      setAuthAlert({ type: 'error', text: 'Please enter username and password.' });
      return;
    }
    setIsAuthLoading(true);
    setAuthAlert(null);
    try {
      const res = await fetch(`${apiUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput.trim(), password: passwordInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Invalid credentials.');

      await AsyncStorage.setItem('chat_user', JSON.stringify(data));
      setUser(data);
      setAuthAlert(null);
    } catch (err) {
      setAuthAlert({ type: 'error', text: err.message });
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Auth: Register Account
  const handleRegister = async () => {
    if (!fullNameInput.trim() || !emailInput.trim() || !usernameInput.trim() || !passwordInput.trim()) {
      setAuthAlert({ type: 'error', text: 'Please fill out all required registration fields.' });
      return;
    }
    setIsAuthLoading(true);
    setAuthAlert(null);
    try {
      const res = await fetch(`${apiUrl}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullNameInput.trim(),
          email: emailInput.trim().toLowerCase(),
          dob: dobInput.trim(),
          phone_number: phoneInput.trim() || '9999999999',
          username: usernameInput.trim(),
          password: passwordInput.trim(),
          semester: regSemester,
          discipline: regDiscipline,
          preferred_mode: 'learn'
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Registration failed.');

      await AsyncStorage.setItem('chat_user', JSON.stringify(data));
      setUser(data);
      setAuthAlert(null);
    } catch (err) {
      setAuthAlert({ type: 'error', text: err.message });
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Auth: Forgot Password Request OTP
  const handleForgotSendOtp = async () => {
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthAlert({ type: 'error', text: 'Enter registered email address.' });
      return;
    }
    setIsAuthLoading(true);
    setAuthAlert(null);
    try {
      const res = await fetch(`${apiUrl}/api/auth/forgot-password/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to send reset code.');
      setForgotStep('reset-password');
      setCountdown(45);
      if (data.demo_otp) {
        setOtpInput(data.demo_otp);
        setAuthAlert({ type: 'success', text: `Reset Code: ${data.demo_otp} (Auto-filled)` });
      } else {
        setOtpInput('');
        setAuthAlert({ type: 'success', text: `Reset OTP sent to ${cleanEmail}` });
      }
    } catch (err) {
      setAuthAlert({ type: 'error', text: err.message });
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Auth: Forgot Password Reset
  const handleForgotReset = async () => {
    if (!otpInput.trim() || !newPasswordInput.trim()) {
      setAuthAlert({ type: 'error', text: 'Enter verification code and new password.' });
      return;
    }
    setIsAuthLoading(true);
    setAuthAlert(null);
    try {
      const res = await fetch(`${apiUrl}/api/auth/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput.trim().toLowerCase(),
          otp_code: otpInput.trim(),
          new_password: newPasswordInput.trim()
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Reset failed.');
      setAuthAlert({ type: 'success', text: 'Password reset successful! Please sign in.' });
      setAuthMode('login');
      setPasswordInput(newPasswordInput);
    } catch (err) {
      setAuthAlert({ type: 'error', text: err.message });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Log out', 'Are you sure you want to log out of EngiBot?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('chat_user');
          setUser(null);
          setMessages([]);
          setCurrentConversationId(null);
          setDrawerVisible(false);
          setOtpStep('enter-email');
          setOtpInput('');
          setAuthAlert(null);
        },
      },
    ]);
  };

  const handleNewChat = () => {
    setMessages([]);
    setInputMessage('');
    setSelectedAttachment(null);
    setCurrentConversationId(null);
    setDrawerVisible(false);
  };

  // ==========================================
  // CHAT & ATTACHMENT PIPELINE
  // ==========================================
  const handlePickFileWeb = (accept = 'image/*') => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        let detectedType = 'file';
        if (file.type.startsWith('image/')) detectedType = 'image';
        else if (file.type.startsWith('video/')) detectedType = 'video';

        const reader = new FileReader();
        reader.onload = () => {
          setSelectedAttachment({
            name: file.name,
            type: detectedType,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            dataBase64: reader.result
          });
          setToolsModalVisible(false);
        };
        reader.readAsDataURL(file);
      };
      input.click();
    } else {
      Alert.alert(
        'Upload File',
        'Choose a sample diagram preset or enter prompt to generate CAD diagram.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSendMessage = async (customText = null) => {
    const textToSend = typeof customText === 'string' ? customText : inputMessage;
    const text = textToSend.trim() || (selectedAttachment ? `Attached ${selectedAttachment.type}: ${selectedAttachment.name}` : '');
    if ((!text && !selectedAttachment) || isChatLoading) return;

    let fileUrl = null;
    let fileName = null;
    let fileType = null;
    let fileSize = null;

    if (selectedAttachment) {
      if (selectedAttachment.dataBase64) {
        setIsUploading(true);
        try {
          const upRes = await fetch(`${apiUrl}/api/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file_name: selectedAttachment.name,
              file_type: selectedAttachment.type,
              mime_type: selectedAttachment.mimeType,
              data_base64: selectedAttachment.dataBase64,
              user_id: user?.id || 1
            })
          });
          if (upRes.ok) {
            const upData = await upRes.json();
            fileUrl = upData.file_url;
            fileName = upData.file_name;
            fileType = upData.file_type;
            fileSize = upData.file_size;
          }
        } catch (e) {
          console.warn('Upload error:', e);
        } finally {
          setIsUploading(false);
        }
      } else if (selectedAttachment.url) {
        fileUrl = selectedAttachment.url;
        fileName = selectedAttachment.name;
        fileType = selectedAttachment.type;
        fileSize = selectedAttachment.size;
      }
    }

    const userMessage = {
      role: 'user',
      content: text,
      attachment_url: fileUrl,
      attachment_type: fileType,
      file_name: fileName,
      file_size: fileSize
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setSelectedAttachment(null);
    setIsChatLoading(true);

    try {
      const res = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.id || 1,
          conversation_id: currentConversationId,
          message: text,
          discipline: activeDiscipline.id,
          system_instruction: activeDiscipline.prompt,
          mode: mode,
          language: language,
          model_provider: selectedModel,
          model: selectedModel,
          attachment_url: fileUrl,
          attachment_type: fileType,
          file_name: fileName,
          file_size: fileSize
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to fetch AI response.');

      if (data.conversation_id && !currentConversationId) {
        setCurrentConversationId(data.conversation_id);
      }

      const aiMessage = {
        role: 'ai',
        content: data.response,
        model_used: data.model_used,
        attachment_url: data.attachment_url,
        attachment_type: data.attachment_type,
        file_name: data.file_name
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      const isNetErr = err.message.includes('Network request failed') || err.message.includes('Failed to fetch') || err.message.includes('NoRouteToHostException');
      const errText = isNetErr
        ? `Could not reach backend at ${apiUrl}. Switch to Cloud Server (Render) in Server Settings.`
        : (err.message || 'Error generating response.');
      setMessages((prev) => [...prev, { role: 'ai', content: errText }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleCopyMessage = (text, index) => {
    setCopiedId(index);
    setTimeout(() => setCopiedId(null), 2000);
    Alert.alert('Copied to clipboard', 'Response text copied.');
  };

  // ==========================================
  // DETERMINISTIC CALCULATORS RUNNER
  // ==========================================
  const handleRunCalculator = async () => {
    setCalcLoading(true);
    setCalcResult(null);
    try {
      let endpoint = '';
      let payload = { user_id: user?.id, conversation_id: currentConversationId };

      if (calcTab === 'civil') {
        endpoint = '/api/calculators/beam-bending';
        payload = { ...payload, beam_type: beamType, load_type: beamLoadType, span_m: parseFloat(beamSpan), load_val: parseFloat(beamLoad) };
      } else if (calcTab === 'eee') {
        endpoint = '/api/calculators/cable-sizing';
        payload = { ...payload, power_kw: parseFloat(cableKw), voltage_v: parseFloat(cableVolt), length_m: parseFloat(cableLen) };
      } else if (calcTab === 'ece') {
        endpoint = '/api/calculators/circuit-analysis';
        payload = { ...payload, circuit_mode: 'series', resistance_ohms: parseFloat(circR), inductance_mh: parseFloat(circL), capacitance_uf: parseFloat(circC) };
      } else if (calcTab === 'cse') {
        endpoint = '/api/calculators/algo-complexity';
        payload = { ...payload, algorithm: 'quicksort', raw_array: '64, 34, 25, 12, 22, 11, 90' };
      } else if (calcTab === 'mech') {
        endpoint = '/api/calculators/stress-strain';
        payload = { ...payload, force_kn: parseFloat(stressForce), shape: 'circular_bar', dim1_mm: parseFloat(stressDim1), yield_strength_mpa: parseFloat(stressYield) };
      } else if (calcTab === 'general') {
        endpoint = '/api/calculators/unit-converter';
        payload = { category: unitCategory, value: parseFloat(unitVal), from_unit: unitFrom, to_unit: unitTo };
      }

      const res = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Calculation failed');
      setCalcResult(data);
    } catch (err) {
      Alert.alert('Calculation Error', err.message);
    } finally {
      setCalcLoading(false);
    }
  };

  // ==========================================
  // EXAM PREP RUNNER
  // ==========================================
  const handleRunExamPrep = async () => {
    setExamLoading(true);
    setExamResult(null);
    try {
      let endpoint = '/api/exam/pyq';
      let payload = { discipline: activeDiscipline.id, university: 'BPUT', semester: 5, subject: examTopic };

      if (examTab === 'quiz') {
        endpoint = '/api/exam/quiz';
        payload = { discipline: activeDiscipline.id, topic: examTopic, num_questions: 5 };
      } else if (examTab === 'flashcards') {
        endpoint = '/api/exam/flashcards';
        payload = { discipline: activeDiscipline.id, topic: examTopic };
      }

      const res = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Exam generation failed');
      setExamResult(data.pyq_content || data.quiz_content || data.flashcards_content);
    } catch (err) {
      Alert.alert('Exam Prep Error', err.message);
    } finally {
      setExamLoading(false);
    }
  };

  // ==========================================
  // AI DIAGRAM & SCHEMATIC RUNNER
  // ==========================================
  const handleGenerateDiagram = async () => {
    if (!diagramPrompt.trim()) return;
    setDiagramLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/image/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: diagramPrompt,
          style: diagramStyle,
          discipline: activeDiscipline.id,
          research_model: selectedModel,
          user_id: user?.id,
          conversation_id: currentConversationId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Diagram generation failed');

      setDiagramModalVisible(false);
      const aiMsg = {
        role: 'ai',
        content: `### Generated Engineering Schematic\n**Prompt:** ${diagramPrompt}\n**Style:** ${diagramStyle.toUpperCase()} • **Discipline:** ${activeDiscipline.name}`,
        attachment_url: data.image_url,
        attachment_type: 'image',
        file_name: data.file_name
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      Alert.alert('Diagram Error', err.message);
    } finally {
      setDiagramLoading(false);
    }
  };

  const handleSaveApiUrl = async () => {
    const trimmed = customApiUrl.trim().replace(/\/$/, '');
    setApiUrl(trimmed);
    await AsyncStorage.setItem('engibot_api_url', trimmed);
    setSettingsVisible(false);
    Alert.alert('Server Saved', `Backend connection set to:\n${trimmed}`);
  };

  if (isInitializing) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: isDark ? '#212121' : '#f9f9f9' }]}>
        <ActivityIndicator size="large" color={isDark ? '#ffffff' : '#0d0d0d'} />
      </View>
    );
  }

  const currentModelConfig = MODEL_OPTIONS.find((m) => m.id === selectedModel) || MODEL_OPTIONS[0];

  // ==========================================
  // AUTH SCREEN (PARITY WITH WEB)
  // ==========================================
  if (!user) {
    return (
      <SafeAreaView style={[styles.authContainer, { backgroundColor: isDark ? '#212121' : '#ffffff' }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#212121' : '#ffffff'} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.authScroll} keyboardShouldPersistTaps="handled">
            
            {/* Top Brand Emblem */}
            <View style={styles.brandBox}>
              <View style={[styles.brandIconCircle, { backgroundColor: isDark ? '#2f2f2f' : '#f4f4f4' }]}>
                <Ionicons name="sparkles" size={32} color={isDark ? '#ffffff' : '#0d0d0d'} />
              </View>
              <Text style={[styles.brandTitle, { color: isDark ? '#ffffff' : '#0d0d0d' }]}>EngiBot</Text>
              <Text style={[styles.brandSubtitle, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                AI Engineering Assistant & Deterministic Calculation Suite
              </Text>
            </View>

            {/* Quick 1-Tap Demo Pill */}
            <TouchableOpacity
              style={[styles.demoPill, { backgroundColor: isDark ? '#2f2f2f' : '#f4f4f4', borderColor: isDark ? '#424242' : '#e5e5e5' }]}
              onPress={handleDemoLogin}
              disabled={isAuthLoading}
            >
              <Ionicons name="flash" size={16} color="#eab308" />
              <Text style={[styles.demoPillText, { color: isDark ? '#f3f4f6' : '#111827' }]}>
                {isAuthLoading ? 'Starting Demo...' : 'Instant 1-Tap Demo Access'}
              </Text>
              <Ionicons name="arrow-forward" size={14} color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: isDark ? '#333' : '#e5e5e5' }]} />
              <Text style={[styles.dividerText, { color: isDark ? '#737373' : '#9ca3af' }]}>OR SIGN IN</Text>
              <View style={[styles.dividerLine, { backgroundColor: isDark ? '#333' : '#e5e5e5' }]} />
            </View>

            {/* Auth Mode Tabs (Email OTP | Password | Register) */}
            <View style={[styles.authTabPill, { backgroundColor: isDark ? '#2f2f2f' : '#f4f4f4' }]}>
              <TouchableOpacity
                style={[styles.authTabOption, authMode === 'otp' && (isDark ? styles.authTabActiveDark : styles.authTabActiveLight)]}
                onPress={() => { setAuthMode('otp'); setAuthAlert(null); }}
              >
                <Text style={[styles.authTabText, authMode === 'otp' ? (isDark ? styles.textWhite : styles.textBlack) : styles.textMuted]}>Email OTP</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.authTabOption, authMode === 'login' && (isDark ? styles.authTabActiveDark : styles.authTabActiveLight)]}
                onPress={() => { setAuthMode('login'); setAuthAlert(null); }}
              >
                <Text style={[styles.authTabText, authMode === 'login' ? (isDark ? styles.textWhite : styles.textBlack) : styles.textMuted]}>Password</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.authTabOption, authMode === 'register' && (isDark ? styles.authTabActiveDark : styles.authTabActiveLight)]}
                onPress={() => { setAuthMode('register'); setAuthAlert(null); }}
              >
                <Text style={[styles.authTabText, authMode === 'register' ? (isDark ? styles.textWhite : styles.textBlack) : styles.textMuted]}>Register</Text>
              </TouchableOpacity>
            </View>

            {/* Alert Box */}
            {authAlert && (
              <View style={[styles.alertBox, authAlert.type === 'error' ? styles.alertError : styles.alertSuccess]}>
                <Ionicons name={authAlert.type === 'error' ? 'alert-circle' : 'checkmark-circle'} size={18} color={authAlert.type === 'error' ? '#ef4444' : '#22c55e'} />
                <Text style={[styles.alertText, authAlert.type === 'error' ? styles.alertTextError : styles.alertTextSuccess]}>{authAlert.text}</Text>
              </View>
            )}

            {/* Email OTP Flow */}
            {authMode === 'otp' && (
              <View>
                {otpStep === 'enter-email' ? (
                  <>
                    <TextInput
                      style={[styles.gptInput, { backgroundColor: isDark ? '#2f2f2f' : '#f9f9f9', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#424242' : '#e5e5e5' }]}
                      placeholder="Student or Faculty Email"
                      placeholderTextColor={isDark ? '#888' : '#aaa'}
                      value={emailInput}
                      onChangeText={setEmailInput}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <TouchableOpacity style={[styles.gptButton, { backgroundColor: isDark ? '#ffffff' : '#0d0d0d' }]} onPress={handleSendOtp} disabled={isAuthLoading}>
                      {isAuthLoading ? <ActivityIndicator color={isDark ? '#000' : '#fff'} /> : <Text style={[styles.gptButtonText, { color: isDark ? '#000' : '#fff' }]}>Send OTP Code</Text>}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TextInput
                      style={[styles.gptInput, { backgroundColor: isDark ? '#2f2f2f' : '#f9f9f9', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#424242' : '#e5e5e5', letterSpacing: 6, textAlign: 'center', fontSize: 22 }]}
                      placeholder="6-digit code"
                      placeholderTextColor={isDark ? '#888' : '#aaa'}
                      value={otpInput}
                      onChangeText={setOtpInput}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                    <TouchableOpacity style={[styles.gptButton, { backgroundColor: isDark ? '#ffffff' : '#0d0d0d' }]} onPress={handleVerifyOtp} disabled={isAuthLoading}>
                      {isAuthLoading ? <ActivityIndicator color={isDark ? '#000' : '#fff'} /> : <Text style={[styles.gptButtonText, { color: isDark ? '#000' : '#fff' }]}>Verify & Sign In</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setOtpStep('enter-email')} style={{ alignSelf: 'center', marginTop: 12 }}>
                      <Text style={{ color: isDark ? '#9ca3af' : '#6b7280', fontSize: 13 }}>Change email</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {/* Password Login Flow */}
            {authMode === 'login' && (
              <View>
                <TextInput
                  style={[styles.gptInput, { backgroundColor: isDark ? '#2f2f2f' : '#f9f9f9', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#424242' : '#e5e5e5' }]}
                  placeholder="Username or Email"
                  placeholderTextColor={isDark ? '#888' : '#aaa'}
                  value={usernameInput}
                  onChangeText={setUsernameInput}
                  autoCapitalize="none"
                />
                <TextInput
                  style={[styles.gptInput, { backgroundColor: isDark ? '#2f2f2f' : '#f9f9f9', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#424242' : '#e5e5e5' }]}
                  placeholder="Password"
                  placeholderTextColor={isDark ? '#888' : '#aaa'}
                  value={passwordInput}
                  onChangeText={setPasswordInput}
                  secureTextEntry
                />
                <TouchableOpacity style={[styles.gptButton, { backgroundColor: isDark ? '#ffffff' : '#0d0d0d' }]} onPress={handlePasswordLogin} disabled={isAuthLoading}>
                  {isAuthLoading ? <ActivityIndicator color={isDark ? '#000' : '#fff'} /> : <Text style={[styles.gptButtonText, { color: isDark ? '#000' : '#fff' }]}>Sign In</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setAuthMode('forgot'); setForgotStep('request-otp'); setAuthAlert(null); }} style={{ alignSelf: 'center', marginTop: 14 }}>
                  <Text style={{ color: isDark ? '#9ca3af' : '#6b7280', fontSize: 13 }}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Register Flow (Full Parity with Web) */}
            {authMode === 'register' && (
              <View>
                <TextInput
                  style={[styles.gptInput, { backgroundColor: isDark ? '#2f2f2f' : '#f9f9f9', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#424242' : '#e5e5e5' }]}
                  placeholder="Full Name *"
                  placeholderTextColor={isDark ? '#888' : '#aaa'}
                  value={fullNameInput}
                  onChangeText={setFullNameInput}
                />
                <TextInput
                  style={[styles.gptInput, { backgroundColor: isDark ? '#2f2f2f' : '#f9f9f9', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#424242' : '#e5e5e5' }]}
                  placeholder="Email Address *"
                  placeholderTextColor={isDark ? '#888' : '#aaa'}
                  value={emailInput}
                  onChangeText={setEmailInput}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextInput
                  style={[styles.gptInput, { backgroundColor: isDark ? '#2f2f2f' : '#f9f9f9', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#424242' : '#e5e5e5' }]}
                  placeholder="Username *"
                  placeholderTextColor={isDark ? '#888' : '#aaa'}
                  value={usernameInput}
                  onChangeText={setUsernameInput}
                  autoCapitalize="none"
                />
                <TextInput
                  style={[styles.gptInput, { backgroundColor: isDark ? '#2f2f2f' : '#f9f9f9', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#424242' : '#e5e5e5' }]}
                  placeholder="Password *"
                  placeholderTextColor={isDark ? '#888' : '#aaa'}
                  value={passwordInput}
                  onChangeText={setPasswordInput}
                  secureTextEntry
                />

                {/* Discipline Selector Chips */}
                <Text style={{ color: isDark ? '#888' : '#666', fontSize: 12, marginBottom: 8, marginTop: 4 }}>Select Engineering Branch:</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                  {DISCIPLINES.map((d) => (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.presetChipBtn, { backgroundColor: regDiscipline === d.id ? (isDark ? '#fff' : '#000') : (isDark ? '#333' : '#e5e5e5') }]}
                      onPress={() => setRegDiscipline(d.id)}
                    >
                      <Text style={[styles.presetChipText, { color: regDiscipline === d.id ? (isDark ? '#000' : '#fff') : (isDark ? '#aaa' : '#555') }]}>
                        {d.short}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={[styles.gptButton, { backgroundColor: isDark ? '#ffffff' : '#0d0d0d' }]} onPress={handleRegister} disabled={isAuthLoading}>
                  {isAuthLoading ? <ActivityIndicator color={isDark ? '#000' : '#fff'} /> : <Text style={[styles.gptButtonText, { color: isDark ? '#000' : '#fff' }]}>Complete Registration</Text>}
                </TouchableOpacity>
              </View>
            )}

            {/* Forgot Password Flow */}
            {authMode === 'forgot' && (
              <View>
                {forgotStep === 'request-otp' ? (
                  <>
                    <TextInput
                      style={[styles.gptInput, { backgroundColor: isDark ? '#2f2f2f' : '#f9f9f9', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#424242' : '#e5e5e5' }]}
                      placeholder="Registered Email"
                      placeholderTextColor={isDark ? '#888' : '#aaa'}
                      value={emailInput}
                      onChangeText={setEmailInput}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <TouchableOpacity style={[styles.gptButton, { backgroundColor: isDark ? '#ffffff' : '#0d0d0d' }]} onPress={handleForgotSendOtp} disabled={isAuthLoading}>
                      {isAuthLoading ? <ActivityIndicator color={isDark ? '#000' : '#fff'} /> : <Text style={[styles.gptButtonText, { color: isDark ? '#000' : '#fff' }]}>Send Reset Code</Text>}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TextInput
                      style={[styles.gptInput, { backgroundColor: isDark ? '#2f2f2f' : '#f9f9f9', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#424242' : '#e5e5e5', letterSpacing: 4, textAlign: 'center' }]}
                      placeholder="6-digit reset code"
                      placeholderTextColor={isDark ? '#888' : '#aaa'}
                      value={otpInput}
                      onChangeText={setOtpInput}
                      keyboardType="number-pad"
                    />
                    <TextInput
                      style={[styles.gptInput, { backgroundColor: isDark ? '#2f2f2f' : '#f9f9f9', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#424242' : '#e5e5e5' }]}
                      placeholder="Enter new password"
                      placeholderTextColor={isDark ? '#888' : '#aaa'}
                      value={newPasswordInput}
                      onChangeText={setNewPasswordInput}
                      secureTextEntry
                    />
                    <TouchableOpacity style={[styles.gptButton, { backgroundColor: isDark ? '#ffffff' : '#0d0d0d' }]} onPress={handleForgotReset} disabled={isAuthLoading}>
                      {isAuthLoading ? <ActivityIndicator color={isDark ? '#000' : '#fff'} /> : <Text style={[styles.gptButtonText, { color: isDark ? '#000' : '#fff' }]}>Set New Password</Text>}
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity onPress={() => { setAuthMode('login'); setAuthAlert(null); }} style={{ alignSelf: 'center', marginTop: 14 }}>
                  <Text style={{ color: isDark ? '#9ca3af' : '#6b7280', fontSize: 13 }}>Back to sign in</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Server Settings Link */}
            <TouchableOpacity style={styles.serverSettingsLink} onPress={() => setSettingsVisible(true)}>
              <Ionicons name="globe-outline" size={13} color={isDark ? '#737373' : '#9ca3af'} />
              <Text style={[styles.serverSettingsLinkText, { color: isDark ? '#737373' : '#9ca3af' }]} numberOfLines={1}>
                Server: {apiUrl}
              </Text>
            </TouchableOpacity>

          </ScrollView>
        </KeyboardAvoidingView>

        {/* Server Connection Modal */}
        <Modal visible={settingsVisible} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalBox, { backgroundColor: isDark ? '#262626' : '#ffffff' }]}>
              <Text style={[styles.modalHeader, { color: isDark ? '#fff' : '#000' }]}>Server Connection</Text>
              <Text style={[styles.modalSub, { color: isDark ? '#9ca3af' : '#6b7280' }]}>Select or enter backend API URL:</Text>

              <TextInput
                style={[styles.gptInput, { backgroundColor: isDark ? '#1f1f1f' : '#f4f4f4', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#3d3d3d' : '#ddd' }]}
                value={customApiUrl}
                onChangeText={setCustomApiUrl}
                autoCapitalize="none"
              />

              <View style={styles.presetChipWrap}>
                <TouchableOpacity style={[styles.presetChipBtn, { backgroundColor: isDark ? '#333' : '#e5e5e5' }]} onPress={() => setCustomApiUrl(DEFAULT_API_URL)}>
                  <Text style={[styles.presetChipText, { color: isDark ? '#fff' : '#000' }]}>Cloud (Render)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.presetChipBtn, { backgroundColor: isDark ? '#333' : '#e5e5e5' }]} onPress={() => setCustomApiUrl(LOCAL_WIFI_URL)}>
                  <Text style={[styles.presetChipText, { color: isDark ? '#fff' : '#000' }]}>PC Wi-Fi (.35)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.presetChipBtn, { backgroundColor: isDark ? '#333' : '#e5e5e5' }]} onPress={() => setCustomApiUrl('http://10.0.2.2:8000')}>
                  <Text style={[styles.presetChipText, { color: isDark ? '#fff' : '#000' }]}>Emulator</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.modalSecondaryBtn} onPress={() => setSettingsVisible(false)}>
                  <Text style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalPrimaryBtn, { backgroundColor: isDark ? '#fff' : '#000' }]} onPress={handleSaveApiUrl}>
                  <Text style={{ color: isDark ? '#000' : '#fff', fontWeight: '700' }}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ==========================================
  // MAIN WORKSPACE (CHATGPT MOBILE ERGONOMICS)
  // ==========================================
  return (
    <SafeAreaView style={[styles.mainWorkspace, { backgroundColor: isDark ? '#212121' : '#ffffff' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#212121' : '#ffffff'} />

      {/* Top Navigation Bar */}
      <View style={[styles.chatGptHeader, { borderBottomColor: isDark ? '#2f2f2f' : '#f0f0f0' }]}>
        
        {/* Left: Sidebar Hamburger Menu */}
        <TouchableOpacity style={styles.headerIconBtn} onPress={handleOpenDrawer}>
          <Ionicons name="menu-outline" size={26} color={isDark ? '#ffffff' : '#0d0d0d'} />
        </TouchableOpacity>

        {/* Center: Model Selector Pill */}
        <TouchableOpacity
          style={[styles.modelDropdownPill, { backgroundColor: isDark ? '#2f2f2f' : '#f4f4f4' }]}
          onPress={() => setModelPickerVisible(true)}
        >
          <Text style={[styles.modelDropdownTitle, { color: isDark ? '#ffffff' : '#0d0d0d' }]}>
            {currentModelConfig.shortName}
          </Text>
          <Ionicons name="chevron-down" size={14} color={isDark ? '#9ca3af' : '#6b7280'} />
        </TouchableOpacity>

        {/* Mode Switcher Pill (Learn vs Work) */}
        <TouchableOpacity
          style={[styles.modeTogglePill, { backgroundColor: mode === 'learn' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)' }]}
          onPress={toggleMode}
        >
          <Text style={[styles.modeToggleText, { color: mode === 'learn' ? '#3b82f6' : '#10b981' }]}>
            {mode === 'learn' ? '🎓 Learn' : '💼 Work'}
          </Text>
        </TouchableOpacity>

        {/* Right: New Chat Pen */}
        <TouchableOpacity style={styles.headerIconBtn} onPress={handleNewChat}>
          <Ionicons name="create-outline" size={24} color={isDark ? '#ffffff' : '#0d0d0d'} />
        </TouchableOpacity>
      </View>

      {/* Messages Feed */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={[styles.chatStreamContent, messages.length === 0 && styles.chatStreamEmpty]}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyScreenWrap}>
            <View style={[styles.emptyLogoCircle, { backgroundColor: isDark ? '#2f2f2f' : '#f4f4f4' }]}>
              <Ionicons name="sparkles" size={32} color={isDark ? '#ffffff' : '#0d0d0d'} />
            </View>
            <Text style={[styles.emptyGreeting, { color: isDark ? '#ffffff' : '#0d0d0d' }]}>
              {activeDiscipline.name}
            </Text>
            <Text style={[styles.emptySubtext, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
              Running on {currentModelConfig.name} in {mode.toUpperCase()} mode.
            </Text>

            {/* Suggestion Cards */}
            <View style={styles.suggestionGrid}>
              {SUGGESTIONS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.suggestionCard, { backgroundColor: isDark ? '#2a2a2a' : '#f9f9f9', borderColor: isDark ? '#383838' : '#e5e5e5' }]}
                  onPress={() => {
                    const matched = DISCIPLINES.find((d) => d.id === item.branch) || DISCIPLINES[0];
                    setActiveDiscipline(matched);
                    handleSendMessage(item.prompt);
                  }}
                >
                  <Text style={[styles.suggestionTitle, { color: isDark ? '#f3f4f6' : '#111827' }]}>{item.title}</Text>
                  <Text style={[styles.suggestionDesc, { color: isDark ? '#9ca3af' : '#6b7280' }]} numberOfLines={2}>{item.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        renderItem={({ item, index }) => {
          const isUser = item.role === 'user';
          const fileUri = item.attachment_url?.startsWith('http')
            ? item.attachment_url
            : `${apiUrl}${item.attachment_url}`;

          if (isUser) {
            return (
              <View style={styles.userMessageRow}>
                <View style={[styles.userMessageBubble, { backgroundColor: isDark ? '#2f2f2f' : '#f4f4f4' }]}>
                  {item.attachment_url && item.attachment_type === 'image' && (
                    <Image source={{ uri: fileUri }} style={styles.attachedImage} resizeMode="cover" />
                  )}
                  {item.attachment_url && item.attachment_type !== 'image' && (
                    <View style={styles.fileAttachmentBadge}>
                      <Ionicons name="document-text" size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
                      <Text style={[styles.fileAttachmentText, { color: isDark ? '#fff' : '#000' }]} numberOfLines={1}>
                        {item.file_name || 'Attached file'}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.userMessageText, { color: isDark ? '#ffffff' : '#0d0d0d' }]}>{item.content}</Text>
                </View>
              </View>
            );
          }

          // Assistant Response
          return (
            <View style={styles.aiMessageRow}>
              <View style={styles.aiMessageHeader}>
                <View style={[styles.aiAvatar, { backgroundColor: isDark ? '#2f2f2f' : '#f4f4f4' }]}>
                  <Ionicons name="sparkles" size={14} color={isDark ? '#fff' : '#000'} />
                </View>
                <Text style={[styles.aiSenderLabel, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                  EngiBot {item.model_used ? `• ${item.model_used}` : ''}
                </Text>
              </View>

              {item.attachment_url && item.attachment_type === 'image' && (
                <Image source={{ uri: fileUri }} style={styles.aiGeneratedImage} resizeMode="contain" />
              )}

              <Text style={[styles.aiMessageText, { color: isDark ? '#ececec' : '#171717' }]}>
                {item.content}
              </Text>

              {/* Action Toolbar */}
              <View style={styles.aiActionRow}>
                <TouchableOpacity style={styles.aiActionBtn} onPress={() => handleCopyMessage(item.content, index)}>
                  <Ionicons
                    name={copiedId === index ? 'checkmark-outline' : 'copy-outline'}
                    size={16}
                    color={copiedId === index ? '#22c55e' : (isDark ? '#888' : '#666')}
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.aiActionBtn} onPress={() => Alert.alert('Feedback', 'Thank you for rating this response!')}>
                  <Ionicons name="thumbs-up-outline" size={16} color={isDark ? '#888' : '#666'} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.aiActionBtn} onPress={() => Alert.alert('Feedback', 'We appreciate your feedback.')}>
                  <Ionicons name="thumbs-down-outline" size={16} color={isDark ? '#888' : '#666'} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.aiActionBtn} onPress={() => handleSendMessage(`Elaborate further: ${messages[index - 1]?.content || ''}`)}>
                  <Ionicons name="reload-outline" size={16} color={isDark ? '#888' : '#666'} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          isChatLoading ? (
            <View style={styles.aiThinkingRow}>
              <View style={[styles.aiAvatar, { backgroundColor: isDark ? '#2f2f2f' : '#f4f4f4' }]}>
                <Ionicons name="sparkles" size={14} color={isDark ? '#fff' : '#000'} />
              </View>
              <View style={styles.thinkingDots}>
                <ActivityIndicator size="small" color={isDark ? '#fff' : '#000'} />
                <Text style={[styles.thinkingText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>Thinking with {currentModelConfig.shortName}...</Text>
              </View>
            </View>
          ) : null
        }
      />

      {/* Attachment Preview Chip */}
      {selectedAttachment && (
        <View style={[styles.previewPill, { backgroundColor: isDark ? '#2f2f2f' : '#f4f4f4', borderColor: isDark ? '#424242' : '#e5e5e5' }]}>
          <Ionicons name={selectedAttachment.type === 'image' ? 'image' : 'document-text'} size={18} color={isDark ? '#fff' : '#000'} />
          <Text style={[styles.previewPillText, { color: isDark ? '#fff' : '#000' }]} numberOfLines={1}>
            {selectedAttachment.name}
          </Text>
          <TouchableOpacity onPress={() => setSelectedAttachment(null)}>
            <Ionicons name="close-circle" size={18} color={isDark ? '#888' : '#aaa'} />
          </TouchableOpacity>
        </View>
      )}

      {/* Signature Floating ChatGPT Input Pill */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}>
        <View style={styles.bottomBarContainer}>
          <View style={[styles.floatingInputPill, { backgroundColor: isDark ? '#2f2f2f' : '#f4f4f4', borderColor: isDark ? '#3d3d3d' : '#e5e5e5' }]}>
            
            {/* Left: Plus Action Menu */}
            <TouchableOpacity style={styles.inputPlusBtn} onPress={() => setToolsModalVisible(true)}>
              <Ionicons name="add" size={24} color={isDark ? '#ffffff' : '#0d0d0d'} />
            </TouchableOpacity>

            {/* Center: Input Text */}
            <TextInput
              style={[styles.floatingTextInput, { color: isDark ? '#ffffff' : '#0d0d0d' }]}
              placeholder={`Ask ${activeDiscipline.short}...`}
              placeholderTextColor={isDark ? '#888888' : '#9ca3af'}
              value={inputMessage}
              onChangeText={setInputMessage}
              multiline
            />

            {/* Right: Circular Send Button */}
            {inputMessage.trim() || selectedAttachment ? (
              <TouchableOpacity
                style={[styles.circularSendBtn, { backgroundColor: isDark ? '#ffffff' : '#0d0d0d' }]}
                onPress={() => handleSendMessage()}
                disabled={isChatLoading || isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color={isDark ? '#000' : '#fff'} />
                ) : (
                  <Ionicons name="arrow-up" size={20} color={isDark ? '#000000' : '#ffffff'} />
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.circularSendBtnDisabled} onPress={() => Alert.alert('Language', `Active response language: ${language.toUpperCase()}. Change in menu.`)}>
                <Ionicons name="language-outline" size={20} color={isDark ? '#888888' : '#9ca3af'} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ================================================== */}
      {/* SIDEBAR DRAWER (History & Controls)                */}
      {/* ================================================== */}
      <Modal visible={drawerVisible} transparent animationType="fade">
        <View style={styles.drawerBackdrop}>
          <TouchableOpacity style={styles.drawerOutsideTouch} onPress={() => setDrawerVisible(false)} />
          <View style={[styles.drawerPanel, { backgroundColor: isDark ? '#171717' : '#ffffff' }]}>
            
            {/* Drawer Top Action */}
            <View style={styles.drawerTop}>
              <TouchableOpacity style={[styles.newChatDrawerBtn, { backgroundColor: isDark ? '#262626' : '#f4f4f4' }]} onPress={handleNewChat}>
                <Ionicons name="add-circle-outline" size={20} color={isDark ? '#fff' : '#000'} />
                <Text style={[styles.newChatDrawerText, { color: isDark ? '#fff' : '#000' }]}>New chat</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDrawerVisible(false)} style={{ padding: 6 }}>
                <Ionicons name="close" size={24} color={isDark ? '#888' : '#666'} />
              </TouchableOpacity>
            </View>

            {/* Quick Switchers: Discipline & Language */}
            <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
              <TouchableOpacity
                style={[styles.drawerQuickBtn, { backgroundColor: isDark ? '#262626' : '#f4f4f4' }]}
                onPress={() => { setDrawerVisible(false); setDisciplinePickerVisible(true); }}
              >
                <Ionicons name="school-outline" size={18} color={isDark ? '#fff' : '#000'} />
                <Text style={[styles.drawerQuickText, { color: isDark ? '#fff' : '#000' }]}>{activeDiscipline.name}</Text>
                <Ionicons name="chevron-forward" size={14} color="#888" />
              </TouchableOpacity>
            </View>

            {/* Past Conversations List */}
            <Text style={[styles.drawerSectionLabel, { color: isDark ? '#737373' : '#9ca3af' }]}>RECENT SESSIONS</Text>
            <ScrollView style={{ flex: 1 }}>
              {conversations.length > 0 ? (
                conversations.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.drawerChatItem, { backgroundColor: currentConversationId === c.id ? (isDark ? '#333' : '#e5e5e5') : (isDark ? '#212121' : '#f9f9f9') }]}
                    onPress={() => {
                      setCurrentConversationId(c.id);
                      setDrawerVisible(false);
                    }}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
                    <Text style={[styles.drawerChatTitle, { color: isDark ? '#ececec' : '#171717' }]} numberOfLines={1}>
                      {c.title || 'Engineering Session'}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={{ paddingVertical: 16, paddingHorizontal: 16 }}>
                  <Text style={{ color: isDark ? '#737373' : '#9ca3af', fontSize: 13 }}>No saved sessions.</Text>
                </View>
              )}
            </ScrollView>

            {/* Language Selector Row */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: isDark ? '#262626' : '#f0f0f0' }}>
              <Text style={{ color: isDark ? '#737373' : '#9ca3af', fontSize: 11, fontWeight: '700', marginBottom: 6 }}>LANGUAGE</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {LANGUAGES.map((l) => (
                  <TouchableOpacity
                    key={l.id}
                    style={[styles.presetChipBtn, { backgroundColor: language === l.id ? (isDark ? '#fff' : '#000') : (isDark ? '#262626' : '#e5e5e5') }]}
                    onPress={() => handleSelectLanguage(l.id)}
                  >
                    <Text style={[styles.presetChipText, { color: language === l.id ? (isDark ? '#000' : '#fff') : (isDark ? '#aaa' : '#555') }]}>
                      {l.id.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Bottom Profile Row */}
            <View style={[styles.drawerBottomSection, { borderTopColor: isDark ? '#262626' : '#f0f0f0' }]}>
              <View style={styles.drawerUserRow}>
                <View style={[styles.drawerAvatar, { backgroundColor: isDark ? '#333' : '#e5e5e5' }]}>
                  <Text style={{ color: isDark ? '#fff' : '#000', fontWeight: '700' }}>
                    {(user.name || user.username || 'U')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.drawerUserName, { color: isDark ? '#fff' : '#000' }]} numberOfLines={1}>
                    {user.name || user.username}
                  </Text>
                  <Text style={{ color: isDark ? '#888' : '#888', fontSize: 11 }}>
                    {user.discipline?.toUpperCase() || 'STUDENT'} • {mode.toUpperCase()}
                  </Text>
                </View>
                <TouchableOpacity onPress={toggleTheme} style={{ padding: 6 }}>
                  <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={isDark ? '#fff' : '#000'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSettingsVisible(true)} style={{ padding: 6 }}>
                  <Ionicons name="settings-outline" size={20} color={isDark ? '#888' : '#666'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleLogout} style={{ padding: 6 }}>
                  <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>

          </View>
        </View>
      </Modal>

      {/* ================================================== */}
      {/* MODEL SELECTOR BOTTOM SHEET (ALL 7 WEB MODELS)     */}
      {/* ================================================== */}
      <Modal visible={modelPickerVisible} transparent animationType="slide">
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setModelPickerVisible(false)} />
          <View style={[styles.bottomSheetCard, { backgroundColor: isDark ? '#262626' : '#ffffff' }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: isDark ? '#ffffff' : '#0d0d0d' }]}>Select AI Engine</Text>
            <Text style={[styles.sheetDesc, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
              Choose from 7 specialized models. Switch anytime per query.
            </Text>

            <ScrollView style={{ maxHeight: 380 }}>
              {MODEL_OPTIONS.map((m) => {
                const isSelected = selectedModel === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.modelRowItem, { backgroundColor: isSelected ? (isDark ? '#333333' : '#f0f0f0') : 'transparent' }]}
                    onPress={() => handleSelectModel(m.id)}
                  >
                    <View style={[styles.modelRowIcon, { backgroundColor: isDark ? '#1f1f1f' : '#f4f4f4' }]}>
                      <Ionicons name={m.icon} size={20} color={m.color} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.modelRowName, { color: isDark ? '#ffffff' : '#0d0d0d' }]}>{m.name}</Text>
                      </View>
                      <Text style={{ color: m.color, fontSize: 11, fontWeight: '700', marginTop: 1 }}>{m.badge}</Text>
                      <Text style={{ color: isDark ? '#888' : '#666', fontSize: 12, marginTop: 2 }}>{m.desc}</Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark" size={20} color={isDark ? '#ffffff' : '#0d0d0d'} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================================================== */}
      {/* DISCIPLINE SELECTOR BOTTOM SHEET                   */}
      {/* ================================================== */}
      <Modal visible={disciplinePickerVisible} transparent animationType="slide">
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setDisciplinePickerVisible(false)} />
          <View style={[styles.bottomSheetCard, { backgroundColor: isDark ? '#262626' : '#ffffff' }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: isDark ? '#ffffff' : '#0d0d0d' }]}>Engineering Discipline</Text>
            {DISCIPLINES.map((d) => (
              <TouchableOpacity
                key={d.id}
                style={[styles.disciplineRowItem, { backgroundColor: activeDiscipline.id === d.id ? (isDark ? '#333' : '#f0f0f0') : 'transparent' }]}
                onPress={() => { setActiveDiscipline(d); setDisciplinePickerVisible(false); }}
              >
                <Ionicons name={d.icon} size={20} color={isDark ? '#fff' : '#000'} />
                <Text style={[styles.disciplineRowName, { color: isDark ? '#fff' : '#000', marginLeft: 12, flex: 1 }]}>{d.name}</Text>
                {activeDiscipline.id === d.id && <Ionicons name="checkmark" size={20} color={isDark ? '#fff' : '#000'} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* ================================================== */}
      {/* TOOLS & SUITE ACTION SHEET (+)                     */}
      {/* ================================================== */}
      <Modal visible={toolsModalVisible} transparent animationType="slide">
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setToolsModalVisible(false)} />
          <View style={[styles.bottomSheetCard, { backgroundColor: isDark ? '#262626' : '#ffffff' }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: isDark ? '#ffffff' : '#0d0d0d' }]}>Engineering Tools & Studio</Text>

            {/* Calculators Suite */}
            <TouchableOpacity style={styles.toolActionRow} onPress={() => { setToolsModalVisible(false); setCalcModalVisible(true); }}>
              <View style={[styles.toolActionIcon, { backgroundColor: '#3b82f6' }]}>
                <Ionicons name="calculator" size={22} color="#ffffff" />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.toolActionTitle, { color: isDark ? '#fff' : '#000' }]}>Deterministic Calculators</Text>
                <Text style={{ color: isDark ? '#888' : '#666', fontSize: 12 }}>Beam Bending, Cable Sizing, Circuits & Stress</Text>
              </View>
            </TouchableOpacity>

            {/* Exam Prep Mode */}
            <TouchableOpacity style={styles.toolActionRow} onPress={() => { setToolsModalVisible(false); setExamModalVisible(true); }}>
              <View style={[styles.toolActionIcon, { backgroundColor: '#f59e0b' }]}>
                <Ionicons name="school" size={22} color="#ffffff" />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.toolActionTitle, { color: isDark ? '#fff' : '#000' }]}>Exam Prep Suite (PYQs & Quizzes)</Text>
                <Text style={{ color: isDark ? '#888' : '#666', fontSize: 12 }}>High-yield questions, MCQ practice & flashcards</Text>
              </View>
            </TouchableOpacity>

            {/* AI Technical Schematic Studio */}
            <TouchableOpacity style={styles.toolActionRow} onPress={() => { setToolsModalVisible(false); setDiagramModalVisible(true); }}>
              <View style={[styles.toolActionIcon, { backgroundColor: '#8b5cf6' }]}>
                <Ionicons name="color-palette" size={22} color="#ffffff" />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.toolActionTitle, { color: isDark ? '#fff' : '#000' }]}>AI CAD Schematic Studio</Text>
                <Text style={{ color: isDark ? '#888' : '#666', fontSize: 12 }}>Generate technical drawings and system blueprints</Text>
              </View>
            </TouchableOpacity>

            {/* Attach Photo / File */}
            <TouchableOpacity style={styles.toolActionRow} onPress={() => handlePickFileWeb('image/*')}>
              <View style={[styles.toolActionIcon, { backgroundColor: '#10b981' }]}>
                <Ionicons name="image" size={22} color="#ffffff" />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.toolActionTitle, { color: isDark ? '#fff' : '#000' }]}>Upload Diagram / Photo</Text>
                <Text style={{ color: isDark ? '#888' : '#666', fontSize: 12 }}>Attach schematic image for AI analysis</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================================================== */}
      {/* DETERMINISTIC CALCULATORS MODAL                    */}
      {/* ================================================== */}
      <Modal visible={calcModalVisible} transparent animationType="slide">
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setCalcModalVisible(false)} />
          <View style={[styles.bottomSheetCard, { backgroundColor: isDark ? '#262626' : '#ffffff', maxHeight: '85%' }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: isDark ? '#ffffff' : '#0d0d0d' }]}>Engineering Calculators</Text>

            {/* Calculator Branch Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {['civil', 'eee', 'ece', 'cse', 'mech', 'general'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.presetChipBtn, { backgroundColor: calcTab === t ? (isDark ? '#fff' : '#000') : (isDark ? '#333' : '#e5e5e5'), marginRight: 6 }]}
                  onPress={() => { setCalcTab(t); setCalcResult(null); }}
                >
                  <Text style={[styles.presetChipText, { color: calcTab === t ? (isDark ? '#000' : '#fff') : (isDark ? '#aaa' : '#555') }]}>
                    {t.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView style={{ maxHeight: 340 }}>
              {calcTab === 'civil' && (
                <View>
                  <Text style={{ color: isDark ? '#aaa' : '#555', fontSize: 12 }}>Span Length (meters):</Text>
                  <TextInput
                    style={[styles.gptInput, { backgroundColor: isDark ? '#1f1f1f' : '#f4f4f4', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#3d3d3d' : '#ddd' }]}
                    value={beamSpan.toString()}
                    onChangeText={(v) => setBeamSpan(parseFloat(v) || 0)}
                    keyboardType="numeric"
                  />
                  <Text style={{ color: isDark ? '#aaa' : '#555', fontSize: 12 }}>Load (kN):</Text>
                  <TextInput
                    style={[styles.gptInput, { backgroundColor: isDark ? '#1f1f1f' : '#f4f4f4', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#3d3d3d' : '#ddd' }]}
                    value={beamLoad.toString()}
                    onChangeText={(v) => setBeamLoad(parseFloat(v) || 0)}
                    keyboardType="numeric"
                  />
                </View>
              )}

              {calcTab === 'eee' && (
                <View>
                  <Text style={{ color: isDark ? '#aaa' : '#555', fontSize: 12 }}>Motor Power (kW):</Text>
                  <TextInput
                    style={[styles.gptInput, { backgroundColor: isDark ? '#1f1f1f' : '#f4f4f4', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#3d3d3d' : '#ddd' }]}
                    value={cableKw.toString()}
                    onChangeText={(v) => setCableKw(parseFloat(v) || 0)}
                    keyboardType="numeric"
                  />
                  <Text style={{ color: isDark ? '#aaa' : '#555', fontSize: 12 }}>Length of Run (meters):</Text>
                  <TextInput
                    style={[styles.gptInput, { backgroundColor: isDark ? '#1f1f1f' : '#f4f4f4', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#3d3d3d' : '#ddd' }]}
                    value={cableLen.toString()}
                    onChangeText={(v) => setCableLen(parseFloat(v) || 0)}
                    keyboardType="numeric"
                  />
                </View>
              )}

              {calcTab === 'mech' && (
                <View>
                  <Text style={{ color: isDark ? '#aaa' : '#555', fontSize: 12 }}>Axial Force (kN):</Text>
                  <TextInput
                    style={[styles.gptInput, { backgroundColor: isDark ? '#1f1f1f' : '#f4f4f4', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#3d3d3d' : '#ddd' }]}
                    value={stressForce.toString()}
                    onChangeText={(v) => setStressForce(parseFloat(v) || 0)}
                    keyboardType="numeric"
                  />
                  <Text style={{ color: isDark ? '#aaa' : '#555', fontSize: 12 }}>Rod Diameter (mm):</Text>
                  <TextInput
                    style={[styles.gptInput, { backgroundColor: isDark ? '#1f1f1f' : '#f4f4f4', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#3d3d3d' : '#ddd' }]}
                    value={stressDim1.toString()}
                    onChangeText={(v) => setStressDim1(parseFloat(v) || 0)}
                    keyboardType="numeric"
                  />
                </View>
              )}

              {calcTab === 'ece' && (
                <View>
                  <Text style={{ color: isDark ? '#aaa' : '#555', fontSize: 12 }}>Resistance (Ohms):</Text>
                  <TextInput
                    style={[styles.gptInput, { backgroundColor: isDark ? '#1f1f1f' : '#f4f4f4', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#3d3d3d' : '#ddd' }]}
                    value={circR.toString()}
                    onChangeText={(v) => setCircR(parseFloat(v) || 0)}
                    keyboardType="numeric"
                  />
                  <Text style={{ color: isDark ? '#aaa' : '#555', fontSize: 12 }}>Inductance (mH):</Text>
                  <TextInput
                    style={[styles.gptInput, { backgroundColor: isDark ? '#1f1f1f' : '#f4f4f4', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#3d3d3d' : '#ddd' }]}
                    value={circL.toString()}
                    onChangeText={(v) => setCircL(parseFloat(v) || 0)}
                    keyboardType="numeric"
                  />
                </View>
              )}

              {calcTab === 'cse' && (
                <View style={{ paddingVertical: 10 }}>
                  <Text style={{ color: isDark ? '#fff' : '#000', fontWeight: '600' }}>Algorithm Complexity Benchmarking</Text>
                  <Text style={{ color: isDark ? '#888' : '#666', fontSize: 12, marginTop: 4 }}>
                    Benchmarks Quicksort, Mergesort, and Heapsort with operation counts and Big-O curves.
                  </Text>
                </View>
              )}

              {calcTab === 'general' && (
                <View>
                  <Text style={{ color: isDark ? '#aaa' : '#555', fontSize: 12 }}>Value:</Text>
                  <TextInput
                    style={[styles.gptInput, { backgroundColor: isDark ? '#1f1f1f' : '#f4f4f4', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#3d3d3d' : '#ddd' }]}
                    value={unitVal.toString()}
                    onChangeText={(v) => setUnitVal(parseFloat(v) || 0)}
                    keyboardType="numeric"
                  />
                </View>
              )}

              <TouchableOpacity
                style={[styles.gptButton, { backgroundColor: isDark ? '#ffffff' : '#0d0d0d', marginTop: 10 }]}
                onPress={handleRunCalculator}
                disabled={calcLoading}
              >
                {calcLoading ? <ActivityIndicator color={isDark ? '#000' : '#fff'} /> : <Text style={[styles.gptButtonText, { color: isDark ? '#000' : '#fff' }]}>Run Calculation</Text>}
              </TouchableOpacity>

              {/* Formatted Result Card */}
              {calcResult && (
                <View style={[styles.calcResultBox, { backgroundColor: isDark ? '#1f1f1f' : '#f4f4f4' }]}>
                  <Text style={{ color: '#22c55e', fontWeight: '700', fontSize: 14 }}>{calcResult.title || 'Calculation Result'}</Text>
                  {calcResult.standard_cited && (
                    <Text style={{ color: isDark ? '#aaa' : '#666', fontSize: 11, marginTop: 2 }}>Standard: {calcResult.standard_cited}</Text>
                  )}
                  <Text style={{ color: isDark ? '#fff' : '#000', fontSize: 13, marginTop: 8 }}>
                    {JSON.stringify(calcResult.results || calcResult, null, 2)}
                  </Text>
                  <TouchableOpacity
                    style={[styles.presetChipBtn, { backgroundColor: isDark ? '#333' : '#ddd', marginTop: 10, alignSelf: 'flex-start' }]}
                    onPress={() => {
                      setCalcModalVisible(false);
                      handleSendMessage(`[CALCULATION: ${calcTab.toUpperCase()}]\n${JSON.stringify(calcResult.results || calcResult)}`);
                    }}
                  >
                    <Text style={{ color: isDark ? '#fff' : '#000', fontSize: 12, fontWeight: '700' }}>Insert into Chat</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================================================== */}
      {/* EXAM PREP SUITE MODAL (PYQs & Quizzes)             */}
      {/* ================================================== */}
      <Modal visible={examModalVisible} transparent animationType="slide">
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setExamModalVisible(false)} />
          <View style={[styles.bottomSheetCard, { backgroundColor: isDark ? '#262626' : '#ffffff', maxHeight: '80%' }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: isDark ? '#ffffff' : '#0d0d0d' }]}>Exam Prep Suite</Text>
            
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
              {['pyq', 'quiz', 'flashcards'].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.presetChipBtn, { backgroundColor: examTab === tab ? (isDark ? '#fff' : '#000') : (isDark ? '#333' : '#e5e5e5') }]}
                  onPress={() => { setExamTab(tab); setExamResult(null); }}
                >
                  <Text style={[styles.presetChipText, { color: examTab === tab ? (isDark ? '#000' : '#fff') : (isDark ? '#aaa' : '#555') }]}>
                    {tab.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.gptInput, { backgroundColor: isDark ? '#1f1f1f' : '#f4f4f4', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#3d3d3d' : '#ddd' }]}
              placeholder="Topic (e.g. Thermodynamics, Data Structures)"
              placeholderTextColor={isDark ? '#888' : '#aaa'}
              value={examTopic}
              onChangeText={setExamTopic}
            />

            <TouchableOpacity
              style={[styles.gptButton, { backgroundColor: isDark ? '#ffffff' : '#0d0d0d' }]}
              onPress={handleRunExamPrep}
              disabled={examLoading}
            >
              {examLoading ? <ActivityIndicator color={isDark ? '#000' : '#fff'} /> : <Text style={[styles.gptButtonText, { color: isDark ? '#000' : '#fff' }]}>Generate Materials</Text>}
            </TouchableOpacity>

            {examResult && (
              <ScrollView style={{ marginTop: 12, maxHeight: 180 }}>
                <Text style={{ color: isDark ? '#ececec' : '#171717', fontSize: 13, lineHeight: 20 }}>{examResult}</Text>
                <TouchableOpacity
                  style={[styles.presetChipBtn, { backgroundColor: isDark ? '#333' : '#ddd', marginTop: 10, alignSelf: 'flex-start' }]}
                  onPress={() => {
                    setExamModalVisible(false);
                    handleSendMessage(`[EXAM PREP: ${examTab.toUpperCase()}]\n${examResult}`);
                  }}
                >
                  <Text style={{ color: isDark ? '#fff' : '#000', fontSize: 12, fontWeight: '700' }}>Insert into Chat</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ================================================== */}
      {/* AI SCHEMATIC STUDIO MODAL                          */}
      {/* ================================================== */}
      <Modal visible={diagramModalVisible} transparent animationType="slide">
        <View style={styles.sheetBackdrop}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setDiagramModalVisible(false)} />
          <View style={[styles.bottomSheetCard, { backgroundColor: isDark ? '#262626' : '#ffffff' }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: isDark ? '#ffffff' : '#0d0d0d' }]}>AI CAD Schematic Studio</Text>

            <TextInput
              style={[styles.gptInput, { backgroundColor: isDark ? '#1f1f1f' : '#f4f4f4', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#3d3d3d' : '#ddd' }]}
              placeholder="Describe schematic (e.g. Distributed database topology)"
              placeholderTextColor={isDark ? '#888' : '#aaa'}
              value={diagramPrompt}
              onChangeText={setDiagramPrompt}
            />

            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
              {['schematic', 'cad', 'circuit', 'flowchart'].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.presetChipBtn, { backgroundColor: diagramStyle === s ? (isDark ? '#fff' : '#000') : (isDark ? '#333' : '#e5e5e5') }]}
                  onPress={() => setDiagramStyle(s)}
                >
                  <Text style={[styles.presetChipText, { color: diagramStyle === s ? (isDark ? '#000' : '#fff') : (isDark ? '#aaa' : '#555') }]}>
                    {s.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.gptButton, { backgroundColor: isDark ? '#ffffff' : '#0d0d0d' }]}
              onPress={handleGenerateDiagram}
              disabled={diagramLoading}
            >
              {diagramLoading ? <ActivityIndicator color={isDark ? '#000' : '#fff'} /> : <Text style={[styles.gptButtonText, { color: isDark ? '#000' : '#fff' }]}>Render Blueprint</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Global Server Settings Modal */}
      <Modal visible={settingsVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: isDark ? '#262626' : '#ffffff' }]}>
            <Text style={[styles.modalHeader, { color: isDark ? '#fff' : '#000' }]}>Server Connection</Text>
            <Text style={[styles.modalSub, { color: isDark ? '#9ca3af' : '#6b7280' }]}>Configure backend API URL for this mobile app:</Text>

            <TextInput
              style={[styles.gptInput, { backgroundColor: isDark ? '#1f1f1f' : '#f4f4f4', color: isDark ? '#fff' : '#000', borderColor: isDark ? '#3d3d3d' : '#ddd' }]}
              value={customApiUrl}
              onChangeText={setCustomApiUrl}
              autoCapitalize="none"
            />

            <View style={styles.presetChipWrap}>
              <TouchableOpacity style={[styles.presetChipBtn, { backgroundColor: isDark ? '#333' : '#e5e5e5' }]} onPress={() => setCustomApiUrl(DEFAULT_API_URL)}>
                <Text style={[styles.presetChipText, { color: isDark ? '#fff' : '#000' }]}>Cloud (Render)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.presetChipBtn, { backgroundColor: isDark ? '#333' : '#e5e5e5' }]} onPress={() => setCustomApiUrl(LOCAL_WIFI_URL)}>
                <Text style={[styles.presetChipText, { color: isDark ? '#fff' : '#000' }]}>PC Wi-Fi (.35)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.presetChipBtn, { backgroundColor: isDark ? '#333' : '#e5e5e5' }]} onPress={() => setCustomApiUrl('http://10.0.2.2:8000')}>
                <Text style={[styles.presetChipText, { color: isDark ? '#fff' : '#000' }]}>Emulator</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalSecondaryBtn} onPress={() => setSettingsVisible(false)}>
                <Text style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalPrimaryBtn, { backgroundColor: isDark ? '#fff' : '#000' }]} onPress={handleSaveApiUrl}>
                <Text style={{ color: isDark ? '#000' : '#fff', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ==========================================
// STYLES (CHATGPT MODERN DESIGN SYSTEM)
// ==========================================
const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authContainer: {
    flex: 1,
    paddingTop: SAFE_STATUS_BAR_HEIGHT,
  },
  authScroll: {
    padding: 24,
    justifyContent: 'center',
    minHeight: '100%',
  },
  brandBox: {
    alignItems: 'center',
    marginBottom: 24,
  },
  brandIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  demoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 20,
  },
  demoPillText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '600',
    marginHorizontal: 12,
    letterSpacing: 0.5,
  },
  authTabPill: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
  },
  authTabOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authTabActiveDark: {
    backgroundColor: '#3d3d3d',
  },
  authTabActiveLight: {
    backgroundColor: '#ffffff',
  },
  authTabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  textWhite: { color: '#ffffff' },
  textBlack: { color: '#0d0d0d' },
  textMuted: { color: '#888888' },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  alertError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  alertSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  alertText: {
    fontSize: 13,
    flex: 1,
  },
  alertTextError: {
    color: '#ef4444',
  },
  alertTextSuccess: {
    color: '#22c55e',
  },
  gptInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 14,
    marginBottom: 12,
  },
  gptButton: {
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  gptButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  serverSettingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 22,
  },
  serverSettingsLinkText: {
    fontSize: 12,
  },

  // Main Workspace
  mainWorkspace: {
    flex: 1,
    paddingTop: SAFE_STATUS_BAR_HEIGHT,
  },
  chatGptHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  modelDropdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  modelDropdownTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  modeTogglePill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  modeToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chatStreamContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  chatStreamEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyScreenWrap: {
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 10,
  },
  emptyLogoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyGreeting: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  suggestionGrid: {
    width: '100%',
    gap: 10,
  },
  suggestionCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  suggestionDesc: {
    fontSize: 12,
    lineHeight: 16,
  },

  // Message Rows
  userMessageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginVertical: 10,
  },
  userMessageBubble: {
    maxWidth: '82%',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  userMessageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  aiMessageRow: {
    marginVertical: 12,
    alignItems: 'flex-start',
  },
  aiMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  aiAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiSenderLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  aiMessageText: {
    fontSize: 15,
    lineHeight: 24,
  },
  aiActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 10,
  },
  aiActionBtn: {
    padding: 4,
  },
  aiThinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 10,
  },
  thinkingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  thinkingText: {
    fontSize: 13,
  },
  attachedImage: {
    width: 220,
    height: 150,
    borderRadius: 12,
    marginBottom: 8,
  },
  aiGeneratedImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginVertical: 10,
  },
  fileAttachmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    marginBottom: 6,
  },
  fileAttachmentText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Floating Input Pill
  bottomBarContainer: {
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 8 : 12,
    paddingTop: 4,
  },
  floatingInputPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 52,
  },
  inputPlusBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingTextInput: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 8,
    paddingVertical: 6,
    maxHeight: 110,
  },
  circularSendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 2,
  },
  circularSendBtnDisabled: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 2,
  },
  previewPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  previewPillText: {
    fontSize: 12,
    maxWidth: 200,
  },

  // Drawer
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
  },
  drawerOutsideTouch: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  drawerPanel: {
    width: SCREEN_WIDTH * 0.78,
    maxWidth: 320,
    height: '100%',
    paddingTop: Platform.OS === 'ios' ? 48 : (SAFE_STATUS_BAR_HEIGHT + 10),
  },
  drawerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  newChatDrawerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 10,
  },
  newChatDrawerText: {
    fontSize: 14,
    fontWeight: '700',
  },
  drawerQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
  },
  drawerQuickText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  drawerSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 18,
    marginTop: 10,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  drawerChatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 10,
    marginVertical: 2,
    borderRadius: 10,
  },
  drawerChatTitle: {
    fontSize: 13,
    flex: 1,
  },
  drawerBottomSection: {
    borderTopWidth: 1,
    padding: 16,
  },
  drawerUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerUserName: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Bottom Sheets
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#666',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sheetDesc: {
    fontSize: 13,
    marginBottom: 14,
    lineHeight: 18,
  },
  modelRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  modelRowIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modelRowName: {
    fontSize: 14,
    fontWeight: '700',
  },
  disciplineRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  disciplineRowName: {
    fontSize: 14,
    fontWeight: '600',
  },
  toolActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  toolActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolActionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  calcResultBox: {
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },

  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    borderRadius: 20,
    padding: 22,
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 13,
    marginBottom: 16,
  },
  presetChipWrap: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  presetChipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalSecondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalPrimaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
});
