"use client";

import { useActionState } from "react";
import { requestMagicLink, verifyCode, type LoginState } from "@/app/(auth)/login/actions";

const initialState: LoginState = { status: "idle", email: "", message: "" };

export function LoginForm({ next, initialError }: { next: string; initialError?: string }) {
  const [linkState, requestLink, linkPending] = useActionState(requestMagicLink, initialState);
  const [codeState, submitCode, codePending] = useActionState(verifyCode, initialState);

  const sent = linkState.status === "sent";
  const message = codeState.message || linkState.message || initialError || "";
  const isError = linkState.status === "error" || Boolean(codeState.message) || (!linkState.message && Boolean(initialError));

  return (
    <div className="space-y-5">
      <form action={requestLink} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <div>
          <label htmlFor="email" className="field-label">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            defaultValue={linkState.email}
            placeholder="you@lindone.com"
            className="glass-input"
            aria-describedby="login-status"
          />
        </div>
        <button
          type="submit"
          disabled={linkPending}
          className="glass glass-pill glass-lit w-full px-6 py-3.5 text-base font-semibold text-mist transition active:scale-[0.98] disabled:opacity-60"
        >
          {linkPending ? "Sending…" : sent ? "Send again" : "Email me a sign-in link"}
        </button>
      </form>

      {sent ? (
        <form action={submitCode} className="space-y-4 border-t border-black/10 pt-5" noValidate>
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="email" value={linkState.email} />
          <div>
            <label htmlFor="code" className="field-label">
              Code from the email
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="••••••"
              className="glass-input text-center text-2xl tracking-[0.5em]"
            />
          </div>
          <button
            type="submit"
            disabled={codePending}
            className="w-full rounded-full border border-black/40 px-6 py-3 text-base font-semibold text-mist transition active:scale-[0.98] disabled:opacity-60"
          >
            {codePending ? "Checking…" : "Sign in with code"}
          </button>
        </form>
      ) : null}

      <p
        id="login-status"
        role="status"
        aria-live="polite"
        className={`min-h-[1.5rem] text-sm ${isError ? "text-rose-600" : "text-mist-muted"}`}
      >
        {message}
      </p>
    </div>
  );
}
