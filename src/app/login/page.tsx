'use client';

import React, { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Boxes, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/app';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
        callbackUrl,
      });

      if (!result || result.error) {
        setError('Invalid email address or password.');
        setIsLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError('An unexpected authentication error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#262626] bg-[#1a1a1a] px-6 py-8 shadow-sm sm:px-10">
      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start space-x-3 rounded-lg bg-red-950/60 p-3.5 text-xs text-red-200 border border-red-800/60"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider"
          >
            Work Email Address
          </label>
          <div className="relative mt-1.5 rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Mail className="h-4 w-4 text-neutral-500" aria-hidden="true" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="block w-full rounded-lg border border-[#333333] bg-[#141414] py-2.5 pl-10 pr-3 text-sm text-white placeholder-neutral-500 focus:border-[#A31C1B] focus:outline-none focus:ring-1 focus:ring-[#A31C1B] transition"
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider"
          >
            Account Password
          </label>
          <div className="relative mt-1.5 rounded-md shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Lock className="h-4 w-4 text-neutral-500" aria-hidden="true" />
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="block w-full rounded-lg border border-[#333333] bg-[#141414] py-2.5 pl-10 pr-3 text-sm text-white placeholder-neutral-500 focus:border-[#A31C1B] focus:outline-none focus:ring-1 focus:ring-[#A31C1B] transition"
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center rounded-lg bg-[#A31C1B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#8a1817] focus:outline-none focus:ring-2 focus:ring-[#A31C1B] focus:ring-offset-2 focus:ring-offset-[#171717] transition disabled:opacity-50"
          >
            {isLoading ? (
              <span>Signing in...</span>
            ) : (
              <span className="flex items-center">
                Sign in to Portal <ArrowRight className="ml-2 h-4 w-4" />
              </span>
            )}
          </button>
        </div>
      </form>

      <div className="mt-6 border-t border-[#262626] pt-4 text-center">
        <p className="text-xs text-neutral-400">
          Role-Based Access Control Protected • Argon2id Encrypted
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#171717] py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#A31C1B] text-white shadow-md">
            <Boxes className="h-7 w-7" aria-hidden="true" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          Sign in to RIMS
        </h2>
        <p className="mt-1 text-center text-xs text-neutral-400">
          Retail Inventory Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense
          fallback={
            <div className="rounded-xl border border-[#262626] bg-[#1a1a1a] p-8 text-center text-xs text-neutral-500">
              Loading authentication portal...
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
