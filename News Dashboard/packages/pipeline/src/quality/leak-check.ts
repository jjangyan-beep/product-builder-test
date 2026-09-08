import { readdir, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const FORBIDDEN_JSON_KEY = /^(body|content|description|snippet|socialimage|image|cookie|authorization|token|secret|api[-_]?key|password)$/i;
const privateKeyPattern = "-----BEGIN [A-Z ]+PRIVATE" + " KEY-----";
const SECRET_VALUE = new RegExp(`(?:AIza[0-9A-Za-z_-]{20,}|gh[pousr]_[0-9A-Za-z]{20,}|sk-[0-9A-Za-z]{20,}|xox[baprs]-[0-9A-Za-z-]{10,}|${privateKeyPattern})`);

async function listFiles(path: string): Promise<string[]> {
  const info = await stat(path);
  if (info.isFile()) return [path];
  const entries = await readdir(path);
  return (await Promise.all(entries.sort().map((entry) => listFiles(resolve(path, entry))))).flat();
}

function inspectJson(value: unknown, file: string, path = "$root"): string[] {
  if (Array.isArray(value)) return value.flatMap((item, index) => inspectJson(item, file, `${path}[${index}]`));
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => [
    ...(FORBIDDEN_JSON_KEY.test(key) ? [`${file}: forbidden key at ${path}.${key}`] : []),
    ...inspectJson(child, file, `${path}.${key}`),
  ]);
}

async function main(): Promise<void> {
  const roots = process.argv.slice(2).map((path) => resolve(path));
  if (!roots.length) throw new Error("Provide one or more files or directories to scan");
  const files = (await Promise.all(roots.map(listFiles))).flat().sort();
  const findings: string[] = [];
  for (const file of files) {
    const text = await readFile(file, "utf8");
    if (SECRET_VALUE.test(text)) findings.push(`${file}: secret-shaped value detected`);
    if (file.endsWith(".json")) {
      try { findings.push(...inspectJson(JSON.parse(text), file)); }
      catch { findings.push(`${file}: invalid JSON`); }
    }
  }
  if (findings.length) throw new Error(findings.join("\n"));
  process.stdout.write(`Leak check passed for ${files.length} files.\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Leak check failed"}\n`);
  process.exitCode = 1;
});
