'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFirebaseApp } from '@/lib/firebaseClient';
import { loginUser, registerUser } from '@/lib/auth';

type Mode = 'login' | 'register';

const genderOptions = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const accountTypeOptions = [
  { value: 'user', label: 'User' },
  { value: 'therapist', label: 'Therapist' },
];

interface AuthFormProps {
  initialMode?: Mode;
}

export function AuthForm({ initialMode = 'login' }: AuthFormProps) {
  const { refreshProfile } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const router = useRouter();
  const [formValues, setFormValues] = useState({
    email: '',
    password: '',
    name: '',
    age: '',
    gender: genderOptions[0]?.value ?? '',
    accountType: accountTypeOptions[0]?.value ?? 'user',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleMode = () => {
    setError(null);
    setMode((prev) => (prev === 'login' ? 'register' : 'login'));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formValues.email || !formValues.password) {
        throw new Error('Email and password are required.');
      }

      if (mode === 'register') {
        if (!formValues.name) {
          throw new Error('Name is required for registration.');
        }
        const parsedAge = Number(formValues.age);
        if (!Number.isFinite(parsedAge) || parsedAge <= 0) {
          throw new Error('Please enter a valid age.');
        }
        if (!formValues.gender) {
          throw new Error('Please select a gender.');
        }

        const registrationPayload = {
          email: formValues.email,
          password: formValues.password,
          name: formValues.name,
          age: parsedAge,
          gender: formValues.gender,
          accountType: (formValues.accountType as 'user' | 'therapist') ?? 'user',
        } as const;

        await registerUser(registrationPayload);
        await refreshProfile();
        if (registrationPayload.accountType === 'therapist') {
          router.push('/therapist/onboarding');
        }
        return;
      }

      await loginUser(formValues.email, formValues.password);
      await refreshProfile();
      const authInstance = getAuth(getFirebaseApp());
      const currentUser = authInstance.currentUser;
      if (!currentUser) {
        router.push('/home');
        return;
      }
      const db = getFirestore(getFirebaseApp());
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const data = userDoc.data() ?? {};
      const rawRole =
        typeof data.role === 'string' ? data.role : typeof data.accountType === 'string' ? data.accountType : undefined;
      if (rawRole === 'admin') {
        router.push('/admin');
        return;
      }
      if (rawRole === 'therapist') {
        router.push('/therapist/dashboard');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full bg-white/70 backdrop-blur border border-indigo-100 rounded-xl shadow-lg p-8">
      <h2 className="text-2xl font-semibold text-indigo-900 text-center mb-2">
        {mode === 'login' ? 'Welcome!' : 'Create Your Account'}
      </h2>
      <p className="text-sm text-indigo-700/80 text-center mb-6">
        {mode === 'login'
          ? 'Log in with your email to continue your journey with Lumora.'
          : 'Join Lumora to access personalized support and resources.'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'register' && (
          <>
            <div>
              <label className="block text-sm font-medium text-indigo-900 mb-1">Name</label>
              <input
                type="text"
                value={formValues.name}
                onChange={(event) => setFormValues((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-lg border border-indigo-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-indigo-900 mb-1">Age</label>
              <input
                type="number"
                min={1}
                value={formValues.age}
                onChange={(event) => setFormValues((prev) => ({ ...prev, age: event.target.value }))}
                className="w-full rounded-lg border border-indigo-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="Your age"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-indigo-900 mb-1">Gender</label>
              <select
                value={formValues.gender}
                onChange={(event) => setFormValues((prev) => ({ ...prev, gender: event.target.value }))}
                className="w-full rounded-lg border border-indigo-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                {genderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-indigo-900 mb-1">Account Type</label>
              <select
                value={formValues.accountType}
                onChange={(event) =>
                  setFormValues((prev) => ({ ...prev, accountType: event.target.value as 'user' | 'therapist' }))
                }
                className="w-full rounded-lg border border-indigo-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                {accountTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-indigo-900 mb-1">Email</label>
          <input
            type="email"
            value={formValues.email}
            onChange={(event) => setFormValues((prev) => ({ ...prev, email: event.target.value }))}
            className="w-full rounded-lg border border-indigo-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-indigo-900 mb-1">Password</label>
          <input
            type="password"
            value={formValues.password}
            onChange={(event) => setFormValues((prev) => ({ ...prev, password: event.target.value }))}
            className="w-full rounded-lg border border-indigo-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Enter a secure password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Register'}
        </button>
      </form>

      <p className="text-sm text-indigo-700/80 text-center mt-6">
        {mode === 'login' ? (
          <>
            Need an account?{' '}
            <button type="button" onClick={toggleMode} className="text-indigo-600 font-medium hover:underline">
              Register here
            </button>
          </>
        ) : (
          <>
            Already joined Lumora?{' '}
            <button type="button" onClick={toggleMode} className="text-indigo-600 font-medium hover:underline">
              Log in instead
            </button>
          </>
        )}
      </p>
    </div>
  );
}
