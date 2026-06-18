-- TravelKit: tablas para viajes, secciones y checklists
-- Ejecutar en: supabase.com → tu proyecto → SQL Editor

-- Tabla principal de viajes/plantillas
CREATE TABLE travel_kits (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title       TEXT NOT NULL,
  destination TEXT,
  trip_date   DATE,
  is_template BOOLEAN DEFAULT FALSE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Secciones dentro de un kit (ej: Documentos, Ropa, Tecnología)
CREATE TABLE checklist_sections (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kit_id     UUID REFERENCES travel_kits(id) ON DELETE CASCADE NOT NULL,
  title      TEXT NOT NULL,
  position   INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Ítems individuales con checkbox
CREATE TABLE checklist_items (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID REFERENCES checklist_sections(id) ON DELETE CASCADE NOT NULL,
  label      TEXT NOT NULL,
  checked    BOOLEAN DEFAULT FALSE NOT NULL,
  position   INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Trigger para updated_at en travel_kits
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_travel_kits_updated_at
  BEFORE UPDATE ON travel_kits
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ── Privilegios de tabla ────────────────────────────────────────────────────
-- Los usuarios autenticados necesitan acceso a nivel de tabla; RLS (abajo) lo
-- restringe a sus propias filas. El rol anon NO recibe acceso (datos privados).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_kits        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_sections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_items    TO authenticated;

-- ── Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE travel_kits       ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items    ENABLE ROW LEVEL SECURITY;

-- travel_kits: solo el propietario
CREATE POLICY "kits_select" ON travel_kits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "kits_insert" ON travel_kits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "kits_update" ON travel_kits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "kits_delete" ON travel_kits FOR DELETE USING (auth.uid() = user_id);

-- checklist_sections: acceso via kit del propietario
CREATE POLICY "sections_select" ON checklist_sections FOR SELECT USING (
  EXISTS (SELECT 1 FROM travel_kits WHERE travel_kits.id = checklist_sections.kit_id AND travel_kits.user_id = auth.uid())
);
CREATE POLICY "sections_insert" ON checklist_sections FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM travel_kits WHERE travel_kits.id = checklist_sections.kit_id AND travel_kits.user_id = auth.uid())
);
CREATE POLICY "sections_update" ON checklist_sections FOR UPDATE USING (
  EXISTS (SELECT 1 FROM travel_kits WHERE travel_kits.id = checklist_sections.kit_id AND travel_kits.user_id = auth.uid())
);
CREATE POLICY "sections_delete" ON checklist_sections FOR DELETE USING (
  EXISTS (SELECT 1 FROM travel_kits WHERE travel_kits.id = checklist_sections.kit_id AND travel_kits.user_id = auth.uid())
);

-- checklist_items: acceso via section → kit del propietario
CREATE POLICY "items_select" ON checklist_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM checklist_sections
    JOIN travel_kits ON travel_kits.id = checklist_sections.kit_id
    WHERE checklist_sections.id = checklist_items.section_id AND travel_kits.user_id = auth.uid()
  )
);
CREATE POLICY "items_insert" ON checklist_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM checklist_sections
    JOIN travel_kits ON travel_kits.id = checklist_sections.kit_id
    WHERE checklist_sections.id = checklist_items.section_id AND travel_kits.user_id = auth.uid()
  )
);
CREATE POLICY "items_update" ON checklist_items FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM checklist_sections
    JOIN travel_kits ON travel_kits.id = checklist_sections.kit_id
    WHERE checklist_sections.id = checklist_items.section_id AND travel_kits.user_id = auth.uid()
  )
);
CREATE POLICY "items_delete" ON checklist_items FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM checklist_sections
    JOIN travel_kits ON travel_kits.id = checklist_sections.kit_id
    WHERE checklist_sections.id = checklist_items.section_id AND travel_kits.user_id = auth.uid()
  )
);
