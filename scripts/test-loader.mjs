// Resolver hook for `node --test` so that lib code using `@/` aliases and
// extensionless relative `.ts` imports can be imported directly by tests.
// This does NOT affect the Next.js build/runtime (which uses its own resolver);
// it only helps the Node test runner locate modules.
import { pathToFileURL, fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const EXTS = ["", ".ts", ".js", ".mjs", ".cjs", ".json"];

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const abs = path.resolve(root, "src", specifier.slice(2));
    for (const e of EXTS) {
      const f = abs + e;
      if (existsSync(f)) {
        try {
          return await nextResolve(pathToFileURL(f).href, context);
        } catch {
          // try next extension
        }
      }
    }
    return nextResolve(specifier, context);
  }

  if (specifier.startsWith(".") && !path.extname(specifier)) {
    const base = fileURLToPath(context.parentURL);
    const abs = path.resolve(path.dirname(base), specifier);
    for (const e of EXTS) {
      const f = abs + e;
      if (existsSync(f)) {
        try {
          return await nextResolve(pathToFileURL(f).href, context);
        } catch {
          // try next extension
        }
      }
    }
  }

  return nextResolve(specifier, context);
}
