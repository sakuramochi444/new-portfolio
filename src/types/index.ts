export type AccentColor = "cyan" | "magenta" | "yellow";

export interface SocialLink {
  label: string;
  url: string;
  icon: "github" | "twitter" | "linkedin" | "mail" | "zenn" | "qiita";
}

export interface Profile {
  name: string;
  nameReading: string;
  role: string;
  tagline: string;
  bio: string[];
  location: string;
  email: string;
  socials: SocialLink[];
}

export interface Skill {
  id: string;
  name: string;
  category: "language" | "framework" | "infra" | "tool" | "other";
  level: 1 | 2 | 3 | 4 | 5;
  note: string;
  accent: AccentColor;
}

export interface Project {
  id: string;
  title: string;
  period: string;
  summary: string;
  description: string;
  role: string;
  tags: string[];
  skillIds: string[];
  links: { label: string; url: string }[];
  accent: AccentColor;
  images: string[];
}

export interface ExperienceItem {
  id: string;
  period: string;
  title: string;
  org: string;
  description: string;
  kind: "work" | "education" | "milestone";
}

export interface Qualification {
  id: string;
  name: string;
  date: string;
  accent: AccentColor;
}

export interface PortfolioData {
  profile: Profile;
  skills: Skill[];
  projects: Project[];
  experience: ExperienceItem[];
  qualifications: Qualification[];
}
