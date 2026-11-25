import React, { useState } from 'react'
import {
  X,
  Chrome,
  Mail,
  Lock,
  User,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Send,
  RotateCw,
  KeyRound
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

export default function AuthModal({ isOpen, onClose }) {
  const {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    checkEmailVerification,
    resendVerificationEmail,
    resetPassword
  } = useAuth()
  
  const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'verify' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [resendCooldown, setResendCooldown] = useState(false)

  if (!isOpen) return null

  const handleGoogleSignIn = async () => {
    setError('')
    setLoading(true)
    try {
      await signInWithGoogle()
      onClose()
    } catch (err) {
      setError(err.message || 'Google authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    
    if (mode === 'forgot') {
      if (!email) {
        setError('Please enter your email to receive a password reset link.')
        return
      }
      setLoading(true)
      try {
        await resetPassword(email)
        setSuccessMsg('Password reset email sent! Check your inbox.')
      } catch (err) {
        setError(err.message || 'Could not send reset email.')
      } finally {
        setLoading(false)
      }
      return
    }

    if (!email || !password) {
      setError('Please provide both email and password.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'signup') {
        const res = await signUpWithEmail(email, password, displayName)
        if (res.requiresVerification) {
          setMode('verify')
          setSuccessMsg(`We sent a verification email to ${email}. Please check your inbox or spam folder!`)
          setLoading(false)
          return
        }
      } else {
        const res = await signInWithEmail(email, password)
        if (res.requiresVerification) {
          setMode('verify')
          setError('Your email is not verified yet. Please click the link sent to your email.')
          setLoading(false)
          return
        }
      }
      onClose()
    } catch (err) {
      let msg = err.message || 'Authentication failed.'
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password.'
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists.'
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.'
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.'
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckVerified = async () => {
    setLoading(true)
    setError('')
    try {
      const isVerified = await checkEmailVerification()
      if (isVerified) {
        setSuccessMsg('Email verified successfully! Welcome.')
        setTimeout(() => {
          onClose()
        }, 600)
      } else {
        setError('Verification not detected yet. Please click the verification link in your email and try again.')
      }
    } catch (err) {
      setError(err.message || 'Could not check verification status.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown) return
    setError('')
    setSuccessMsg('')
    try {
      await resendVerificationEmail()
      setSuccessMsg('A new verification email has been sent!')
      setResendCooldown(true)
      setTimeout(() => setResendCooldown(false), 30000)
    } catch (err) {
      setError(err.message || 'Could not resend email. Please try again shortly.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="User Authentication"
    >
      <div className="w-full max-w-[440px] bg-white border border-[#E5E5E5] p-6 sm:p-8 relative shadow-2xl animate-fade rounded-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#6B6B6B] hover:text-[#0A0A0A] hover:bg-[#F5F5F5] rounded-full transition"
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3">
          <span className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center font-display font-bold text-lg">
            F
          </span>
          <div>
            <span className="mono text-[10px] tracking-widest text-[#6B6B6B] uppercase">Secure Access</span>
            <h2 className="font-display text-2xl font-bold text-[#0A0A0A]">
              {mode === 'verify'
                ? 'Verify Your Email'
                : mode === 'forgot'
                ? 'Reset Password'
                : mode === 'signup'
                ? 'Create Verified Account'
                : 'Account Sign In'}
            </h2>
          </div>
        </div>

        {/* VERIFICATION STATE */}
        {mode === 'verify' ? (
          <div className="mt-5 space-y-4 animate-fade">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
              <Mail className="mx-auto text-emerald-600 mb-2" size={32} />
              <p className="font-semibold text-sm text-emerald-900">
                Verification link sent to:
              </p>
              <p className="text-xs font-mono text-emerald-800 font-bold mt-0.5">{email}</p>
              <p className="text-xs text-emerald-700 mt-2 leading-relaxed">
                Click the confirmation link inside the email to authenticate your account and activate your Cloud Firestore storage.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              onClick={handleCheckVerified}
              disabled={loading}
              className="w-full bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 text-sm shadow-sm"
            >
              <RotateCw size={16} className={loading ? "animate-spin" : ""} />
              <span>{loading ? "Checking verification…" : "I Have Verified My Email"}</span>
            </button>

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown}
                className="text-[#6B6B6B] hover:text-[#0A0A0A] underline underline-offset-4 disabled:opacity-50"
              >
                {resendCooldown ? "Resend available in 30s" : "Resend verification email"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signin')
                  setError('')
                  setSuccessMsg('')
                }}
                className="text-[#0A0A0A] font-semibold hover:underline"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-[#6B6B6B] text-xs sm:text-sm mt-3 leading-relaxed">
              {mode === 'forgot'
                ? "Enter your registered email and we'll send you a password reset link."
                : mode === 'signup'
                ? 'Sign up with verified email authentication to save scans to Cloud Firestore.'
                : 'Sign in to access your personal diagnosis history and plant health scans.'}
            </p>

            {/* Google Sign-In (OTP & 2FA handled by Google Auth) */}
            {mode !== 'forgot' && (
              <div className="mt-5">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGoogleSignIn}
                  className="w-full bg-[#0A0A0A] text-white hover:bg-[#262626] font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-3 transition disabled:opacity-50 text-sm"
                >
                  <Chrome size={18} />
                  <span>Continue with Google</span>
                </button>

                <div className="flex items-center gap-3 my-4">
                  <span className="h-px bg-[#E5E5E5] flex-1" />
                  <span className="mono text-[10px] text-[#6B6B6B] uppercase tracking-wider">or with email</span>
                  <span className="h-px bg-[#E5E5E5] flex-1" />
                </div>
              </div>
            )}

            {/* Feedback messages */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Email Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'signup' && (
                <div>
                  <label className="block mono text-[11px] font-medium text-[#0A0A0A] mb-1">
                    Full Name / Grower Name
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B6B6B]" />
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A0A0A] transition"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block mono text-[11px] font-medium text-[#0A0A0A] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B6B6B]" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A0A0A] transition"
                  />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="mono text-[11px] font-medium text-[#0A0A0A]">
                      Password
                    </label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot')
                          setError('')
                          setSuccessMsg('')
                        }}
                        className="text-[11px] text-[#6B6B6B] hover:text-[#0A0A0A] underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B6B6B]" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl text-sm text-[#0A0A0A] focus:outline-none focus:border-[#0A0A0A] transition"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 text-sm shadow-sm"
              >
                {loading ? (
                  <span>Processing…</span>
                ) : mode === 'forgot' ? (
                  <>
                    <KeyRound size={16} />
                    <span>Send Password Reset Link</span>
                  </>
                ) : mode === 'signup' ? (
                  <>
                    <Send size={16} />
                    <span>Create Account & Send Verification Email</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
              {mode === 'forgot' ? (
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin')
                    setError('')
                    setSuccessMsg('')
                  }}
                  className="text-xs text-[#0A0A0A] font-semibold underline underline-offset-4"
                >
                  ← Back to Sign In
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'signin' ? 'signup' : 'signin')
                    setError('')
                    setSuccessMsg('')
                  }}
                  className="text-xs text-[#6B6B6B] hover:text-[#0A0A0A] transition underline underline-offset-4"
                >
                  {mode === 'signup'
                    ? 'Already have an account? Sign In'
                    : "Don't have an account yet? Sign Up with Email Verification"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
