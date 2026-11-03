import { execSync, spawnSync } from "node:child_process";
import path from "node:path";

try {
  const local = JSON.parse(execSync("npx supabase status -o json", { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
  const env = { ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: local.PUBLISHABLE_KEY || local.ANON_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: local.ANON_KEY,
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    E2E_SUPABASE_URL: local.API_URL,
    E2E_SUPABASE_SERVICE_KEY: local.SERVICE_ROLE_KEY,
    E2E_MAILPIT_URL: local.MAILPIT_URL,
    E2E_APP: "1",
  };
  for (const args of [["node_modules/next/dist/bin/next", "build"], ["node_modules/@playwright/test/cli.js", "test"]]) {
    const result = spawnSync(process.execPath, args.map((s, i) => i === 0 ? path.resolve(s) : s), { env, stdio: "inherit", windowsHide: true });
    if (result.status !== 0) { process.exitCode = result.status || 1; break; }
  }
} catch {
  console.error("Não foi possível preparar os testes. Inicie o Supabase local.");
  process.exitCode = 1;
}
