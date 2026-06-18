export type TravelKit = {
  id: string;
  user_id: string;
  title: string;
  destination: string | null;
  trip_date: string | null;
  is_template: boolean;
  created_at: string;
  updated_at: string;
};

export type ChecklistSection = {
  id: string;
  kit_id: string;
  title: string;
  position: number;
  created_at: string;
};

export type ChecklistItem = {
  id: string;
  section_id: string;
  label: string;
  checked: boolean;
  position: number;
  created_at: string;
};

export type SectionWithItems = ChecklistSection & { items: ChecklistItem[] };
export type KitWithSections = TravelKit & { sections: SectionWithItems[] };

export type KitMember = {
  user_id: string;
  email: string;
  role: "owner" | "editor";
};
