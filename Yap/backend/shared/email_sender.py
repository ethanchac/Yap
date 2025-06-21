import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
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
    #this is the message of the email with all the styling. Had to AI all this
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