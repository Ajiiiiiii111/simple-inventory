"use client";

import { useEffect, useMemo, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "login" | "register";
type RegisterStep = "email" | "code" | "password";

type AuthFormState = {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
};

export function AuthPanel() {
  const resendCooldownSeconds = 60;
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const hasSupabaseConfig = Boolean(supabase);
  const [mode, setMode] = useState<AuthMode>("login");
  const [registerStep, setRegisterStep] = useState<RegisterStep>("email");
  const [form, setForm] = useState<AuthFormState>({ email: "", code: "", password: "", confirmPassword: "" });
  const [message, setMessage] = useState(
    hasSupabaseConfig
      ? "Sign in to manage your inventory."
      : "Supabase is not connected yet. Open your Supabase project, copy the project URL and public key, paste them into the app folder's .env.local file, then restart the dev server.",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    const client = supabase;

    if (!client) {
      return;
    }

    const supabaseClient = client;

    let isMounted = true;

    async function loadSession() {
      const { data } = await supabaseClient.auth.getSession();

      if (!isMounted) {
        return;
      }

      setIsAuthenticated(Boolean(data.session));
      if (data.session) {
        setMessage(`Signed in as ${data.session.user.email ?? "your account"}.`);
      }
    }

    void loadSession();

    const { data } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      setIsAuthenticated(Boolean(session));
      if (session) {
        setMessage(`Signed in as ${session.user.email ?? "your account"}.`);
      }
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (resendCountdown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setResendCountdown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [resendCountdown]);

  function isRateLimitError(errorMessage: string): boolean {
    const text = errorMessage.toLowerCase();
    return text.includes("rate") && text.includes("email");
  }

  function resetRegisterFlow() {
    setRegisterStep("email");
    setResendCountdown(0);
    setForm((current) => ({ ...current, code: "", password: "", confirmPassword: "" }));
  }

  async function sendRegisterCode(email: string) {
    if (!supabase) {
      setMessage(
        "Supabase is not connected yet. Add your project URL and public key to .env.local, then restart the dev server.",
      );
      return;
    }

    if (!email) {
      setMessage("Enter your email first.");
      return;
    }

    try {
      setIsSubmitting(true);

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        if (isRateLimitError(error.message)) {
          setMessage("Email rate limit exceeded. Please wait about 60-120 seconds, then try again.");
          return;
        }

        setMessage(error.message);
        return;
      }

      setRegisterStep("code");
      setResendCountdown(resendCooldownSeconds);
      setMessage("A 6-digit code was sent to your email. Enter it to continue registration.");
    } catch {
      setMessage("Unable to send verification code.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyRegisterCode(email: string, code: string) {
    if (!supabase) {
      setMessage("Supabase is not connected yet. Add your project URL and public key to .env.local.");
      return;
    }

    if (!email || code.length !== 6) {
      setMessage("Enter your email and a valid 6-digit code.");
      return;
    }

    try {
      setIsSubmitting(true);

      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setRegisterStep("password");
      setMessage("Code verified. Set your password to finish registration.");
    } catch {
      setMessage("Unable to verify code.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function completeRegister(password: string, confirmPassword: string) {
    if (!supabase) {
      setMessage("Supabase is not connected yet. Add your project URL and public key to .env.local.");
      return;
    }

    if (!password) {
      setMessage("Enter a password.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      await supabase.auth.signOut();
      setMode("login");
      resetRegisterFlow();
      setForm((current) => ({
        ...current,
        password: "",
        confirmPassword: "",
      }));
      setMessage("Registration complete. You can now log in with your email and password.");
    } catch {
      setMessage("Unable to complete registration.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const email = form.email.trim();
    const password = form.password.trim();
    const confirmPassword = form.confirmPassword.trim();

    if (!supabase) {
      setMessage(
        "Supabase is not connected yet. Add your project URL and public key to .env.local, then restart the dev server.",
      );
      return;
    }

    if (mode === "register") {
      if (registerStep === "email") {
        await sendRegisterCode(email);
        return;
      }

      if (registerStep === "code") {
        await verifyRegisterCode(email, form.code.trim());
        return;
      }

      await completeRegister(password, confirmPassword);
      return;
    }

    if (!email || !password) {
      setMessage("Enter an email and password.");
      return;
    }

    try {
      setIsSubmitting(true);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes("email") && error.message.toLowerCase().includes("confirm")) {
          setMessage("Email not confirmed yet. Verify your inbox and try again, or resend verification below.");
          return;
        }

        setMessage(error.message);
        return;
      }

      setMessage("Signed in successfully.");
      window.location.assign("/dashboard");
    } catch {
      setMessage("Unable to complete authentication.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendConfirmation() {
    if (resendCountdown > 0) {
      return;
    }

    await sendRegisterCode(form.email.trim());
  }

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setMessage("Signed out.");
    setIsAuthenticated(false);
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <article className="rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
          Simple Inventory
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
          Sign in or create an account to manage only your own products.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Register with email verification, then use the dashboard to manage your inventory,
          transactions, and stock movement. Each account is isolated in the database.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/dashboard"
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
          >
            Go to Dashboard
          </a>
          <a
            href="/dashboard/products"
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Open Products
          </a>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["Email verification", "New accounts confirm ownership before access."],
            ["Scoped records", "Products and stock rows belong to the signed-in user."],
            ["Private data", "API requests are checked against the active session."],
          ].map(([title, detail]) => (
            <div key={title} className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-[2rem] border border-slate-200 bg-slate-950 p-8 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:p-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
              Account Access
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              {mode === "login" ? "Login" : "Register"}
            </h2>
          </div>
          <div className="flex rounded-full border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                resetRegisterFlow();
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                mode === "login" ? "bg-white text-slate-950" : "text-slate-300 hover:text-white"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                resetRegisterFlow();
                setMessage("Enter your email to start registration.");
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                mode === "register" ? "bg-white text-slate-950" : "text-slate-300 hover:text-white"
              }`}
            >
              Register
            </button>
          </div>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <p className="text-sm leading-6 text-slate-300">
            {mode === "login"
              ? "Use your existing account to sign in."
              : registerStep === "email"
                ? "Step 1 of 3: Enter your email to receive a 6-digit code."
                : registerStep === "code"
                  ? "Step 2 of 3: Enter the 6-digit code sent to your email."
                  : "Step 3 of 3: Set your password to finish registration."}
          </p>

          <div>
            <label htmlFor="email" className="text-sm font-medium text-slate-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-white/30"
              placeholder="you@example.com"
              autoComplete="email"
              disabled={mode === "register" && registerStep !== "email"}
            />
          </div>

          {mode === "register" && registerStep === "code" ? (
            <div>
              <label htmlFor="otpCode" className="text-sm font-medium text-slate-300">
                6-digit code
              </label>
              <input
                id="otpCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={form.code}
                onChange={(event) =>
                  setForm((current) => ({ ...current, code: event.target.value.replace(/\D/g, "") }))
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-white/30"
                placeholder="123456"
                autoComplete="one-time-code"
              />
            </div>
          ) : null}

          {mode === "login" || (mode === "register" && registerStep === "password") ? (
            <div>
            <label htmlFor="password" className="text-sm font-medium text-slate-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-white/30"
              placeholder="Enter a secure password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
            </div>
          ) : null}

          {mode === "register" && registerStep === "password" ? (
            <div>
              <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-300">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={(event) =>
                  setForm((current) => ({ ...current, confirmPassword: event.target.value }))
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-white/30"
                placeholder="Repeat your password"
                autoComplete="new-password"
              />
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || !hasSupabaseConfig}
            className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {!hasSupabaseConfig
              ? "Setup needed"
              : isSubmitting
                ? "Please wait..."
                : mode === "login"
                  ? "Sign in"
                  : registerStep === "email"
                    ? "Send code"
                    : registerStep === "code"
                      ? "Verify code"
                      : "Complete registration"}
          </button>

          <button
            type="button"
            onClick={() => {
              const nextMode = mode === "login" ? "register" : "login";
              setMode(nextMode);
              resetRegisterFlow();
              setMessage(
                nextMode === "login"
                  ? "Use your existing account to sign in."
                  : "Enter your email to start registration.",
              );
            }}
            className="w-full text-sm font-semibold text-slate-300 underline decoration-white/30 underline-offset-4 transition hover:text-white"
          >
            {mode === "login"
              ? "No account yet? Create one here."
              : "Already have an account? Go back to sign in."}
          </button>

          {mode === "register" && registerStep === "code" ? (
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={isSubmitting || !hasSupabaseConfig || resendCountdown > 0}
              className="w-full text-sm font-semibold text-slate-300 underline decoration-white/30 underline-offset-4 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : "Resend code"}
            </button>
          ) : null}

          {mode === "register" && registerStep !== "email" ? (
            <button
              type="button"
              onClick={() => {
                resetRegisterFlow();
                setMessage("Enter your email to start registration.");
              }}
              disabled={isSubmitting}
              className="w-full text-sm font-semibold text-slate-300 underline decoration-white/30 underline-offset-4 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              Start over
            </button>
          ) : null}
        </form>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
          {message}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-slate-400">
          <span>Status: {isAuthenticated ? "authenticated" : "signed out"}</span>
          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full border border-white/20 px-3 py-1.5 font-semibold text-white transition hover:bg-white/10"
            >
              Sign out
            </button>
          ) : null}
        </div>
      </article>
    </section>
  );
}