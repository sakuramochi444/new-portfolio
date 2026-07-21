import {
  CONTENT_FILES,
  decodeBase64,
  encodeBase64,
  githubHeaders,
  jsonResponse,
  requireAdmin,
  validateContent,
  type AdminEnv,
  type ContentFile,
} from "../../_lib/admin";

interface FunctionContext {
  request: Request;
  env: AdminEnv;
}

function getFile(request: Request): ContentFile | null {
  const file = new URL(request.url).searchParams.get("file");
  return file && file in CONTENT_FILES ? (file as ContentFile) : null;
}

function githubUrl(env: AdminEnv, file: ContentFile): string {
  const path = CONTENT_FILES[file].split("/").map(encodeURIComponent).join("/");
  return `https://api.github.com/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}/contents/${path}`;
}

export async function onRequestGet({ request, env }: FunctionContext): Promise<Response> {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  const file = getFile(request);
  if (!file) return jsonResponse({ error: "編集対象のファイルが不正です。" }, 400);

  const response = await fetch(`${githubUrl(env, file)}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`, {
    headers: githubHeaders(env),
  });
  const body = (await response.json()) as { content?: string; encoding?: string; sha?: string; message?: string };
  if (!response.ok || body.encoding !== "base64" || !body.content || !body.sha) {
    return jsonResponse({ error: body.message ?? "GitHubからJSONを取得できませんでした。" }, response.status || 502);
  }

  try {
    return jsonResponse({ file, content: JSON.parse(decodeBase64(body.content)), sha: body.sha });
  } catch {
    return jsonResponse({ error: "GitHub上のJSONを解析できませんでした。" }, 502);
  }
}

export async function onRequestPut({ request, env }: FunctionContext): Promise<Response> {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  const file = getFile(request);
  if (!file) return jsonResponse({ error: "編集対象のファイルが不正です。" }, 400);

  let payload: { content?: unknown; sha?: unknown };
  try {
    payload = (await request.json()) as { content?: unknown; sha?: unknown };
  } catch {
    return jsonResponse({ error: "リクエストのJSONが不正です。" }, 400);
  }

  if (typeof payload.sha !== "string") return jsonResponse({ error: "更新元のSHAがありません。" }, 400);
  const validationErrors = validateContent(file, payload.content);
  if (validationErrors.length > 0) return jsonResponse({ error: "入力内容を確認してください。", details: validationErrors }, 422);

  const formatted = `${JSON.stringify(payload.content, null, 2)}\n`;
  const response = await fetch(githubUrl(env, file), {
    method: "PUT",
    headers: githubHeaders(env),
    body: JSON.stringify({
      message: `[admin] Update ${file}.json`,
      content: encodeBase64(formatted),
      sha: payload.sha,
      branch: env.GITHUB_BRANCH,
      committer: {
        name: "Portfolio Admin",
        email: env.ADMIN_EMAIL,
      },
    }),
  });
  const body = (await response.json()) as { content?: { sha?: string }; commit?: { sha?: string }; message?: string };

  if (response.status === 409) {
    return jsonResponse({ error: "GitHub側で更新が競合しました。再読み込みしてから編集してください。" }, 409);
  }
  if (!response.ok) return jsonResponse({ error: body.message ?? "GitHubへ保存できませんでした。" }, response.status || 502);

  return jsonResponse({ ok: true, sha: body.content?.sha, commitSha: body.commit?.sha });
}
