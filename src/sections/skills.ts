import type { Skill } from "../types";
import { RevealAnimator } from "../core/reveal";
import { Section } from "./section";

export interface SkillsSectionProps {
  skills: Skill[];
  personaName: string;
}

export class SkillsSection extends Section<SkillsSectionProps> {
  private static readonly GROUPS: Array<{
    category: Skill["category"];
    label: string;
    code: string;
    description: string;
    accent: Skill["accent"];
    tilt: number;
  }> = [
    {
      category: "primary",
      label: "主力",
      code: "core",
      description: "設計から実装まで、現在の制作で中心に使っている技術です。",
      accent: "cyan",
      tilt: -0.25,
    },
    {
      category: "experienced",
      label: "制作経験あり",
      code: "built_with",
      description: "作品や業務で実際に使用し、成果物までつなげた技術です。",
      accent: "magenta",
      tilt: 0.45,
    },
    {
      category: "learning",
      label: "学習中・基礎経験",
      code: "learning",
      description: "書籍・授業・試作を通して、基礎を積み上げている技術です。",
      accent: "yellow",
      tilt: -0.35,
    },
  ];

  public mount({ skills }: SkillsSectionProps): void {
    this.setMarkup(`
      <section id="skills" class="section skills" data-accent="cyan" data-section-label="Skills">
        <div class="section-inner skills__inner">
          <p class="section-tag" style="--section-accent: var(--accent-cyan)">// toolkit.md</p>
          <h2 class="section-heading"><span class="stroke-underline">得意なこと<svg></svg></span></h2>
          <p class="skills__summary">TypeScriptとReactを中心に、Cloudflare Workers・D1を使ったWebアプリを開発しています。C#とUnityを使用したゲーム・Windowsアプリ開発にも取り組んでいます。</p>
          <div class="skills__notebook">
            ${SkillsSection.GROUPS.map((group, index) => this.renderGroup(group, skills, index)).join("")}
          </div>
        </div>
      </section>
    `);

    RevealAnimator.reveal(this.queryAll(".skills__group, .skills__item"), { stagger: 0.045 });
  }

  private renderGroup(group: (typeof SkillsSection.GROUPS)[number], skills: Skill[], index: number): string {
    const groupSkills = skills.filter((skill) => skill.category === group.category);
    return `
      <section class="pin-card skills__group skills__group--${group.category}" aria-labelledby="skills-group-${group.category}" style="--group-index:${index}; --tilt:${group.tilt}deg; --pin-color:var(--accent-${group.accent})">
        <span class="tape skills__tape" aria-hidden="true"></span>
        <header class="skills__group-header">
          <p class="skills__group-code">${group.code}</p>
          <h3 id="skills-group-${group.category}">${group.label}</h3>
          <p>${group.description}</p>
        </header>
        <ul class="skills__items">
          ${groupSkills
            .map(
              (skill) => `
                <li class="skills__item" style="--skill-accent:var(--accent-${skill.accent})">
                  <span class="skills__item-mark" aria-hidden="true"></span>
                  <div>
                    <p class="skills__item-name">${skill.name}</p>
                    <p class="skills__item-note">${skill.note}</p>
                  </div>
                </li>`,
            )
            .join("")}
        </ul>
      </section>`;
  }
}
