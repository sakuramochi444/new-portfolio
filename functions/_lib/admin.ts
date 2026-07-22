export interface AdminEnv {
  GITHUB_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
  ADMIN_EMAIL: string;
  CF_ACCESS_TEAM_DOMAIN: string;
  CF_ACCESS_AUD: string;
}

export const CONTENT_FILES = {
  profile: "src/data/profile.json",
  skills: "src/data/skills.json",
  projects: "src/data/projects.json",
  experience: "src/data/experience.json",
  qualifications: "src/data/qualifications.json",
} as const;

export type ContentFile = keyof typeof CONTENT_FILES;

interface AccessClaims {
  aud?: string | string[];
  email?: string;
  exp?: number;
  nbf?: number;
  iss?: string;
}

interface AccessHeader {
  alg?: string;
  kid?: string;
}

type AccessJwk = JsonWebKey & { kid?: string };

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

function decodeJsonPart<T>(value: string): T {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value))) as T;
}

export async function requireAdmin(request: Request, env: AdminEnv): Promise<Response | null> {
  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token) return jsonResponse({ error: "Cloudflare Accessの認証が必要です。" }, 401);

  const rawTeamDomain = env.CF_ACCESS_TEAM_DOMAIN?.trim();
  const expectedAudience = env.CF_ACCESS_AUD?.trim().replace(/^["']|["']$/g, "");
  const expectedEmail = env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!rawTeamDomain || !expectedAudience || !expectedEmail) {
    return jsonResponse(
      { error: "管理者認証の環境変数が不足しています。", code: "ACCESS_CONFIG_MISSING" },
      500,
    );
  }

  let teamDomain: string;
  try {
    const url = new URL(/^https?:\/\//i.test(rawTeamDomain) ? rawTeamDomain : `https://${rawTeamDomain}`);
    if (url.protocol !== "https:") throw new Error("Team domain must use HTTPS");
    teamDomain = url.origin;
  } catch {
    return jsonResponse(
      { error: "CF_ACCESS_TEAM_DOMAINの形式を確認してください。", code: "ACCESS_TEAM_DOMAIN_INVALID" },
      500,
    );
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return jsonResponse({ error: "認証トークンの形式が不正です。", code: "ACCESS_TOKEN_INVALID" }, 401);
  }

  try {
    const header = decodeJsonPart<AccessHeader>(parts[0]);
    const claims = decodeJsonPart<AccessClaims>(parts[1]);
    if (header.alg !== "RS256" || !header.kid) {
      return jsonResponse({ error: "認証トークンの署名方式が不正です。", code: "ACCESS_TOKEN_ALGORITHM" }, 401);
    }

    const certResponse = await fetch(`${teamDomain}/cdn-cgi/access/certs`);
    if (!certResponse.ok) {
      return jsonResponse(
        { error: "Cloudflare Accessの署名鍵を取得できません。Team Domainを確認してください。", code: "ACCESS_CERTS_UNAVAILABLE" },
        502,
      );
    }
    const certs = (await certResponse.json()) as { keys?: AccessJwk[] };
    const jwk = certs.keys?.find((key) => key.kid === header.kid);
    if (!jwk) {
      return jsonResponse({ error: "認証トークンに対応する署名鍵がありません。", code: "ACCESS_KEY_NOT_FOUND" }, 401);
    }

    const publicKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const signatureValid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      publicKey,
      decodeBase64Url(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );

    const now = Math.floor(Date.now() / 1000);
    const audiences = Array.isArray(claims.aud) ? claims.aud : claims.aud ? [claims.aud] : [];
    const email = claims.email?.toLowerCase();
    if (!signatureValid) return jsonResponse({ error: "認証トークンの署名が不正です。", code: "ACCESS_SIGNATURE_INVALID" }, 401);
    if (claims.iss?.replace(/\/$/, "") !== teamDomain) {
      return jsonResponse({ error: "AccessのTeam Domainが一致しません。", code: "ACCESS_ISSUER_MISMATCH" }, 401);
    }
    if (!audiences.includes(expectedAudience)) {
      return jsonResponse({ error: "Access ApplicationのAUDが一致しません。", code: "ACCESS_AUDIENCE_MISMATCH" }, 401);
    }
    if (typeof claims.exp !== "number" || claims.exp <= now || (typeof claims.nbf === "number" && claims.nbf > now)) {
      return jsonResponse({ error: "認証セッションの有効期限が切れています。", code: "ACCESS_TOKEN_EXPIRED" }, 401);
    }
    if (email !== expectedEmail) {
      return jsonResponse({ error: "この管理画面を利用する権限がありません。", code: "ACCESS_EMAIL_MISMATCH" }, 403);
    }
    return null;
  } catch (error) {
    console.error("Cloudflare Access validation failed", error instanceof Error ? error.message : "Unknown error");
    return jsonResponse({ error: "管理者認証を確認できませんでした。", code: "ACCESS_VALIDATION_FAILED" }, 401);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasStrings(value: Record<string, unknown>, keys: string[]): boolean {
  return keys.every((key) => typeof value[key] === "string" && String(value[key]).trim().length > 0);
}

function isStringArray(value: unknown): boolean {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function validateContent(file: ContentFile, value: unknown): string[] {
  const errors: string[] = [];
  const requireArray = (): unknown[] => {
    if (!Array.isArray(value)) {
      errors.push("ルートは配列である必要があります。");
      return [];
    }
    return value;
  };

  if (file === "profile") {
    if (!isRecord(value)) return ["profile.jsonのルートはオブジェクトである必要があります。"];
    if (!hasStrings(value, ["name", "nameReading", "role", "tagline", "location", "email"])) {
      errors.push("プロフィールの必須文字列が不足しています。");
    }
    if (!isStringArray(value.bio)) errors.push("bioは文字列の配列である必要があります。");
    if (!Array.isArray(value.socials)) errors.push("socialsは配列である必要があります。");
    return errors;
  }

  const items = requireArray();
  items.forEach((item, index) => {
    if (!isRecord(item)) {
      errors.push(`${index + 1}件目はオブジェクトである必要があります。`);
      return;
    }
    if (file === "skills") {
      if (!hasStrings(item, ["id", "name", "category", "note", "accent"]) || typeof item.level !== "number") {
        errors.push(`${index + 1}件目のスキルに必須項目が不足しています。`);
      }
      if (!["language", "framework", "infra", "tool", "other"].includes(String(item.category))) {
        errors.push(`${index + 1}件目のスキルカテゴリが不正です。`);
      }
      if (![1, 2, 3, 4, 5].includes(Number(item.level))) errors.push(`${index + 1}件目の習熟度は1〜5で指定してください。`);
    } else if (file === "projects") {
      if (!hasStrings(item, ["id", "title", "period", "summary", "description", "role", "accent"])) {
        errors.push(`${index + 1}件目の作品に必須項目が不足しています。`);
      }
      if (!isStringArray(item.tags) || !isStringArray(item.skillIds) || !isStringArray(item.images) || !Array.isArray(item.links)) {
        errors.push(`${index + 1}件目の作品の配列項目が不正です。`);
      }
    } else if (file === "experience") {
      if (!hasStrings(item, ["id", "period", "title", "org", "description", "kind"])) {
        errors.push(`${index + 1}件目の経歴に必須項目が不足しています。`);
      }
      if (!["work", "education", "milestone"].includes(String(item.kind))) {
        errors.push(`${index + 1}件目の経歴種別が不正です。`);
      }
    } else if (file === "qualifications") {
      if (!hasStrings(item, ["id", "name", "date", "accent"])) {
        errors.push(`${index + 1}件目の資格に必須項目が不足しています。`);
      }
    }

    if ("accent" in item && !["cyan", "magenta", "yellow"].includes(String(item.accent))) {
      errors.push(`${index + 1}件目のアクセント色が不正です。`);
    }
  });

  const ids = items.filter(isRecord).map((item) => item.id).filter((id): id is string => typeof id === "string");
  if (new Set(ids).size !== ids.length) errors.push("idが重複しています。");
  return errors;
}

export function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function decodeBase64(value: string): string {
  const binary = atob(value.replace(/\s/g, ""));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

export function githubHeaders(env: AdminEnv): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "new-portfolio-admin",
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
