-- TravelKit: compartir viajes entre usuarios
-- Añade membresía multiusuario por viaje y reescribe las políticas RLS para
-- basarse en pertenencia (no solo propiedad). Ejecutar tras 20260618_travelkit.sql

-- ── Tabla de miembros ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS travel_kit_members (
  kit_id     UUID REFERENCES travel_kits(id) ON DELETE CASCADE NOT NULL,
  user_id    UUID REFERENCES auth.users(id)  ON DELETE CASCADE NOT NULL,
  role       TEXT NOT NULL DEFAULT 'editor',  -- 'owner' | 'editor'
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (kit_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_kit_members TO authenticated;
ALTER TABLE travel_kit_members ENABLE ROW LEVEL SECURITY;

-- ── Helpers SECURITY DEFINER (evitan recursión de RLS) ───────────────────────
CREATE OR REPLACE FUNCTION public.is_kit_member(_kit_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM travel_kit_members m
    WHERE m.kit_id = _kit_id AND m.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_kit_owner(_kit_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM travel_kits k
    WHERE k.id = _kit_id AND k.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_section_member(_section_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM checklist_sections s
    JOIN travel_kit_members m ON m.kit_id = s.kit_id
    WHERE s.id = _section_id AND m.user_id = auth.uid()
  );
$$;

-- ── Trigger: el creador se añade como miembro 'owner' automáticamente ─────────
CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO travel_kit_members (kit_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'owner')
  ON CONFLICT (kit_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_add_owner_as_member ON travel_kits;
CREATE TRIGGER trg_add_owner_as_member
  AFTER INSERT ON travel_kits
  FOR EACH ROW EXECUTE PROCEDURE public.add_owner_as_member();

-- Backfill: añadir como miembros 'owner' a los dueños de kits ya existentes
INSERT INTO travel_kit_members (kit_id, user_id, role)
SELECT id, user_id, 'owner' FROM travel_kits
ON CONFLICT (kit_id, user_id) DO NOTHING;

-- ── RPC: compartir un viaje con otro usuario por email ───────────────────────
CREATE OR REPLACE FUNCTION public.share_kit(_kit_id uuid, _email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _target uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM travel_kits WHERE id = _kit_id AND user_id = auth.uid()) THEN
    RETURN 'not_owner';
  END IF;
  SELECT id INTO _target FROM auth.users WHERE lower(email) = lower(trim(_email)) LIMIT 1;
  IF _target IS NULL THEN
    RETURN 'user_not_found';
  END IF;
  IF _target = auth.uid() THEN
    RETURN 'self';
  END IF;
  INSERT INTO travel_kit_members (kit_id, user_id, role)
  VALUES (_kit_id, _target, 'editor')
  ON CONFLICT (kit_id, user_id) DO NOTHING;
  RETURN 'ok';
END;
$$;
GRANT EXECUTE ON FUNCTION public.share_kit(uuid, text) TO authenticated;

-- ── RPC: listar miembros de un viaje (con email) ─────────────────────────────
CREATE OR REPLACE FUNCTION public.get_kit_members(_kit_id uuid)
RETURNS TABLE(user_id uuid, email text, role text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT m.user_id, u.email::text, m.role
  FROM travel_kit_members m
  JOIN auth.users u ON u.id = m.user_id
  WHERE m.kit_id = _kit_id AND public.is_kit_member(_kit_id)
  ORDER BY (m.role = 'owner') DESC, u.email;
$$;
GRANT EXECUTE ON FUNCTION public.get_kit_members(uuid) TO authenticated;

-- ── Reescritura de políticas RLS basadas en membresía ────────────────────────

-- travel_kits
DROP POLICY IF EXISTS kits_select ON travel_kits;
DROP POLICY IF EXISTS kits_insert ON travel_kits;
DROP POLICY IF EXISTS kits_update ON travel_kits;
DROP POLICY IF EXISTS kits_delete ON travel_kits;
-- El propietario se incluye explícitamente además de la membresía: al crear un
-- kit con return=representation, Postgres aplica la política SELECT a la fila
-- del RETURNING antes de que el trigger AFTER inserte la membresía, así que sin
-- "auth.uid() = user_id" el INSERT se revertiría por RLS.
CREATE POLICY kits_select ON travel_kits FOR SELECT USING (auth.uid() = user_id OR public.is_kit_member(id));
CREATE POLICY kits_insert ON travel_kits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY kits_update ON travel_kits FOR UPDATE USING (auth.uid() = user_id OR public.is_kit_member(id));
CREATE POLICY kits_delete ON travel_kits FOR DELETE USING (auth.uid() = user_id);

-- checklist_sections
DROP POLICY IF EXISTS sections_select ON checklist_sections;
DROP POLICY IF EXISTS sections_insert ON checklist_sections;
DROP POLICY IF EXISTS sections_update ON checklist_sections;
DROP POLICY IF EXISTS sections_delete ON checklist_sections;
CREATE POLICY sections_select ON checklist_sections FOR SELECT USING (public.is_kit_member(kit_id));
CREATE POLICY sections_insert ON checklist_sections FOR INSERT WITH CHECK (public.is_kit_member(kit_id));
CREATE POLICY sections_update ON checklist_sections FOR UPDATE USING (public.is_kit_member(kit_id));
CREATE POLICY sections_delete ON checklist_sections FOR DELETE USING (public.is_kit_member(kit_id));

-- checklist_items
DROP POLICY IF EXISTS items_select ON checklist_items;
DROP POLICY IF EXISTS items_insert ON checklist_items;
DROP POLICY IF EXISTS items_update ON checklist_items;
DROP POLICY IF EXISTS items_delete ON checklist_items;
CREATE POLICY items_select ON checklist_items FOR SELECT USING (public.is_section_member(section_id));
CREATE POLICY items_insert ON checklist_items FOR INSERT WITH CHECK (public.is_section_member(section_id));
CREATE POLICY items_update ON checklist_items FOR UPDATE USING (public.is_section_member(section_id));
CREATE POLICY items_delete ON checklist_items FOR DELETE USING (public.is_section_member(section_id));

-- travel_kit_members
DROP POLICY IF EXISTS members_select ON travel_kit_members;
DROP POLICY IF EXISTS members_insert ON travel_kit_members;
DROP POLICY IF EXISTS members_update ON travel_kit_members;
DROP POLICY IF EXISTS members_delete ON travel_kit_members;
-- Ver co-miembros de los viajes a los que perteneces
CREATE POLICY members_select ON travel_kit_members FOR SELECT USING (public.is_kit_member(kit_id));
-- Solo el propietario añade miembros (normalmente vía RPC share_kit)
CREATE POLICY members_insert ON travel_kit_members FOR INSERT WITH CHECK (public.is_kit_owner(kit_id));
-- El propietario gestiona roles
CREATE POLICY members_update ON travel_kit_members FOR UPDATE USING (public.is_kit_owner(kit_id));
-- El propietario quita a cualquiera; un miembro puede salirse a sí mismo
CREATE POLICY members_delete ON travel_kit_members FOR DELETE USING (public.is_kit_owner(kit_id) OR user_id = auth.uid());
