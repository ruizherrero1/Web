"use client";

import type { Session } from "@supabase/supabase-js";
import { Clapperboard } from "lucide-react";
import React, { useEffect, useState } from "react";
import type { ProfileKey } from "../_lib/types";
import { createClient, hasSupabaseEnv } from "../_lib/supabase/client";

type CineProfile = {
  id: string;
  initials: ProfileKey;
  display_name: string;
};

type AuthGateProps = {
  children: React.ReactElement<{ currentProfile?: ProfileKey; accessToken?: string }>;
};

const isLocalPreviewAllowed = process.env.NODE_ENV !== "production";

export function AuthGate({ children }: AuthGateProps) {
  const supabaseReady = hasSupabaseEnv();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CineProfile | null>(null);
  const [loaded, setLoaded] = useState(!supabaseReady);
  const [previewMode] = useState(!supabaseReady && isLocalPreviewAllowed);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!supabaseReady) return;

    const supabase = createClient();

    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      if (data.session) {
        await loadProfile(data.session.user.id);
      }
      setLoaded(true);
    }

    async function loadProfile(userId: string) {
      const { data, error } = await supabase
        .from("cine_profiles")
        .select("id, initials, display_name")
        .eq("id", userId)
        .maybeSingle();

      if (error || !data) {
        setProfile(null);
        setErrorMessage("Tu usuario no tiene acceso a Cine.");
        await supabase.auth.signOut();
        setSession(null);
        return;
      }

      setProfile(data as CineProfile);
      setErrorMessage("");
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        await loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
      setLoaded(true);
    });

    return () => subscription.unsubscribe();
  }, [supabaseReady]);

  const signIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setErrorMessage("No se pudo iniciar sesion con esos datos.");
    } catch {
      setErrorMessage("Supabase no esta configurado todavia.");
    } finally {
      setSubmitting(false);
    }
  };

  const signOut = async () => {
    if (!supabaseReady) return;
    const supabase = createClient();
    await supabase.auth.signOut();
  };

  if (!supabaseReady && !isLocalPreviewAllowed) {
    return (
      <main className="cine-app-shell grid min-h-screen place-items-center bg-[var(--page-bg)] px-4 py-8 text-[var(--text-main)]">
        <div className="w-full max-w-[420px] rounded-3xl border border-white/10 bg-[var(--app-bg)] p-5 shadow-2xl shadow-black/45">
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--gold)] text-black">
            <Clapperboard size={28} />
          </div>
          <h1 className="text-2xl font-semibold">Cine necesita configuracion</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">
            Faltan las variables publicas de Supabase en el despliegue. Por seguridad, la app no abre preview en produccion.
          </p>
        </div>
      </main>
    );
  }

  if (!loaded) {
    return (
      <main className="cine-app-shell grid min-h-screen place-items-center bg-[var(--page-bg)] px-6 text-[var(--text-main)]">
        <div className="text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--gold)] text-black">
            <Clapperboard size={28} />
          </div>
          <p className="font-semibold">Preparando Cine</p>
        </div>
      </main>
    );
  }

  if (!previewMode && (!session || !profile)) {
    return (
      <main className="cine-app-shell grid min-h-screen place-items-center bg-[var(--page-bg)] px-4 py-8 text-[var(--text-main)]">
        <form
          className="w-full max-w-[420px] rounded-3xl border border-white/10 bg-[var(--app-bg)] p-5 shadow-2xl shadow-black/45"
          onSubmit={signIn}
        >
          <div className="mb-6">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[linear-gradient(145deg,#f5b84b,#9e1b32)] text-black">
              <Clapperboard size={28} />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Acceso privado</p>
            <h1 className="mt-1 text-3xl font-semibold">Cine</h1>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm text-[var(--muted)]">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="h-12 w-full rounded-xl border border-white/10 bg-black/24 px-3 outline-none focus:border-[var(--gold)]"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-[var(--muted)]">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="h-12 w-full rounded-xl border border-white/10 bg-black/24 px-3 outline-none focus:border-[var(--gold)]"
                required
              />
            </label>
          </div>

          {errorMessage && <p className="mt-3 rounded-xl bg-red-500/12 p-3 text-sm text-red-200">{errorMessage}</p>}

          <button type="submit" disabled={submitting} className="action-button action-button-gold mt-5 w-full">
            {submitting ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <div>
      {session && (
        <button
          type="button"
          onClick={signOut}
          className="fixed right-4 top-4 z-40 rounded-full border border-white/10 bg-black/50 px-3 py-2 text-xs font-semibold text-[var(--text-soft)] backdrop-blur"
        >
          Salir
        </button>
      )}
      {!supabaseReady && previewMode && (
        <div className="fixed left-4 top-4 z-40 rounded-full border border-white/10 bg-black/50 px-3 py-2 text-xs font-semibold text-[var(--text-soft)] backdrop-blur">
          Preview local
        </div>
      )}
      {React.cloneElement(children, { currentProfile: profile?.initials ?? "RR", accessToken: session?.access_token })}
    </div>
  );
}


