import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { randomUUID } from "node:crypto";

test.skip(
  !process.env.E2E_APP,
  "Requires isolated Supabase; use npm run test:app",
);
test.setTimeout(90_000);

async function mailLink(request: APIRequestContext, email: string) {
  let messageId = "";
  await expect
    .poll(
      async () => {
        const response = await request.get(
          `${process.env.E2E_MAILPIT_URL}/api/v1/messages`,
        );
        const body = await response.json();
        const message = body.messages.find(
          (m: { To: { Address: string }[]; ID: string }) =>
            m.To.some((to) => to.Address === email),
        );
        messageId = message?.ID || "";
        return Boolean(messageId);
      },
      { timeout: 15_000 },
    )
    .toBe(true);
  const message = await (
    await request.get(
      `${process.env.E2E_MAILPIT_URL}/api/v1/message/${messageId}`,
    )
  ).json();
  const link = String(message.HTML || message.Text).match(
    /https?:\/\/[^"\s<>]+\/auth\/v1\/verify[^"\s<>]+/,
  );
  expect(link).toBeTruthy();
  return link![0].replaceAll("&amp;", "&");
}

async function add(
  page: Page,
  type: string,
  value: string,
  description: string,
  category: string,
) {
  await page
    .getByRole("button", { name: "+ Nova transação", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tipo", { exact: true }).selectOption(type);
  await dialog.getByLabel("Valor (R$)").fill(value);
  await dialog.getByLabel("Descrição").fill(description);
  await dialog
    .getByLabel("Categoria", { exact: true })
    .selectOption({ label: category });
  await dialog.getByLabel("Data", { exact: true }).fill("2026-10-15");
  await dialog.getByRole("button", { name: "Salvar lançamento" }).click();
  await expect(dialog.getByRole("status")).toContainText("Lançamento salvo");
  await page.keyboard.press("Escape");
}

test("signup, confirmation, onboarding, finances, persistence and recovery", async ({
  page,
  request,
}, testInfo) => {
  const email = `codex-${randomUUID()}@example.test`;
  const password = `Test-${randomUUID()}!`;
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/cadastro");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page.getByRole("status")).toContainText("Confirme seu e-mail");
  await page.goto(await mailLink(request, email));
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByLabel("Como podemos chamar você?").fill("Pessoa Teste");
  await page.getByRole("button", { name: "Começar a organizar" }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await add(page, "income", "8000", "Salário teste", "Salário");
  await add(page, "expense", "1200", "Mercado teste", "Alimentação");
  await add(page, "expense", "2000", "Aluguel teste", "Moradia");
  await page.goto("/dashboard?month=2026-10");
  await expect(page.locator(".metric.income")).toContainText("8.000,00");
  await expect(page.locator(".metric.expense")).toContainText("3.200,00");
  await expect(page.locator(".metric.balance")).toContainText("4.800,00");
  await page.reload();
  await expect(page.locator(".metric.balance")).toContainText("4.800,00");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator(".metric.balance")).toBeVisible();
  await expect(page.locator(".chart-container svg").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("dashboard.png"),
    fullPage: true,
  });
  await page.goto("/orcamentos?month=2026-10");
  await page
    .getByLabel("Categoria de despesa")
    .selectOption({ label: "Alimentação" });
  await page.getByLabel("Limite mensal (R$)").fill("1000");
  await page.getByRole("button", { name: "Salvar orçamento" }).click();
  await expect(page.getByText("120% utilizado", { exact: true })).toBeVisible();
  await expect(
    page.getByText("R$ 200,00 acima", { exact: true }),
  ).toBeVisible();
  await page.goto("/transacoes?start=2026-10-01&end=2026-10-31&q=Mercado");
  await expect(page.locator(".transaction-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Descrição")
    .fill("Mercado atualizado");
  await page.getByRole("button", { name: "Salvar lançamento" }).click();
  await expect(page.getByRole("dialog").getByRole("status")).toContainText(
    "Lançamento salvo",
  );
  await page.keyboard.press("Escape");
  await expect(
    page.getByText("Mercado atualizado", { exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Excluir", exact: true }).click();
  await expect(page.locator(".transaction-row")).toHaveCount(0);
  await page.goto("/configuracoes");
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.goto("/dashboard?month=2026-10");
  await expect(page.locator(".metric.balance")).toContainText("6.000,00");
  await page.goto("/recuperar-senha");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page
    .getByRole("button", { name: "Enviar link de recuperação" })
    .click();
  await expect(page.getByRole("status")).toContainText("receberá o link");
  await page.goto(await mailLink(request, email));
  await expect(page).toHaveURL(/\/atualizar-senha/);
  await page.getByLabel("Senha", { exact: true }).fill(`New-${password}`);
  await page.getByRole("button", { name: "Atualizar senha" }).click();
  await expect(page.getByRole("status")).toContainText("Senha atualizada");
});

test("two accounts share a family space while personal data stays private", async ({
  page,
  request,
  browser,
}) => {
  const emailA = `a-${randomUUID()}@example.test`,
    emailB = `b-${randomUUID()}@example.test`,
    password = `Test-${randomUUID()}!`;
  for (const email of [emailA, emailB]) {
    const response = await request.post(
      `${process.env.E2E_SUPABASE_URL}/auth/v1/admin/users`,
      {
        headers: {
          apikey: process.env.E2E_SUPABASE_SERVICE_KEY!,
          Authorization: `Bearer ${process.env.E2E_SUPABASE_SERVICE_KEY}`,
        },
        data: { email, password, email_confirm: true },
      },
    );
    expect(response.ok()).toBe(true);
  }
  async function login(p: Page, email: string) {
    await p.goto("/login");
    await p.getByLabel("E-mail", { exact: true }).fill(email);
    await p.getByLabel("Senha", { exact: true }).fill(password);
    await p.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(p).toHaveURL(/onboarding/);
    await p
      .getByLabel("Como podemos chamar você?")
      .fill(email === emailA ? "Pessoa A" : "Pessoa B");
    await p.getByRole("button", { name: "Começar a organizar" }).click();
    await expect(p).toHaveURL(/dashboard/);
  }
  await login(page, emailA);
  const personalId = await page
    .getByLabel("Espaço selecionado")
    .locator("option", { hasText: "Meu espaço" })
    .getAttribute("value");
  await add(page, "expense", "99", "Despesa privada A", "Alimentação");
  await page.goto("/espacos");
  await page.getByLabel("Nome do novo espaço").fill("Nossa Casa");
  await page
    .getByLabel("Tipo de espaço", { exact: true })
    .selectOption("family");
  await page.getByRole("button", { name: "Criar espaço", exact: true }).click();
  await expect(page.locator(".workspace-context")).toContainText("Nossa Casa");
  await page.getByLabel("E-mail do convidado").fill(emailB);
  await page.getByRole("button", { name: "Gerar convite" }).click();
  const invite = page.getByLabel("Link do convite");
  await expect(invite).toBeVisible();
  const link = await invite.inputValue();
  await add(page, "expense", "1200", "Mercado compartilhado", "Alimentação");
  const context = await browser.newContext({
    baseURL: "http://localhost:3000",
  });
  const b = await context.newPage();
  await login(b, emailB);
  await b.goto(link);
  await b.getByRole("button", { name: "Aceitar convite" }).click();
  await expect(b.locator(".workspace-context")).toContainText("Nossa Casa");
  await b.goto("/dashboard?month=2026-10");
  await expect(b.locator(".metric.expense")).toContainText("1.200,00");
  await expect(b.getByText("Despesa privada A", { exact: true })).toHaveCount(
    0,
  );
  await b.goto("/transacoes?start=2026-10-01&end=2026-10-31");
  await expect(b.locator(".transaction-row")).toHaveCount(1);
  await expect(
    b.getByRole("button", { name: "Editar", exact: true }),
  ).toHaveCount(0);
  await b.goto("/configuracoes");
  const form = b
    .locator("form")
    .filter({ has: b.locator('input[name="op"][value="category"]') });
  await form.getByLabel("Nome da categoria").fill("Tentativa externa");
  await form.locator('input[name="space_id"]').evaluate((node, value) => {
    (node as HTMLInputElement).value = String(value);
  }, personalId);
  await form.getByRole("button", { name: "Criar categoria" }).click();
  await expect(form.getByRole("alert")).toContainText("não autorizado");
  await context.close();
});
