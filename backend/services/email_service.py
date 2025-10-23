"""Email service for sending password reset and other emails."""

import os
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        # Email configuration from environment variables
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", self.smtp_username)
        self.from_name = os.getenv("FROM_NAME", "Budgetly")
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

        # Check if SSL should be used instead of TLS
        self.use_ssl = os.getenv("SMTP_USE_SSL", "false").lower() == "true"

        # Check if email is configured
        self.is_configured = bool(self.smtp_username and self.smtp_password)

        if not self.is_configured:
            logger.warning(
                "Email service not configured. Set SMTP_USERNAME and SMTP_PASSWORD environment variables.")

    def _create_smtp_connection(self):
        """Create and return SMTP connection."""
        context = ssl.create_default_context()

        if self.use_ssl:
            # Use SMTP_SSL for port 465
            server = smtplib.SMTP_SSL(
                self.smtp_server, self.smtp_port, context=context)
        else:
            # Use SMTP with STARTTLS for port 587
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls(context=context)

        server.login(self.smtp_username, self.smtp_password)
        return server

    def _create_password_reset_html(self, user_name: str, reset_token: str) -> str:
        """Create HTML content for password reset email."""
        reset_url = f"{self.frontend_url}/reset-password?token={reset_token}"

        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password - Budgetly</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                
                * {{
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }}
                
                body {{
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6;
                    color: #1f2937;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    padding: 20px;
                }}
                
                .email-wrapper {{
                    max-width: 600px;
                    margin: 0 auto;
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(10px);
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
                }}
                
                .header {{
                    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #7c3aed 100%);
                    padding: 40px 30px;
                    text-align: center;
                    position: relative;
                    overflow: hidden;
                }}
                
                .header::before {{
                    content: '';
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                    animation: float 6s ease-in-out infinite;
                }}
                
                @keyframes float {{
                    0%, 100% {{ transform: translateY(0px) rotate(0deg); }}
                    50% {{ transform: translateY(-20px) rotate(180deg); }}
                }}
                
                .logo-container {{
                    position: relative;
                    z-index: 2;
                    margin-bottom: 20px;
                }}
                
                .logo {{
                    width: 80px;
                    height: 80px;
                    background: rgba(255, 255, 255, 0.2);
                    border: 2px solid rgba(255, 255, 255, 0.3);
                    border-radius: 20px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 32px;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                }}
                
                .brand-name {{
                    color: white;
                    font-size: 28px;
                    font-weight: 700;
                    margin: 15px 0 5px 0;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }}
                
                .tagline {{
                    color: rgba(255, 255, 255, 0.9);
                    font-size: 16px;
                    font-weight: 400;
                    margin: 0;
                }}
                
                .content {{
                    padding: 50px 40px;
                    background: white;
                }}
                
                .title {{
                    font-size: 32px;
                    font-weight: 700;
                    color: #1f2937;
                    text-align: center;
                    margin-bottom: 15px;
                    background: linear-gradient(135deg, #3b82f6, #7c3aed);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }}
                
                .subtitle {{
                    text-align: center;
                    color: #6b7280;
                    font-size: 18px;
                    margin-bottom: 40px;
                    font-weight: 400;
                }}
                
                .greeting {{
                    font-size: 18px;
                    font-weight: 500;
                    color: #374151;
                    margin-bottom: 25px;
                }}
                
                .message {{
                    color: #4b5563;
                    font-size: 16px;
                    line-height: 1.7;
                    margin-bottom: 35px;
                }}
                
                .cta-container {{
                    text-align: center;
                    margin: 40px 0;
                }}
                
                .cta-button {{
                    display: inline-block;
                    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #7c3aed 100%);
                    color: white;
                    text-decoration: none;
                    padding: 18px 40px;
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 16px;
                    box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
                    transition: all 0.3s ease;
                    position: relative;
                    overflow: hidden;
                }}
                
                .cta-button::before {{
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                    transition: left 0.5s;
                }}
                
                .cta-button:hover::before {{
                    left: 100%;
                }}
                
                .cta-button:hover {{
                    transform: translateY(-2px);
                    box-shadow: 0 15px 35px rgba(59, 130, 246, 0.4);
                }}
                
                .info-card {{
                    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                    border-left: 4px solid #3b82f6;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 30px 0;
                }}
                
                .info-card-title {{
                    font-weight: 600;
                    color: #1f2937;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }}
                
                .info-card-text {{
                    color: #4b5563;
                    font-size: 14px;
                    line-height: 1.6;
                }}
                
                .security-badge {{
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                    padding: 12px 20px;
                    border-radius: 25px;
                    font-size: 14px;
                    font-weight: 500;
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    margin: 20px 0;
                }}
                
                .alternative-link {{
                    background: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 25px 0;
                    font-size: 14px;
                }}
                
                .alternative-link-title {{
                    font-weight: 600;
                    color: #374151;
                    margin-bottom: 8px;
                }}
                
                .alternative-link a {{
                    color: #3b82f6;
                    word-break: break-all;
                    text-decoration: none;
                }}
                
                .footer {{
                    background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
                    padding: 40px;
                    text-align: center;
                    color: #9ca3af;
                }}
                
                .footer-logo {{
                    width: 50px;
                    height: 50px;
                    background: linear-gradient(135deg, #3b82f6, #7c3aed);
                    border-radius: 12px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 20px;
                    font-size: 20px;
                }}
                
                .footer-text {{
                    font-size: 14px;
                    line-height: 1.6;
                    margin-bottom: 15px;
                }}
                
                .footer-copyright {{
                    font-size: 12px;
                    color: #6b7280;
                    border-top: 1px solid #374151;
                    padding-top: 20px;
                    margin-top: 20px;
                }}
                
                .social-links {{
                    margin: 20px 0;
                }}
                
                .social-links a {{
                    display: inline-block;
                    width: 40px;
                    height: 40px;
                    background: rgba(59, 130, 246, 0.1);
                    border-radius: 8px;
                    margin: 0 5px;
                    text-decoration: none;
                    color: #3b82f6;
                    line-height: 40px;
                    transition: all 0.3s ease;
                }}
                
                .social-links a:hover {{
                    background: #3b82f6;
                    color: white;
                    transform: translateY(-2px);
                }}
                
                @media (max-width: 600px) {{
                    body {{ padding: 10px; }}
                    .content {{ padding: 30px 20px; }}
                    .header {{ padding: 30px 20px; }}
                    .title {{ font-size: 24px; }}
                    .cta-button {{ padding: 16px 30px; }}
                }}
            </style>
        </head>
        <body>
            <div class="email-wrapper">
                <div class="header">
                    <div class="logo-container">
                        <div class="logo">💰</div>
                    </div>
                    <h1 class="brand-name">Budgetly</h1>
                    <p class="tagline">AI-Powered Financial Management</p>
                </div>
                
                <div class="content">
                    <h2 class="title">Password Reset</h2>
                    <p class="subtitle">Secure your account with a new password</p>
                    
                    <div class="greeting">
                        Hello {user_name or "there"} 👋
                    </div>
                    
                    <div class="message">
                        We received a request to reset your password for your Budgetly account. 
                        No worries, it happens to the best of us! Click the button below to create a new, secure password.
                    </div>
                    
                    <div class="cta-container">
                        <a href="{reset_url}" class="cta-button">
                            🔐 Reset My Password
                        </a>
                    </div>
                    
                    <div class="security-badge">
                        ⏰ Expires in 1 hour for your security
                    </div>
                    
                    <div class="info-card">
                        <div class="info-card-title">
                            🔒 Security First
                        </div>
                        <div class="info-card-text">
                            If you didn't request this password reset, please ignore this email. 
                            Your account remains completely secure and no changes have been made.
                        </div>
                    </div>
                    
                    <div class="alternative-link">
                        <div class="alternative-link-title">Button not working?</div>
                        Copy and paste this link into your browser:<br>
                        <a href="{reset_url}">{reset_url}</a>
                    </div>
                </div>
                
                <div class="footer">
                    <div class="footer-logo">💰</div>
                    <div class="footer-text">
                        This email was sent by Budgetly<br>
                        Questions? We're here to help!
                    </div>
                    <div class="social-links">
                        <a href="#" title="Support">📧</a>
                        <a href="#" title="Help">❓</a>
                        <a href="#" title="Security">🛡️</a>
                    </div>
                    <div class="footer-copyright">
                        © 2025 Budgetly by Lumen Grove Analytics. All rights reserved.
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        return html_content

    def _create_password_reset_text(self, user_name: str, reset_token: str) -> str:
        """Create plain text content for password reset email."""
        reset_url = f"{self.frontend_url}/reset-password?token={reset_token}"

        text_content = f"""
Hello {user_name or "there"},

We received a request to reset your password for your Budgetly account.

If you made this request, click the link below to create a new password:
{reset_url}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email. 
Your account remains secure and no changes have been made.

Best regards,
The Budgetly Team

---
© 2025 Budgetly. All rights reserved.
        """
        return text_content.strip()

    async def send_password_reset_email(self, to_email: str, reset_token: str, user_name: str = "") -> bool:
        """Send password reset email to user."""
        if not self.is_configured:
            logger.error(
                "Email service not configured. Cannot send password reset email.")
            # In development, log the reset URL
            reset_url = f"{self.frontend_url}/reset-password?token={reset_token}"
            print(f"\n🔗 Password Reset Link for {to_email}:")
            print(f"   {reset_url}")
            print(f"   (This link expires in 1 hour)\n")
            return False

        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = "Reset Your Budgetly Password"
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email

            # Create text and HTML versions
            text_content = self._create_password_reset_text(
                user_name, reset_token)
            html_content = self._create_password_reset_html(
                user_name, reset_token)

            # Attach parts
            text_part = MIMEText(text_content, "plain")
            html_part = MIMEText(html_content, "html")

            message.attach(text_part)
            message.attach(html_part)

            # Send email
            with self._create_smtp_connection() as server:
                server.send_message(message)

            logger.info(
                f"Password reset email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(
                f"Failed to send password reset email to {to_email}: {str(e)}")
            # Fallback: log the reset URL for development
            reset_url = f"{self.frontend_url}/reset-password?token={reset_token}"
            print(
                f"\n❌ Email sending failed, but here's the reset link for {to_email}:")
            print(f"   {reset_url}")
            print(f"   (This link expires in 1 hour)\n")
            return False

    def _create_welcome_email_html(self, user_name: str) -> str:
        """Create HTML content for welcome email."""
        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Budgetly!</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
                
                * {{
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }}
                
                body {{
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6;
                    color: #1f2937;
                    background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
                    min-height: 100vh;
                    padding: 20px;
                }}
                
                .email-wrapper {{
                    max-width: 600px;
                    margin: 0 auto;
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(10px);
                    border-radius: 20px;
                    overflow: hidden;
                    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
                }}
                
                .header {{
                    background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
                    padding: 50px 30px;
                    text-align: center;
                    position: relative;
                    overflow: hidden;
                }}
                
                .header::before {{
                    content: '';
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                    animation: celebrate 8s ease-in-out infinite;
                }}
                
                @keyframes celebrate {{
                    0%, 100% {{ transform: translateY(0px) rotate(0deg) scale(1); }}
                    25% {{ transform: translateY(-10px) rotate(90deg) scale(1.1); }}
                    50% {{ transform: translateY(-20px) rotate(180deg) scale(1); }}
                    75% {{ transform: translateY(-10px) rotate(270deg) scale(1.1); }}
                }}
                
                .logo-container {{
                    position: relative;
                    z-index: 2;
                    margin-bottom: 25px;
                }}
                
                .logo {{
                    width: 100px;
                    height: 100px;
                    background: rgba(255, 255, 255, 0.2);
                    border: 3px solid rgba(255, 255, 255, 0.3);
                    border-radius: 25px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 40px;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                    animation: bounce 2s ease-in-out infinite;
                }}
                
                @keyframes bounce {{
                    0%, 20%, 50%, 80%, 100% {{ transform: translateY(0); }}
                    40% {{ transform: translateY(-10px); }}
                    60% {{ transform: translateY(-5px); }}
                }}
                
                .welcome-text {{
                    color: white;
                    font-size: 36px;
                    font-weight: 700;
                    margin: 20px 0 10px 0;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }}
                
                .brand-name {{
                    color: rgba(255, 255, 255, 0.95);
                    font-size: 24px;
                    font-weight: 600;
                    margin: 0;
                }}
                
                .content {{
                    padding: 50px 40px;
                    background: white;
                }}
                
                .title {{
                    font-size: 28px;
                    font-weight: 700;
                    color: #1f2937;
                    text-align: center;
                    margin-bottom: 20px;
                }}
                
                .greeting {{
                    font-size: 20px;
                    font-weight: 500;
                    color: #374151;
                    margin-bottom: 30px;
                    text-align: center;
                }}
                
                .message {{
                    color: #4b5563;
                    font-size: 16px;
                    line-height: 1.8;
                    margin-bottom: 35px;
                    text-align: center;
                }}
                
                .features-grid {{
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 25px;
                    margin: 40px 0;
                }}
                
                .feature-card {{
                    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                    border-radius: 15px;
                    padding: 25px;
                    text-align: center;
                    border: 1px solid #e5e7eb;
                    transition: all 0.3s ease;
                }}
                
                .feature-card:hover {{
                    transform: translateY(-5px);
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                }}
                
                .feature-icon {{
                    font-size: 32px;
                    margin-bottom: 15px;
                    display: block;
                }}
                
                .feature-title {{
                    font-size: 16px;
                    font-weight: 600;
                    color: #1f2937;
                    margin-bottom: 8px;
                }}
                
                .feature-desc {{
                    font-size: 14px;
                    color: #6b7280;
                    line-height: 1.5;
                }}
                
                .cta-container {{
                    text-align: center;
                    margin: 40px 0;
                }}
                
                .cta-button {{
                    display: inline-block;
                    background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
                    color: white;
                    text-decoration: none;
                    padding: 18px 40px;
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 16px;
                    box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
                    transition: all 0.3s ease;
                    position: relative;
                    overflow: hidden;
                }}
                
                .cta-button::before {{
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                    transition: left 0.5s;
                }}
                
                .cta-button:hover::before {{
                    left: 100%;
                }}
                
                .cta-button:hover {{
                    transform: translateY(-2px);
                    box-shadow: 0 15px 35px rgba(16, 185, 129, 0.4);
                }}
                
                .tips-section {{
                    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                    border-radius: 15px;
                    padding: 30px;
                    margin: 30px 0;
                    border-left: 4px solid #3b82f6;
                }}
                
                .tips-title {{
                    font-size: 18px;
                    font-weight: 600;
                    color: #1f2937;
                    margin-bottom: 15px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }}
                
                .tips-list {{
                    list-style: none;
                    padding: 0;
                }}
                
                .tips-list li {{
                    color: #4b5563;
                    font-size: 14px;
                    margin-bottom: 8px;
                    padding-left: 25px;
                    position: relative;
                }}
                
                .tips-list li::before {{
                    content: '✨';
                    position: absolute;
                    left: 0;
                    top: 0;
                }}
                
                .footer {{
                    background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
                    padding: 40px;
                    text-align: center;
                    color: #9ca3af;
                }}
                
                .footer-logo {{
                    width: 50px;
                    height: 50px;
                    background: linear-gradient(135deg, #10b981, #047857);
                    border-radius: 12px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 20px;
                    font-size: 20px;
                }}
                
                .footer-text {{
                    font-size: 14px;
                    line-height: 1.6;
                    margin-bottom: 15px;
                }}
                
                .footer-copyright {{
                    font-size: 12px;
                    color: #6b7280;
                    border-top: 1px solid #374151;
                    padding-top: 20px;
                    margin-top: 20px;
                }}
                
                @media (max-width: 600px) {{
                    body {{ padding: 10px; }}
                    .content {{ padding: 30px 20px; }}
                    .header {{ padding: 40px 20px; }}
                    .welcome-text {{ font-size: 28px; }}
                    .features-grid {{ grid-template-columns: 1fr; }}
                }}
            </style>
        </head>
        <body>
            <div class="email-wrapper">
                <div class="header">
                    <div class="logo-container">
                        <div class="logo">🎉</div>
                    </div>
                    <h1 class="welcome-text">Welcome!</h1>
                    <p class="brand-name">You're now part of Budgetly</p>
                </div>
                
                <div class="content">
                    <h2 class="title">Your Financial Journey Starts Here</h2>
                    
                    <div class="greeting">
                        Hello {user_name}! 👋
                    </div>
                    
                    <div class="message">
                        Congratulations on taking the first step towards better financial management! 
                        Your Budgetly account is ready, and we're excited to help you achieve your financial goals.
                    </div>
                    
                    <div class="features-grid">
                        <div class="feature-card">
                            <span class="feature-icon">📊</span>
                            <div class="feature-title">Track Expenses</div>
                            <div class="feature-desc">Monitor your spending with smart categorization</div>
                        </div>
                        <div class="feature-card">
                            <span class="feature-icon">🎯</span>
                            <div class="feature-title">Set Budgets</div>
                            <div class="feature-desc">Create realistic budgets and stay on track</div>
                        </div>
                        <div class="feature-card">
                            <span class="feature-icon">💡</span>
                            <div class="feature-title">AI Insights</div>
                            <div class="feature-desc">Get personalized financial recommendations</div>
                        </div>
                        <div class="feature-card">
                            <span class="feature-icon">📈</span>
                            <div class="feature-title">Track Income</div>
                            <div class="feature-desc">Record and analyze your income sources</div>
                        </div>
                    </div>
                    
                    <div class="cta-container">
                        <a href="{self.frontend_url}/dashboard" class="cta-button">
                            🚀 Start Managing Your Finances
                        </a>
                    </div>
                    
                    <div class="tips-section">
                        <div class="tips-title">
                            💡 Quick Tips to Get Started
                        </div>
                        <ul class="tips-list">
                            <li>Add your first expense to see how easy tracking can be</li>
                            <li>Set up budgets for your main spending categories</li>
                            <li>Record your income sources for a complete financial picture</li>
                            <li>Check your dashboard regularly for insights and alerts</li>
                        </ul>
                    </div>
                </div>
                
                <div class="footer">
                    <div class="footer-logo">💰</div>
                    <div class="footer-text">
                        Welcome to the Budgetly family!<br>
                        Need help? We're here for you every step of the way.
                    </div>
                    <div class="footer-copyright">
                        © 2025 Budgetly by Lumen Grove Analytics. All rights reserved.
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        return html_content

    async def send_welcome_email(self, to_email: str, user_name: str) -> bool:
        """Send welcome email to new user."""
        if not self.is_configured:
            logger.warning(
                "Email service not configured. Cannot send welcome email.")
            return False

        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = "🎉 Welcome to Budgetly - Your Financial Journey Begins!"
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email

            # Enhanced welcome message
            text_content = f"""
Hello {user_name}!

🎉 Welcome to Budgetly! Your account has been created successfully.

Your financial journey starts here! With Budgetly, you can:
• Track expenses with smart categorization
• Set and monitor budgets
• Record income sources
• Get AI-powered financial insights

Ready to take control of your finances? Visit: {self.frontend_url}/dashboard

Quick Tips to Get Started:
✨ Add your first expense to see how easy tracking can be
✨ Set up budgets for your main spending categories  
✨ Record your income sources for a complete picture
✨ Check your dashboard regularly for insights

Need help? We're here for you every step of the way.

Best regards,
The Budgetly Team

© 2025 Budgetly by Lumen Grove Analytics. All rights reserved.
            """

            html_content = self._create_welcome_email_html(user_name)

            # Attach parts
            text_part = MIMEText(text_content, "plain")
            html_part = MIMEText(html_content, "html")

            message.attach(text_part)
            message.attach(html_part)

            # Send email
            with self._create_smtp_connection() as server:
                server.send_message(message)

            logger.info(f"Welcome email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(
                f"Failed to send welcome email to {to_email}: {str(e)}")
            return False


# Create global instance
email_service = EmailService()
