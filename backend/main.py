from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, Date, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
from pathlib import Path
import os
import requests
import boto3
import base64
import secrets
import re
import json
from dotenv import load_dotenv

from mailer import send_otp_email
from prompts import build_system_prompt, detect_branch_mismatch, format_branch_mismatch_response, DISCIPLINE_METADATA
import calculators

# Directory for user-uploaded images, videos, and files
UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Load environment variables
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path, override=True)
else:
    load_dotenv(override=True)

# Database Setup (Supports PostgreSQL with fallback to SQLite)
raw_db_url = os.getenv("DATABASE_URL", "").strip().strip('"').strip("'")

if "[YOUR-PASSWORD]" in raw_db_url or "[PASSWORD]" in raw_db_url:
    print("\n[CRITICAL ERROR] DATABASE_URL in environment contains literal placeholder '[YOUR-PASSWORD]'.")
    print("Please replace '[YOUR-PASSWORD]' with your actual Supabase database password in Render Environment tab!\n")

# Support individual POSTGRES_* environment variables if DATABASE_URL is not directly set
if not raw_db_url and os.getenv("POSTGRES_DB"):
    pg_user = os.getenv("POSTGRES_USER", "postgres")
    pg_password = os.getenv("POSTGRES_PASSWORD", "")
    pg_host = os.getenv("POSTGRES_HOST", "localhost")
    pg_port = os.getenv("POSTGRES_PORT", "5432")
    pg_db = os.getenv("POSTGRES_DB", "engibot")
    auth_part = f"{pg_user}:{pg_password}@" if pg_password else f"{pg_user}@"
    raw_db_url = f"postgresql://{auth_part}{pg_host}:{pg_port}/{pg_db}"

if raw_db_url:
    # Ensure postgresql+psycopg2:// driver is used for standard postgresql URLs
    if raw_db_url.startswith("postgres://"):
        raw_db_url = raw_db_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif raw_db_url.startswith("postgresql://") and not raw_db_url.startswith("postgresql+"):
        raw_db_url = raw_db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    
    # Strip Prisma-specific ?pgbouncer=true or &pgbouncer=true which causes libpq 'invalid connection option' error
    raw_db_url = re.sub(r'[?&]pgbouncer=[^&]*', '', raw_db_url)
    # Clean up trailing '?' or '&' if pgbouncer was the only param
    if raw_db_url.endswith("?") or raw_db_url.endswith("&"):
        raw_db_url = raw_db_url[:-1]
        
    # Ensure sslmode=require is set for cloud connections (Supabase / Neon / Render)
    if "pooler.supabase.com" in raw_db_url or "supabase.co" in raw_db_url:
        if "sslmode=" not in raw_db_url:
            separator = "&" if "?" in raw_db_url else "?"
            raw_db_url = f"{raw_db_url}{separator}sslmode=require"

    SQLALCHEMY_DATABASE_URL = raw_db_url
else:
    # Default fallback to SQLite if no PostgreSQL connection is provided
    SQLALCHEMY_DATABASE_URL = "sqlite:///./chatbot.db"

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    # PostgreSQL with connection pooling and keep-alive verification
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

DB_STATUS = {
    "target": "postgresql" if SQLALCHEMY_DATABASE_URL.startswith("postgresql") else "sqlite",
    "active": "sqlite" if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else "postgresql",
    "connected": False,
    "error": None
}

class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title = Column(String(255), default="New Chat")
    discipline = Column(String(50), default="general")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="conversations")
    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="ChatMessage.timestamp.asc()")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    dob = Column(Date, nullable=True)
    phone_number = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)  # Plaintext for prototype
    role = Column(String, default="student") # 'student', 'professional', 'faculty_admin'
    university = Column(String, default="BPUT")
    semester = Column(Integer, default=5)
    discipline = Column(String, default="general")
    experience_years = Column(Integer, default=0)
    preferred_mode = Column(String, default="learn") # 'learn', 'work'
    preferred_language = Column(String, default="en") # 'en', 'hi', 'od', 'te'

    messages = relationship("ChatMessage", back_populates="user")
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan", order_by="Conversation.updated_at.desc()")
    calculation_logs = relationship("CalculationLog", back_populates="user", cascade="all, delete-orphan")
    doubts = relationship("EscalatedDoubt", back_populates="user", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=True, index=True)
    role = Column(String, index=True)
    content = Column(Text)
    discipline = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    attachment_url = Column(String, nullable=True)
    attachment_type = Column(String, nullable=True)  # 'image', 'video', 'file'
    file_name = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)
    mode = Column(String, default="learn")
    language = Column(String, default="en")
    model = Column(String, default="auto")
    
    user = relationship("User", back_populates="messages")
    conversation = relationship("Conversation", back_populates="messages")

class CalculationLog(Base):
    __tablename__ = "calculation_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True)
    calculator_type = Column(String(100), index=True)
    title = Column(String(255))
    inputs_json = Column(Text)
    assumptions_json = Column(Text, default="[]")
    results_json = Column(Text)
    units_used = Column(String(255))
    standard_cited = Column(String(255), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="calculation_logs")

class EscalatedDoubt(Base):
    __tablename__ = "escalated_doubts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True)
    discipline = Column(String(50))
    question_summary = Column(Text)
    status = Column(String(30), default="pending")
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="doubts")

class EmailOTP(Base):
    __tablename__ = "email_otps"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True)
    otp_code = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
    is_used = Column(Integer, default=0)

def init_db():
    global engine, SessionLocal, SQLALCHEMY_DATABASE_URL, DB_STATUS
    
    if SQLALCHEMY_DATABASE_URL.startswith("postgresql"):
        print("[DB INIT] Checking connection to PostgreSQL...")
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print("[DB INIT] Successfully connected to PostgreSQL!")
            DB_STATUS["connected"] = True
            DB_STATUS["active"] = "postgresql"
        except Exception as e:
            err_str = str(e)
            print("\n" + "!" * 68)
            print("[POSTGRESQL CONNECTION ATTEMPT FAILED]")
            print(f"Details: {err_str}")
            if "password authentication failed" in err_str:
                print(">> REASON: Wrong database password in Render DATABASE_URL.")
            elif "server closed the connection" in err_str or "6543" in SQLALCHEMY_DATABASE_URL:
                print(">> REASON: Port 6543 (transaction pooler) dropped the connection.")
                print(">> FIX: In Render Environment tab, change :6543 to :5432 (Session mode) in DATABASE_URL!")
            elif "could not translate host name" in err_str:
                print(">> REASON: Host could not be resolved. Ensure you use the pooler host.")
            print("[SAFE RECOVERY] Temporarily switching to local SQLite database so Render service stays ONLINE!")
            print("!" * 68 + "\n")
            
            DB_STATUS["connected"] = False
            DB_STATUS["active"] = "sqlite_fallback"
            DB_STATUS["error"] = err_str
            
            SQLALCHEMY_DATABASE_URL = "sqlite:///./chatbot.db"
            engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
            SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    try:
        Base.metadata.create_all(bind=engine)
        if not DB_STATUS["error"]:
            DB_STATUS["connected"] = True
    except Exception as e:
        print(f"[DB INIT WARNING] Table creation note: {e}")

    # Check and run database-agnostic column migrations
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        if "users" in tables:
            columns = [col["name"] for col in inspector.get_columns("users")]
            user_cols_to_add = [
                ("email", "VARCHAR(255)"),
                ("role", "VARCHAR(50) DEFAULT 'student'"),
                ("university", "VARCHAR(150) DEFAULT 'BPUT'"),
                ("semester", "INTEGER DEFAULT 5"),
                ("discipline", "VARCHAR(50) DEFAULT 'general'"),
                ("experience_years", "INTEGER DEFAULT 0"),
                ("preferred_mode", "VARCHAR(20) DEFAULT 'learn'"),
                ("preferred_language", "VARCHAR(10) DEFAULT 'en'")
            ]
            for col_name, col_def in user_cols_to_add:
                if col_name not in columns:
                    with engine.begin() as conn:
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}"))
                    print(f"[DB MIGRATION] Added '{col_name}' column to users table.")

        if "messages" in tables:
            columns = [col["name"] for col in inspector.get_columns("messages")]
            if "conversation_id" not in columns:
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE messages ADD COLUMN conversation_id INTEGER"))
                print("[DB MIGRATION] Added 'conversation_id' column to messages table.")
            if "attachment_url" not in columns:
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE messages ADD COLUMN attachment_url VARCHAR(500)"))
                print("[DB MIGRATION] Added 'attachment_url' column to messages table.")
            if "attachment_type" not in columns:
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE messages ADD COLUMN attachment_type VARCHAR(50)"))
                print("[DB MIGRATION] Added 'attachment_type' column to messages table.")
            if "file_name" not in columns:
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE messages ADD COLUMN file_name VARCHAR(255)"))
                print("[DB MIGRATION] Added 'file_name' column to messages table.")
            if "file_size" not in columns:
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE messages ADD COLUMN file_size INTEGER"))
                print("[DB MIGRATION] Added 'file_size' column to messages table.")
            if "mode" not in columns:
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE messages ADD COLUMN mode VARCHAR(20) DEFAULT 'learn'"))
                print("[DB MIGRATION] Added 'mode' column to messages table.")
            if "language" not in columns:
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE messages ADD COLUMN language VARCHAR(10) DEFAULT 'en'"))
                print("[DB MIGRATION] Added 'language' column to messages table.")
            if "model" not in columns:
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE messages ADD COLUMN model VARCHAR(100) DEFAULT 'auto'"))
                print("[DB MIGRATION] Added 'model' column to messages table.")

        # Migrate any legacy orphaned messages into initial conversations
        with SessionLocal() as db:
            orphaned = db.query(ChatMessage).filter(ChatMessage.conversation_id == None).all()
            if orphaned:
                groups = {}
                for msg in orphaned:
                    key = (msg.user_id, msg.discipline or "general")
                    groups.setdefault(key, []).append(msg)
                
                for (u_id, disc), msgs in groups.items():
                    first_user_msg = next((m for m in msgs if m.role == "user"), None)
                    raw_title = first_user_msg.content.strip().split("\n")[0][:36] if first_user_msg else f"{disc.upper()} Chat"
                    clean_title = re.sub(r'[\r\n\t]+', ' ', raw_title).strip()
                    conv = Conversation(
                        user_id=u_id,
                        title=clean_title or "Previous Chat",
                        discipline=disc,
                        created_at=msgs[0].timestamp if msgs else datetime.utcnow(),
                        updated_at=msgs[-1].timestamp if msgs else datetime.utcnow()
                    )
                    db.add(conv)
                    db.commit()
                    db.refresh(conv)
                    for m in msgs:
                        m.conversation_id = conv.id
                    db.commit()
                print(f"[DB MIGRATION] Grouped {len(orphaned)} legacy chat messages into conversations.")

    except Exception as e:
        print(f"[DB MIGRATION WARNING] Column check skipped: {e}")

init_db()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# API Setup
app = FastAPI(title="EngiBot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="api_uploads")

class UserLogin(BaseModel):
    username: str
    password: str

class UserRegister(BaseModel):
    name: str
    dob: str
    phone_number: str
    email: Optional[str] = None
    username: str
    password: str
    discipline: Optional[str] = "general"

class RegisterSendOTPRequest(BaseModel):
    name: str
    dob: str
    phone_number: str
    email: str
    username: str
    password: str
    discipline: Optional[str] = "general"

class RegisterVerifyOTPRequest(BaseModel):
    name: str
    dob: str
    phone_number: str
    email: str
    username: str
    password: str
    discipline: Optional[str] = "general"
    otp_code: str

class OTPRequest(BaseModel):
    email: str

class OTPVerify(BaseModel):
    email: str
    otp_code: str

class UploadRequest(BaseModel):
    file_name: str
    file_type: str  # 'image', 'video', 'file'
    mime_type: Optional[str] = None
    data_base64: str
    user_id: Optional[int] = None

class ChatRequest(BaseModel):
    user_id: int
    message: str
    discipline: str
    system_instruction: Optional[str] = ""
    mode: Optional[str] = "learn"
    language: Optional[str] = "en"
    conversation_id: Optional[int] = None
    attachment_url: Optional[str] = None
    attachment_type: Optional[str] = None  # 'image', 'video', 'file'
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    file_text: Optional[str] = None
    model_provider: Optional[str] = "auto"

class ProfileUpdate(BaseModel):
    user_id: int
    name: Optional[str] = None
    role: Optional[str] = "student"
    university: Optional[str] = "BPUT"
    semester: Optional[int] = 5
    discipline: Optional[str] = "general"
    experience_years: Optional[int] = 0
    preferred_mode: Optional[str] = "learn"
    preferred_language: Optional[str] = "en"

class BeamBendingRequest(BaseModel):
    user_id: Optional[int] = None
    conversation_id: Optional[int] = None
    beam_type: str = "ssb"
    load_type: str = "udl"
    span_m: float
    load_val: float
    load_pos_m: Optional[float] = 0.0

class CableSizingRequest(BaseModel):
    user_id: Optional[int] = None
    conversation_id: Optional[int] = None
    power_kw: float
    voltage_v: float = 415.0
    length_m: float
    power_factor: Optional[float] = 0.85
    is_three_phase: Optional[bool] = True
    conductor: Optional[str] = "aluminum"
    insulation: Optional[str] = "xlpe"
    max_drop_pct: Optional[float] = 3.0

class CircuitAnalysisRequest(BaseModel):
    user_id: Optional[int] = None
    conversation_id: Optional[int] = None
    circuit_mode: str = "series_rlc"
    resistance_ohms: float
    inductance_mh: Optional[float] = 0.0
    capacitance_uf: Optional[float] = 0.0
    frequency_hz: Optional[float] = 50.0
    voltage_v: Optional[float] = 230.0

class AlgoComplexityRequest(BaseModel):
    user_id: Optional[int] = None
    conversation_id: Optional[int] = None
    algorithm: str = "bubble_sort"
    raw_array: List[int]

class StressStrainRequest(BaseModel):
    user_id: Optional[int] = None
    conversation_id: Optional[int] = None
    force_kn: float
    shape: str = "circular"
    dim1_mm: float
    dim2_mm: Optional[float] = 0.0
    orig_length_m: Optional[float] = 1.0
    delta_l_mm: Optional[float] = 0.0
    yield_strength_mpa: Optional[float] = 250.0

class UnitConvertRequest(BaseModel):
    user_id: Optional[int] = None
    conversation_id: Optional[int] = None
    category: str = "force"
    value: float
    from_unit: str
    to_unit: str

class ExamPYQRequest(BaseModel):
    discipline: str
    university: str = "BPUT"
    semester: int = 5
    subject: Optional[str] = None
    unit_module: Optional[str] = None

class ExamQuizRequest(BaseModel):
    discipline: str
    topic: str
    num_questions: Optional[int] = 5

class EscalationRequest(BaseModel):
    user_id: int
    conversation_id: Optional[int] = None
    discipline: str
    question_summary: str

class ConversationCreate(BaseModel):
    user_id: int
    discipline: str = "general"
    title: Optional[str] = "New Chat"

class ConversationUpdate(BaseModel):
    title: str

@app.post("/api/upload")
def upload_file(req: UploadRequest):
    try:
        raw_b64 = req.data_base64
        if "," in raw_b64:
            _, raw_b64 = raw_b64.split(",", 1)
        
        file_bytes = base64.b64decode(raw_b64)
        
        if len(file_bytes) > 50 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds maximum allowed limit of 50MB")

        safe_name = re.sub(r'[^a-zA-Z0-9_\.-]', '_', req.file_name)
        timestamp_prefix = int(datetime.utcnow().timestamp())
        unique_name = f"{timestamp_prefix}_{secrets.token_hex(4)}_{safe_name}"
        
        file_path = UPLOAD_DIR / unique_name
        with open(file_path, "wb") as f:
            f.write(file_bytes)
            
        file_url = f"/uploads/{unique_name}"
        return {
            "status": "success",
            "file_url": file_url,
            "file_name": req.file_name,
            "file_type": req.file_type,
            "file_size": len(file_bytes)
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[UPLOAD ERROR] {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process upload: {str(e)}")

@app.post("/api/register")
def register(auth: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == auth.username).first():
        raise HTTPException(status_code=400, detail="Username already registered")
        
    email_clean = auth.email.strip().lower() if auth.email else None
    if email_clean:
        if not re.match(r"^[^@]+@[^@]+\.[^@]+$", email_clean):
            raise HTTPException(status_code=400, detail="Invalid email format")
        if db.query(User).filter(User.email == email_clean).first():
            raise HTTPException(status_code=400, detail="Email is already registered")

    try:
        dob_date = datetime.strptime(auth.dob, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
    today = date.today()
    age = today.year - dob_date.year - ((today.month, today.day) < (dob_date.month, dob_date.day))
    
    if age < 18:
        raise HTTPException(status_code=400, detail="You must be at least 18 years old to register.")

    new_user = User(
        name=auth.name,
        dob=dob_date,
        phone_number=auth.phone_number,
        email=email_clean,
        username=auth.username,
        password=auth.password,
        discipline=auth.discipline or "general"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {
        "id": new_user.id, 
        "username": new_user.username, 
        "name": new_user.name,
        "email": new_user.email,
        "discipline": getattr(new_user, "discipline", "general") or "general",
        "role": getattr(new_user, "role", "student") or "student",
        "preferred_mode": getattr(new_user, "preferred_mode", "learn") or "learn"
    }

@app.post("/api/register/send-otp")
def register_send_otp(req: RegisterSendOTPRequest, db: Session = Depends(get_db)):
    username_clean = req.username.strip()
    if not username_clean:
        raise HTTPException(status_code=400, detail="Please choose a username.")
    if db.query(User).filter(User.username == username_clean).first():
        raise HTTPException(status_code=400, detail=f"Username '{username_clean}' is already taken. Please choose another username.")

    email_clean = req.email.strip().lower()
    if not email_clean or not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email_clean):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
    if db.query(User).filter(User.email == email_clean).first():
        raise HTTPException(status_code=400, detail="This email is already registered. Please sign in instead.")

    if not req.password or len(req.password.strip()) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters long.")

    try:
        dob_date = datetime.strptime(req.dob, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    today = date.today()
    age = today.year - dob_date.year - ((today.month, today.day) < (dob_date.month, dob_date.day))
    if age < 18:
        raise HTTPException(status_code=400, detail="You must be at least 18 years old to register.")

    # Generate 6-digit numeric OTP
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    # Invalidate old unused OTPs for this email
    db.query(EmailOTP).filter(
        EmailOTP.email == email_clean,
        EmailOTP.is_used == 0
    ).update({"is_used": 2})

    # Send email directly
    mail_result = send_otp_email(email_clean, otp_code)
    is_demo_mode = False

    if not mail_result.get("sent"):
        err = mail_result.get("error", "")
        is_demo_mode = True
        print(f"\n[REGISTRATION DEMO OTP] Email delivery unavailable ({err}). Verification Code for {email_clean} is: {otp_code}\n")

    new_otp = EmailOTP(
        email=email_clean,
        otp_code=otp_code,
        expires_at=expires_at,
        is_used=0
    )
    db.add(new_otp)
    db.commit()

    if is_demo_mode:
        reason = "Render Cloud notice" if "101" in str(mail_result.get("error", "")) else "Demo Mode"
        return {
            "status": "success",
            "message": f"{reason}: Verification code is {otp_code} (Auto-filled below).",
            "email": email_clean,
            "demo_otp": otp_code
        }

    return {
        "status": "success",
        "message": f"Verification code sent to {email_clean}. Please check your mail inbox.",
        "email": email_clean
    }

@app.post("/api/register/verify-otp")
def register_verify_otp(req: RegisterVerifyOTPRequest, db: Session = Depends(get_db)):
    email_clean = req.email.strip().lower()
    code_clean = req.otp_code.strip()

    if not email_clean or not code_clean:
        raise HTTPException(status_code=400, detail="Email and verification code are required.")

    now = datetime.utcnow()
    otp_record = db.query(EmailOTP).filter(
        EmailOTP.email == email_clean,
        EmailOTP.otp_code == code_clean,
        EmailOTP.is_used == 0,
        EmailOTP.expires_at >= now
    ).order_by(EmailOTP.id.desc()).first()

    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code. Please request a new code.")

    otp_record.is_used = 1
    db.commit()

    username_clean = req.username.strip()
    if db.query(User).filter(User.username == username_clean).first():
        raise HTTPException(status_code=400, detail=f"Username '{username_clean}' is already registered.")
    if db.query(User).filter(User.email == email_clean).first():
        raise HTTPException(status_code=400, detail="This email is already registered.")

    try:
        dob_date = datetime.strptime(req.dob, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    new_user = User(
        name=req.name.strip(),
        dob=dob_date,
        phone_number=req.phone_number.strip(),
        email=email_clean,
        username=username_clean,
        password=req.password.strip(),
        discipline=req.discipline or "general"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "id": new_user.id,
        "username": new_user.username,
        "name": new_user.name,
        "email": new_user.email,
        "discipline": getattr(new_user, "discipline", "general") or "general",
        "role": getattr(new_user, "role", "student") or "student",
        "preferred_mode": getattr(new_user, "preferred_mode", "learn") or "learn"
    }

@app.post("/api/login")
def login(auth: UserLogin, db: Session = Depends(get_db)):
    clean_identifier = auth.username.strip()
    user = db.query(User).filter(
        (User.username == clean_identifier) | (User.email == clean_identifier.lower())
    ).first()
    if not user or user.password != auth.password:
        raise HTTPException(status_code=401, detail="Invalid username/email or password")
    return {
        "id": user.id, 
        "username": user.username, 
        "name": user.name,
        "email": user.email,
        "discipline": getattr(user, "discipline", "general") or "general",
        "role": getattr(user, "role", "student") or "student",
        "preferred_mode": getattr(user, "preferred_mode", "learn") or "learn"
    }

@app.post("/api/otp/send")
def send_otp(request: OTPRequest, db: Session = Depends(get_db)):
    email_clean = request.email.strip().lower()
    if not email_clean or not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email_clean):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    # OTP Login is strictly for registered accounts
    user = db.query(User).filter((User.email == email_clean) | (User.username == email_clean)).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="No account registered with this email address. Please click 'Create one now' to register your account."
        )

    # Generate 6-digit numeric OTP
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    # Invalidate old unused OTPs for this email to keep clean
    db.query(EmailOTP).filter(
        EmailOTP.email == email_clean,
        EmailOTP.is_used == 0
    ).update({"is_used": 2}) # 2 = superseded

    # Send email directly to the user's mail ID
    mail_result = send_otp_email(email_clean, otp_code)
    is_demo_mode = False

    if not mail_result.get("sent"):
        err = mail_result.get("error", "")
        # If Render blocks outbound SMTP (Errno 101 Network is unreachable) or SMTP not configured,
        # gracefully fall back to Demo Mode with the code so user is never blocked!
        is_demo_mode = True
        print(f"\n[DEMO MODE OTP] Email delivery unavailable ({err}). Verification Code for {email_clean} is: {otp_code}\n")

    # Save to database
    new_otp = EmailOTP(
        email=email_clean,
        otp_code=otp_code,
        expires_at=expires_at,
        is_used=0
    )
    db.add(new_otp)
    db.commit()

    if is_demo_mode:
        reason = "Render Cloud notice (Outbound SMTP blocked on free tier)" if "101" in str(mail_result.get("error", "")) else "Demo Mode"
        return {
            "status": "success",
            "message": f"{reason}: Verification code is {otp_code} (Auto-filled below).",
            "email": email_clean,
            "demo_otp": otp_code
        }

    return {
        "status": "success",
        "message": f"Verification code sent to {email_clean}. Please check your mail inbox.",
        "email": email_clean
    }

@app.post("/api/otp/verify")
def verify_otp(request: OTPVerify, db: Session = Depends(get_db)):
    email_clean = request.email.strip().lower()
    code_clean = request.otp_code.strip()

    if not email_clean or not code_clean:
        raise HTTPException(status_code=400, detail="Email and OTP code are required.")

    # Find matching valid OTP
    now = datetime.utcnow()
    otp_record = db.query(EmailOTP).filter(
        EmailOTP.email == email_clean,
        EmailOTP.otp_code == code_clean,
        EmailOTP.is_used == 0,
        EmailOTP.expires_at >= now
    ).order_by(EmailOTP.id.desc()).first()

    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP code. Please request a new code.")

    # Mark OTP as used
    otp_record.is_used = 1
    db.commit()

    # Look for existing user with this email or username (strictly registered accounts)
    user = db.query(User).filter((User.email == email_clean) | (User.username == email_clean)).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="No account registered with this email address. Please click 'Create one now' to register your account."
        )

    return {
        "id": user.id,
        "username": user.username,
        "name": user.name or user.username,
        "email": user.email,
        "discipline": getattr(user, "discipline", "general") or "general",
        "role": getattr(user, "role", "student") or "student",
        "preferred_mode": getattr(user, "preferred_mode", "learn") or "learn"
    }

    return {
        "id": user.id,
        "username": user.username,
        "name": user.name or user.username,
        "email": user.email,
        "discipline": getattr(user, "discipline", "general") or "general",
        "role": getattr(user, "role", "student") or "student",
        "preferred_mode": getattr(user, "preferred_mode", "learn") or "learn"
    }

def generate_ai_response(
    system_instruction: str, 
    history_messages: list, 
    new_user_message: str,
    preferred_provider: Optional[str] = "auto",
    return_model: bool = False
):
    ai_provider = os.getenv("AI_PROVIDER", "auto").strip().lower()
    ollama_model = os.getenv("OLLAMA_MODEL", "engibot-model").strip()
    ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")

    # 0. Helper function to query Groq API (Ultra-fast, 120B parameter reasoning)
    def try_groq():
        groq_key = os.getenv("GROQ_API_KEY", "").strip()
        if not groq_key:
            return None
        configured_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b").strip()
        candidate_models = [
            configured_model,
            "openai/gpt-oss-120b",
            "qwen/qwen3.8-27b",
            "openai/gpt-oss-20b"
        ]
        unique_models = list(dict.fromkeys([m for m in candidate_models if m]))

        messages_payload = [{"role": "system", "content": system_instruction}]
        for msg in history_messages:
            role = "user" if getattr(msg, "role", "user") == "user" else "assistant"
            messages_payload.append({"role": role, "content": getattr(msg, "content", "")})
        messages_payload.append({"role": "user", "content": new_user_message})

        headers = {
            "Authorization": f"Bearer {groq_key}",
            "Content-Type": "application/json",
            "User-Agent": "EngiBot/1.0"
        }

        last_error = None
        for model_name in unique_models:
            try:
                payload = {
                    "model": model_name,
                    "messages": messages_payload,
                    "temperature": 0.4
                }
                res = requests.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=25
                )
                if res.status_code == 200:
                    result = res.json()
                    choices = result.get("choices", [])
                    if choices:
                        return choices[0]["message"]["content"], f"Groq ({model_name})"
                else:
                    last_error = f"Groq {model_name} HTTP {res.status_code}: {res.text[:120]}"
                    print(f"[GROQ WARNING] {last_error}. Trying next Groq model...")
            except Exception as e:
                last_error = str(e)
                print(f"[GROQ EXCEPTION] {model_name}: {e}. Trying next model...")

        if last_error:
            print(f"[AI ROUTER] Groq failed: {last_error}")
        return None

    # 1. Helper function to query Claude API (Anthropic Messages Endpoint)
    def try_claude():
        claude_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
        if not claude_key:
            return None
        claude_model = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022").strip()
        claude_messages = []
        for msg in history_messages:
            role = "user" if getattr(msg, "role", "user") == "user" else "assistant"
            claude_messages.append({"role": role, "content": getattr(msg, "content", "")})
        claude_messages.append({"role": "user", "content": new_user_message})

        headers = {
            "x-api-key": claude_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        payload = {
            "model": claude_model,
            "max_tokens": 4096,
            "system": system_instruction,
            "messages": claude_messages
        }
        res = requests.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload, timeout=60)
        if res.status_code == 200:
            result = res.json()
            return "".join([b.get("text", "") for b in result.get("content", [])]), f"Claude ({claude_model})"
        else:
            raise Exception(f"Claude API Error ({res.status_code}): {res.text}")

    # 2. Helper function to query local Ollama model
    def try_ollama():
        if not ollama_model:
            return None
        ollama_messages = [{"role": "system", "content": system_instruction}]
        for msg in history_messages:
            role = "user" if getattr(msg, "role", "user") == "user" else "assistant"
            ollama_messages.append({"role": role, "content": getattr(msg, "content", "")})
        ollama_messages.append({"role": "user", "content": new_user_message})

        payload = {
            "model": ollama_model,
            "messages": ollama_messages,
            "stream": False,
            "options": {
                "temperature": float(os.getenv("OLLAMA_TEMPERATURE", "0.7"))
            }
        }
        res = requests.post(f"{ollama_base_url}/api/chat", json=payload, timeout=90)
        if res.status_code == 200:
            result = res.json()
            return result.get("message", {}).get("content", ""), f"Local Ollama ({ollama_model})"
        else:
            raise Exception(f"Ollama Error ({res.status_code}): {res.text}")

    # 3. Helper function to query OpenRouter AI
    def try_openrouter():
        openrouter_key = os.getenv("OPENROUTER_API_KEY", "").strip()
        if not openrouter_key:
            return None
        configured_model = os.getenv("OPENROUTER_MODEL", "nvidia/nemotron-3.5-lightning:free").strip()
        candidate_models = [
            configured_model,
            "nvidia/nemotron-3.5-lightning:free",
            "liquid/lfm-3-1.7b:free",
            "cohere/north-mini-code:free",
            "baidu/ernie-5.5-flash-preview:free"
        ]
        unique_models = list(dict.fromkeys([m for m in candidate_models if m]))

        messages_payload = [{"role": "system", "content": system_instruction}]
        for msg in history_messages:
            role = "user" if getattr(msg, "role", "user") == "user" else "assistant"
            messages_payload.append({"role": role, "content": getattr(msg, "content", "")})
        messages_payload.append({"role": "user", "content": new_user_message})

        headers = {
            "Authorization": f"Bearer {openrouter_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://engibot.pages.dev",
            "X-Title": "EngiBot AI Assistant"
        }

        last_error = None
        for model_name in unique_models:
            try:
                payload = {
                    "model": model_name,
                    "messages": messages_payload
                }
                res = requests.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=30
                )
                if res.status_code == 200:
                    result = res.json()
                    choices = result.get("choices", [])
                    if choices:
                        return choices[0]["message"]["content"], f"OpenRouter ({model_name})"
                else:
                    last_error = f"{model_name} HTTP {res.status_code}: {res.text[:120]}"
                    print(f"[OPENROUTER WARNING] {last_error}. Trying next free model...")
            except Exception as e:
                last_error = str(e)
                print(f"[OPENROUTER EXCEPTION] {model_name}: {e}. Trying next free model...")

        if last_error:
            raise Exception(f"All OpenRouter models failed: {last_error}")
        return None

    # 4. Helper function to query AWS Bedrock
    def try_bedrock():
        aws_access_key = os.getenv("AWS_ACCESS_KEY_ID", "").strip()
        aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY", "").strip()
        if not (aws_access_key and aws_secret_key):
            return None

        formatted_history = []
        for msg in history_messages:
            role = "user" if getattr(msg, "role", "user") == "user" else "assistant"
            formatted_history.append({"role": role, "content": [{"text": getattr(msg, "content", "")}]})
        formatted_history.append({"role": "user", "content": [{"text": new_user_message}]})

        client = boto3.client(
            service_name='bedrock-runtime',
            region_name=os.getenv("AWS_REGION", "us-east-1"),
            aws_access_key_id=aws_access_key,
            aws_secret_access_key=aws_secret_key
        )
        response = client.converse(
            modelId=os.getenv("BEDROCK_MODEL_ID", "amazon.nova-lite-v1:0"),
            messages=formatted_history,
            system=[{"text": system_instruction}]
        )
        return response['output']['message']['content'][0]['text'], "AWS Bedrock"

    # Route according to preferred_provider selection (from UI model selector)
    pref = (preferred_provider or ai_provider or "auto").strip().lower()

    # Case A: Explicitly selected Groq 120B
    if pref in ("groq", "groq-120b"):
        try:
            groq_res = try_groq()
            if groq_res:
                return groq_res if return_model else groq_res[0]
        except Exception as e:
            print(f"[AI ROUTER] Explicit Groq request warning ({e}). Falling back to OpenRouter...")
        try:
            or_res = try_openrouter()
            if or_res:
                return or_res if return_model else or_res[0]
        except Exception:
            pass

    # Case B: Explicitly selected OpenRouter Cloud
    elif pref in ("openrouter", "nemotron", "cloud"):
        try:
            or_res = try_openrouter()
            if or_res:
                return or_res if return_model else or_res[0]
        except Exception as e:
            print(f"[AI ROUTER] Explicit OpenRouter request warning ({e}). Falling back to Groq...")
        try:
            groq_res = try_groq()
            if groq_res:
                return groq_res if return_model else groq_res[0]
        except Exception:
            pass

    # Case C: Explicitly selected Local Ollama
    elif pref in ("ollama", "local"):
        try:
            ollama_res = try_ollama()
            if ollama_res:
                return ollama_res if return_model else ollama_res[0]
        except Exception as e:
            print(f"[AI ROUTER] Explicit Ollama request failed ({e}). Falling back to Groq...")
        try:
            groq_res = try_groq()
            if groq_res:
                return groq_res if return_model else groq_res[0]
        except Exception:
            pass

    # Case D: Auto Smart Cascade (Default: Groq -> Claude -> Ollama -> OpenRouter -> Bedrock)
    if os.getenv("GROQ_API_KEY", "").strip():
        try:
            groq_res = try_groq()
            if groq_res:
                return groq_res if return_model else groq_res[0]
        except Exception as e:
            print(f"[AI ROUTER] Groq API warning ({e}). Falling back to next provider...")

    if ai_provider in ("claude", "anthropic") or os.getenv("ANTHROPIC_API_KEY", "").strip():
        try:
            claude_res = try_claude()
            if claude_res:
                return claude_res if return_model else claude_res[0]
        except Exception as e:
            print(f"[AI ROUTER] Claude API unavailable ({e}). Falling back...")

    try:
        ollama_res = try_ollama()
        if ollama_res:
            return ollama_res if return_model else ollama_res[0]
    except Exception as e:
        print(f"[AI ROUTER] Ollama local model not available ({e}). Falling back...")

    try:
        or_res = try_openrouter()
        if or_res:
            return or_res if return_model else or_res[0]
    except Exception as e:
        print(f"[AI ROUTER] OpenRouter error: {e}")

    try:
        bedrock_res = try_bedrock()
        if bedrock_res:
            return bedrock_res if return_model else bedrock_res[0]
    except Exception as e:
        print(f"[AI ROUTER] Bedrock error: {e}")

    raise Exception("No AI provider responded successfully. Please check your Groq, Ollama, or OpenRouter configuration in backend/.env")

@app.post("/api/chat")
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    try:
        conv = None
        if request.conversation_id:
            conv = db.query(Conversation).filter(
                Conversation.id == request.conversation_id,
                Conversation.user_id == request.user_id
            ).first()

        # If no active conversation session, auto-create one
        if not conv:
            first_line = request.message.strip().split("\n")[0][:36]
            clean_title = re.sub(r'[\r\n\t]+', ' ', first_line).strip()
            if len(request.message.strip()) > 36:
                clean_title += "..."
            conv = Conversation(
                user_id=request.user_id,
                title=clean_title or "New Chat",
                discipline=request.discipline
            )
            db.add(conv)
            db.commit()
            db.refresh(conv)
        elif conv.title in ("New Chat", "Untitled Chat") or not conv.title:
            first_line = request.message.strip().split("\n")[0][:36]
            clean_title = re.sub(r'[\r\n\t]+', ' ', first_line).strip()
            if len(request.message.strip()) > 36:
                clean_title += "..."
            conv.title = clean_title or "New Chat"

        # Lookup user profile to dynamically compose the system prompt
        user = db.query(User).filter(User.id == request.user_id).first()
        user_role = user.role if user and user.role else "student"
        user_univ = user.university if user and user.university else "BPUT"
        user_sem = user.semester if user and user.semester else 5
        active_mode = request.mode or (user.preferred_mode if user and user.preferred_mode else "learn")
        active_lang = request.language or (user.preferred_language if user and user.preferred_language else "en")

        effective_system_instruction = request.system_instruction
        if not effective_system_instruction:
            effective_system_instruction = build_system_prompt(
                discipline=request.discipline,
                mode=active_mode,
                role=user_role,
                university=user_univ,
                semester=user_sem,
                language=active_lang
            )

        # Retrieve previous messages for context within this conversation
        history_msgs = db.query(ChatMessage).filter(
            ChatMessage.conversation_id == conv.id
        ).order_by(ChatMessage.timestamp.asc()).limit(20).all()

        user_msg = ChatMessage(
            user_id=request.user_id,
            conversation_id=conv.id,
            role="user",
            content=request.message,
            discipline=request.discipline,
            attachment_url=request.attachment_url,
            attachment_type=request.attachment_type,
            file_name=request.file_name,
            file_size=request.file_size,
            mode=active_mode,
            language=active_lang
        )
        db.add(user_msg)
        db.commit()

        # Strict Engineering Branch Domain Boundary Check
        # Example: Reject Civil questions asked in Computer Science (CSE), or CSE coding in Civil
        branch_mismatch = detect_branch_mismatch(request.message or "", request.discipline)
        if branch_mismatch:
            refusal_text = format_branch_mismatch_response(branch_mismatch)
            ai_msg = ChatMessage(
                user_id=request.user_id,
                conversation_id=conv.id,
                role="ai",
                content=refusal_text,
                discipline=request.discipline,
                mode=active_mode,
                language=active_lang,
                model="Branch Boundary Guard"
            )
            db.add(ai_msg)
            conv.updated_at = datetime.utcnow()
            db.commit()
            return {
                "response": refusal_text,
                "model_used": "Branch Boundary Guard",
                "conversation_id": conv.id,
                "title": conv.title,
                "discipline": conv.discipline,
                "mode": active_mode
            }

        # Augment prompt if attachment is provided
        augmented_prompt = request.message or ""
        if request.attachment_url:
            att_type = (request.attachment_type or "file").upper()
            att_info = f"\n\n[USER ATTACHED {att_type}: '{request.file_name or 'file'}']"
            if request.file_text:
                att_info += f"\nFile content preview:\n```\n{request.file_text[:3500]}\n```"
            elif request.attachment_type == "image":
                att_info += "\n(The user has shared an engineering image / diagram for analysis.)"
            elif request.attachment_type == "video":
                att_info += "\n(The user has shared an engineering video file for discussion.)"
            augmented_prompt = f"{augmented_prompt.strip()}\n{att_info}".strip()

        ai_text, model_used = generate_ai_response(
            system_instruction=effective_system_instruction,
            history_messages=history_msgs,
            new_user_message=augmented_prompt,
            preferred_provider=request.model_provider,
            return_model=True
        )

        ai_msg = ChatMessage(
            user_id=request.user_id,
            conversation_id=conv.id,
            role="ai",
            content=ai_text,
            discipline=request.discipline,
            mode=active_mode,
            language=active_lang,
            model=model_used
        )
        db.add(ai_msg)
        conv.updated_at = datetime.utcnow()
        db.commit()

        return {
            "response": ai_text,
            "model_used": model_used,
            "conversation_id": conv.id,
            "title": conv.title,
            "discipline": conv.discipline,
            "mode": active_mode
        }

    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "EngiBot Backend",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/conversations/{user_id}")
def get_conversations(user_id: int, discipline: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Conversation).filter(Conversation.user_id == user_id)
    if discipline:
        query = query.filter(Conversation.discipline == discipline)
    conversations = query.order_by(Conversation.updated_at.desc()).all()
    
    result = []
    for c in conversations:
        last_msg = db.query(ChatMessage).filter(ChatMessage.conversation_id == c.id).order_by(ChatMessage.timestamp.desc()).first()
        result.append({
            "id": c.id,
            "title": c.title,
            "discipline": c.discipline,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "last_message": last_msg.content[:80] if last_msg else ""
        })
    return result

@app.post("/api/conversations")
def create_conversation(data: ConversationCreate, db: Session = Depends(get_db)):
    conv = Conversation(
        user_id=data.user_id,
        title=data.title or "New Chat",
        discipline=data.discipline or "general"
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return {
        "id": conv.id,
        "title": conv.title,
        "discipline": conv.discipline,
        "created_at": conv.created_at,
        "updated_at": conv.updated_at,
        "last_message": ""
    }

@app.get("/api/conversations/{conversation_id}/messages")
def get_conversation_messages(conversation_id: int, db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    messages = db.query(ChatMessage).filter(ChatMessage.conversation_id == conversation_id).order_by(ChatMessage.timestamp.asc()).all()
    return {
        "conversation": {
            "id": conv.id,
            "title": conv.title,
            "discipline": conv.discipline,
            "created_at": conv.created_at,
            "updated_at": conv.updated_at
        },
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "timestamp": m.timestamp,
                "discipline": m.discipline,
                "model": getattr(m, "model", None),
                "attachment_url": getattr(m, "attachment_url", None),
                "attachment_type": getattr(m, "attachment_type", None),
                "file_name": getattr(m, "file_name", None),
                "file_size": getattr(m, "file_size", None)
            } for m in messages
        ]
    }

@app.patch("/api/conversations/{conversation_id}")
def update_conversation(conversation_id: int, data: ConversationUpdate, db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    new_title = data.title.strip()
    if not new_title:
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    conv.title = new_title[:100]
    db.commit()
    return {"status": "success", "id": conv.id, "title": conv.title}

@app.delete("/api/conversations/{conversation_id}")
def delete_conversation(conversation_id: int, db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(conv)
    db.commit()
    return {"status": "success", "deleted_id": conversation_id}

@app.get("/api/history/{user_id}")
def get_history(user_id: int, discipline: str = None, db: Session = Depends(get_db)):
    query = db.query(ChatMessage).filter(ChatMessage.user_id == user_id)
    if discipline:
        query = query.filter(ChatMessage.discipline == discipline)
    messages = query.order_by(ChatMessage.timestamp.asc()).all()
    return [
        {
            "role": m.role,
            "content": m.content,
            "timestamp": m.timestamp,
            "attachment_url": getattr(m, "attachment_url", None),
            "attachment_type": getattr(m, "attachment_type", None),
            "file_name": getattr(m, "file_name", None),
            "file_size": getattr(m, "file_size", None)
        } for m in messages
    ]

@app.get("/api/model/status")
def get_model_status():
    ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
    ollama_model = os.getenv("OLLAMA_MODEL", "engibot-model").strip()
    ai_provider = os.getenv("AI_PROVIDER", "auto").strip()

    ollama_online = False
    installed_models = []
    try:
        res = requests.get(f"{ollama_base_url}/api/tags", timeout=2)
        if res.status_code == 200:
            ollama_online = True
            installed_models = [m.get("name") for m in res.json().get("models", [])]
    except Exception:
        ollama_online = False

    return {
        "configured_provider": ai_provider,
        "ollama": {
            "online": ollama_online,
            "target_model": ollama_model,
            "is_target_installed": any(ollama_model in m for m in installed_models),
            "available_models": installed_models,
            "base_url": ollama_base_url
        },
        "groq": {
            "configured": bool(os.getenv("GROQ_API_KEY")),
            "model": os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
        },
        "openrouter": {
            "configured": bool(os.getenv("OPENROUTER_API_KEY")),
            "model": os.getenv("OPENROUTER_MODEL", "google/gemma-4-31b-it:free")
        },
        "claude": {
            "configured": bool(os.getenv("ANTHROPIC_API_KEY")),
            "model": os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")
        },
        "database": DB_STATUS["active"],
        "database_target": DB_STATUS["target"],
        "database_connected": DB_STATUS["connected"],
        "database_error": DB_STATUS["error"],
        "status": "online"
    }

# ========================================================
# User Profile & Onboarding Endpoints
# ========================================================

@app.get("/api/user/profile/{user_id}")
def get_user_profile(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "name": user.name or user.username,
        "username": user.username,
        "email": user.email,
        "role": getattr(user, "role", "student") or "student",
        "university": getattr(user, "university", "BPUT") or "BPUT",
        "semester": getattr(user, "semester", 5) or 5,
        "discipline": getattr(user, "discipline", "general") or "general",
        "experience_years": getattr(user, "experience_years", 0) or 0,
        "preferred_mode": getattr(user, "preferred_mode", "learn") or "learn",
        "preferred_language": getattr(user, "preferred_language", "en") or "en"
    }

@app.post("/api/user/profile")
def update_user_profile(profile: ProfileUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == profile.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if profile.name:
        user.name = profile.name
    if profile.role:
        user.role = profile.role
    if profile.university:
        user.university = profile.university
    if profile.semester is not None:
        user.semester = profile.semester
    if profile.discipline:
        user.discipline = profile.discipline
    if profile.experience_years is not None:
        user.experience_years = profile.experience_years
    if profile.preferred_mode:
        user.preferred_mode = profile.preferred_mode
    if profile.preferred_language:
        user.preferred_language = profile.preferred_language
    db.commit()
    db.refresh(user)
    return {
        "status": "success",
        "message": "Profile updated successfully",
        "profile": {
            "id": user.id,
            "name": user.name,
            "role": user.role,
            "university": user.university,
            "semester": user.semester,
            "discipline": user.discipline,
            "preferred_mode": user.preferred_mode,
            "preferred_language": user.preferred_language
        }
    }

# ========================================================
# Deterministic Engineering Calculators
# ========================================================

@app.post("/api/calculators/beam-bending")
def api_beam_bending(req: BeamBendingRequest, db: Session = Depends(get_db)):
    try:
        res = calculators.calculate_beam_bending(
            beam_type=req.beam_type,
            load_type=req.load_type,
            span_m=req.span_m,
            load_val=req.load_val,
            load_pos_m=req.load_pos_m or 0.0
        )
        if req.user_id:
            log = CalculationLog(
                user_id=req.user_id,
                conversation_id=req.conversation_id,
                calculator_type="beam_bending",
                title=res["title"],
                inputs_json=json.dumps(res["inputs"]),
                assumptions_json=json.dumps(res["assumptions"]),
                results_json=json.dumps(res["results"]),
                units_used=res["units"],
                standard_cited=res.get("standard_cited")
            )
            db.add(log)
            db.commit()
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/calculators/cable-sizing")
def api_cable_sizing(req: CableSizingRequest, db: Session = Depends(get_db)):
    try:
        res = calculators.calculate_cable_sizing(
            power_kw=req.power_kw,
            voltage_v=req.voltage_v,
            length_m=req.length_m,
            power_factor=req.power_factor or 0.85,
            is_three_phase=req.is_three_phase if req.is_three_phase is not None else True,
            conductor=req.conductor or "aluminum",
            insulation=req.insulation or "xlpe",
            max_drop_pct=req.max_drop_pct or 3.0
        )
        if req.user_id:
            log = CalculationLog(
                user_id=req.user_id,
                conversation_id=req.conversation_id,
                calculator_type="cable_sizing",
                title=res["title"],
                inputs_json=json.dumps(res["inputs"]),
                assumptions_json=json.dumps(res["assumptions"]),
                results_json=json.dumps(res["results"]),
                units_used=res["units"],
                standard_cited=res.get("standard_cited")
            )
            db.add(log)
            db.commit()
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/calculators/circuit-analysis")
def api_circuit_analysis(req: CircuitAnalysisRequest, db: Session = Depends(get_db)):
    try:
        res = calculators.calculate_circuit_analysis(
            circuit_mode=req.circuit_mode,
            resistance_ohms=req.resistance_ohms,
            inductance_mh=req.inductance_mh or 0.0,
            capacitance_uf=req.capacitance_uf or 0.0,
            frequency_hz=req.frequency_hz or 50.0,
            voltage_v=req.voltage_v or 230.0
        )
        if req.user_id:
            log = CalculationLog(
                user_id=req.user_id,
                conversation_id=req.conversation_id,
                calculator_type="circuit_analysis",
                title=res["title"],
                inputs_json=json.dumps(res["inputs"]),
                assumptions_json="[]",
                results_json=json.dumps(res["results"]),
                units_used=res["units"],
                standard_cited=res.get("standard_cited")
            )
            db.add(log)
            db.commit()
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/calculators/algo-complexity")
def api_algo_complexity(req: AlgoComplexityRequest, db: Session = Depends(get_db)):
    try:
        res = calculators.calculate_algo_complexity(
            algorithm=req.algorithm,
            raw_array=req.raw_array
        )
        if req.user_id:
            log = CalculationLog(
                user_id=req.user_id,
                conversation_id=req.conversation_id,
                calculator_type="algo_complexity",
                title=res["title"],
                inputs_json=json.dumps(res["inputs"]),
                assumptions_json="[]",
                results_json=json.dumps(res["results"]),
                units_used="Operations & Big-O",
                standard_cited=res.get("standard_cited")
            )
            db.add(log)
            db.commit()
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/calculators/stress-strain")
def api_stress_strain(req: StressStrainRequest, db: Session = Depends(get_db)):
    try:
        res = calculators.calculate_stress_strain(
            force_kn=req.force_kn,
            shape=req.shape,
            dim1_mm=req.dim1_mm,
            dim2_mm=req.dim2_mm or 0.0,
            orig_length_m=req.orig_length_m or 1.0,
            delta_l_mm=req.delta_l_mm or 0.0,
            yield_strength_mpa=req.yield_strength_mpa or 250.0
        )
        if req.user_id:
            log = CalculationLog(
                user_id=req.user_id,
                conversation_id=req.conversation_id,
                calculator_type="stress_strain",
                title=res["title"],
                inputs_json=json.dumps(res["inputs"]),
                assumptions_json="[]",
                results_json=json.dumps(res["results"]),
                units_used=res["units"],
                standard_cited=res.get("standard_cited")
            )
            db.add(log)
            db.commit()
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/calculators/unit-converter")
def api_unit_converter(req: UnitConvertRequest):
    try:
        res = calculators.calculate_unit_conversion(
            category=req.category,
            value=req.value,
            from_unit=req.from_unit,
            to_unit=req.to_unit
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/calculation-logs/{user_id}")
def get_calculation_logs(user_id: int, db: Session = Depends(get_db)):
    logs = db.query(CalculationLog).filter(CalculationLog.user_id == user_id).order_by(CalculationLog.timestamp.desc()).limit(50).all()
    return [{
        "id": l.id,
        "calculator_type": l.calculator_type,
        "title": l.title,
        "inputs": json.loads(l.inputs_json) if l.inputs_json else {},
        "results": json.loads(l.results_json) if l.results_json else {},
        "units": l.units_used,
        "standard_cited": l.standard_cited,
        "timestamp": l.timestamp.strftime("%Y-%m-%d %H:%M:%S") if l.timestamp else ""
    } for l in logs]

# ========================================================
# Human Doubt Escalation
# ========================================================

@app.post("/api/escalate-doubt")
def escalate_doubt(req: EscalationRequest, db: Session = Depends(get_db)):
    doubt = EscalatedDoubt(
        user_id=req.user_id,
        conversation_id=req.conversation_id,
        discipline=req.discipline,
        question_summary=req.question_summary.strip()
    )
    db.add(doubt)
    db.commit()
    db.refresh(doubt)
    return {
        "status": "success",
        "ticket_id": f"ENG-DOUBT-{doubt.id:04d}",
        "message": "Your doubt has been forwarded to the faculty and senior engineering mentor queue.",
        "created_at": doubt.created_at.strftime("%Y-%m-%d %H:%M:%S")
    }

# ========================================================
# Exam Mode Endpoints (PYQs, Quizzes, Flashcards)
# ========================================================

@app.post("/api/exam/pyq")
def generate_pyq(req: ExamPYQRequest):
    prompt = f"Generate 5 high-yield previous-year exam questions (PYQs) for {req.university} Semester {req.semester} students in the discipline of {req.discipline.upper()}."
    if req.subject:
        prompt += f" Subject: {req.subject}."
    if req.unit_module:
        prompt += f" Unit / Module: {req.unit_module}."
    prompt += " For each question, indicate the expected marks weighting (e.g. 5 Marks, 10 Marks or 15 Marks), the key concept tested, and a 2-line solution outline."
    system_inst = "You are a university engineering examination controller and professor. Output crisp, high-yield previous year questions formatted in clean markdown with KaTeX math."
    ans = generate_ai_response(system_inst, [], prompt)
    return {"discipline": req.discipline, "university": req.university, "semester": req.semester, "pyq_content": ans}

@app.post("/api/exam/quiz")
def generate_quiz(req: ExamQuizRequest):
    prompt = f"Generate a {req.num_questions or 5}-question multiple-choice practice quiz on the topic '{req.topic}' for engineering students in {req.discipline.upper()}. Each question must have 4 options (A, B, C, D) and clearly state the correct option with a 1-sentence engineering justification."
    system_inst = "You are an engineering quiz author. Provide 5 challenging conceptual engineering multiple-choice questions with answer key and brief explanations."
    ans = generate_ai_response(system_inst, [], prompt)
    return {"discipline": req.discipline, "topic": req.topic, "quiz_content": ans}

@app.post("/api/exam/flashcards")
def generate_flashcards(req: ExamQuizRequest):
    prompt = f"Generate 6 formula and key principle revision flashcards for '{req.topic}' in {req.discipline.upper()}. Format each card with a [Card Front]: Concept / Formula Name and [Card Back]: Governing Equation, SI Units, and 1 Practical Rule."
    system_inst = "You are an engineering flashcard creator. Deliver dense, high-retention formulas and rules in clear flashcard format."
    ans = generate_ai_response(system_inst, [], prompt)
    return {"discipline": req.discipline, "topic": req.topic, "flashcards_content": ans}

