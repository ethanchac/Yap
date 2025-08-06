import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL")

def send_verification_email(to_email: str, code: str) -> bool:
    """Send verification email and return success status"""
    print(f"[DEBUG] Sending FROM: {FROM_EMAIL}")
    print(f"[DEBUG] Sending TO: {to_email}")
    print(f"[DEBUG] API Key: {SENDGRID_API_KEY[:10]}...")

    if not SENDGRID_API_KEY or not FROM_EMAIL:
        print("[ERROR] SendGrid not configured properly")
        return False
    
    message = Mail(
        from_email=FROM_EMAIL,
        to_emails=to_email,
        subject="Your TMU Yapp Verification Code",
        html_content=f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #003c71; color: white; padding: 20px; text-align: center;">
                <h1>TMU Yapp</h1>
                <p>Email Verification</p>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
                <h2>Verify Your TMU Email</h2>
                <p>Welcome to TMU Yapp! Please enter this verification code to complete your registration:</p>
                
                <div style="background: white; padding: 20px; border: 2px solid #003c71; text-align: center; margin: 20px 0; border-radius: 8px;">
                    <h1 style="color: #003c71; font-size: 32px; margin: 0; letter-spacing: 4px;">{code}</h1>
                </div>
                
                <p><strong>This code will expire in 10 minutes.</strong></p>
                <p>If you didn't create an account, please ignore this email.</p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                <p style="color: #666; font-size: 12px; text-align: center;">
                    TMU Yapp - Toronto Metropolitan University Student Platform
                </p>
            </div>
        </div>
        """
    )

    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        
        print(f"[INFO] Verification email sent to {to_email}")
        print(f"[DEBUG] SendGrid response: {response.status_code}")
        print(f"[DEBUG] Response Status: {response.status_code}")
        print(f"[DEBUG] Response Body: {response.body}")
        print(f"[DEBUG] Response Headers: {response.headers}")
        
        return response.status_code in [200, 201, 202]
        
    except Exception as e:
        print(f"[ERROR] Exception details: {e}")
        print(f"[ERROR] Exception type: {type(e)}")
        return False

def send_password_reset_email(to_email: str, code: str) -> bool:
    """Send password reset email and return success status"""
    print(f"[DEBUG] Sending password reset FROM: {FROM_EMAIL}")
    print(f"[DEBUG] Sending password reset TO: {to_email}")
    print(f"[DEBUG] API Key: {SENDGRID_API_KEY[:10]}...")

    if not SENDGRID_API_KEY or not FROM_EMAIL:
        print("[ERROR] SendGrid not configured properly")
        return False
    
    message = Mail(
        from_email=FROM_EMAIL,
        to_emails=to_email,
        subject="TMU Yapp Password Reset Code",
        html_content=f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #003c71; color: white; padding: 20px; text-align: center;">
                <h1>TMU Yapp</h1>
                <p>Password Reset</p>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
                <h2>Reset Your Password</h2>
                <p>You requested to reset your password for TMU Yapp. Please enter this verification code to proceed:</p>
                
                <div style="background: white; padding: 20px; border: 2px solid #003c71; text-align: center; margin: 20px 0; border-radius: 8px;">
                    <h1 style="color: #003c71; font-size: 32px; margin: 0; letter-spacing: 4px;">{code}</h1>
                </div>
                
                <p><strong>This code will expire in 10 minutes.</strong></p>
                <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                <p style="color: #666; font-size: 12px; text-align: center;">
                    TMU Yapp - Toronto Metropolitan University Student Platform
                </p>
            </div>
        </div>
        """
    )

    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        
        print(f"[INFO] Password reset email sent to {to_email}")
        print(f"[DEBUG] SendGrid response: {response.status_code}")
        print(f"[DEBUG] Response Status: {response.status_code}")
        print(f"[DEBUG] Response Body: {response.body}")
        print(f"[DEBUG] Response Headers: {response.headers}")
        
        return response.status_code in [200, 201, 202]
        
    except Exception as e:
        print(f"[ERROR] Exception details: {e}")
        print(f"[ERROR] Exception type: {type(e)}")
        return False

def send_feedback_email(feedback_data):
    """Send feedback notification email to yappTMU@gmail.com yessir"""
    print(f"[DEBUG] Sending feedback notification FROM: {FROM_EMAIL}")
    print(f"[DEBUG] Sending feedback notification TO: yappTMU@gmail.com")
    print(f"[DEBUG] API Key: {SENDGRID_API_KEY[:10]}...")

    if not SENDGRID_API_KEY or not FROM_EMAIL:
        print("[ERROR] SendGrid not configured properly")
        return False
    
    # Format the feedback type
    feedback_type_map = {
        'general': 'General Feedback',
        'bug': 'Bug Report',
        'feature': 'Feature Request'
    }
    
    feedback_type_display = feedback_type_map.get(feedback_data.get('type', 'general'), 'General Feedback')
    
    # Create star rating display
    rating = feedback_data.get('rating', 0)
    star_rating = '⭐' * rating + '☆' * (5 - rating) if rating > 0 else 'No rating provided'
    
    # Format submission time
    created_at = feedback_data.get('created_at', datetime.utcnow())
    formatted_date = created_at.strftime('%B %d, %Y at %I:%M %p UTC')
    
    # Email subject
    subject = f"New {feedback_type_display}: {feedback_data.get('subject', 'No Subject')}"
    
    message = Mail(
        from_email=FROM_EMAIL,
        to_emails="yappTMU@gmail.com",
        subject=subject,
        html_content=f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #003c71; color: white; padding: 20px; text-align: center;">
                <h1>🎯 TMU Yapp</h1>
                <p>New Feedback Received</p>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
                <h2>Feedback Details</h2>
                
                <div style="background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #003c71;">
                    <p style="margin: 5px 0; font-weight: bold; color: #555;">📅 Submitted:</p>
                    <p style="margin: 5px 0 15px 0;">{formatted_date}</p>
                </div>
                
                <div style="background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #003c71;">
                    <p style="margin: 5px 0; font-weight: bold; color: #555;">📋 Type:</p>
                    <p style="margin: 5px 0 15px 0;">{feedback_type_display}</p>
                </div>
                
                <div style="background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #003c71;">
                    <p style="margin: 5px 0; font-weight: bold; color: #555;">⭐ Rating:</p>
                    <p style="margin: 5px 0 15px 0; font-size: 18px;">{star_rating}</p>
                </div>
                
                <div style="background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #003c71;">
                    <p style="margin: 5px 0; font-weight: bold; color: #555;">📝 Subject:</p>
                    <p style="margin: 5px 0 15px 0;">{feedback_data.get('subject', 'No subject provided')}</p>
                </div>
                
                <div style="background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #003c71;">
                    <p style="margin: 5px 0; font-weight: bold; color: #555;">💬 Message:</p>
                    <p style="margin: 5px 0 15px 0; white-space: pre-wrap;">{feedback_data.get('message', 'No message provided')}</p>
                </div>
                
                <div style="background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #003c71;">
                    <p style="margin: 5px 0; font-weight: bold; color: #555;">📧 User Email:</p>
                    <p style="margin: 5px 0 15px 0;">{feedback_data.get('email', 'Not provided')}</p>
                </div>
                
                <div style="background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #003c71;">
                    <p style="margin: 5px 0; font-weight: bold; color: #555;">👤 User ID:</p>
                    <p style="margin: 5px 0 15px 0;">{feedback_data.get('user_id', 'Not available')}</p>
                </div>
                
                <div style="background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #003c71;">
                    <p style="margin: 5px 0; font-weight: bold; color: #555;">🆔 Feedback ID:</p>
                    <p style="margin: 5px 0 15px 0;">{feedback_data.get('feedback_id', 'Not available')}</p>
                </div>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                <p style="color: #666; font-size: 12px; text-align: center;">
                    This email was automatically generated by the TMU Yapp feedback system.<br>
                    Please do not reply to this email.
                </p>
            </div>
        </div>
        """
    )

    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        
        print(f"[INFO] Feedback email sent to yappTMU@gmail.com")
        print(f"[DEBUG] SendGrid response: {response.status_code}")
        print(f"[DEBUG] Response Status: {response.status_code}")
        print(f"[DEBUG] Response Body: {response.body}")
        print(f"[DEBUG] Response Headers: {response.headers}")
        
        return response.status_code in [200, 201, 202]
        
    except Exception as e:
        print(f"[ERROR] Exception details: {e}")
        print(f"[ERROR] Exception type: {type(e)}")
        return False

def send_feedback_confirmation_email(to_email: str, feedback_data) -> bool:
    """Send confirmation email to the user who submitted feedback"""
    print(f"[DEBUG] Sending feedback confirmation FROM: {FROM_EMAIL}")
    print(f"[DEBUG] Sending feedback confirmation TO: {to_email}")
    print(f"[DEBUG] API Key: {SENDGRID_API_KEY[:10]}...")

    if not SENDGRID_API_KEY or not FROM_EMAIL:
        print("[ERROR] SendGrid not configured properly")
        return False
    
    if not to_email:
        print("[INFO] No user email provided, skipping confirmation email")
        return True  # Not an error, just skip
    
    message = Mail(
        from_email=FROM_EMAIL,
        to_emails=to_email,
        subject="Thank you for your feedback - TMU Yapp",
        html_content=f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #003c71; color: white; padding: 20px; text-align: center;">
                <h1>TMU Yapp</h1>
                <p>Feedback Received</p>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
                <div style="text-align: center; padding: 20px;">
                    <h2 style="color: #003c71;">🎉 Thank You for Your Feedback!</h2>
                    <p style="font-size: 16px; margin: 20px 0;">Your feedback has been received successfully!</p>
                    
                    <div style="background: white; padding: 20px; border: 2px solid #003c71; text-align: left; margin: 20px 0; border-radius: 8px;">
                        <p style="margin: 5px 0; font-weight: bold;">Subject:</p>
                        <p style="margin: 5px 0 15px 0;">{feedback_data.get('subject', 'No subject')}</p>
                    </div>
                    
                    <p style="color: #555; line-height: 1.6;">
                        We appreciate you taking the time to help us improve TMU Yapp. 
                        Your input helps us build a better experience for everyone.
                    </p>
                    
                    <p style="color: #555; line-height: 1.6;">
                        Our team will review your feedback and work on improvements. 
                        If needed, we may reach out for follow-up questions.
                    </p>
                </div>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                <p style="color: #666; font-size: 12px; text-align: center;">
                    Best regards,<br>
                    The TMU Yapp Team<br>
                    Toronto Metropolitan University Student Platform
                </p>
            </div>
        </div>
        """
    )

    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        
        print(f"[INFO] Feedback confirmation email sent to {to_email}")
        print(f"[DEBUG] SendGrid response: {response.status_code}")
        print(f"[DEBUG] Response Status: {response.status_code}")
        print(f"[DEBUG] Response Body: {response.body}")
        print(f"[DEBUG] Response Headers: {response.headers}")
        
        return response.status_code in [200, 201, 202]
        
    except Exception as e:
        print(f"[ERROR] Exception details: {e}")
        print(f"[ERROR] Exception type: {type(e)}")
        return False