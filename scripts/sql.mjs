import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";

// This administrative tool is never imported by application code. Credentials
// travel only in the child environment, never command arguments or console logs.
const root = process.cwd();
const redactions = [process.env.DATABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.OPENROUTER_API_KEY].filter(Boolean);

function redact(value) {
  return redactions.reduce((text, secret) => text.split(secret).join("[REDACTED]"), String(value));
}

try {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL precisa estar configurada.");
  const connection = new URL(process.env.DATABASE_URL);
  if (!["postgres:", "postgresql:"].includes(connection.protocol)) throw new Error("Protocolo de banco inválido.");
  const password = decodeURIComponent(connection.password);
  if (password) redactions.push(password, connection.password);
  const env = {
    ...process.env,
    PGHOST: connection.hostname,
    PGPORT: connection.port || "5432",
    PGUSER: decodeURIComponent(connection.username),
    PGPASSWORD: password,
    PGDATABASE: connection.pathname.slice(1),
    PGSSLMODE: ["localhost", "127.0.0.1", "[::1]"].includes(connection.hostname) ? "disable" : "require",
    PGCONNECT_TIMEOUT: "10",
  };
  const args = process.argv.slice(2);
  const files = args[0] === "--test"
    ? readdirSync(path.join(root, "supabase/tests")).filter((file) => file.endsWith(".sql")).sort().map((file) => `supabase/tests/${file}`)
    : args;
  if (files.length === 0) throw new Error("Informe um arquivo SQL ou --test.");
  for (const file of files) {
    const absolute = path.resolve(root, file);
    const relative = path.relative(path.join(root, "supabase"), absolute);
    if (relative.startsWith("..") || path.isAbsolute(relative) || !relative.endsWith(".sql")) {
      throw new Error("Somente arquivos SQL dentro de supabase/ são permitidos.");
    }
    console.log(`Executando ${path.relative(root, absolute)}...`);
    const result = spawnSync("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-f", absolute], {
      env,
      encoding: "utf8",
      timeout: 60_000,
      windowsHide: true,
    });
    if (result.status !== 0) {
      throw new Error(`SQL falhou (${result.error?.code ?? result.status}): ${result.stderr || "sem detalhes disponíveis"}`);
    }
    // Fixture SQL output is deliberately not echoed: statements could include
    // private data. Successful exit with ON_ERROR_STOP proves assertions passed.
    console.log("Aprovado.");
  }
} catch (error) {
  console.error(redact(error instanceof Error ? error.message : "Falha de banco."));
  process.exitCode = 1;
}
