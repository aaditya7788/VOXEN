const nodemailer = require('nodemailer');

// Initialize Nodemailer transporter with AWS SES
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Send a professional OTP email
 */
const sendOTPEmail = async (email, otp, name = 'User') => {
  try {
    const mailOptions = {
      from: `"Voxen Support" <${process.env.SMTP_FROM}>`,
      to: email,
      subject: `Your Verification Code: ${otp} - Voxen`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
          <div style="background: linear-gradient(135deg, #1a1a1a 0%, #333333 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; letter-spacing: 2px;">VOXEN</h1>
          </div>
          <div style="padding: 40px 30px; background-color: #ffffff;">
            <h2 style="color: #333; margin-top: 0;">Verify Your Email</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Hello ${name},</p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Use the following code to complete your verification process. This code is valid for 10 minutes.</p>
            
            <div style="margin: 35px 0; text-align: center;">
              <span style="background-color: #f4f7ff; border: 2px dashed #4f46e5; color: #4f46e5; padding: 15px 30px; font-size: 32px; font-weight: bold; letter-spacing: 8px; border-radius: 8px; display: inline-block;">
                ${otp}
              </span>
            </div>
            
            <p style="color: #999; font-size: 14px; margin-top: 30px;">If you didn't request this code, you can safely ignore this email.</p>
          </div>
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
            <p style="color: #999; font-size: 12px; margin: 0;">&copy; 2026 Voxen Platform. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `Your Voxen verification code is: ${otp}`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Send OTP email error:', error);
    throw new Error('Failed to send verification email');
  }
};

/**
 * Custom email sender for general notifications
 */
const sendCustomEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: `"Voxen" <${process.env.SMTP_FROM}>`,
      to,
      subject,
      html
    };
    return await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Send custom email error:', error);
    throw error;
  }
};

module.exports = {
  sendOTPEmail,
  sendCustomEmail
};
