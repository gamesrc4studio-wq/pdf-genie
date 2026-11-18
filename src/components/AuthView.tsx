import React, { useState } from "react";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  LogIn,
  UserPlus,
  CheckCircle2,
  MailCheck,
} from "lucide-react";
import { auth, googleProvider } from "../lib/firebase";
import { EightPointStar, FourPointStar } from "./GeometricDecor";

interface AuthViewProps {
  initialMode?: "login" | "signup" | "reset";
  onSuccess: () => void;
  onSignupVerified?: () => void;
  onBack: () => void;
}

function mapFirebaseAuthError(code: string): string {
  switch (code) {
    case "auth/operation-not-allowed":
      return "Email/Password sign-in is not enabled in your Firebase Console yet. Click 'Continue with Google' above for instant access, or enable Email/Password under Firebase Console > Authentication > Sign-in method.";
    case "auth/unauthorized-domain": {
      const host = typeof window !== "undefined" ? window.location.hostname : "this domain";
      return `Sign-in is not authorized for "${host}". Add "${host}" under Firebase Console > Authentication > Settings > Authorized domains.`;
    }
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password. Please double-check and try again.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try logging in instead.";
    case "auth/weak-password":
      return "Please choose a stronger password (at least 6 characters).";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/popup-closed-by-user":
      return "Google sign-in window was closed before completing.";
    case "auth/popup-blocked":
      return "Browser blocked the Google sign-in popup. Please allow popups for this site and try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment before trying again.";
    default:
      return "Could not complete authentication. Please try again.";
  }
}

export const AuthView: React.FC<AuthViewProps> = ({
  initialMode = "login",
  onSuccess,
  onSignupVerified,
  onBack,
}) => {
  const [mode, setMode] = useState<"login" | "signup" | "reset">(initialMode);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleGoogleAuth = async () => {
    setError(null);
    setInfoMessage(null);
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      onSuccess();
    } catch (err) {
      const code = (err as { code?: string }).code || "";
      setError(mapFirebaseAuthError(code));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySignupComplete = async () => {
    setError(null);
    setInfoMessage(null);
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setPendingVerificationEmail(null);
      return;
    }

    setIsLoading(true);
    try {
      await currentUser.reload();
      if (auth.currentUser?.emailVerified) {
        onSignupVerified?.();
        onSuccess();
      } else {
        setError(
          "Your email is not verified yet. Please click the verification link sent to your inbox, then try again."
        );
      }
    } catch {
      setError("Could not check verification status right now. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendSignupEmail = async () => {
    setError(null);
    setInfoMessage(null);
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    setIsLoading(true);
    try {
      await sendEmailVerification(currentUser);
      setInfoMessage(`Verification link re-sent to ${pendingVerificationEmail}.`);
    } catch {
      setError("Please wait a moment before requesting another verification email.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelPendingSignup = async () => {
    setError(null);
    setInfoMessage(null);
    setPendingVerificationEmail(null);
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
  };

  const handleBackToStudio = async () => {
    if (pendingVerificationEmail) {
      await handleCancelPendingSignup();
    }
    onBack();
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const trimmedEmail = email.trim();
    const trimmedName = displayName.trim();

    if (mode === "reset") {
      if (!trimmedEmail) {
        setError("Please enter the email address associated with your account.");
        return;
      }
      setIsLoading(true);
      try {
        await sendPasswordResetEmail(auth, trimmedEmail);
        setInfoMessage(
          `Password reset link sent to ${trimmedEmail}. Check your inbox and spam folder.`
        );
      } catch (err) {
        const code = (err as { code?: string }).code || "";
        if (code === "auth/user-not-found") {
          setError("No account found with that email address.");
        } else {
          setError(mapFirebaseAuthError(code));
        }
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!trimmedEmail || !password) {
      setError("Please enter both your email and password.");
      return;
    }
    if (mode === "signup" && trimmedName.length < 2) {
      setError("Please enter your name (at least 2 characters).");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    try {
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        await updateProfile(cred.user, { displayName: trimmedName });
        await sendEmailVerification(cred.user);
        setPendingVerificationEmail(trimmedEmail);
      } else {
        // Log in directly without requiring an email verification screen
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
        onSuccess();
      }
    } catch (err) {
      const code = (err as { code?: string }).code || "";
      setError(mapFirebaseAuthError(code));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
      <button
        type="button"
        onClick={handleBackToStudio}
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#17213B] hover:text-[#2855D9] mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to PDF Studio
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Editorial Pitch Card */}
        <div className="lg:col-span-5 editorial-card bg-[#FFE0C5] rounded-3xl p-7 sm:p-8 flex flex-col justify-between relative overflow-hidden">
          <FourPointStar className="w-7 h-7 absolute top-5 right-5" fill="#F47A35" stroke="#17213B" />
          <EightPointStar className="w-8 h-8 absolute bottom-5 right-6" fill="#2855D9" stroke="#17213B" />

          <div className="space-y-4">
            <p className="text-xs font-bold tracking-wide text-[#2855D9]">
              PDF GENIUS Account · Cloud Study Library
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#17213B] leading-tight [text-wrap:balance]">
              Save every summary, chat &amp; quiz score.
            </h1>
            <p className="text-[15px] text-[#17213B]/85 leading-relaxed">
              Sign in or create an account to automatically keep your analyzed PDFs, Ask Your PDF conversations, important terms, and quiz history across sessions.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t-2 border-[#17213B]/15 space-y-2.5 text-sm font-medium text-[#17213B]">
            <p>01. Re-open any past PDF summary in one click</p>
            <p>02. Continue Ask Your PDF chats where you left off</p>
            <p>03. Track comprehension quiz scores over time</p>
          </div>
        </div>

        {/* Right Auth Card */}
        <div className="lg:col-span-7 editorial-card bg-[#FFFFFF] rounded-3xl p-7 sm:p-9">
          {pendingVerificationEmail ? (
            <div className="space-y-5 py-2">
              <div className="w-12 h-12 rounded-2xl bg-[#FFE0C5] border-2 border-[#17213B] flex items-center justify-center">
                <MailCheck className="w-6 h-6 text-[#2855D9]" />
              </div>

              <div>
                <h2 className="font-display text-2xl font-bold text-[#17213B]">
                  Verify your email to finish Sign Up
                </h2>
                <p className="text-sm sm:text-base text-[#17213B]/80 mt-2 leading-relaxed">
                  We sent a verification link to{" "}
                  <span className="font-bold text-[#17213B]">{pendingVerificationEmail}</span>.
                  Open that email and click the verification link, then click below to enter PDF GENIUS.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border-2 border-[#17213B] bg-[#FFE0C5] px-4 py-3 flex items-start gap-2.5 text-sm text-[#17213B]"
                >
                  <AlertCircle className="w-4 h-4 text-[#F47A35] shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {infoMessage && (
                <div className="rounded-xl border-2 border-[#17213B] bg-[#FFF1D8] px-4 py-3 flex items-start gap-2.5 text-sm text-[#17213B]">
                  <CheckCircle2 className="w-4 h-4 text-[#2855D9] shrink-0 mt-0.5" />
                  <span>{infoMessage}</span>
                </div>
              )}

              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  onClick={handleVerifySignupComplete}
                  disabled={isLoading}
                  className="editorial-btn w-full bg-[#F47A35] text-[#17213B] px-5 py-3 rounded-xl text-base font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking verification...
                    </>
                  ) : (
                    "I've Verified — Complete Sign Up"
                  )}
                </button>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleResendSignupEmail}
                    disabled={isLoading}
                    className="text-sm font-bold text-[#2855D9] hover:underline cursor-pointer"
                  >
                    Resend Verification Email
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelPendingSignup}
                    disabled={isLoading}
                    className="text-sm font-semibold text-[#17213B]/75 hover:underline cursor-pointer"
                  >
                    Use a different email
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Segmented Login / Sign Up Tabs */}
              <div className="inline-flex p-1 rounded-xl bg-[#FFF1D8] border-2 border-[#17213B] mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                    setInfoMessage(null);
                  }}
                  className={`px-5 py-2 rounded-lg text-sm font-bold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    mode === "login" || mode === "reset"
                      ? "bg-[#2855D9] text-white"
                      : "text-[#17213B] hover:bg-[#FFE0C5]"
                  }`}
                >
                  <LogIn className="w-4 h-4" />
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                    setInfoMessage(null);
                  }}
                  className={`px-5 py-2 rounded-lg text-sm font-bold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    mode === "signup"
                      ? "bg-[#2855D9] text-white"
                      : "text-[#17213B] hover:bg-[#FFE0C5]"
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  Sign Up
                </button>
              </div>

              <h2 className="font-display text-2xl font-bold text-[#17213B]">
                {mode === "login"
                  ? "Welcome back"
                  : mode === "signup"
                  ? "Create your free account"
                  : "Reset your password"}
              </h2>
              <p className="text-sm text-[#17213B]/75 mt-1">
                {mode === "login"
                  ? "Sign in to access your saved PDFs and study history."
                  : mode === "signup"
                  ? "Verify your email during sign-up to save summaries, terms, and quizzes."
                  : "Enter your email address and we'll send you a password reset link."}
              </p>

              {mode !== "reset" && (
                <>
                  {/* Google Sign-In Button */}
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={handleGoogleAuth}
                      disabled={isLoading}
                      className="editorial-btn w-full bg-[#FFF1D8] text-[#17213B] px-5 py-3 rounded-xl text-sm sm:text-base font-bold inline-flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
                    >
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </button>
                  </div>

                  <div className="my-6 flex items-center gap-3 text-xs font-semibold text-[#17213B]/60">
                    <div className="flex-1 h-px bg-[#17213B]/20" />
                    <span>or use email &amp; password</span>
                    <div className="flex-1 h-px bg-[#17213B]/20" />
                  </div>
                </>
              )}

              {/* Email / Password Form */}
              <form
                onSubmit={handleEmailSubmit}
                className={`space-y-4 ${mode === "reset" ? "mt-6" : ""}`}
              >
                {mode === "signup" && (
                  <div>
                    <label
                      htmlFor="auth-name"
                      className="block text-sm font-semibold text-[#17213B] mb-1.5"
                    >
                      Full Name
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Alex Rivera"
                      disabled={isLoading}
                      maxLength={100}
                      className="w-full rounded-xl border-2 border-[#17213B] bg-[#FFF1D8]/40 px-4 py-2.5 text-sm sm:text-base text-[#17213B] focus:outline-none focus:ring-2 focus:ring-[#2855D9]"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="auth-email"
                    className="block text-sm font-semibold text-[#17213B] mb-1.5"
                  >
                    Email Address
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@university.edu"
                    disabled={isLoading}
                    autoComplete="email"
                    className="w-full rounded-xl border-2 border-[#17213B] bg-[#FFF1D8]/40 px-4 py-2.5 text-sm sm:text-base text-[#17213B] focus:outline-none focus:ring-2 focus:ring-[#2855D9]"
                  />
                </div>

                {mode !== "reset" && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="auth-password"
                        className="block text-sm font-semibold text-[#17213B]"
                      >
                        Password
                      </label>
                      {mode === "login" && (
                        <button
                          type="button"
                          onClick={() => {
                            setMode("reset");
                            setError(null);
                            setInfoMessage(null);
                          }}
                          className="text-xs font-bold text-[#2855D9] hover:underline cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <input
                      id="auth-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      disabled={isLoading}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      className="w-full rounded-xl border-2 border-[#17213B] bg-[#FFF1D8]/40 px-4 py-2.5 text-sm sm:text-base text-[#17213B] focus:outline-none focus:ring-2 focus:ring-[#2855D9]"
                    />
                  </div>
                )}

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border-2 border-[#17213B] bg-[#FFE0C5] px-4 py-3 flex items-start gap-2.5 text-sm text-[#17213B]"
                  >
                    <AlertCircle className="w-4 h-4 text-[#F47A35] shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {infoMessage && (
                  <div className="rounded-xl border-2 border-[#17213B] bg-[#FFF1D8] px-4 py-3 flex items-start gap-2.5 text-sm text-[#17213B]">
                    <CheckCircle2 className="w-4 h-4 text-[#2855D9] shrink-0 mt-0.5" />
                    <span>{infoMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="editorial-btn w-full bg-[#F47A35] text-[#17213B] px-5 py-3 rounded-xl text-base font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Please wait...
                    </>
                  ) : mode === "login" ? (
                    "Log In to PDF GENIUS"
                  ) : mode === "signup" ? (
                    "Create Account"
                  ) : (
                    "Send Password Reset Email"
                  )}
                </button>

                {mode === "reset" && (
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        setError(null);
                        setInfoMessage(null);
                      }}
                      className="text-sm font-semibold text-[#2855D9] hover:underline cursor-pointer"
                    >
                      Back to Log In
                    </button>
                  </div>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
