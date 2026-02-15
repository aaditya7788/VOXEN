// Email Service - Using Supabase Auth for email verification
// Supabase handles all email verification automatically
const supabaseClient = require('./supabaseClient');

/**
 * Send verification email using Supabase Auth
 * Supabase will automatically send a verification email with a confirmation link
 */
const sendVerificationEmail = async (email) => {
  try {
    // Call supabase to resend verification email
    const { error } = await supabaseClient.supabaseClient.auth.resend({
      type: 'signup',
      email: email
    });
    
    if (error) {
      throw new Error(`Failed to send verification email: ${error.message}`);
    }

    return {
      success: true,
      message: 'Verification email sent successfully',
      email
    };
  } catch (error) {
    console.error('Send verification email error:', error);
    throw error;
  }
};

/**
 * Resend verification email
 * Used when user requests a new verification email
 */
const resendVerificationEmail = async (email) => {
  return sendVerificationEmail(email);
};

module.exports = {
  sendVerificationEmail,
  resendVerificationEmail
};
