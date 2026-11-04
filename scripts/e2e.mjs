import { execSync, spawnSync, spawn } from "node:child_process";
import path from "node:path";
import { mkdirSync, appendFileSync } from "node:fs";

let simulation;
try {
  const local = JSON.parse(
    execSync("npx supabase status -o json", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );
  const env = {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: local.API_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      local.PUBLISHABLE_KEY || local.ANON_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: local.ANON_KEY,
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    E2E_SUPABASE_URL: local.API_URL,
    E2E_SUPABASE_SERVICE_KEY: local.SERVICE_ROLE_KEY,
    E2E_MAILPIT_URL: local.MAILPIT_URL,
    E2E_APP: "1",
  };
  if (!process.env.E2E_LIVE) {
    simulation = spawn(
      "postman",
      [
        "simulation",
        "run",
        "postman/simulations/assistant-failure.sim.yaml",
        "--port",
        "4010",
        "--no-history",
        "--output",
        "ndjson",
      ],
      { stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
    );
    let ready = false;
    simulation.stdout.on("data", (data) => {
      if (String(data).includes('"listening"')) ready = true;
      mkdirSync("test-results", { recursive: true });
      appendFileSync("test-results/provider-simulation.ndjson", data);
    });
    simulation.on("error", () => {});
    for (let i = 0; i < 100 && !ready; i++)
      await new Promise((resolve) => setTimeout(resolve, 100));
    if (!ready) throw new Error("Simulação indisponível.");
    env.OPENROUTER_BASE_URL = "http://127.0.0.1:4010/openrouter/api/v1";
    env.OPENROUTER_API_KEY = "simulation-only";
    env.E2E_SIMULATION = "1";
  }
  for (const args of [
    ["node_modules/next/dist/bin/next", "build"],
    ["node_modules/@playwright/test/cli.js", "test"],
  ]) {
    const result = spawnSync(
      process.execPath,
      args.map((s, i) => (i === 0 ? path.resolve(s) : s)),
      { env, stdio: "inherit", windowsHide: true },
    );
    if (result.status !== 0) {
      process.exitCode = result.status || 1;
      break;
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 100));
} catch {
  console.error(
    "Não foi possível preparar os testes. Inicie o Supabase local.",
  );
  process.exitCode = 1;
} finally {
  simulation?.kill();
}
