interface ContactEnv {
  RESEND_API_KEY: string;
  CONTACT_TO: string;
  CONTACT_FROM: string;
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

export async function onRequestPost({ request, env }: FunctionContext): Promise<Response> {
  let body: { name?: unknown; email?: unknown; message?: unknown; website?: unknown; startedAt?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "送信内容を読み取れませんでした。" }, 400);
  }

  if (typeof body.website === "string" && body.website.length > 0) return json({ ok: true });

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const startedAt = typeof body.startedAt === "number" ? body.startedAt : 0;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (Date.now() - startedAt < 2_000) return json({ error: "少し待ってから送信してください。" }, 429);
  if (name.length < 1 || name.length > 100) return json({ error: "お名前は1〜100文字で入力してください。" }, 422);
  if (!emailPattern.test(email) || email.length > 254) return json({ error: "メールアドレスを確認してください。" }, 422);
  if (message.length < 1 || message.length > 5_000) return json({ error: "メッセージは1〜5000文字で入力してください。" }, 422);

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
      subject: `ポートフォリオからのお問い合わせ: ${name}`,
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
