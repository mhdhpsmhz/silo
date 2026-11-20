export interface DentouColor {
  hex: string;
  name: string;
  japanese: string;
}

export const DENTOU_IRO_COLORS: DentouColor[] = [
  { hex: "#A93838", name: "Deep Crimson", japanese: "Enji" },
  { hex: "#48929B", name: "Slate Teal", japanese: "Asagi" },
  { hex: "#1F4788", name: "Lapis Blue", japanese: "Ruri" },
  { hex: "#1F9967", name: "Pine Green", japanese: "Tokiwa" },
  { hex: "#FFA400", name: "Marigold Amber", japanese: "Yamabuki" },
  { hex: "#985629", name: "Chestnut Bronze", japanese: "Kitsune" },
  { hex: "#89729E", name: "Wisteria Violet", japanese: "Fuji" },
  { hex: "#F47983", name: "Peach Rose", japanese: "Momo" },
];

export const DEFAULT_CATEGORY_ICON = "lucide:book-open";

export interface IconOption {
  name: string;
  label: string;
  keywords: string[];
}

export const CATEGORY_ICON_OPTIONS: IconOption[] = [
  {
    name: "lucide:book-open",
    label: "Book Open",
    keywords: ["study", "reading", "knowledge", "docs"],
  },
  {
    name: "lucide:code-2",
    label: "Code",
    keywords: ["programming", "software", "dev", "engineering"],
  },
  {
    name: "lucide:cpu",
    label: "Processor",
    keywords: ["systems", "hardware", "architecture", "compute"],
  },
  {
    name: "lucide:layers",
    label: "Layers",
    keywords: ["design", "stack", "ui", "system"],
  },
  {
    name: "lucide:terminal",
    label: "Terminal",
    keywords: ["cli", "shell", "linux", "devops"],
  },
  {
    name: "lucide:database",
    label: "Database",
    keywords: ["sql", "postgres", "storage", "data"],
  },
  {
    name: "lucide:compass",
    label: "Compass",
    keywords: ["explore", "strategy", "guide", "career"],
  },
  {
    name: "lucide:microscope",
    label: "Microscope",
    keywords: ["science", "research", "lab", "biology"],
  },
  {
    name: "lucide:atom",
    label: "Atom",
    keywords: ["physics", "chemistry", "quantum", "theory"],
  },
  {
    name: "lucide:calculator",
    label: "Calculator",
    keywords: ["math", "finance", "statistics", "logic"],
  },
  {
    name: "lucide:palette",
    label: "Palette",
    keywords: ["art", "visual", "color", "illustration"],
  },
  {
    name: "lucide:camera",
    label: "Camera",
    keywords: ["film", "photography", "cinema", "video"],
  },
  {
    name: "lucide:music",
    label: "Music",
    keywords: ["audio", "sound", "production", "synth"],
  },
  {
    name: "lucide:globe",
    label: "Globe",
    keywords: ["history", "geography", "world", "culture"],
  },
  {
    name: "lucide:landmark",
    label: "Landmark",
    keywords: ["economics", "politics", "philosophy", "law"],
  },
  {
    name: "lucide:briefcase",
    label: "Briefcase",
    keywords: ["business", "product", "startup", "work"],
  },
  {
    name: "lucide:wrench",
    label: "Wrench",
    keywords: ["craft", "workshop", "maker", "tools"],
  },
  {
    name: "lucide:brain",
    label: "Brain",
    keywords: ["psychology", "cognition", "ai", "ml"],
  },
  {
    name: "lucide:rocket",
    label: "Rocket",
    keywords: ["space", "launch", "aerospace", "growth"],
  },
  {
    name: "lucide:pen-tool",
    label: "Pen Tool",
    keywords: ["typography", "vector", "drafting", "writing"],
  },
  {
    name: "lucide:folder-kanban",
    label: "Kanban",
    keywords: ["workflow", "planning", "agile", "management"],
  },
  {
    name: "lucide:clapperboard",
    label: "Clapperboard",
    keywords: ["documentary", "essay", "editing", "motion"],
  },
  {
    name: "lucide:headphones",
    label: "Headphones",
    keywords: ["podcast", "lecture", "talk", "interview"],
  },
  {
    name: "lucide:shield-check",
    label: "Shield",
    keywords: ["security", "crypto", "privacy", "audit"],
  },
];

export const SILO_COLORS = {
  background: "#1C1C1C",
  surface: "#242424",
  elevated: "#2C2C2C",
  border: "#363636",
  text: "#F4EFE3",
  muted: "#9E9A90",
  subtle: "#6E6B63",
} as const;
