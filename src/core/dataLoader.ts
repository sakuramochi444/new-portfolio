import type { PortfolioData } from "../types";
import profileJson from "../data/profile.json";
import skillsJson from "../data/skills.json";
import projectsJson from "../data/projects.json";
import experienceJson from "../data/experience.json";
import qualificationsJson from "../data/qualifications.json";

/** Static repository that loads and types the bundled JSON portfolio data. */
export class PortfolioRepository {
  public static load(): PortfolioData {
    return {
      profile: profileJson as PortfolioData["profile"],
      skills: skillsJson as PortfolioData["skills"],
      projects: projectsJson as PortfolioData["projects"],
      experience: experienceJson as PortfolioData["experience"],
      qualifications: qualificationsJson as PortfolioData["qualifications"],
    };
  }
}
