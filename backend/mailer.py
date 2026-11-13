import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent / ".env"

def get_smtp_config():
    """Reloads .env dynamically to ensure updated credentials are always used."""
    if env_path.exists():
        load_dotenv(dotenv_path=env_path, override=True)
    else:
        load_dotenv(override=True)

    host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
    port = int(os.getenv("SMTP_PORT", "587").strip() or 587)
    user = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASSWORD", "").strip()
    from_name = os.getenv("SMTP_FROM_NAME", "EngiBot Assistant").strip()
    from_email = os.getenv("SMTP_FROM_EMAIL", user).strip() or user

    return {
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "from_name": from_name,
        "from_email": from_email,
    }


def is_smtp_configured() -> bool:
    """Check if SMTP credentials are fully provided."""
    config = get_smtp_config()
    user = config["user"]
    password = config["password"]
    placeholder_values = ["", "your_email@gmail.com", "youremail@gmail.com", "user@example.com"]
    return bool(user and password and user not in placeholder_values)


def create_otp_html(otp_code: str, recipient_email: str) -> str:
    """Generate a clean, responsive HTML email template for OTP."""
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your EngiBot Login OTP</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 30px 15px;">
            <tr>
                <td align="center">
                    <table role="presentation" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden;">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 32px 24px; text-align: center; color: #ffffff;">
                                <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">EngiBot</h1>
                                <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">Engineering Knowledge & AI Assistant</p>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 32px 28px;">
                                <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 600; color: #0f172a;">Your Login Verification Code</h2>
                                <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.5; color: #475569;">
                                    Hello, <br>
                                    Use the 6-digit One-Time Password (OTP) below to securely log into your EngiBot account associated with <strong>{recipient_email}</strong>.
                                </p>
                                
                                <!-- OTP Badge -->
                                <div style="background-color: #eff6ff; border: 2px dashed #3b82f6; border-radius: 12px; padding: 20px 10px; text-align: center; margin: 24px 0;">
                                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8; display: inline-block;">
                                        {otp_code}
                                    </span>
                                </div>
                                
                                <p style="margin: 0 0 16px; font-size: 14px; color: #64748b; line-height: 1.5;">
                                    ⏱ This code will expire in <strong>10 minutes</strong>.
                                </p>
                                <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">
                                    If you did not request this login code, you can safely disregard this email. Your account remains secure.
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f1f5f9; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                                <p style="margin: 0; font-size: 12px; color: #64748b;">
                                    © EngiBot • AI Engineering Workspace
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


def send_otp_email(recipient_email: str, otp_code: str) -> dict:
    """
    Sends the OTP code directly to recipient_email via SMTP.
    Does NOT return or expose the OTP in the output.
    """
    email_clean = recipient_email.strip().lower()
    config = get_smtp_config()

    if not is_smtp_configured():
        error_msg = (
            "SMTP sender email is not configured. "
            "Please configure SMTP_USER and SMTP_PASSWORD in backend/.env to deliver OTPs to user mail IDs."
        )
        print(f"[ENGIBOT EMAIL ERROR] {error_msg}")
        return {
            "sent": False,
            "error": error_msg
        }

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Your EngiBot Login OTP: {otp_code}"
        msg["From"] = f"{config['from_name']} <{config['from_email']}>"
        msg["To"] = email_clean

        # Plaintext version
        plain_text = (
            f"Your EngiBot Verification Code is: {otp_code}\n\n"
            f"This code expires in 10 minutes.\n"
            f"If you did not request this code, please ignore this email."
        )

        # HTML version
        html_content = create_otp_html(otp_code, email_clean)

        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        # Connect and send
        if config["port"] == 465:
            server = smtplib.SMTP_SSL(config["host"], config["port"], timeout=15)
        else:
            server = smtplib.SMTP(config["host"], config["port"], timeout=15)
            server.ehlo()
            server.starttls()
            server.ehlo()

        server.login(config["user"], config["password"])
        server.sendmail(config["from_email"], [email_clean], msg.as_string())
        server.quit()

        print(f"[ENGIBOT EMAIL SERVICE] Live OTP email successfully sent to {email_clean}")
        return {
            "sent": True,
            "message": f"Verification code successfully sent to {email_clean}. Please check your inbox."
        }

    except Exception as e:
        error_msg = f"Failed to send email to {email_clean}: {str(e)}"
        print(f"[ENGIBOT EMAIL SERVICE ERROR] {error_msg}")
        return {
            "sent": False,
            "error": error_msg
        }
