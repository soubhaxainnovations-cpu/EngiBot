"""
Data Migration Tool: SQLite (chatbot.db) -> PostgreSQL
Transfers all existing users, chat history, and OTP records into PostgreSQL
and automatically updates primary key sequences.
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

# Load environment
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

def run_migration():
    # Source: SQLite
    sqlite_path = Path(__file__).parent / "chatbot.db"
    if not sqlite_path.exists():
        print(f"[ERROR] Source SQLite database not found at: {sqlite_path}")
        sys.exit(1)

    SQLITE_URL = f"sqlite:///{sqlite_path}"
    source_engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
    SourceSession = sessionmaker(bind=source_engine)

    # Target: PostgreSQL
    raw_target_url = os.getenv("DATABASE_URL", "").strip()

    if not raw_target_url and os.getenv("POSTGRES_DB"):
        pg_user = os.getenv("POSTGRES_USER", "postgres")
        pg_password = os.getenv("POSTGRES_PASSWORD", "")
        pg_host = os.getenv("POSTGRES_HOST", "localhost")
        pg_port = os.getenv("POSTGRES_PORT", "5432")
        pg_db = os.getenv("POSTGRES_DB", "engibot")
        auth_part = f"{pg_user}:{pg_password}@" if pg_password else f"{pg_user}@"
        raw_target_url = f"postgresql://{auth_part}{pg_host}:{pg_port}/{pg_db}"

    if not raw_target_url or raw_target_url.startswith("sqlite"):
        print("=" * 60)
        print(" PostgreSQL Migration: Target Database Needed")
        print("=" * 60)
        print("DATABASE_URL is not set in backend/.env")
        print("Example: postgresql://postgres:password@localhost:5432/engibot")
        print("Or Supabase/Neon: postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require")
        print("-" * 60)
        raw_target_url = input("Enter target PostgreSQL URL (or press Enter to cancel): ").strip()

    if not raw_target_url:
        print("Migration canceled.")
        sys.exit(0)

    if raw_target_url.startswith("postgres://"):
        raw_target_url = raw_target_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif raw_target_url.startswith("postgresql://") and not raw_target_url.startswith("postgresql+"):
        raw_target_url = raw_target_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    import re
    raw_target_url = re.sub(r'[?&]pgbouncer=[^&]*', '', raw_target_url)
    if raw_target_url.endswith("?") or raw_target_url.endswith("&"):
        raw_target_url = raw_target_url[:-1]
    if "pooler.supabase.com" in raw_target_url or "supabase.co" in raw_target_url:
        if "sslmode=" not in raw_target_url:
            separator = "&" if "?" in raw_target_url else "?"
            raw_target_url = f"{raw_target_url}{separator}sslmode=require"

    print(f"\n[INFO] Connecting to target PostgreSQL...")
    try:
        target_engine = create_engine(raw_target_url, pool_pre_ping=True)
        with target_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("[SUCCESS] Connected to PostgreSQL!")
    except Exception as e:
        print(f"[ERROR] Failed to connect to PostgreSQL: {e}")
        sys.exit(1)

    # Import models from main.py to create schema
    try:
        from main import Base, User, ChatMessage, EmailOTP, Conversation
        Base.metadata.create_all(bind=target_engine)
        print("[SUCCESS] Verified/created tables (users, conversations, messages, email_otps) in PostgreSQL.")
    except Exception as e:
        print(f"[ERROR] Failed to create tables in PostgreSQL: {e}")
        sys.exit(1)

    TargetSession = sessionmaker(bind=target_engine)
    source_db = SourceSession()
    target_db = TargetSession()

    try:
        # 1. Migrate Users
        users = source_db.query(User).all()
        migrated_users = 0
        for u in users:
            existing = target_db.query(User).filter(
                (User.id == u.id) | (User.username == u.username)
            ).first()
            if not existing:
                new_u = User(
                    id=u.id,
                    name=u.name,
                    dob=u.dob,
                    phone_number=u.phone_number,
                    email=u.email,
                    username=u.username,
                    password=u.password
                )
                target_db.add(new_u)
                migrated_users += 1
        target_db.commit()
        print(f"[MIGRATION] Migrated {migrated_users}/{len(users)} users.")

        # 2. Migrate Conversations
        convs = source_db.query(Conversation).all()
        migrated_convs = 0
        for c in convs:
            existing_c = target_db.query(Conversation).filter(Conversation.id == c.id).first()
            if not existing_c:
                new_c = Conversation(
                    id=c.id,
                    user_id=c.user_id,
                    title=c.title,
                    discipline=c.discipline,
                    created_at=c.created_at,
                    updated_at=c.updated_at
                )
                target_db.add(new_c)
                migrated_convs += 1
        target_db.commit()
        print(f"[MIGRATION] Migrated {migrated_convs}/{len(convs)} conversations.")

        # 3. Migrate Chat Messages
        messages = source_db.query(ChatMessage).all()
        migrated_messages = 0
        for m in messages:
            existing_msg = target_db.query(ChatMessage).filter(ChatMessage.id == m.id).first()
            if not existing_msg:
                new_m = ChatMessage(
                    id=m.id,
                    user_id=m.user_id,
                    conversation_id=m.conversation_id,
                    role=m.role,
                    content=m.content,
                    discipline=m.discipline,
                    timestamp=m.timestamp,
                    attachment_url=getattr(m, 'attachment_url', None),
                    attachment_type=getattr(m, 'attachment_type', None),
                    file_name=getattr(m, 'file_name', None),
                    file_size=getattr(m, 'file_size', None)
                )
                target_db.add(new_m)
                migrated_messages += 1
        target_db.commit()
        print(f"[MIGRATION] Migrated {migrated_messages}/{len(messages)} chat messages.")

        # 4. Migrate Email OTPs
        otps = source_db.query(EmailOTP).all()
        migrated_otps = 0
        for o in otps:
            existing_otp = target_db.query(EmailOTP).filter(EmailOTP.id == o.id).first()
            if not existing_otp:
                new_o = EmailOTP(
                    id=o.id,
                    email=o.email,
                    otp_code=o.otp_code,
                    created_at=o.created_at,
                    expires_at=o.expires_at,
                    is_used=o.is_used
                )
                target_db.add(new_o)
                migrated_otps += 1
        target_db.commit()
        print(f"[MIGRATION] Migrated {migrated_otps}/{len(otps)} OTP records.")

        # 5. Reset PostgreSQL Auto-Increment Sequences
        tables = ["users", "conversations", "messages", "email_otps"]
        with target_engine.begin() as conn:
            for tbl in tables:
                try:
                    conn.execute(text(f"""
                        SELECT setval(
                            pg_get_serial_sequence('{tbl}', 'id'),
                            COALESCE((SELECT MAX(id) FROM {tbl}), 1)
                        );
                    """))
                except Exception as seq_err:
                    print(f"[WARNING] Sequence reset for {tbl}: {seq_err}")

        print("\n" + "=" * 60)
        print(" [COMPLETED] Database migration to PostgreSQL succeeded!")
        print("=" * 60)

    except Exception as err:
        target_db.rollback()
        print(f"\n[ERROR] Migration failed: {err}")
    finally:
        source_db.close()
        target_db.close()

if __name__ == "__main__":
    run_migration()

