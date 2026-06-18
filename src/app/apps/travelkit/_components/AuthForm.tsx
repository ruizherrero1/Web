"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

export function AuthForm() {
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function switchMode(next: typeof mode) {
    setMode(next);
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError("Correo o contraseña incorrectos.");
    } else if (mode === "register") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setSuccess("Cuenta creada. Revisa tu correo para confirmar el registro.");
      }
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/apps/travelkit`,
      });
      if (error) {
        setError(error.message);
      } else {
        setSuccess("Te hemos enviado un enlace para restablecer la contraseña.");
      }
    }

    setLoading(false);
  }

  return (
    <div className="max-w-sm">
      {mode !== "reset" && (
        <div className="flex gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-1 mb-6">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
                mode === m
                  ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {m === "login" ? "Acceder" : "Registrarse"}
            </button>
          ))}
        </div>
      )}

      {mode === "reset" && (
        <div className="mb-6">
          <p className="text-sm font-semibold text-[var(--ink)]">Restablecer contraseña</p>
          <p className="text-sm text-[var(--muted)] mt-1">
            Recibirás un enlace en tu correo para crear una nueva contraseña.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--ink)] mb-1.5">
            Correo electrónico
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--muted)]" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu@email.com"
              className="w-full rounded-md border border-[var(--line)] bg-[var(--surface)] pl-10 pr-4 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none transition"
            />
          </div>
        </div>

        {mode !== "reset" && (
          <div>
            <label className="block text-sm font-medium text-[var(--ink)] mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--muted)]" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full rounded-md border border-[var(--line)] bg-[var(--surface)] pl-10 pr-10 py-2.5 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--ink)] transition"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm rounded-md px-3 py-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm rounded-md px-3 py-2 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="focus-ring w-full min-h-11 flex items-center justify-center gap-2 rounded-md bg-[var(--accent-strong)] text-[var(--on-accent)] text-sm font-semibold transition hover:bg-[var(--accent)] disabled:opacity-60"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          {mode === "login" ? "Acceder" : mode === "register" ? "Crear cuenta" : "Enviar enlace"}
        </button>
      </form>

      <div className="mt-4 text-center">
        {mode === "login" ? (
          <button
            onClick={() => switchMode("reset")}
            className="text-xs text-[var(--muted)] hover:text-[var(--accent-dark)] transition"
          >
            ¿Olvidaste tu contraseña?
          </button>
        ) : (
          <button
            onClick={() => switchMode("login")}
            className="text-xs text-[var(--muted)] hover:text-[var(--accent-dark)] transition"
          >
            ← Volver al acceso
          </button>
        )}
      </div>
    </div>
  );
}
