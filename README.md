# EngiBot - Engineering AI Chatbot

EngiBot is an intelligent, branch-specific engineering assistant powered by modern AI models via OpenRouter (with support for Google Gemma, DeepSeek, Llama, and AWS Bedrock) and a FastAPI backend with SQLite.

## ✨ Features
- **AI-Powered Engineering Intelligence**: Answers questions across disciplines with multi-turn conversation memory.
- **Email OTP Login**: Passwordless, secure one-time password verification sent to your mail ID.
- **Traditional Password Login & Sign-Up**: Optional username/password authentication.
- **Engineering Disciplines**: Computer Science, Civil, Electronics, Electrical, Mechanical, and General Engineering.
- **Chat History**: Full conversation history persisted per discipline and user.

## 🚀 Getting Started

### Prerequisites
- **Python**: Python 3.12 (e.g. 3.12.5 / 3.12.10)
- **Node.js**: v18+ with npm

### 1. Launch Web & Backend
Double click or run:
```cmd
start.bat
```
This automatically starts:
- FastAPI backend on `http://0.0.0.0:8000` (accessible from both PC and phone)
- Vite React frontend on `http://localhost:5173`

### 2. Launch Mobile App (React Native Expo)
Double click or run:
```cmd
start-mobile.bat
```
Or run:
```cmd
cd mobile
npx expo start
```
1. Install **Expo Go** from Google Play Store (Android) or App Store (iOS).
2. Ensure your phone is connected to the same Wi-Fi (`192.168.1.40`).
3. Scan the QR code shown in the terminal with Expo Go!
4. The mobile app will open on your phone with full Email OTP login and AI chat!

---

## 🤖 AI Model Configuration

EngiBot supports **both your custom locally trained dataset model** (via Ollama) and **cloud models** (via OpenRouter) with intelligent fallback.

### 🌟 Using Your Custom Trained Dataset Model (.gguf)

1. **Place your trained `.gguf` file** into the `backend/models/` folder.
2. Double-click `backend/models/import-model.bat` or run:
   ```cmd
   cd backend/models
   ollama create engibot-model -f Modelfile
   ```
3. Start Ollama anytime with:
   ```cmd
   ollama serve
   ```
4. Configure in `backend/.env`:
   ```env
   AI_PROVIDER=auto
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=engibot-model
   ```
   > When set to `auto` or `ollama`, EngiBot queries your custom local trained model first! If Ollama is offline, it seamlessly falls back to OpenRouter cloud models.

### ☁️ Cloud AI Fallback (OpenRouter)

Settings in `backend/.env`:
```env
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=google/gemma-4-31b-it:free
```

> **Smart Fallback**: The backend includes automatic model fallback. If the primary model is busy or rate-limited, it automatically routes the prompt to backup models (`liquid/lfm-2.5-2.6b:free`, `cohere/north-mini-code:free`, etc.) to guarantee seamless responses.

---

## 🗄️ Database Configuration (PostgreSQL / SQLite)

EngiBot supports both **PostgreSQL** (production) and **SQLite** (local default):

### 1. Connecting PostgreSQL
Open `backend/.env` and set `DATABASE_URL`:
```env
# Local PostgreSQL
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/engibot

# Or Cloud PostgreSQL (Supabase / Neon / Render / AWS RDS)
DATABASE_URL=postgresql://user:password@ep-xyz.neon.tech/neondb?sslmode=require
```
*(If `DATABASE_URL` is left blank, EngiBot automatically uses local SQLite `chatbot.db`).*

### 2. Migrating Data from SQLite to PostgreSQL
If you already have existing users and chat history in `chatbot.db`, you can migrate everything into PostgreSQL with one command:
```cmd
cd backend
.venv\Scripts\activate
python migrate_to_postgres.py
```
This migrates all `users`, `messages`, and `email_otps` and resets auto-increment sequences.

---

## 📧 Email OTP Configuration (SMTP)

To send live OTP emails to users via Gmail or any standard SMTP provider:

1. Open `backend/.env`.
2. Configure your SMTP credentials:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASSWORD=your_16_character_app_password
   SMTP_FROM_NAME=EngiBot Assistant
   ```

> **Security Note**: Verification OTPs are delivered strictly to the user's registered mail ID via SMTP and are never displayed in the login dashboard or browser responses.
