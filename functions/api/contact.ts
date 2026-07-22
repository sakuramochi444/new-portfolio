interface ContactEnv {
  RESEND_API_KEY: string;
  CONTACT_TO: string;
  CONTACT_FROM: string;
  TURNSTILE_SECRET_KEY: string;
  CONTACT_RATE_LIMIT: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options: { expirationTtl: number }): Promise<void>;
  };
}

interface FunctionContext {
  request: Request;
  env: ContactEnv;
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" },
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" };
    return entities[character];
  });
}

function isValidEmail(value: string): boolean {
  if (value.length < 3 || value.length > 254 || /[\r\n\s]/.test(value)) return false;

  const atIndex = value.lastIndexOf("@");
  if (atIndex <= 0 || atIndex !== value.indexOf("@")) return false;

  const local = value.slice(0, atIndex);
  const domain = value.slice(atIndex + 1).toLowerCase();
  if (local.length > 64 || domain.length > 253) return false;
  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) return false;
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;

  const labels = domain.split(".");
  if (labels.length < 2) return false;
  if (labels.some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return false;

  const topLevelDomain = labels.at(-1) ?? "";
  return /^(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/.test(topLevelDomain);
}

const MAX_REQUEST_BYTES = 32 * 1024;
const RATE_LIMIT_SECONDS = 60;

async function readJson(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get("Content-Length") ?? 0);
  if (declaredLength > MAX_REQUEST_BYTES) throw new Error("payload-too-large");

  if (!request.body) throw new Error("invalid-json");
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_REQUEST_BYTES) {
      await reader.cancel();
      throw new Error("payload-too-large");
    }
    text += decoder.decode(value, { stream: true });
  }

  text += decoder.decode();
  return JSON.parse(text) as unknown;
}

async function verifyTurnstile(request: Request, secret: string, token: string): Promise<boolean> {
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        response: token,
        remoteip: request.headers.get("CF-Connecting-IP") ?? undefined,
      }),
    });

    if (!response.ok) return false;
    const result = (await response.json()) as { success?: boolean; hostname?: string; action?: string };
    return (
      result.success === true &&
      result.hostname === new URL(request.url).hostname &&
      result.action === "contact"
    );
  } catch (error) {
    console.error("Turnstile verification error", error);
    return false;
  }
}

async function rateLimitKey(request: Request): Promise<string> {
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const bytes = new TextEncoder().encode(`contact:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function onRequestPost({ request, env }: FunctionContext): Promise<Response> {
  const origin = request.headers.get("Origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) {
        return json({ error: "このページから送信してください。" }, 403);
      }
    } catch {
      return json({ error: "このページから送信してください。" }, 403);
    }
  }

  let body: {
    name?: unknown;
    email?: unknown;
    emailConfirmation?: unknown;
    message?: unknown;
    website?: unknown;
    startedAt?: unknown;
    turnstileToken?: unknown;
  };
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json")) {
    return json({ error: "送信形式が正しくありません。" }, 415);
  }
  try {
    const parsedBody = await readJson(request);
    if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
      throw new Error("invalid-json");
    }
    body = parsedBody as typeof body;
  } catch (error) {
    if (error instanceof Error && error.message === "payload-too-large") {
      return json({ error: "送信内容が大きすぎます。" }, 413);
    }
    return json({ error: "送信内容を読み取れませんでした。" }, 400);
  }

  if (typeof body.website === "string" && body.website.length > 0) return json({ ok: true });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const emailConfirmation = typeof body.emailConfirmation === "string" ? body.emailConfirmation.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const subjectName = name.replace(/[\r\n]+/g, " ");
  const startedAt = typeof body.startedAt === "number" ? body.startedAt : 0;
  const turnstileToken = typeof body.turnstileToken === "string" ? body.turnstileToken : "";

  if (Date.now() - startedAt < 2_000) return json({ error: "少し待ってから送信してください。" }, 429);
  if (name.length < 1 || name.length > 100) return json({ error: "お名前は1〜100文字で入力してください。" }, 422);
  if (!isValidEmail(email)) return json({ error: "メールアドレスの形式を確認してください。" }, 422);
  if (email !== emailConfirmation) return json({ error: "確認用メールアドレスが一致しません。" }, 422);
  if (message.length < 1 || message.length > 5_000) return json({ error: "メッセージは1〜5000文字で入力してください。" }, 422);
  if (!env.TURNSTILE_SECRET_KEY || !env.CONTACT_RATE_LIMIT) {
    console.error("Contact protection bindings are not configured");
    return json({ error: "お問い合わせ機能の設定が完了していません。" }, 503);
  }
  if (!turnstileToken || !(await verifyTurnstile(request, env.TURNSTILE_SECRET_KEY, turnstileToken))) {
    return json({ error: "セキュリティ確認に失敗しました。もう一度お試しください。" }, 403);
  }

  const limiterKey = await rateLimitKey(request);
  if (await env.CONTACT_RATE_LIMIT.get(limiterKey)) {
    return json({ error: "送信間隔が短すぎます。1分ほど待ってからお試しください。" }, 429);
  }
  await env.CONTACT_RATE_LIMIT.put(limiterKey, "1", { expirationTtl: RATE_LIMIT_SECONDS });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({
      from: env.CONTACT_FROM,
      to: [env.CONTACT_TO],
      reply_to: email,
      subject: `ポートフォリオからのお問い合わせ: ${subjectName}`,
      text: `${message}\n\n送信者: ${name}\n返信先: ${email}`,
      html: `<p>${escapeHtml(message).replace(/\n/g, "<br>")}</p><hr><p>送信者: ${escapeHtml(name)}<br>返信先: ${escapeHtml(email)}</p>`,
    }),
  });

  if (!response.ok) {
    console.error("Resend API error", response.status, await response.text());
    return json({ error: "現在メールを送信できません。時間を置いて再度お試しください。" }, 502);
  }

  return json({ ok: true });
}
