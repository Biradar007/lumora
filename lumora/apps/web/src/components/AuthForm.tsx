'use client';

import { type FormEvent, useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { FirebaseError } from 'firebase/app';
import { Loader2, LogIn, MailCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getFirebaseApp } from '@/lib/firebaseClient';
import {
  loginUser,
  completeGoogleSignup,
  requestSignupCode,
  signInWithGooglePopup,
  verifySignupCode,
  getFirebaseAuth,
  type VerifySignupCodeParams,
} from '@/lib/auth';
import type { Role } from '@/types/domain';

type Mode = 'login' | 'register';

const MIN_PASSWORD_LENGTH = 8;

const roleOptions: Array<{ value: 'user' | 'therapist'; label: string; description: string }> = [
  { value: 'user', label: 'User', description: 'Track wellbeing, chat with Lumora, and access resources.' },
  {
    value: 'therapist',
    label: 'Therapist',
    description: 'Manage clients, appointments, and insights in the therapist workspace.',
  },
];

const genderOptions = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const;

function isFirebaseError(error: unknown): error is FirebaseError {
  return error instanceof FirebaseError;
}

function resolveRole(value: unknown): Role {
  if (value === 'admin' || value === 'therapist' || value === 'user') {
    return value;
  }
  return 'user';
}

async function fetchUserRole(uid: string): Promise<Role> {
  const db = getFirestore(getFirebaseApp());
  const snap = await getDoc(doc(db, 'users', uid));
  const data = snap.data() ?? {};
  if (typeof data.role === 'string') {
    return resolveRole(data.role);
  }
  if (typeof data.accountType === 'string') {
    return resolveRole(data.accountType);
  }
  return 'user';
}

interface AuthFormProps {
  initialMode?: Mode;
}

export function AuthForm({ initialMode = 'login' }: AuthFormProps) {
  const { refreshProfile, logout } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [codeStatusMessage, setCodeStatusMessage] = useState<string | null>(null);
  const [googleCompletion, setGoogleCompletion] = useState<{ idToken: string } | null>(null);
  const [googleDetails, setGoogleDetails] = useState<{
    age: string;
    gender: (typeof genderOptions)[number]['value'];
    role: 'user' | 'therapist';
  }>({
    age: '',
    gender: genderOptions[0]?.value ?? 'female',
    role: 'user',
  });
  const [googleDetailError, setGoogleDetailError] = useState<string | null>(null);
  const [googleDetailSubmitting, setGoogleDetailSubmitting] = useState(false);

  const [loginValues, setLoginValues] = useState({ email: '', password: '' });

  const [registerValues, setRegisterValues] = useState<VerifySignupCodeParams>({
    name: '',
    email: '',
    password: '',
    role: 'user',
    code: '',
    age: undefined,
    gender: genderOptions[0]?.value,
  });

  const navigateByRole = useCallback(
    (role: Role) => {
      if (role === 'admin') {
        router.push('/admin');
        return;
      }
      if (role === 'therapist') {
        router.push('/therapist');
        return;
      }
      router.push('/user/chat');
    },
    [router]
  );

  const resetMessages = useCallback(() => {
    setErrorMessage(null);
    setInfoMessage(null);
    setCodeStatusMessage(null);
  }, []);

  const toggleMode = useCallback(() => {
    resetMessages();
    setMode((prev) => (prev === 'login' ? 'register' : 'login'));
    setLoading(false);
    setSendingCode(false);
    setSocialLoading(false);
    setCodeSent(false);
    setRegisterValues({
      name: '',
      email: '',
      password: '',
      role: 'user',
      code: '',
      age: undefined,
      gender: genderOptions[0]?.value,
    });
    setGoogleCompletion(null);
  }, [resetMessages]);

  const handleGoogleSignIn = useCallback(async () => {
    resetMessages();
    setSocialLoading(true);
    try {
      const result = await signInWithGooglePopup();
      console.log('Google sign-in', { created: result.created, role: result.role });
      const authInstance = getFirebaseAuth();
      const currentUser = authInstance.currentUser;
      if (!currentUser) {
        throw new Error('We could not complete Google sign-in. Please try again.');
      }

      let existingRole: Role | undefined;
      let existingAge: number | undefined;
      let existingGender: string | undefined;

      try {
        const db = getFirestore(getFirebaseApp());
        const snapshot = await getDoc(doc(db, 'users', currentUser.uid));
        if (snapshot.exists()) {
          const data = snapshot.data() ?? {};
          const rawRole =
            typeof data.role === 'string'
              ? data.role
              : typeof data.accountType === 'string'
                ? data.accountType
                : undefined;
          existingRole = resolveRole(rawRole);
          existingAge =
            typeof data.age === 'number' && Number.isFinite(data.age) ? Math.round(data.age) : undefined;
          existingGender =
            typeof data.gender === 'string' && data.gender.trim().length > 0 ? data.gender.trim() : undefined;
        }
      } catch (error) {
        console.warn('Failed to load existing Google profile details', error);
      }

      const needsDetails =
        result.created ||
        !existingRole ||
        existingAge === undefined ||
        !existingGender ||
        existingAge <= 0 ||
        existingAge > 120;

      if (needsDetails) {
        setGoogleCompletion({ idToken: result.idToken });
        setGoogleDetails({
          age: existingAge !== undefined ? String(existingAge) : '',
          gender:
            genderOptions.find((option) => option.value === existingGender)?.value ??
            genderOptions[0]?.value ??
            'female',
          role: existingRole === 'therapist' ? 'therapist' : 'user',
        });
        setGoogleDetailError(null);
        setInfoMessage(null);
        setErrorMessage(null);
        return;
      }

      await refreshProfile();
      navigateByRole(existingRole ?? result.role ?? 'user');
    } catch (error) {
      if (isFirebaseError(error) && error.code === 'auth/account-exists-with-different-credential') {
        setErrorMessage(
          'Your email is already linked to a Lumora account. Sign in with your password, then link Google from your profile.'
        );
      } else if (error instanceof Error) {
        setErrorMessage(error.message || 'Google sign-in failed. Please try again.');
      } else {
        setErrorMessage('Google sign-in failed. Please try again.');
      }
    } finally {
      setSocialLoading(false);
    }
  }, [navigateByRole, refreshProfile, resetMessages]);

  const handleLoginSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      resetMessages();
      setLoading(true);
      try {
        if (!loginValues.email || !loginValues.password) {
          throw new Error('Enter your email and password to continue.');
        }
        const credential = await loginUser(loginValues.email, loginValues.password);
        const uid = credential.user.uid;
        const role = await fetchUserRole(uid);
        await refreshProfile();
        navigateByRole(role);
      } catch (error) {
        if (isFirebaseError(error)) {
          if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
            setErrorMessage('That email and password combination is not recognized.');
          } else if (error.code === 'auth/user-not-found') {
            setErrorMessage('No account found for that email. Try signing up first.');
          } else {
            setErrorMessage(error.message || 'Unable to sign in. Please try again.');
          }
        } else if (error instanceof Error) {
          setErrorMessage(error.message || 'Unable to sign in. Please try again.');
        } else {
          setErrorMessage('Unable to sign in. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    },
    [loginValues.email, loginValues.password, navigateByRole, refreshProfile, resetMessages]
  );

  const handleSendVerificationCode = useCallback(async () => {
    resetMessages();
    if (!registerValues.email) {
      setErrorMessage('Enter your email to receive a verification code.');
      return;
    }
    setSendingCode(true);
    try {
      await requestSignupCode(registerValues.email);
      setCodeSent(true);
      setCodeStatusMessage('Verification code sent. Check your inbox—it expires in 10 minutes.');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'mail_not_configured') {
          setErrorMessage('Email delivery is not configured yet. Please contact support to complete sign up.');
        } else {
          setErrorMessage(error.message || 'Could not send verification code. Please try again shortly.');
        }
      } else {
        setErrorMessage('Could not send verification code. Please try again shortly.');
      }
    } finally {
      setSendingCode(false);
    }
  }, [registerValues.email, resetMessages]);

  const handleRegisterSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      resetMessages();
      if (!codeSent) {
        setErrorMessage('Verify your email before creating an account.');
        return;
      }
      if (!registerValues.name.trim()) {
        setErrorMessage('Enter your full name so we know how to address you.');
        return;
      }
      if (!registerValues.code.trim()) {
        setErrorMessage('Enter the 6-digit verification code we emailed you.');
        return;
      }
      if (registerValues.password.length < MIN_PASSWORD_LENGTH) {
        setErrorMessage(`Choose a password that is at least ${MIN_PASSWORD_LENGTH} characters long.`);
        return;
      }
      const parsedAge =
        typeof registerValues.age === 'number'
          ? registerValues.age
          : Number.parseInt(String(registerValues.age ?? ''), 10);
      if (!Number.isFinite(parsedAge) || parsedAge <= 0 || parsedAge > 120) {
        setErrorMessage('Enter a valid age.');
        return;
      }
      if (!registerValues.gender) {
        setErrorMessage('Select your gender.');
        return;
      }

      setLoading(true);
      try {
        const result = await verifySignupCode({
          ...registerValues,
          age: parsedAge,
        });
        const credential = await loginUser(registerValues.email, registerValues.password);
        const uid = credential.user.uid;
        const role = result.role ?? (await fetchUserRole(uid));
        await refreshProfile();
        setInfoMessage('Account created! Redirecting you now…');
        navigateByRole(role);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'email_exists') {
            setErrorMessage('That email already has a Lumora account. Try signing in instead.');
          } else if (error.message === 'code_invalid') {
            setErrorMessage('That verification code did not match. Double-check the digits and try again.');
          } else if (error.message === 'code_expired') {
            setErrorMessage('That code has expired. Request a new one to continue.');
          } else if (error.message === 'code_locked') {
            setErrorMessage('Too many incorrect attempts. Request a new verification code to continue.');
          } else if (error.message === 'rate_limited') {
            setErrorMessage('We are processing a lot of requests. Please wait a moment before trying again.');
          } else {
            setErrorMessage(error.message || 'We could not create your account with that code.');
          }
        } else {
          setErrorMessage('We could not create your account with that code.');
        }
      } finally {
        setLoading(false);
      }
    },
    [codeSent, navigateByRole, refreshProfile, registerValues, resetMessages]
  );

  const registerButtonDisabled = useMemo(() => {
    const parsedAge =
      typeof registerValues.age === 'number'
        ? registerValues.age
        : Number.parseInt(String(registerValues.age ?? ''), 10);
    return (
      loading ||
      !registerValues.email ||
      !registerValues.password ||
      !registerValues.code ||
      !registerValues.name ||
      !registerValues.gender ||
      !Number.isFinite(parsedAge) ||
      parsedAge <= 0
    );
  }, [
    loading,
    registerValues.age,
    registerValues.code,
    registerValues.email,
    registerValues.gender,
    registerValues.name,
    registerValues.password,
  ]);

  const handleCompleteGoogleDetails = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!googleCompletion) {
        return;
      }
      setGoogleDetailError(null);
      const parsedAge = Number.parseInt(googleDetails.age, 10);
      if (!Number.isFinite(parsedAge) || parsedAge <= 0 || parsedAge > 120) {
        setGoogleDetailError('Enter a valid age.');
        return;
      }
      if (!googleDetails.gender) {
        setGoogleDetailError('Select your gender.');
        return;
      }
      setGoogleDetailSubmitting(true);
      try {
        const role = await completeGoogleSignup(googleCompletion.idToken, {
          age: parsedAge,
          gender: googleDetails.gender,
          role: googleDetails.role,
        });
        await refreshProfile();
        setGoogleCompletion(null);
        navigateByRole(role ?? 'user');
      } catch (error) {
        console.error('Failed to complete Google signup', error);
        if (error instanceof Error) {
          setGoogleDetailError(error.message || 'We could not save your details. Please try again.');
        } else {
          setGoogleDetailError('We could not save your details. Please try again.');
        }
      } finally {
        setGoogleDetailSubmitting(false);
      }
    },
    [googleCompletion, googleDetails.age, googleDetails.gender, googleDetails.role, navigateByRole, refreshProfile]
  );

  const handleCancelGoogleDetails = useCallback(async () => {
    setGoogleCompletion(null);
    setGoogleDetailError(null);
    try {
      await logout();
    } catch (error) {
      console.warn('Failed to logout after cancelling Google signup', error);
    }
  }, [logout]);

  return (
    <>
      <div className="max-w-md w-full bg-white/80 backdrop-blur border border-indigo-100 rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
            <LogIn className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-semibold text-indigo-900">
            {mode === 'login' ? 'Welcome back to Lumora' : 'Create your Lumora account'}
          </h2>
          <p className="mt-2 text-sm text-indigo-700/80">
            {mode === 'login'
              ? 'Sign in to continue your journey with personalized support.'
              : 'Verify your email to start using Lumora. It only takes a minute.'}
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={socialLoading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 py-2 font-medium text-indigo-700 shadow-sm transition hover:bg-indigo-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {socialLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
            Continue with Google
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-indigo-100" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-indigo-400">or with email</span>
            </div>
          </div>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-indigo-900 mb-1">Email</label>
              <input
                type="email"
                value={loginValues.email}
                onChange={(event) => setLoginValues((prev) => ({ ...prev, email: event.target.value }))}
                className="w-full rounded-lg border border-indigo-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-indigo-900 mb-1">Password</label>
              <input
                type="password"
                value={loginValues.password}
                onChange={(event) => setLoginValues((prev) => ({ ...prev, password: event.target.value }))}
                className="w-full rounded-lg border border-indigo-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => router.push('/forgot-password')}
                className="text-indigo-600 font-medium hover:underline"
              >
                Forgot password?
              </button>
              <button type="button" onClick={toggleMode} className="text-indigo-500 hover:underline">
                Need an account?
              </button>
            </div>
            {errorMessage && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorMessage}</p>
            )}
            {infoMessage && (
              <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{infoMessage}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Signing you in…' : 'Log In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-indigo-900 mb-1">Full name</label>
              <input
                type="text"
                value={registerValues.name}
                onChange={(event) => setRegisterValues((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-lg border border-indigo-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Alex Morgan"
                autoComplete="name"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-indigo-900 mb-1">Age</label>
                <input
                  type="number"
                  min={1}
                  value={registerValues.age ?? ''}
                  onChange={(event) =>
                    setRegisterValues((prev) => ({
                      ...prev,
                      age: event.target.value ? Number.parseInt(event.target.value, 10) : undefined,
                    }))
                  }
                  className="w-full rounded-lg border border-indigo-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="25"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-indigo-900 mb-1">Gender</label>
                <select
                  value={registerValues.gender ?? ''}
                  onChange={(event) =>
                    setRegisterValues((prev) => ({
                      ...prev,
                      gender: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-indigo-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                >
                  {genderOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-indigo-900 mb-1">Email</label>
              <input
                type="email"
                value={registerValues.email}
                onChange={(event) =>
                  setRegisterValues((prev) => ({
                    ...prev,
                    email: event.target.value.toLowerCase(),
                  }))
                }
                className="w-full rounded-lg border border-indigo-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-indigo-900 mb-1">Role</label>
              <div className="grid gap-3 sm:grid-cols-2">
                {roleOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRegisterValues((prev) => ({ ...prev, role: option.value }))}
                    className={`rounded-lg border px-3 py-2 text-left transition ${
                      registerValues.role === option.value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-indigo-200 bg-white text-indigo-700 hover:border-indigo-300'
                    }`}
                  >
                    <p className="text-sm font-semibold">{option.label}</p>
                    <p className="text-xs text-indigo-600/80 mt-1">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-indigo-900">Verify your email</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={registerValues.code}
                  onChange={(event) =>
                    setRegisterValues((prev) => ({ ...prev, code: event.target.value.replace(/\D+/g, '') }))
                  }
                  className="flex-1 rounded-lg border border-indigo-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="6-digit code"
                />
                <button
                  type="button"
                  onClick={handleSendVerificationCode}
                  disabled={sendingCode || !registerValues.email}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {sendingCode && <Loader2 className="h-4 w-4 animate-spin" />}
                  {sendingCode ? 'Sending…' : codeSent ? 'Resend code' : 'Send verification code'}
                </button>
              </div>
              {codeStatusMessage && (
                <p className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                  {codeStatusMessage}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-indigo-900 mb-1">Password</label>
              <input
                type="password"
                value={registerValues.password}
                onChange={(event) => setRegisterValues((prev) => ({ ...prev, password: event.target.value }))}
                className="w-full rounded-lg border border-indigo-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Create a secure password"
                autoComplete="new-password"
              />
              <p className="mt-1 text-xs text-indigo-500">Must be at least {MIN_PASSWORD_LENGTH} characters.</p>
            </div>

            {errorMessage && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errorMessage}</p>
            )}
            {infoMessage && (
              <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{infoMessage}</p>
            )}

            <button
              type="submit"
              disabled={registerButtonDisabled}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Creating account…' : 'Create account'}
            </button>

            <div className="text-sm text-indigo-700/80 text-center">
              Already have an account?{' '}
              <button type="button" onClick={toggleMode} className="text-indigo-600 font-semibold hover:underline">
                Log in instead
              </button>
            </div>
          </form>
        )}
      </div>

      {googleCompletion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-indigo-100 bg-white p-6 shadow-xl">
            <h3 className="text-xl font-semibold text-indigo-900 mb-2">Finish setting up your account</h3>
            <p className="text-sm text-indigo-700/80 mb-4">
              Tell us a little about yourself so we can personalise your workspace.
            </p>
            <form onSubmit={handleCompleteGoogleDetails} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-indigo-900 mb-1">Age</label>
                  <input
                    type="number"
                    min={1}
                    value={googleDetails.age}
                    onChange={(event) =>
                      setGoogleDetails((prev) => ({
                        ...prev,
                        age: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-indigo-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="25"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-indigo-900 mb-1">Gender</label>
                  <select
                    value={googleDetails.gender}
                    onChange={(event) =>
                      setGoogleDetails((prev) => ({
                        ...prev,
                        gender: event.target.value as (typeof genderOptions)[number]['value'],
                      }))
                    }
                    className="w-full rounded-lg border border-indigo-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  >
                    {genderOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-indigo-900 mb-1">Role</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {roleOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setGoogleDetails((prev) => ({
                          ...prev,
                          role: option.value,
                        }))
                      }
                      className={`rounded-lg border px-3 py-2 text-left transition ${
                        googleDetails.role === option.value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-indigo-200 bg-white text-indigo-700 hover:border-indigo-300'
                      }`}
                    >
                      <p className="text-sm font-semibold">{option.label}</p>
                      <p className="text-xs text-indigo-600/80 mt-1">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {googleDetailError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {googleDetailError}
                </p>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleCancelGoogleDetails}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={googleDetailSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {googleDetailSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
