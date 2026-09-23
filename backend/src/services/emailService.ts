import nodemailer, { Transporter } from 'nodemailer';
import { ENV } from '../config/env';

/**
 * 📧 Email Service for b.well Smart Healthcare
 * "Secure token-based email verification and password reset system with expiration and hashing."
 */

class EmailService {
  private transporter: Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    try {
      if (ENV.SMTP_USER && ENV.SMTP_PASS) {
        this.transporter = nodemailer.createTransport({
          host: ENV.SMTP_HOST,
          port: ENV.SMTP_PORT,
          secure: ENV.SMTP_PORT === 465,
          auth: {
            user: ENV.SMTP_USER,
            pass: ENV.SMTP_PASS,
          },
        });
      } else {
        // Fallback for development without real SMTP credentials configured
        this.transporter = null;
      }
    } catch (error) {
      console.warn('[EmailService] Failed to initialize SMTP transporter:', error);
      this.transporter = null;
    }
  }

  /**
   * Send Email Verification Link
   */
  public async sendVerificationEmail(
    toEmail: string,
    userName: string,
    rawToken: string
  ): Promise<{ success: boolean; previewLink?: string }> {
    const clientUrl = ENV.CLIENT_URL || 'http://localhost:5173';
    const verificationLink = `${clientUrl}/verify-email?token=${rawToken}`;

    const subject = 'Verify your email address - b.well Smart Healthcare';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
          .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
          .header { background: linear-gradient(135deg, #1e2e6e 0%, #2563eb 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
          .brand { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
          .content { padding: 32px 28px; line-height: 1.6; font-size: 14px; }
          .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 50px; font-weight: 700; font-size: 14px; margin: 20px 0; text-align: center; }
          .footer { background-color: #f1f5f9; padding: 20px; font-size: 12px; text-align: center; color: #64748b; border-top: 1px solid #e2e8f0; }
          .highlight-box { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 8px; margin: 16px 0; font-size: 13px; color: #1e3a8a; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div class="brand">b.well Healthcare</div>
            <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">Smart Healthcare & Emergency Network</p>
          </div>
          <div class="content">
            <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Welcome to b.well, ${userName}! 👋</h2>
            <p>Thank you for creating an account with b.well. Please confirm your email address to activate your healthcare profile and access doctor appointments, emergency ambulance dispatch, and hospital records.</p>
            
            <div style="text-align: center;">
              <a href="${verificationLink}" class="btn" target="_blank">Verify My Email Address</a>
            </div>

            <div class="highlight-box">
              ⏱️ <strong>Link Expiration:</strong> This verification link is valid for <strong>24 hours</strong>. For security, never share this link with anyone.
            </div>

            <p style="font-size: 12px; color: #64748b;">If the button above does not work, copy and paste this link into your browser:</p>
            <p style="font-size: 11px; word-break: break-all; color: #2563eb;">${verificationLink}</p>
          </div>
          <div class="footer">
            <p style="margin: 0;">© ${new Date().getFullYear()} b.well Smart Healthcare System. All rights reserved.</p>
            <p style="margin: 4px 0 0 0;">If you did not register for an account, please disregard this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log(`\n======================================================`);
    console.log(`✉️ [Email Verification Generated]`);
    console.log(`To: ${toEmail} (${userName})`);
    console.log(`Verification URL: ${verificationLink}`);
    console.log(`======================================================\n`);

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: ENV.EMAIL_FROM,
          to: toEmail,
          subject,
          html,
        });
        return { success: true, previewLink: verificationLink };
      } catch (err) {
        console.error('[EmailService] Error sending verification email:', err);
        return { success: false, previewLink: verificationLink };
      }
    }

    return { success: true, previewLink: verificationLink };
  }

  /**
   * Send Password Reset Link
   */
  public async sendPasswordResetEmail(
    toEmail: string,
    userName: string,
    rawToken: string
  ): Promise<{ success: boolean; previewLink?: string }> {
    const clientUrl = ENV.CLIENT_URL || 'http://localhost:5173';
    const resetLink = `${clientUrl}/reset-password?token=${rawToken}`;

    const subject = 'Reset your password - b.well Smart Healthcare';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Password</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a; }
          .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
          .header { background: linear-gradient(135deg, #1e2e6e 0%, #2563eb 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
          .brand { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
          .content { padding: 32px 28px; line-height: 1.6; font-size: 14px; }
          .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 50px; font-weight: 700; font-size: 14px; margin: 20px 0; text-align: center; }
          .footer { background-color: #f1f5f9; padding: 20px; font-size: 12px; text-align: center; color: #64748b; border-top: 1px solid #e2e8f0; }
          .warning-box { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 8px; margin: 16px 0; font-size: 13px; color: #991b1b; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div class="brand">b.well Healthcare</div>
            <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">Password Recovery Request</p>
          </div>
          <div class="content">
            <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Hello, ${userName}</h2>
            <p>We received a request to reset the password for your b.well Smart Healthcare account associated with <strong>${toEmail}</strong>.</p>
            
            <div style="text-align: center;">
              <a href="${resetLink}" class="btn" target="_blank">Reset My Password</a>
            </div>

            <div class="warning-box">
              ⏱️ <strong>Security Notice:</strong> This password reset link expires in <strong>30 minutes</strong>. If you did not request a password reset, you can safely ignore this email; your account remains secure.
            </div>

            <p style="font-size: 12px; color: #64748b;">If the button above does not work, copy and paste this link into your browser:</p>
            <p style="font-size: 11px; word-break: break-all; color: #2563eb;">${resetLink}</p>
          </div>
          <div class="footer">
            <p style="margin: 0;">© ${new Date().getFullYear()} b.well Smart Healthcare System. All rights reserved.</p>
            <p style="margin: 4px 0 0 0;">Secure token-based email verification and password reset system with expiration and hashing.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log(`\n======================================================`);
    console.log(`🔑 [Password Reset Link Generated]`);
    console.log(`To: ${toEmail} (${userName})`);
    console.log(`Reset URL: ${resetLink}`);
    console.log(`======================================================\n`);

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: ENV.EMAIL_FROM,
          to: toEmail,
          subject,
          html,
        });
        return { success: true, previewLink: resetLink };
      } catch (err) {
        console.error('[EmailService] Error sending password reset email:', err);
        return { success: false, previewLink: resetLink };
      }
    }

    return { success: true, previewLink: resetLink };
  }
}

export const emailService = new EmailService();
export default emailService;
