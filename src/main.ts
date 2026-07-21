import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/nav.css";
import "./styles/components.css";
import "./styles/sections.css";

import { PortfolioRepository } from "./core/dataLoader";
import { NoiseTexture } from "./core/noise";
import { CustomCursor } from "./core/cursor";
import { RoughTheme } from "./core/rough";
import { StrokeUnderline } from "./components/strokeUnderline";
import { PortfolioThread } from "./components/portfolioThread";
import { HeroSection } from "./sections/hero";
import { AboutSection } from "./sections/about";
import { SkillsSection } from "./sections/skills";
import { ProjectsSection } from "./sections/projects";
import { ExperienceSection } from "./sections/experience";
import { QualificationsSection } from "./sections/qualifications";
import { ContactSection } from "./sections/contact";
import type { AccentColor, PortfolioData } from "./types";

interface NavItem {
  id: string;
  label: string;
  accent: AccentColor;
}

/** Composition root: builds the page shell and wires every section together. */
export class PortfolioApp {
  private static readonly NAV_ITEMS: NavItem[] = [
    { id: "hero", label: "Top", accent: "cyan" },
    { id: "about", label: "About", accent: "magenta" },
    { id: "skills", label: "Skills", accent: "cyan" },
    { id: "projects", label: "Works", accent: "magenta" },
    { id: "experience", label: "Career", accent: "yellow" },
    { id: "qualifications", label: "Licenses", accent: "cyan" },
    { id: "contact", label: "Contact", accent: "yellow" },
  ];

  private readonly root: HTMLElement;
  private cursor: CustomCursor | null = null;
  private portfolioThread: PortfolioThread | null = null;
  private hero: HeroSection | null = null;
  private about: AboutSection | null = null;
  private skills: SkillsSection | null = null;
  private projects: ProjectsSection | null = null;
  private experience: ExperienceSection | null = null;
  private qualifications: QualificationsSection | null = null;
  private contact: ContactSection | null = null;

  constructor(rootSelector: string) {
    const root = document.querySelector<HTMLElement>(rootSelector);
    if (!root) {
      throw new Error(`PortfolioApp: root element not found for selector "${rootSelector}"`);
    }
    this.root = root;
  }

  public bootstrap(): void {
    const data = PortfolioRepository.load();
    this.renderShell(data.profile.name);
    this.initBoardNoise();
    this.cursor = new CustomCursor();
    this.mountSections(data);
    this.initPortfolioThread();
    this.initNavActiveState();
  }

  private renderShell(personaName: string): void {
    this.root.innerHTML = `
      <svg class="hand-drawn-defs" aria-hidden="true" focusable="false">
        <defs>
          <filter id="roughen-edge" x="-15%" y="-15%" width="130%" height="130%">
            <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id="roughen-text" x="-15%" y="-15%" width="130%" height="130%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.06" numOctaves="2" seed="5" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.6" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      <div class="board-noise" data-board-noise aria-hidden="true"></div>
      <nav class="board-nav" aria-label="セクションナビゲーション">
        <span class="board-nav__logo">${personaName}</span>
        ${PortfolioApp.NAV_ITEMS.map(
          (item) =>
            `<a href="#${item.id}" class="nav-tab" data-nav-tab="${item.id}" style="--tab-accent: var(--accent-${item.accent})">${item.label}</a>`,
        ).join("")}
      </nav>
      <main>
        <svg class="portfolio-thread" data-portfolio-thread aria-hidden="true"></svg>
        <div id="hero-root"></div>
        <div id="about-root"></div>
        <div id="skills-root"></div>
        <div id="projects-root"></div>
        <div id="experience-root"></div>
        <div id="qualifications-root"></div>
        <div id="contact-root"></div>
        <footer class="board-footer">
          <p>Built with TypeScript, GSAP, Matter.js &amp; rough.js — ${new Date().getFullYear()}</p>
        </footer>
      </main>
    `;
  }

  private initBoardNoise(): void {
    const el = document.querySelector<HTMLElement>("[data-board-noise]");
    if (!el) return;
    const grain = NoiseTexture.grainUrl();
    if (grain) el.style.backgroundImage = `url(${grain})`;
  }

  private initPortfolioThread(): void {
    const main = this.root.querySelector<HTMLElement>("main");
    const svg = this.root.querySelector<SVGSVGElement>("[data-portfolio-thread]");
    if (main && svg) this.portfolioThread = new PortfolioThread(main, svg);
  }

  private mountSections(data: PortfolioData): void {
    const heroRoot = document.getElementById("hero-root");
    const aboutRoot = document.getElementById("about-root");
    const skillsRoot = document.getElementById("skills-root");
    const projectsRoot = document.getElementById("projects-root");
    const experienceRoot = document.getElementById("experience-root");
    const qualificationsRoot = document.getElementById("qualifications-root");
    const contactRoot = document.getElementById("contact-root");

    if (heroRoot) {
      this.hero = new HeroSection(heroRoot);
      this.hero.mount(data.profile);
      StrokeUnderline.mountAll(heroRoot, RoughTheme.ACCENT_COLORS.cyan);
    }
    if (aboutRoot) {
      this.about = new AboutSection(aboutRoot);
      this.about.mount(data.profile);
      StrokeUnderline.mountAll(aboutRoot, RoughTheme.ACCENT_COLORS.magenta);
    }
    if (skillsRoot) {
      this.skills = new SkillsSection(skillsRoot);
      this.skills.mount({ skills: data.skills, personaName: data.profile.name });
      StrokeUnderline.mountAll(skillsRoot, RoughTheme.ACCENT_COLORS.cyan);
    }
    if (projectsRoot) {
      this.projects = new ProjectsSection(projectsRoot);
      this.projects.mount(data.projects);
      StrokeUnderline.mountAll(projectsRoot, RoughTheme.ACCENT_COLORS.magenta);
    }
    if (experienceRoot) {
      this.experience = new ExperienceSection(experienceRoot);
      this.experience.mount(data.experience);
      StrokeUnderline.mountAll(experienceRoot, RoughTheme.ACCENT_COLORS.yellow);
    }
    if (qualificationsRoot) {
      this.qualifications = new QualificationsSection(qualificationsRoot);
      this.qualifications.mount(data.qualifications);
      StrokeUnderline.mountAll(qualificationsRoot, RoughTheme.ACCENT_COLORS.cyan);
    }
    if (contactRoot) {
      this.contact = new ContactSection(contactRoot);
      this.contact.mount(data.profile);
      StrokeUnderline.mountAll(contactRoot, RoughTheme.ACCENT_COLORS.yellow);
    }
  }

  private initNavActiveState(): void {
    const tabs = new Map<string, HTMLElement>();
    document.querySelectorAll<HTMLElement>("[data-nav-tab]").forEach((tab) => {
      const id = tab.dataset.navTab;
      if (id) tabs.set(id, tab);
    });

    const sections = PortfolioApp.NAV_ITEMS.map((item) => document.getElementById(item.id)).filter(
      (el): el is HTMLElement => el !== null,
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const tab = tabs.get(entry.target.id);
          if (!tab) return;
          tab.classList.toggle("is-active", entry.isIntersecting);
        });
      },
      { threshold: 0.5 },
    );

    sections.forEach((section) => observer.observe(section));
  }

  public dispose(): void {
    this.cursor?.dispose();
    this.portfolioThread?.dispose();
    this.hero?.dispose();
    this.projects?.dispose();
    this.experience?.dispose();
  }
}

new PortfolioApp("#app").bootstrap();
