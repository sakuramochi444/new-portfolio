import "./styles/tokens.css";
import "./styles/admin.css";

type ContentFile = "profile" | "skills" | "projects" | "experience" | "qualifications";

const FILE_META: Record<ContentFile, { label: string; path: string }> = {
  profile: { label: "Profile", path: "src/data/profile.json" },
  skills: { label: "Skills", path: "src/data/skills.json" },
  projects: { label: "Works", path: "src/data/projects.json" },
  experience: { label: "Career", path: "src/data/experience.json" },
  qualifications: { label: "Licenses", path: "src/data/qualifications.json" },
};

function requiredElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Admin element not found: ${selector}`);
  return element;
}

const editor = requiredElement<HTMLTextAreaElement>("[data-json-editor]");
const saveButton = requiredElement<HTMLButtonElement>("[data-save]");
const formatButton = requiredElement<HTMLButtonElement>("[data-format]");
const reloadButton = requiredElement<HTMLButtonElement>("[data-reload]");
const status = requiredElement<HTMLElement>("[data-admin-status]");
const validity = requiredElement<HTMLElement>("[data-validity]");
const title = requiredElement<HTMLElement>("[data-editor-title]");
const filePath = requiredElement<HTMLElement>("[data-file-path]");
const fileButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-file]"));

let activeFile: ContentFile = "profile";
let activeSha = "";
let lastLoadedText = "";
let dirty = false;

function formatJson(value: unknown): string {
  const formatted = JSON.stringify(value, null, 2);
  if (typeof formatted !== "string") throw new Error("JSONとして表示できない値です。");
  return formatted;
}

function setStatus(message: string, kind: "idle" | "success" | "error" = "idle"): void {
  status.textContent = message;
  status.dataset.kind = kind;
}

function setBusy(busy: boolean): void {
  editor.disabled = busy || !activeSha;
  formatButton.disabled = busy || !activeSha;
  reloadButton.disabled = busy;
  saveButton.disabled = busy || !dirty || !activeSha;
}

function validateEditor(): unknown | null {
  try {
    const parsed = JSON.parse(editor.value) as unknown;
    validity.textContent = "JSON OK";
    validity.dataset.valid = "true";
    return parsed;
  } catch (error) {
    validity.textContent = "JSONエラー";
    validity.dataset.valid = "false";
    setStatus(error instanceof Error ? error.message : "JSONを解析できません。", "error");
    return null;
  }
}

async function loadFile(file: ContentFile): Promise<void> {
  activeFile = file;
  const meta = FILE_META[file];
  title.textContent = meta.label;
  filePath.textContent = meta.path;
  fileButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.file === file));
  dirty = false;
  activeSha = "";
  setBusy(true);
  setStatus("GitHubから読み込んでいます…");
  validity.textContent = "確認中";
  validity.removeAttribute("data-valid");

  try {
    const response = await fetch(`/api/admin/content?file=${encodeURIComponent(file)}`, {
      headers: { Accept: "application/json" },
    });
    const body = (await response.json()) as { content?: unknown; sha?: string; error?: string };
    if (!response.ok || !body.sha) throw new Error(body.error ?? "JSONを取得できませんでした。");

    activeSha = body.sha;
    lastLoadedText = formatJson(body.content);
    editor.value = lastLoadedText;
    validateEditor();
    setStatus("GitHub上の最新版を表示しています。", "success");
  } catch (error) {
    editor.value = "";
    activeSha = "";
    setStatus(error instanceof Error ? error.message : "読み込みに失敗しました。", "error");
  } finally {
    setBusy(false);
  }
}

editor.addEventListener("input", () => {
  dirty = editor.value !== lastLoadedText;
  saveButton.disabled = !dirty || !activeSha;
  validateEditor();
});

formatButton.addEventListener("click", () => {
  const parsed = validateEditor();
  if (parsed === null) return;
  editor.value = formatJson(parsed);
  dirty = editor.value !== lastLoadedText;
  saveButton.disabled = !dirty || !activeSha;
  setStatus("JSONを整形しました。");
});

reloadButton.addEventListener("click", () => {
  if (dirty && !window.confirm("未保存の変更を破棄してGitHubから再読み込みしますか？")) return;
  void loadFile(activeFile);
});

saveButton.addEventListener("click", async () => {
  const content = validateEditor();
  if (content === null || !activeSha) return;
  if (!window.confirm(`${FILE_META[activeFile].path} をmainブランチへ保存し、公開を開始しますか？`)) return;

  setBusy(true);
  setStatus("GitHubへ保存しています…");
  try {
    const response = await fetch(`/api/admin/content?file=${encodeURIComponent(activeFile)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ content, sha: activeSha }),
    });
    const body = (await response.json()) as { sha?: string; error?: string; details?: string[] };
    if (!response.ok) {
      const detail = body.details?.join("\n");
      throw new Error([body.error, detail].filter(Boolean).join("\n") || "保存に失敗しました。");
    }

    activeSha = body.sha ?? activeSha;
    lastLoadedText = formatJson(content);
    editor.value = lastLoadedText;
    dirty = false;
    setStatus("保存しました。Cloudflareで自動公開が始まっています。", "success");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "保存に失敗しました。", "error");
  } finally {
    setBusy(false);
  }
});

fileButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const file = button.dataset.file as ContentFile | undefined;
    if (!file || file === activeFile) return;
    if (dirty && !window.confirm("未保存の変更を破棄して別のファイルを開きますか？")) return;
    void loadFile(file);
  });
});

window.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    if (!saveButton.disabled) saveButton.click();
  }
});

window.addEventListener("beforeunload", (event) => {
  if (!dirty) return;
  event.preventDefault();
});

void loadFile(activeFile);
