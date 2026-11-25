import React from 'react'
import { Lock, LogIn, Mail, RefreshCw, Send, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

export default function ProtectedRoute({ children, onOpenLogin, fallbackTitle = "Protected Section" }) {
  const {
    user,
    loading,
    checkEmailVerification,
    resendVerificationEmail,
    logout
  } = useAuth()

  const [checking, setChecking] = React.useState(false)
  const [resending, setResending] = React.useState(false)
  const [resendStatus, setResendStatus] = React.useState('')
  const [errorMsg, setErrorMsg] = React.useState('')

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-2 border-[#E5E5E5] border-t-[#0A0A0A] rounded-full animate-spin" />
        <p className="mono text-xs text-[#6B6B6B] mt-4 tracking-widest uppercase">Verifying Authentication…</p>
      </div>
    )
  }

  // 1. Not signed in at all
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center animate-fade">
        <div className="w-16 h-16 bg-[#F5F5F5] border border-[#E5E5E5] rounded-2xl flex items-center justify-center mx-auto mb-6 text-[#0A0A0A] shadow-sm">
          <Lock size={28} />
        </div>
        <span className="mono text-xs uppercase tracking-widest text-[#16A34A] font-semibold">Authentication Required</span>
        <h2 className="font-display text-3xl sm:text-4xl font-bold mt-2 text-[#0A0A0A]">
          {fallbackTitle} is Protected
        </h2>
        <p className="text-[#6B6B6B] text-sm sm:text-base mt-3 max-w-md mx-auto leading-relaxed">
          Please sign in with Google or Email to unlock AI leaf scanning, view your personalized diagnosis history, and sync your data securely to Cloud Firestore.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <button
            onClick={onOpenLogin}
            className="bg-[#0A0A0A] hover:bg-[#262626] text-white font-semibold px-6 py-3.5 rounded-full flex items-center gap-2 transition shadow-md"
          >
            <LogIn size={18} />
            <span>Sign In to Continue</span>
          </button>
        </div>
      </div>
    )
  }

  // 2. Signed in, but email is not verified (Google sign-ins are already emailVerified === true)
  if (!user.emailVerified) {
    const handleCheckVerification = async () => {
      setChecking(true)
      setErrorMsg('')
      setResendStatus('')
      try {
        const isVerified = await checkEmailVerification()
        if (!isVerified) {
          setErrorMsg("We haven't detected your verification yet. Please click the link in your email and try again.")
        }
      } catch (err) {
        setErrorMsg(err.message || 'Error checking verification status.')
      } finally {
        setChecking(false)
      }
    }

    const handleResend = async () => {
      setResending(true)
      setErrorMsg('')
      setResendStatus('')
      try {
        await resendVerificationEmail()
        setResendStatus('Verification email resent! Please check your inbox and spam folder.')
      } catch (err) {
        setErrorMsg(err.message || 'Failed to resend verification email.')
      } finally {
        setResending(false)
      }
    }

    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center animate-fade">
        <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-600 shadow-sm">
          <Mail size={30} />
        </div>
        <span className="mono text-xs uppercase tracking-widest text-amber-600 font-semibold">Verification Required</span>
        <h2 className="font-display text-3xl sm:text-4xl font-bold mt-2 text-[#0A0A0A]">
          Verify Your Email to Continue
        </h2>
        <p className="text-[#333333] text-sm sm:text-base mt-3 max-w-lg mx-auto leading-relaxed">
          Access to this page is restricted until you verify your email address: <span className="font-mono font-bold text-[#0A0A0A]">{user.email}</span>.
        </p>
        <p className="text-xs text-[#6B6B6B] mt-2 max-w-md mx-auto">
          Please check your <strong>inbox</strong> or <strong>spam folder</strong> for the verification link sent by Firebase.
        </p>

        {resendStatus && (
          <div className="mt-4 max-w-md mx-auto p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{resendStatus}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 max-w-md mx-auto p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs text-center">
            {errorMsg}
          </div>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={handleCheckVerification}
            disabled={checking}
            className="bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold px-6 py-3.5 rounded-full flex items-center gap-2 transition shadow-sm disabled:opacity-50 text-sm"
          >
            <RefreshCw size={16} className={checking ? "animate-spin" : ""} />
            <span>{checking ? "Checking Status…" : "I've Clicked the Verification Link"}</span>
          </button>

          <button
            onClick={handleResend}
            disabled={resending}
            className="border border-[#0A0A0A] bg-white text-[#0A0A0A] hover:bg-[#F5F5F5] font-semibold px-5 py-3.5 rounded-full flex items-center gap-2 transition disabled:opacity-50 text-sm"
          >
            <Send size={15} />
            <span>{resending ? "Sending…" : "Resend Verification Email"}</span>
          </button>
        </div>

        <div className="mt-6">
          <button
            onClick={logout}
            className="text-xs text-[#6B6B6B] hover:text-[#0A0A0A] underline underline-offset-4"
          >
            Sign out / Log in with another account
          </button>
        </div>
      </div>
    )
  }

  // 3. User is authenticated and verified (or signed in with Google)
  return children
}
