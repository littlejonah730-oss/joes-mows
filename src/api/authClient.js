import { supabase } from '@/lib/supabaseClient';

async function fetchProfile(userId) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return data;
}

export const auth = {
  async isAuthenticated() {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  },

  async me() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw error || new Error('Not authenticated');
    const profile = await fetchProfile(data.user.id);
    return {
      id: data.user.id,
      email: data.user.email,
      full_name: profile?.full_name || data.user.user_metadata?.full_name || '',
      role: profile?.role || 'user',
    };
  },

  async loginViaEmailPassword(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  async loginWithProvider(provider, redirectPath = '/') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}${redirectPath}` },
    });
    if (error) throw error;
  },

  async register({ email, password }) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  },

  async resendOtp(email) {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw error;
  },

  async verifyOtp({ email, otpCode }) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'signup' });
    if (error) throw error;
    return { access_token: data.session?.access_token };
  },

  // Supabase already establishes a recovery session from the emailed link
  // (detectSessionInUrl), so the token itself doesn't need to be replayed here.
  async resetPassword({ newPassword }) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  async resetPasswordRequest(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },

  // No-op: verifyOtp() above already leaves the Supabase client holding the
  // new session, so there's no separate token to store.
  setToken() {},

  async logout(redirectUrl) {
    await supabase.auth.signOut();
    if (redirectUrl) window.location.href = redirectUrl;
  },

  redirectToLogin(returnUrl) {
    const path = returnUrl ? `/login?returnTo=${encodeURIComponent(returnUrl)}` : '/login';
    window.location.href = path;
  },
};
