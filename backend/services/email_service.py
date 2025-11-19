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

    def _create_budget_alert_html(self, user_name: str, budget_data: dict) -> str:
        """Create HTML content for budget alert email."""
        category = budget_data.get('category', 'Unknown')
        spent = budget_data.get('spent', 0)
        budget_amount = budget_data.get('budget_amount', 0)
        percentage = budget_data.get('percentage', 0)
        remaining = budget_amount - spent
        # warning, danger, exceeded
        alert_type = budget_data.get('alert_type', 'warning')

        # Determine colors and messaging based on alert type
        if alert_type == 'exceeded':
            header_color = '#dc2626'  # red
            alert_emoji = '🚨'
            alert_title = 'Budget Exceeded!'
            alert_message = f'You have exceeded your {category} budget by ${abs(remaining):.2f}'
            status_color = '#fee2e2'
            status_text_color = '#991b1b'
        elif alert_type == 'danger':
            header_color = '#ea580c'  # orange
            alert_emoji = '⚠️'
            alert_title = 'Budget Alert - 90% Reached'
            alert_message = f'You\'re very close to your {category} budget limit'
            status_color = '#fed7aa'
            status_text_color = '#9a3412'
        else:  # warning
            header_color = '#eab308'  # yellow
            alert_emoji = '💡'
            alert_title = 'Budget Alert - 80% Reached'
            alert_message = f'You\'ve used 80% of your {category} budget'
            status_color = '#fef3c7'
            status_text_color = '#92400e'

        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Budget Alert - {category}</title>
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
                    background: linear-gradient(135deg, {header_color} 0%, #1f2937 100%);
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
                    background: linear-gradient(135deg, {header_color} 0%, #1f2937 100%);
                    padding: 40px 30px;
                    text-align: center;
                    position: relative;
                    overflow: hidden;
                }}

                .alert-icon {{
                    font-size: 64px;
                    margin-bottom: 20px;
                    animation: pulse 2s ease-in-out infinite;
                }}

                @keyframes pulse {{
                    0%, 100% {{ transform: scale(1); }}
                    50% {{ transform: scale(1.1); }}
                }}

                .alert-title {{
                    color: white;
                    font-size: 28px;
                    font-weight: 700;
                    margin: 15px 0 5px 0;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                }}

                .alert-subtitle {{
                    color: rgba(255, 255, 255, 0.9);
                    font-size: 16px;
                    font-weight: 400;
                    margin: 0;
                }}

                .content {{
                    padding: 40px;
                    background: white;
                }}

                .greeting {{
                    font-size: 18px;
                    font-weight: 500;
                    color: #374151;
                    margin-bottom: 25px;
                }}

                .alert-message {{
                    color: #4b5563;
                    font-size: 16px;
                    line-height: 1.7;
                    margin-bottom: 30px;
                    text-align: center;
                    background: {status_color};
                    color: {status_text_color};
                    padding: 20px;
                    border-radius: 12px;
                    font-weight: 500;
                }}

                .budget-stats {{
                    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                    border-radius: 15px;
                    padding: 30px;
                    margin: 30px 0;
                    border-left: 4px solid {header_color};
                }}

                .budget-category {{
                    font-size: 20px;
                    font-weight: 600;
                    color: #1f2937;
                    margin-bottom: 20px;
                    text-align: center;
                }}

                .stats-grid {{
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 20px;
                    margin-bottom: 25px;
                }}

                .stat-item {{
                    text-align: center;
                    padding: 15px;
                    background: white;
                    border-radius: 10px;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                }}

                .stat-value {{
                    font-size: 24px;
                    font-weight: 700;
                    color: #1f2937;
                    margin-bottom: 5px;
                }}

                .stat-label {{
                    font-size: 12px;
                    color: #6b7280;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }}

                .progress-container {{
                    margin: 20px 0;
                }}

                .progress-label {{
                    display: flex;
                    justify-content: between;
                    margin-bottom: 8px;
                    font-size: 14px;
                    color: #374151;
                }}

                .progress-bar {{
                    width: 100%;
                    height: 12px;
                    background: #e5e7eb;
                    border-radius: 6px;
                    overflow: hidden;
                }}

                .progress-fill {{
                    height: 100%;
                    background: linear-gradient(90deg, {header_color}, #1f2937);
                    border-radius: 6px;
                    width: {min(percentage, 100)}%;
                    transition: width 0.3s ease;
                }}

                .progress-text {{
                    text-align: center;
                    margin-top: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    color: {status_text_color};
                }}

                .recommendations {{
                    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                    border-radius: 12px;
                    padding: 25px;
                    margin: 25px 0;
                    border-left: 4px solid #3b82f6;
                }}

                .recommendations-title {{
                    font-size: 16px;
                    font-weight: 600;
                    color: #1f2937;
                    margin-bottom: 15px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }}

                .recommendations-list {{
                    list-style: none;
                    padding: 0;
                }}

                .recommendations-list li {{
                    color: #4b5563;
                    font-size: 14px;
                    margin-bottom: 8px;
                    padding-left: 20px;
                    position: relative;
                }}

                .recommendations-list li::before {{
                    content: '💡';
                    position: absolute;
                    left: 0;
                    top: 0;
                }}

                .cta-container {{
                    text-align: center;
                    margin: 30px 0;
                }}

                .cta-button {{
                    display: inline-block;
                    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                    color: white;
                    text-decoration: none;
                    padding: 15px 30px;
                    border-radius: 10px;
                    font-weight: 600;
                    font-size: 14px;
                    box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
                    transition: all 0.3s ease;
                }}

                .cta-button:hover {{
                    transform: translateY(-2px);
                    box-shadow: 0 12px 25px rgba(59, 130, 246, 0.4);
                }}

                .footer {{
                    background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
                    padding: 30px;
                    text-align: center;
                    color: #9ca3af;
                }}

                .footer-text {{
                    font-size: 14px;
                    line-height: 1.6;
                }}

                @media (max-width: 600px) {{
                    body {{ padding: 10px; }}
                    .content {{ padding: 25px 20px; }}
                    .header {{ padding: 30px 20px; }}
                    .stats-grid {{ grid-template-columns: 1fr; }}
                }}
            </style>
        </head>
        <body>
            <div class="email-wrapper">
                <div class="header">
                    <div class="alert-icon">{alert_emoji}</div>
                    <h1 class="alert-title">{alert_title}</h1>
                    <p class="alert-subtitle">Budgetly Alert System</p>
                </div>

                <div class="content">
                    <div class="greeting">
                        Hello {user_name or "there"}! 👋
                    </div>

                    <div class="alert-message">
                        {alert_message}
                    </div>

                    <div class="budget-stats">
                        <div class="budget-category">{category} Budget</div>

                        <div class="stats-grid">
                            <div class="stat-item">
                                <div class="stat-value">${spent:.2f}</div>
                                <div class="stat-label">Spent</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">${budget_amount:.2f}</div>
                                <div class="stat-label">Budget</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">${abs(remaining):.2f}</div>
                                <div class="stat-label">{'Over' if remaining < 0 else 'Remaining'}</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-value">{percentage:.1f}%</div>
                                <div class="stat-label">Used</div>
                            </div>
                        </div>

                        <div class="progress-container">
                            <div class="progress-bar">
                                <div class="progress-fill"></div>
                            </div>
                            <div class="progress-text">
                                {percentage:.1f}% of budget used
                            </div>
                        </div>
                    </div>

                    <div class="recommendations">
                        <div class="recommendations-title">
                            💡 Smart Recommendations
                        </div>
                        <ul class="recommendations-list">
                            {'<li>Consider reducing spending in this category for the rest of the period</li>' if alert_type !=
                             'exceeded' else '<li>Review your recent expenses to identify areas for adjustment</li>'}
                            <li>Set up spending alerts for smaller amounts to catch overspending earlier</li>
                            <li>Review and adjust your budget if your spending patterns have changed</li>
                            {'<li>Consider creating a separate emergency fund for unexpected expenses</li>' if alert_type ==
                             'exceeded' else '<li>Track daily spending to stay within your remaining budget</li>'}
                        </ul>
                    </div>

                    <div class="cta-container">
                        <a href="{self.frontend_url}/budget" class="cta-button">
                            📊 View Budget Details
                        </a>
                    </div>
                </div>

                <div class="footer">
                    <div class="footer-text">
                        Stay on track with Budgetly's smart budget alerts<br>
                        © 2025 Budgetly. All rights reserved.
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        return html_content

    async def send_budget_alert_email(self, to_email: str, user_name: str, budget_data: dict) -> bool:
        """Send budget alert email to user."""
        if not self.is_configured:
            logger.warning(
                "Email service not configured. Cannot send budget alert email.")
            # Log the alert for development
            category = budget_data.get('category', 'Unknown')
            percentage = budget_data.get('percentage', 0)
            alert_type = budget_data.get('alert_type', 'warning')
            print(f"\n🚨 Budget Alert for {to_email}:")
            print(f"   Category: {category}")
            print(f"   Usage: {percentage:.1f}%")
            print(f"   Alert Type: {alert_type}")
            print(f"   (Email would be sent if SMTP was configured)\n")
            return False

        try:
            category = budget_data.get('category', 'Unknown')
            percentage = budget_data.get('percentage', 0)
            alert_type = budget_data.get('alert_type', 'warning')

            # Determine subject based on alert type
            if alert_type == 'exceeded':
                subject = f"🚨 Budget Exceeded: {category} - Budgetly Alert"
            elif alert_type == 'danger':
                subject = f"⚠️ Budget Alert: {category} at {percentage:.0f}% - Budgetly"
            else:
                subject = f"💡 Budget Alert: {category} at {percentage:.0f}% - Budgetly"

            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email

            # Create text version
            spent = budget_data.get('spent', 0)
            budget_amount = budget_data.get('budget_amount', 0)
            remaining = budget_amount - spent

            text_content = f"""
Hello {user_name or "there"},

Budget Alert: {category}

You've used {percentage:.1f}% of your {category} budget.

Budget Details:
• Spent: ${spent:.2f}
• Budget: ${budget_amount:.2f}
• {'Remaining' if remaining >= 0 else 'Over by'}: ${abs(remaining):.2f}

{'⚠️ You have exceeded your budget limit!' if alert_type ==
                'exceeded' else '💡 Consider monitoring your spending in this category.'}

View your budget details: {self.frontend_url}/budget

Best regards,
The Budgetly Team

© 2025 Budgetly. All rights reserved.
            """

            html_content = self._create_budget_alert_html(
                user_name, budget_data)

            # Attach parts
            text_part = MIMEText(text_content, "plain")
            html_part = MIMEText(html_content, "html")

            message.attach(text_part)
            message.attach(html_part)

            # Send email
            with self._create_smtp_connection() as server:
                server.send_message(message)

            logger.info(
                f"Budget alert email sent successfully to {to_email} for {category} budget")
            return True

        except Exception as e:
            logger.error(
                f"Failed to send budget alert email to {to_email}: {str(e)}")
            return False

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

    async def send_data_export_email(self, to_email: str, user_name: str, zip_data: bytes, filename: str,
                                     expense_count: int, budget_count: int, income_count: int) -> bool:
        """Send data export email with ZIP attachment."""
        if not self.is_configured:
            logger.error(
                "Email service not configured. Cannot send data export email.")
            print(f"\n📦 Data Export for {to_email}:")
            print(f"   Filename: {filename}")
            print(f"   Size: {len(zip_data)} bytes")
            print(
                f"   Contents: {expense_count} expenses, {budget_count} budgets, {income_count} income records\n")
            return False

        try:
            from email.mime.base import MIMEBase
            from email import encoders

            # Create message
            message = MIMEMultipart()
            message["Subject"] = "Your Budgetly Data Export"
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email

            # Create HTML content
            html_content = f"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Your Data Export - Budgetly</title>
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
                        margin-bottom: 20px;
                    }}
                    
                    .brand-name {{
                        color: white;
                        font-size: 28px;
                        font-weight: 700;
                        margin: 15px 0 5px 0;
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
                        margin-bottom: 15px;
                    }}
                    
                    .subtitle {{
                        text-align: center;
                        color: #6b7280;
                        font-size: 16px;
                        margin-bottom: 30px;
                    }}
                    
                    .greeting {{
                        font-size: 18px;
                        font-weight: 500;
                        color: #374151;
                        margin-bottom: 20px;
                    }}
                    
                    .message {{
                        color: #4b5563;
                        font-size: 16px;
                        line-height: 1.7;
                        margin-bottom: 30px;
                    }}
                    
                    .stats-grid {{
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 15px;
                        margin: 30px 0;
                    }}
                    
                    .stat-card {{
                        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                        border-radius: 12px;
                        padding: 20px;
                        text-align: center;
                    }}
                    
                    .stat-number {{
                        font-size: 24px;
                        font-weight: 700;
                        color: #3b82f6;
                        margin-bottom: 5px;
                    }}
                    
                    .stat-label {{
                        font-size: 12px;
                        color: #6b7280;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }}
                    
                    .info-card {{
                        background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                        border-left: 4px solid #3b82f6;
                        border-radius: 8px;
                        padding: 20px;
                        margin: 25px 0;
                    }}
                    
                    .info-card-title {{
                        font-weight: 600;
                        color: #1f2937;
                        margin-bottom: 8px;
                    }}
                    
                    .info-card-text {{
                        color: #4b5563;
                        font-size: 14px;
                        line-height: 1.6;
                    }}
                    
                    .attachment-box {{
                        background: #f9fafb;
                        border: 2px dashed #d1d5db;
                        border-radius: 12px;
                        padding: 25px;
                        text-align: center;
                        margin: 25px 0;
                    }}
                    
                    .attachment-icon {{
                        font-size: 48px;
                        margin-bottom: 15px;
                    }}
                    
                    .attachment-name {{
                        font-weight: 600;
                        color: #1f2937;
                        margin-bottom: 5px;
                    }}
                    
                    .attachment-size {{
                        color: #6b7280;
                        font-size: 14px;
                    }}
                    
                    .footer {{
                        background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
                        padding: 40px;
                        text-align: center;
                        color: #9ca3af;
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
                </style>
            </head>
            <body>
                <div class="email-wrapper">
                    <div class="header">
                        <div class="logo">💰</div>
                        <h1 class="brand-name">Budgetly</h1>
                    </div>
                    
                    <div class="content">
                        <h2 class="title">Your Data Export is Ready</h2>
                        <p class="subtitle">All your financial data in one place</p>
                        
                        <div class="greeting">
                            Hello {user_name or "there"} 👋
                        </div>
                        
                        <div class="message">
                            Your data export has been completed successfully! You'll find a ZIP file attached to this email containing all your financial information from Budgetly. This export was processed within minutes of your request.
                        </div>
                        
                        <div class="stats-grid">
                            <div class="stat-card">
                                <div class="stat-number">{expense_count}</div>
                                <div class="stat-label">Expenses</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-number">{budget_count}</div>
                                <div class="stat-label">Budgets</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-number">{income_count}</div>
                                <div class="stat-label">Income</div>
                            </div>
                        </div>
                        
                        <div class="attachment-box">
                            <div class="attachment-icon">📦</div>
                            <div class="attachment-name">{filename}</div>
                            <div class="attachment-size">{len(zip_data) / 1024:.1f} KB</div>
                        </div>
                        
                        <div class="info-card">
                            <div class="info-card-title">📋 What's Included</div>
                            <div class="info-card-text">
                                Your export contains:
                                <ul style="margin: 10px 0 0 20px; padding: 0;">
                                    <li>All expense records with details</li>
                                    <li>Budget configurations and tracking</li>
                                    <li>Income records and sources</li>
                                    <li>Account settings and preferences</li>
                                    <li>Export summary with statistics</li>
                                </ul>
                            </div>
                        </div>
                        
                        <div class="info-card">
                            <div class="info-card-title">🔒 Privacy & Security</div>
                            <div class="info-card-text">
                                Your data is exported in JSON format for easy reading and portability. 
                                Please store this file securely as it contains your personal financial information.
                            </div>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <div class="footer-text">
                            This email was sent by Budgetly<br>
                            Questions? We're here to help!
                        </div>
                        <div class="footer-copyright">
                            © 2025 Budgetly by Lumen Grove Analytics. All rights reserved.
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """

            # Create text version
            text_content = f"""
Hello {user_name or "there"},

Your data export from Budgetly is ready!

Export Summary:
- {expense_count} Expenses
- {budget_count} Budgets
- {income_count} Income Records

The attached ZIP file ({filename}) contains all your financial data in JSON format.

What's Included:
- All expense records with details
- Budget configurations and tracking
- Income records and sources
- Account settings and preferences
- Export summary with statistics

Please store this file securely as it contains your personal financial information.

Best regards,
The Budgetly Team

---
© 2025 Budgetly. All rights reserved.
            """

            # Attach parts
            text_part = MIMEText(text_content, "plain")
            html_part = MIMEText(html_content, "html")
            message.attach(text_part)
            message.attach(html_part)

            # Attach ZIP file
            attachment = MIMEBase("application", "zip")
            attachment.set_payload(zip_data)
            encoders.encode_base64(attachment)
            attachment.add_header(
                "Content-Disposition",
                f"attachment; filename={filename}"
            )
            message.attach(attachment)

            # Send email
            with self._create_smtp_connection() as server:
                server.send_message(message)

            logger.info(f"Data export email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(
                f"Failed to send data export email to {to_email}: {str(e)}")
            print(f"\n❌ Email sending failed for {to_email}:")
            print(f"   Error: {str(e)}")
            print(f"   Data export was prepared but not delivered\n")
            return False


# Create global instance
email_service = EmailService()
