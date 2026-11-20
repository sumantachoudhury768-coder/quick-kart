import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  validateEmailFormat,
  validateEmailLogin,
  validateEmailRegistration,
} from '../utils/commerce';

export function AuthModal() {
  const {
    authModalOpen,
    authModalView,
    closeAuthModal,
    setAuthModalView,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    resetPassword,
  } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authModalOpen) {
      setFieldErrors({});
      setFormError('');
      setResetSent(false);
      setPassword('');
      setConfirmPassword('');
    }
  }, [authModalOpen]);

  useEffect(() => {
    setFieldErrors({});
    setFormError('');
    setResetSent(false);
  }, [authModalView]);

  if (!authModalOpen) return null;

  const handleGoogleSignIn = async () => {
    setFormError('');
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const errors = validateEmailLogin(email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await signInWithEmail(email, password);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const errors = validateEmailRegistration(fullName, email, password, confirmPassword);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await registerWithEmail(fullName, email, password);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!email.trim() || !validateEmailFormat(email)) {
      setFieldErrors({ email: 'Please enter a valid email address.' });
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to send password reset email.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {authModalView !== 'options' && (
              <button
                type="button"
                onClick={() =>
                  setAuthModalView(
                    authModalView === 'email-login' ? 'options' : 'email-login'
                  )
                }
                aria-label="Go back"
                className="p-1.5 -ml-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h2 id="auth-modal-title" className="font-display text-lg font-semibold text-slate-900">
              {authModalView === 'options' && 'Sign in to QuickKart'}
              {authModalView === 'email-login' && 'Sign in with Email'}
              {authModalView === 'email-register' && 'Create your QuickKart account'}
              {authModalView === 'forgot-password' && 'Reset your password'}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeAuthModal}
            aria-label="Close sign-in dialog"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          {formError && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" aria-hidden="true" />
              <span>{formError}</span>
            </div>
          )}

          {authModalView === 'options' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Access your saved hostel or home addresses, track live grocery deliveries, and checkout faster.
              </p>

              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleGoogleSignIn}
                  className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-60 transition-colors"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
                  ) : (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  )}
                  <span>Continue with Google</span>
                </button>

                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-slate-200" />
                  <span className="mx-3 text-xs font-medium text-slate-400">or</span>
                  <div className="flex-grow border-t border-slate-200" />
                </div>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setAuthModalView('email-login')}
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:opacity-60 transition-colors"
                >
                  <Mail className="h-4 w-4" aria-hidden="true" />
                  <span>Continue with Email</span>
                </button>
              </div>

              <p className="text-center text-xs text-slate-500 pt-2">
                New to QuickKart?{' '}
                <button
                  type="button"
                  onClick={() => setAuthModalView('email-register')}
                  className="font-semibold text-emerald-700 hover:text-emerald-800 underline underline-offset-2"
                >
                  Create an account
                </button>
              </p>
            </div>
          )}

          {authModalView === 'email-login' && (
            <form onSubmit={handleEmailLogin} className="space-y-4" noValidate>
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email address
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setAuthModalView('forgot-password')}
                    className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 transition-colors"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign In
              </button>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-600">
                <span>Don&apos;t have an account?</span>
                <button
                  type="button"
                  onClick={() => setAuthModalView('email-register')}
                  className="font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  Create Account
                </button>
              </div>
            </form>
          )}

          {authModalView === 'email-register' && (
            <form onSubmit={handleEmailRegister} className="space-y-3.5" noValidate>
              <div>
                <label htmlFor="register-name" className="block text-sm font-medium text-slate-700 mb-1">
                  Full name
                </label>
                <input
                  id="register-name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                />
                {fieldErrors.name && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="register-email" className="block text-sm font-medium text-slate-700 mb-1">
                  Email address
                </label>
                <input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="register-password" className="block text-sm font-medium text-slate-700 mb-1">
                  Create password
                </label>
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                />
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
                )}
              </div>

              <div>
                <label htmlFor="register-confirm" className="block text-sm font-medium text-slate-700 mb-1">
                  Confirm password
                </label>
                <input
                  id="register-confirm"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                />
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 transition-colors mt-1"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Account
              </button>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-600">
                <span>Already have an account?</span>
                <button
                  type="button"
                  onClick={() => setAuthModalView('email-login')}
                  className="font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {authModalView === 'forgot-password' && (
            <form onSubmit={handleForgotPassword} className="space-y-4" noValidate>
              {resetSent ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 space-y-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    <span>Password reset link sent</span>
                  </div>
                  <p className="text-emerald-800 text-xs leading-relaxed">
                    Check <span className="font-medium">{email}</span> for instructions to reset your QuickKart password.
                  </p>
                  <button
                    type="button"
                    onClick={() => setAuthModalView('email-login')}
                    className="mt-2 inline-flex text-xs font-semibold text-emerald-800 underline underline-offset-2"
                  >
                    Return to Sign In
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Enter your registered email address and we will send you a secure password reset link via Firebase Authentication.
                  </p>
                  <div>
                    <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Email address
                    </label>
                    <input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
                    />
                    {fieldErrors.email && (
                      <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 transition-colors"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Send Reset Link
                  </button>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
