// Supabase Client - For email authentication and other operations
const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

// Initialize Supabase client
const supabaseClient = createClient(
  config.supabase.url,
  config.supabase.anonKey
);

// Admin client (if needed for advanced operations)
// Note: Use with caution - contains admin privileges
let adminClient = null;

const initializeAdminClient = (serviceKey) => {
  if (serviceKey && config.supabase.url) {
    adminClient = createClient(
      config.supabase.url,
      serviceKey
    );
  }
};

// Export clients and helper functions
module.exports = {
  supabaseClient,
  getAdminClient: () => adminClient,
  initializeAdminClient,
  
  // Helper method to send verification email via Supabase Auth
  sendVerificationEmail: async (email, emailActionLink) => {
    try {
      const { data, error } = await supabaseClient.auth.admin.createUser({
        email,
        email_confirm: false
      });
      
      if (error) throw error;
      return { success: true, user: data.user };
    } catch (error) {
      throw new Error(`Failed to send verification email: ${error.message}`);
    }
  },

  // Verify email by confirming the OTP/magic link
  confirmEmail: async (token) => {
    try {
      const { data, error } = await supabaseClient.auth.verifyOtp({
        type: 'email',
        token,
        email: undefined // Supabase will handle this
      });
      
      if (error) throw error;
      return { success: true, session: data.session };
    } catch (error) {
      throw new Error(`Failed to verify email: ${error.message}`);
    }
  },

  // Resend verification email
  resendVerificationEmail: async (email) => {
    try {
      const { data, error } = await supabaseClient.auth.resend({
        type: 'signup',
        email
      });
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to resend verification email: ${error.message}`);
    }
  }
};
