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
  Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const DEFAULT_API_URL = 'http://192.168.1.40:8000';

const DISCIPLINES = [
  { id: 'general', name: 'General', icon: 'chatbubbles-outline', prompt: 'You are an expert engineering assistant.' },
  { id: 'cse', name: 'Computer Science', icon: 'hardware-chip-outline', prompt: 'You are an expert Computer Science Engineer. Help with programming, algorithms, system design, and software engineering.' },
  { id: 'civil', name: 'Civil', icon: 'construct-outline', prompt: 'You are an expert Civil Engineer. Help with structural design, construction materials, fluid mechanics, and surveying.' },
  { id: 'ece', name: 'Electronics', icon: 'radio-outline', prompt: 'You are an expert Electronics and Communication Engineer. Help with circuits, signals & systems, microprocessors, and communication theory.' },
  { id: 'eee', name: 'Electrical', icon: 'flash-outline', prompt: 'You are an expert Electrical Engineer. Help with power systems, electrical machines, control systems, and power electronics.' },
  { id: 'mech', name: 'Mechanical', icon: 'settings-outline', prompt: 'You are an expert Mechanical Engineer. Help with thermodynamics, solid mechanics, manufacturing, and machine design.' },
];

export default function App() {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Auth State
  const [authMode, setAuthMode] = useState('otp'); // 'otp' | 'password' | 'register'
  const [otpStep, setOtpStep] = useState('enter-email'); // 'enter-email' | 'enter-code'
  const [emailInput, setEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [fullNameInput, setFullNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [dobInput, setDobInput] = useState('2000-01-01');
  const [countdown, setCountdown] = useState(0);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authAlert, setAuthAlert] = useState(null);

  // Chat State
  const [activeDiscipline, setActiveDiscipline] = useState(DISCIPLINES[0]);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [attachModalVisible, setAttachModalVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Settings Modal State
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState(DEFAULT_API_URL);

  const flatListRef = useRef(null);

  // Initialize stored session & API URL
  useEffect(() => {
    (async () => {
      try {
        const storedUrl = await AsyncStorage.getItem('engibot_api_url');
        if (storedUrl) {
          setApiUrl(storedUrl);
          setCustomApiUrl(storedUrl);
        }
        const storedUser = await AsyncStorage.getItem('chat_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error('Initialization error:', e);
      } finally {
        setIsInitializing(false);
      }
    })();
  }, []);

  // Countdown timer for OTP
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Load chat history when user or branch changes
  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/history/${user.id}?discipline=${activeDiscipline.id}`);
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
  }, [user, activeDiscipline, apiUrl]);

  // Auth: Send OTP
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
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to send OTP code.');
      }

      setOtpStep('enter-code');
      setCountdown(45);
      setOtpInput('');
      setAuthAlert({ type: 'success', text: `OTP code sent to ${cleanEmail}. Check your inbox.` });
    } catch (err) {
      const isNetErr = err.message.includes('Network request failed') || err.message.includes('Failed to fetch');
      setAuthAlert({
        type: 'error',
        text: isNetErr
          ? `Cannot connect to server at ${apiUrl}. Make sure backend is running on your PC (start.bat) and phone is on the same Wi-Fi.`
          : err.message,
      });
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Auth: Verify OTP
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
        body: JSON.stringify({
          email: emailInput.trim().toLowerCase(),
          otp_code: cleanCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Invalid or expired OTP.');
      }

      await AsyncStorage.setItem('chat_user', JSON.stringify(data));
      setUser(data);
      setAuthAlert(null);
    } catch (err) {
      setAuthAlert({ type: 'error', text: err.message });
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Auth: Password Login or Register
  const handlePasswordAuth = async () => {
    setIsAuthLoading(true);
    setAuthAlert(null);

    try {
      let endpoint = '/api/login';
      let payload = {
        username: usernameInput.trim(),
        password: passwordInput.trim(),
      };

      if (authMode === 'register') {
        endpoint = '/api/register';
        payload = {
          name: fullNameInput.trim(),
          email: emailInput.trim().toLowerCase(),
          dob: dobInput.trim(),
          phone_number: phoneInput.trim(),
          username: usernameInput.trim(),
          password: passwordInput.trim(),
        };
      }

      const res = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed.');
      }

      await AsyncStorage.setItem('chat_user', JSON.stringify(data));
      setUser(data);
      setAuthAlert(null);
    } catch (err) {
      const isNetErr = err.message.includes('Network request failed') || err.message.includes('Failed to fetch');
      setAuthAlert({
        type: 'error',
        text: isNetErr
          ? `Cannot connect to server at ${apiUrl}. Make sure backend is running on your PC (start.bat) and phone is on the same Wi-Fi.`
          : err.message,
      });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('chat_user');
          setUser(null);
          setMessages([]);
          setOtpStep('enter-email');
          setOtpInput('');
          setAuthAlert(null);
        },
      },
    ]);
  };

  // Attachment Handlers
  const handlePickFileWeb = (accept = '*/*') => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 50 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Maximum file size is 50MB.');
          return;
        }
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
          setAttachModalVisible(false);
        };
        reader.readAsDataURL(file);
      };
      input.click();
    } else {
      Alert.alert(
        'Upload File',
        'Choose an engineering diagram preset below or paste image/file URL.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSelectPreset = (name, type, url) => {
    setSelectedAttachment({
      name,
      type,
      url,
      size: 10240,
      dataBase64: null
    });
    setAttachModalVisible(false);
  };

  // Chat: Send Message
  const handleSendMessage = async () => {
    const text = inputMessage.trim() || (selectedAttachment ? `Attached ${selectedAttachment.type}: ${selectedAttachment.name}` : '');
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
              user_id: user.id
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
          console.warn("Mobile file upload error:", e);
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
          user_id: user.id,
          message: text,
          discipline: activeDiscipline.id,
          system_instruction: activeDiscipline.prompt,
          attachment_url: fileUrl,
          attachment_type: fileType,
          file_name: fileName,
          file_size: fileSize
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to fetch AI response.');
      }

      const aiMessage = { role: 'ai', content: data.response };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      const isNetErr = err.message.includes('Network request failed') || err.message.includes('Failed to fetch');
      const errText = isNetErr
        ? `Cannot connect to server at ${apiUrl}. Make sure backend is running on your PC (start.bat) and phone is on the same Wi-Fi.`
        : (err.message || 'Something went wrong.');
      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: `Error: ${errText}` },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSaveApiUrl = async () => {
    const trimmed = customApiUrl.trim().replace(/\/$/, '');
    setApiUrl(trimmed);
    await AsyncStorage.setItem('engibot_api_url', trimmed);
    setSettingsVisible(false);
    Alert.alert('Server Saved', `Backend URL set to:\n${trimmed}`);
  };

  if (isInitializing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // ==========================================
  // 1. AUTH SCREEN (OTP, LOGIN, SIGNUP)
  // ==========================================
  if (!user) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.authScroll}>
            {/* Header Brand */}
            <View style={styles.brandBox}>
              <View style={styles.brandIconCircle}>
                <Ionicons name="school-outline" size={36} color="#3b82f6" />
              </View>
              <Text style={styles.brandTitle}>EngiBot</Text>
              <Text style={styles.brandSubtitle}>AI Engineering Knowledge Assistant</Text>
            </View>

            {/* Auth Mode Tabs */}
            {authMode !== 'register' && (
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tabButton, authMode === 'otp' && styles.tabButtonActive]}
                  onPress={() => { setAuthMode('otp'); setAuthAlert(null); }}
                >
                  <Ionicons name="mail-outline" size={16} color={authMode === 'otp' ? '#3b82f6' : '#64748b'} />
                  <Text style={[styles.tabText, authMode === 'otp' && styles.tabTextActive]}>Email OTP</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabButton, authMode === 'password' && styles.tabButtonActive]}
                  onPress={() => { setAuthMode('password'); setAuthAlert(null); }}
                >
                  <Ionicons name="key-outline" size={16} color={authMode === 'password' ? '#3b82f6' : '#64748b'} />
                  <Text style={[styles.tabText, authMode === 'password' && styles.tabTextActive]}>Password</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Alert Box */}
            {authAlert && (
              <View style={[styles.alertBox, authAlert.type === 'error' ? styles.alertError : styles.alertSuccess]}>
                <Ionicons
                  name={authAlert.type === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                  size={18}
                  color={authAlert.type === 'error' ? '#b91c1c' : '#15803d'}
                />
                <Text style={[styles.alertText, authAlert.type === 'error' ? styles.alertTextError : styles.alertTextSuccess]}>
                  {authAlert.text}
                </Text>
              </View>
            )}

            {/* Form Card */}
            <View style={styles.formCard}>
              {/* FLOW 1: EMAIL OTP */}
              {authMode === 'otp' && otpStep === 'enter-email' && (
                <View>
                  <Text style={styles.formHeading}>Sign In with Mail ID</Text>
                  <Text style={styles.formSubheading}>
                    We will send a 6-digit verification code directly to your email.
                  </Text>

                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputWithIcon}
                      placeholder="Enter your email ID"
                      placeholderTextColor="#94a3b8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={emailInput}
                      onChangeText={setEmailInput}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleSendOtp}
                    disabled={isAuthLoading}
                  >
                    {isAuthLoading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Send Verification Code</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {authMode === 'otp' && otpStep === 'enter-code' && (
                <View>
                  <Text style={styles.formHeading}>Enter Verification Code</Text>
                  
                  {/* Email chip with change option */}
                  <View style={styles.emailChip}>
                    <Ionicons name="mail-outline" size={14} color="#3b82f6" />
                    <Text style={styles.emailChipText}>{emailInput}</Text>
                    <TouchableOpacity onPress={() => setOtpStep('enter-email')}>
                      <Text style={styles.emailChipEdit}>Change</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.formSubheading}>
                    Check your mail inbox (and spam folder) for the 6-digit OTP.
                  </Text>

                  <TextInput
                    style={styles.otpInput}
                    placeholder="••••••"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otpInput}
                    onChangeText={setOtpInput}
                    textAlign="center"
                  />

                  <TouchableOpacity
                    style={[styles.primaryButton, otpInput.length < 6 && { opacity: 0.6 }]}
                    onPress={handleVerifyOtp}
                    disabled={isAuthLoading || otpInput.length < 6}
                  >
                    {isAuthLoading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Verify & Sign In</Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.resendContainer}>
                    {countdown > 0 ? (
                      <Text style={styles.resendText}>Resend code in {countdown}s</Text>
                    ) : (
                      <TouchableOpacity onPress={handleSendOtp} disabled={isAuthLoading}>
                        <Text style={styles.resendButtonText}>Resend OTP</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* FLOW 2: PASSWORD LOGIN */}
              {authMode === 'login' && (
                <View>
                  <Text style={styles.formHeading}>Sign In with Password</Text>
                  <Text style={styles.formSubheading}>Enter your username or email and password.</Text>

                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={20} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputWithIcon}
                      placeholder="Username or Email ID"
                      placeholderTextColor="#94a3b8"
                      autoCapitalize="none"
                      value={usernameInput}
                      onChangeText={setUsernameInput}
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputWithIcon}
                      placeholder="Password"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry
                      value={passwordInput}
                      onChangeText={setPasswordInput}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handlePasswordAuth}
                    disabled={isAuthLoading}
                  >
                    {isAuthLoading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Sign In</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* FLOW 3: REGISTER */}
              {authMode === 'register' && (
                <View>
                  <Text style={styles.formHeading}>Create Account</Text>
                  <Text style={styles.formSubheading}>Register as an engineering student.</Text>

                  <TextInput
                    style={styles.standardInput}
                    placeholder="Full Name"
                    placeholderTextColor="#94a3b8"
                    value={fullNameInput}
                    onChangeText={setFullNameInput}
                  />

                  <TextInput
                    style={styles.standardInput}
                    placeholder="Email ID (for OTP & updates)"
                    placeholderTextColor="#94a3b8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={emailInput}
                    onChangeText={setEmailInput}
                  />

                  <TextInput
                    style={styles.standardInput}
                    placeholder="Date of Birth (YYYY-MM-DD)"
                    placeholderTextColor="#94a3b8"
                    value={dobInput}
                    onChangeText={setDobInput}
                  />

                  <TextInput
                    style={styles.standardInput}
                    placeholder="Phone Number"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    value={phoneInput}
                    onChangeText={setPhoneInput}
                  />

                  <TextInput
                    style={styles.standardInput}
                    placeholder="Choose Username"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    value={usernameInput}
                    onChangeText={setUsernameInput}
                  />

                  <TextInput
                    style={styles.standardInput}
                    placeholder="Choose Password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry
                    value={passwordInput}
                    onChangeText={setPasswordInput}
                  />

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handlePasswordAuth}
                    disabled={isAuthLoading}
                  >
                    {isAuthLoading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Create Account</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Bottom Switcher */}
            <View style={styles.authFooter}>
              {authMode === 'register' ? (
                <TouchableOpacity onPress={() => { setAuthMode('otp'); setAuthAlert(null); }}>
                  <Text style={styles.footerLink}>Already have an account? <Text style={styles.footerLinkBold}>Sign in with OTP</Text></Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => { setAuthMode('register'); setAuthAlert(null); }}>
                  <Text style={styles.footerLink}>Don't have an account? <Text style={styles.footerLinkBold}>Register here</Text></Text>
                </TouchableOpacity>
              )}

              {/* Server Settings Link */}
              <TouchableOpacity style={styles.serverSettingsBtn} onPress={() => setSettingsVisible(true)}>
                <Ionicons name="server-outline" size={14} color="#64748b" />
                <Text style={styles.serverSettingsText}>Server: {apiUrl}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Server Settings Modal */}
        <Modal visible={settingsVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Backend Server Connection</Text>
              <Text style={styles.modalDesc}>
                Set your PC's IP address to connect the mobile app to your FastAPI backend.
              </Text>

              <TextInput
                style={styles.modalInput}
                value={customApiUrl}
                onChangeText={setCustomApiUrl}
                placeholder="http://192.168.1.X:8000"
                autoCapitalize="none"
              />

              <View style={styles.presetButtons}>
                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() => setCustomApiUrl('http://192.168.1.40:8000')}
                >
                  <Text style={styles.presetChipText}>Wi-Fi IP</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.presetChip}
                  onPress={() => setCustomApiUrl('http://10.0.2.2:8000')}
                >
                  <Text style={styles.presetChipText}>Emulator (10.0.2.2)</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setSettingsVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveApiUrl}>
                  <Text style={styles.saveBtnText}>Save & Reconnect</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ==========================================
  // 2. LOGGED-IN CHAT WORKSPACE
  // ==========================================
  return (
    <SafeAreaView style={styles.chatContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Navbar */}
      <View style={styles.navBar}>
        <View style={styles.navBrand}>
          <Ionicons name="school" size={24} color="#3b82f6" />
          <Text style={styles.navTitle}>EngiBot</Text>
        </View>

        <View style={styles.navUserSection}>
          <TouchableOpacity
            style={styles.navProfile}
            onPress={() => Alert.alert('Logged In', `User: ${user.name || user.username}\nEmail: ${user.email || 'N/A'}`)}
          >
            <Ionicons name="person-circle-outline" size={22} color="#1e293b" />
            <Text style={styles.navUserName} numberOfLines={1}>{user.name?.split(' ')[0] || user.username}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navIconBtn} onPress={() => setSettingsVisible(true)}>
            <Ionicons name="settings-outline" size={20} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.navIconBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Engineering Discipline Selector Bar */}
      <View style={styles.disciplineBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.disciplineScroll}>
          {DISCIPLINES.map((item) => {
            const isActive = activeDiscipline.id === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.disciplineChip, isActive && styles.disciplineChipActive]}
                onPress={() => setActiveDiscipline(item)}
              >
                <Ionicons
                  name={item.icon}
                  size={15}
                  color={isActive ? '#ffffff' : '#64748b'}
                />
                <Text style={[styles.disciplineChipText, isActive && styles.disciplineChipTextActive]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name={activeDiscipline.icon} size={36} color="#3b82f6" />
            </View>
            <Text style={styles.emptyHeading}>{activeDiscipline.name} Expert</Text>
            <Text style={styles.emptyText}>
              Ask questions on engineering concepts, formulas, assignments, or code.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isUser = item.role === 'user';
          const fileUri = item.attachment_url?.startsWith('http') 
            ? item.attachment_url 
            : `${apiUrl}${item.attachment_url}`;
          return (
            <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAi]}>
              {!isUser && (
                <View style={styles.avatarAi}>
                  <Ionicons name="sparkles" size={14} color="#ffffff" />
                </View>
              )}
              <View style={[styles.messageBubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
                {item.attachment_url && item.attachment_type === 'image' && (
                  <Image 
                    source={{ uri: fileUri }} 
                    style={styles.chatImageMobile} 
                    resizeMode="cover" 
                  />
                )}
                {item.attachment_url && item.attachment_type !== 'image' && (
                  <View style={styles.chatFileBadgeMobile}>
                    <Ionicons 
                      name={item.attachment_type === 'video' ? 'videocam' : 'document-text'} 
                      size={16} 
                      color={isUser ? '#ffffff' : '#3b82f6'} 
                    />
                    <Text style={[styles.chatFileBadgeText, isUser && { color: '#ffffff' }]} numberOfLines={1}>
                      {item.file_name || 'Attachment'}
                    </Text>
                  </View>
                )}
                <Text style={[styles.messageText, isUser ? styles.messageTextUser : styles.messageTextAi]}>
                  {item.content}
                </Text>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          isChatLoading ? (
            <View style={styles.aiLoadingRow}>
              <View style={styles.avatarAi}>
                <Ionicons name="sparkles" size={14} color="#ffffff" />
              </View>
              <View style={styles.aiLoadingBubble}>
                <ActivityIndicator size="small" color="#3b82f6" />
                <Text style={styles.aiLoadingText}>Thinking...</Text>
              </View>
            </View>
          ) : null
        }
      />

      {/* Attachment Preview Chip */}
      {selectedAttachment && (
        <View style={styles.mobilePreviewBar}>
          <Ionicons 
            name={selectedAttachment.type === 'image' ? 'image' : selectedAttachment.type === 'video' ? 'videocam' : 'document-text'} 
            size={18} 
            color="#3b82f6" 
          />
          <Text style={styles.mobilePreviewName} numberOfLines={1}>
            {selectedAttachment.name}
          </Text>
          <TouchableOpacity onPress={() => setSelectedAttachment(null)} style={styles.mobilePreviewClose}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      )}

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.mobileAttachBtn}
            onPress={() => setAttachModalVisible(true)}
            title="Attach file or image"
          >
            <Ionicons name="attach" size={24} color={selectedAttachment ? '#3b82f6' : '#64748b'} />
          </TouchableOpacity>

          <TextInput
            style={styles.chatInput}
            placeholder={
              selectedAttachment 
                ? `Ask about ${selectedAttachment.name}...` 
                : `Ask ${activeDiscipline.name} assistant...`
            }
            placeholderTextColor="#94a3b8"
            value={inputMessage}
            onChangeText={setInputMessage}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton, 
              ((!inputMessage.trim() && !selectedAttachment) || isChatLoading || isUploading) && styles.sendButtonDisabled
            ]}
            onPress={handleSendMessage}
            disabled={(!inputMessage.trim() && !selectedAttachment) || isChatLoading || isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="send" size={18} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* File & Media Attachment Modal */}
      <Modal visible={attachModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.modalTitle}>Upload / Attach</Text>
              <TouchableOpacity onPress={() => setAttachModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDesc}>Select media or document to upload for engineering analysis:</Text>

            <TouchableOpacity 
              style={styles.attachOptionRow}
              onPress={() => handlePickFileWeb('image/*')}
            >
              <View style={[styles.attachOptionIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <Ionicons name="image" size={22} color="#3b82f6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.attachOptionTitle}>Upload Image</Text>
                <Text style={styles.attachOptionSubtitle}>PNG, JPG, Schematics, Diagrams</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.attachOptionRow}
              onPress={() => handlePickFileWeb('video/*')}
            >
              <View style={[styles.attachOptionIcon, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
                <Ionicons name="videocam" size={22} color="#a855f7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.attachOptionTitle}>Upload Video</Text>
                <Text style={styles.attachOptionSubtitle}>MP4, WebM, Labs & Simulations</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.attachOptionRow}
              onPress={() => handlePickFileWeb('.pdf,.doc,.docx,.txt,.csv,.json,.py,.java,.c,.cpp,.h,.zip,.md')}
            >
              <View style={[styles.attachOptionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Ionicons name="document-text" size={22} color="#10b981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.attachOptionTitle}>Upload Document / Code</Text>
                <Text style={styles.attachOptionSubtitle}>PDF, Source code, TXT, CSV, Datasets</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>

            <Text style={[styles.modalDesc, { marginTop: 12, marginBottom: 8, fontWeight: '600' }]}>
              Quick Sample Diagrams:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <TouchableOpacity 
                style={styles.presetChip}
                onPress={() => handleSelectPreset('OpAmp_Circuit.png', 'image', 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600')}
              >
                <Text style={styles.presetChipText}>🔌 Circuit Schematic</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.presetChip}
                onPress={() => handleSelectPreset('Beam_Stress_Diagram.png', 'image', 'https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?w=600')}
              >
                <Text style={styles.presetChipText}>🏗️ Stress-Strain Diagram</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Server Settings Modal */}
      <Modal visible={settingsVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Backend Server Connection</Text>
            <Text style={styles.modalDesc}>Configure host IP address for mobile API requests:</Text>

            <TextInput
              style={styles.modalInput}
              value={customApiUrl}
              onChangeText={setCustomApiUrl}
              placeholder="http://192.168.1.X:8000"
              autoCapitalize="none"
            />

            <View style={styles.presetButtons}>
              <TouchableOpacity style={styles.presetChip} onPress={() => setCustomApiUrl('http://192.168.1.40:8000')}>
                <Text style={styles.presetChipText}>Wi-Fi IP</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.presetChip} onPress={() => setCustomApiUrl('http://10.0.2.2:8000')}>
                <Text style={styles.presetChipText}>Emulator</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSettingsVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveApiUrl}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  authContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 9,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#3b82f6',
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  alertError: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  alertSuccess: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  alertText: {
    fontSize: 13,
    flex: 1,
  },
  alertTextError: {
    color: '#b91c1c',
  },
  alertTextSuccess: {
    color: '#15803d',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  formHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  formSubheading: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 18,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  inputWithIcon: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: '#0f172a',
  },
  standardInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    marginBottom: 12,
  },
  emailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 14,
  },
  emailChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  emailChipEdit: {
    fontSize: 12,
    color: '#3b82f6',
    textDecorationLine: 'underline',
    marginLeft: 6,
  },
  otpInput: {
    height: 58,
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 10,
    color: '#1d4ed8',
    marginBottom: 16,
  },
  primaryButton: {
    height: 48,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 14,
  },
  resendText: {
    fontSize: 13,
    color: '#64748b',
  },
  resendButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3b82f6',
  },
  authFooter: {
    alignItems: 'center',
    marginTop: 24,
    gap: 12,
  },
  footerLink: {
    fontSize: 14,
    color: '#64748b',
  },
  footerLinkBold: {
    color: '#3b82f6',
    fontWeight: '700',
  },
  serverSettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  serverSettingsText: {
    fontSize: 11,
    color: '#475569',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

  // Chat Styles
  chatContainer: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  navBar: {
    height: 56,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  navBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  navUserSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 14,
    maxWidth: 110,
  },
  navUserName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  navIconBtn: {
    padding: 6,
  },
  disciplineBar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 8,
  },
  disciplineScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  disciplineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  disciplineChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  disciplineChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  disciplineChipTextActive: {
    color: '#ffffff',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 20,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 6,
    alignItems: 'flex-end',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAi: {
    justifyContent: 'flex-start',
  },
  avatarAi: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: '82%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  bubbleUser: {
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 2,
  },
  bubbleAi: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderBottomLeftRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextUser: {
    color: '#ffffff',
  },
  messageTextAi: {
    color: '#0f172a',
  },
  aiLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  aiLoadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  aiLoadingText: {
    fontSize: 12,
    color: '#64748b',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0f172a',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  mobileAttachBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobilePreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#bfdbfe',
  },
  mobilePreviewName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  mobilePreviewClose: {
    padding: 2,
  },
  chatImageMobile: {
    width: 220,
    height: 150,
    borderRadius: 10,
    marginBottom: 6,
  },
  chatFileBadgeMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  chatFileBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  attachOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  attachOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  attachOptionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 14,
    lineHeight: 18,
  },
  modalInput: {
    height: 46,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 12,
    backgroundColor: '#f8fafc',
  },
  presetButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  presetChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  presetChipText: {
    fontSize: 12,
    color: '#1d4ed8',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  cancelBtnText: {
    color: '#64748b',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
