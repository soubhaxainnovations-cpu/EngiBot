import sys
import os
import unittest
import time
import base64

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import main as engibot_main
from fastapi import HTTPException

class TestEngiBotSecurity(unittest.TestCase):
    
    # -------------------------------------------------------------
    # Priority 1: Secure Password Hashing
    # -------------------------------------------------------------
    def test_password_hashing(self):
        password = "SecurePassword2026!"
        h1 = engibot_main.hash_password(password)
        h2 = engibot_main.hash_password(password)
        
        # Hashing format check
        self.assertTrue(h1.startswith("pbkdf2:sha256:260000$"))
        # Random salt check (two hashes of same password must differ)
        self.assertNotEqual(h1, h2)
        
        # Verification checks
        self.assertTrue(engibot_main.verify_password(password, h1))
        self.assertTrue(engibot_main.verify_password(password, h2))
        self.assertFalse(engibot_main.verify_password("WrongPassword!", h1))
        
        # Legacy plaintext compatibility and migration support
        self.assertTrue(engibot_main.verify_password("legacyPlain123", "legacyPlain123"))
        self.assertFalse(engibot_main.verify_password("WrongPlain", "legacyPlain123"))

    # -------------------------------------------------------------
    # Priority 2: Admin MFA & Removal of Hardcoded PIN
    # -------------------------------------------------------------
    def test_admin_mfa_no_hardcoded_pin(self):
        admin_email = "soubhaxainnovations@gmail.com"
        secret = engibot_main.get_admin_totp_secret(admin_email)
        
        # Valid TOTP rolling code should pass
        valid_totp = engibot_main.generate_totp(secret)
        self.assertTrue(engibot_main.verify_totp(valid_totp, secret))
        
        # Old hardcoded PIN 982461 must fail
        self.assertFalse(engibot_main.verify_totp("982461", secret))
        
        # Old hardcoded master keys must fail
        self.assertFalse(engibot_main.verify_totp("ENGIBOT-MFA-2026", secret))
        self.assertFalse(engibot_main.verify_totp("ENGIBOT-MFA-2026-ROOT", secret))

    # -------------------------------------------------------------
    # Priority 3: Authentication, Session Tokens & IDOR Protection
    # -------------------------------------------------------------
    def test_session_tokens_and_idor(self):
        user_id = 42
        username = "eng_student"
        token = engibot_main.generate_session_token(user_id, username)
        
        # Valid token extracts user id
        auth_uid = engibot_main.verify_session_token(token)
        self.assertEqual(auth_uid, user_id)
        
        # Tampered token fails
        tampered = token[:-4] + "AAAA"
        self.assertIsNone(engibot_main.verify_session_token(tampered))
        
        # IDOR check: Matching user passes
        self.assertTrue(engibot_main.verify_ownership(user_id, f"Bearer {token}"))
        
        # IDOR check: Mismatched user raises 403 Forbidden
        with self.assertRaises(HTTPException) as ctx:
            engibot_main.verify_ownership(999, f"Bearer {token}")
        self.assertEqual(ctx.exception.status_code, 403)
        
        # Forged token raises 401 Unauthorized
        with self.assertRaises(HTTPException) as ctx:
            engibot_main.verify_ownership(user_id, "Bearer forged_invalid_token")
        self.assertEqual(ctx.exception.status_code, 401)

    # -------------------------------------------------------------
    # Priority 4: CORS Configuration Whitelist
    # -------------------------------------------------------------
    def test_cors_whitelist(self):
        allowed = engibot_main.ALLOWED_ORIGINS
        self.assertIn("https://engibot.pages.dev", allowed)
        self.assertIn("https://engibot.vercel.app", allowed)
        self.assertNotIn("*", allowed)

    # -------------------------------------------------------------
    # Priority 6: OTP Hashing and Rate Limiting
    # -------------------------------------------------------------
    def test_otp_hashing_and_rate_limiting(self):
        code = "482910"
        hashed = engibot_main.hash_otp_code(code)
        
        # Hashed OTP verification
        self.assertTrue(engibot_main.verify_stored_otp(code, hashed))
        self.assertFalse(engibot_main.verify_stored_otp("000000", hashed))
        
        # Rate limiting on OTP send (max 3 requests)
        test_email = f"ratelimit_{int(time.time())}@example.com"
        for _ in range(3):
            engibot_main.check_otp_send_rate_limit(test_email)
            
        with self.assertRaises(HTTPException) as ctx:
            engibot_main.check_otp_send_rate_limit(test_email)
        self.assertEqual(ctx.exception.status_code, 429)

    # -------------------------------------------------------------
    # Priority 7: Secure File Uploads Validation
    # -------------------------------------------------------------
    def test_file_upload_security_filters(self):
        # 1. Reject prohibited executable extension (.exe)
        exe_req = engibot_main.UploadRequest(
            file_name="malware.exe",
            file_type="file",
            data_base64=base64.b64encode(b"MZtestexecutable").decode()
        )
        with self.assertRaises(HTTPException) as ctx:
            engibot_main.upload_file(exe_req)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("prohibited", ctx.exception.detail.lower())

        # 2. Reject mismatched magic bytes for image
        fake_png = engibot_main.UploadRequest(
            file_name="fake_graphic.png",
            file_type="image",
            data_base64=base64.b64encode(b"NotRealPngData").decode()
        )
        with self.assertRaises(HTTPException) as ctx:
            engibot_main.upload_file(fake_png)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("png", ctx.exception.detail.lower())

        # 3. Path traversal sanitization
        valid_png_header = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
        traversal_req = engibot_main.UploadRequest(
            file_name="../../etc/passwd.png",
            file_type="image",
            data_base64=base64.b64encode(valid_png_header).decode()
        )
        res = engibot_main.upload_file(traversal_req)
        self.assertEqual(res["status"], "success")
        # Ensure path traversal was stripped from file name
        self.assertNotIn("..", res["file_name"])
        self.assertNotIn("/", res["file_name"])
        self.assertNotIn("\\", res["file_name"])

if __name__ == "__main__":
    unittest.main()
