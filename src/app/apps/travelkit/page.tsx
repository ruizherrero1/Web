"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { TravelKit } from "@/lib/supabase/types";
import { PageShell } from "@/components/PageShell";
import { AuthForm } from "./_components/AuthForm";
import { KitsGrid } from "./_components/KitsGrid";
import {
  cacheKits,
  OFFLINE_SYNC_COMPLETED,
  readCachedKits,
} from "@/lib/travelkit/offline";

function Skeleton() {
  return (
    <div className="container-shell py-12 space-y-4">
      <div className="h-8 w-56 rounded-lg bg-[var(--surface-strong)] animate-pulse" />
      <div className="h-4 w-72 rounded bg-[var(--surface-strong)] animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 rounded-lg bg-[var(--surface-strong)] animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default function TravelKitPage() {
  const [user, setUser] = useState<User | null>(null);
  const [kits, setKits] = useState<TravelKit[]>([]);
  const [templates, setTemplates] = useState<TravelKit[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchKits(userId: string) {
    const cached = readCachedKits(userId);
    if (cached.length > 0) {
      setKits(cached.filter((kit) => !kit.is_template));
      setTemplates(cached.filter((kit) => kit.is_template));
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    const supabase = createClient();
    // Sin filtro por user_id: RLS devuelve los kits propios + los compartidos
    // conmigo. Las plantillas son siempre personales (solo su dueño es miembro).
    const { data } = await supabase
      .from("travel_kits")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      cacheKits(userId, data as TravelKit[]);
      setKits(data.filter((k: TravelKit) => !k.is_template));
      setTemplates(data.filter((k: TravelKit) => k.is_template));
    }
  }

  useEffect(() => {
    const supabase = createClient();

    // getSession se resuelve desde el almacenamiento local y permite abrir los
    // viajes cacheados sin red. Supabase/RLS validará toda escritura al sincronizar.
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      setUser(user);
      if (user) fetchKits(user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchKits(u.id);
      } else {
        setKits([]);
        setTemplates([]);
      }
    });

    const handleSync = () => {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user.id) void fetchKits(session.user.id);
      });
    };
    window.addEventListener(OFFLINE_SYNC_COMPLETED, handleSync);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener(OFFLINE_SYNC_COMPLETED, handleSync);
    };
  }, []);

  if (loading) return <Skeleton />;

  if (!user) {
    return (
      <PageShell
        eyebrow="Área privada"
        title="TravelKit"
        description="Organiza tus viajes con checklists personalizadas. Accede con tu cuenta."
      >
        <AuthForm />
      </PageShell>
    );
  }

  return (
    <PageShell eyebrow="Tus viajes" title="TravelKit">
      <KitsGrid
        kits={kits}
        templates={templates}
        currentUserId={user.id}
        onRefresh={() => fetchKits(user.id)}
      />
    </PageShell>
  );
}
