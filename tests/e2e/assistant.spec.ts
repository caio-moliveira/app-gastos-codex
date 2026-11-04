import {
  expect,
  test,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import { randomUUID } from "node:crypto";
test.skip(!process.env.E2E_APP, "Requires isolated Supabase");

async function setup(page: Page, request: APIRequestContext) {
  const email = `ai-${randomUUID()}@example.test`,
    password = `Test-${randomUUID()}!`;
  const key = process.env.E2E_SUPABASE_SERVICE_KEY!,
    url = process.env.E2E_SUPABASE_URL!;
  expect(
    (
      await request.post(`${url}/auth/v1/admin/users`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        data: { email, password, email_confirm: true },
      })
    ).ok(),
  ).toBe(true);
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/onboarding/);
  await page.getByLabel("Como podemos chamar você?").fill("Pessoa Assistente");
  await page.getByRole("button", { name: "Começar a organizar" }).click();
  await expect(page).toHaveURL(/dashboard/);
  const spaceId = await page.getByLabel("Espaço selecionado").inputValue();
  await page.goto("/assistente");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Autorizar e continuar" }).click();
  await expect(page.getByLabel("Sua pergunta")).toBeVisible();
  const tokenResponse = await request.post(
    `${url}/auth/v1/token?grant_type=password`,
    { headers: { apikey: key }, data: { email, password } },
  );
  expect(tokenResponse.ok()).toBe(true);
  const token = (await tokenResponse.json()).access_token;
  return {
    spaceId,
    url,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      "Accept-Profile": "codex",
      "Content-Profile": "codex",
      Prefer: "return=representation",
    },
  };
}

test("provider outage is recoverable and never fabricates an answer", async ({
  page,
  request,
}) => {
  test.skip(!process.env.E2E_SIMULATION, "Uses Postman dependency simulation");
  await setup(page, request);
  await page.getByLabel("Sua pergunta").fill("Quanto gastei em outubro?");
  const response = page.waitForResponse((r) =>
    r.url().includes("/api/ai/chat"),
  );
  await page.getByRole("button", { name: "Enviar pergunta" }).click();
  expect((await response).status()).toBe(503);
  await expect(page.locator('.chat-panel [data-slot="alert"]')).toContainText(
    "indisponível",
  );
  await expect(
    page.getByRole("button", { name: "Enviar pergunta" }),
  ).toBeEnabled();
  await page.getByRole("link", { name: "Visão geral", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
});

test("real OpenRouter answers all eight PRD questions from synthetic records", async ({
  page,
  request,
}, testInfo) => {
  test.skip(
    !process.env.E2E_LIVE || testInfo.project.name !== "desktop",
    "Explicit live model audit only",
  );
  test.setTimeout(360_000);
  const fixture = await setup(page, request);
  const categories = await (
    await request.get(
      `${fixture.url}/rest/v1/categories?space_id=eq.${fixture.spaceId}&select=id,name,type`,
      { headers: fixture.headers },
    )
  ).json();
  const category = (name: string) =>
    categories.find((c: { name: string }) => c.name === name).id;
  const rows = [
    {
      type: "income",
      amount: "8000",
      description: "Salário de outubro",
      category_id: category("Salário"),
      occurred_on: "2026-10-10",
    },
    {
      type: "expense",
      amount: "1200",
      description: "Mercado em outubro",
      category_id: category("Alimentação"),
      occurred_on: "2026-10-10",
    },
    {
      type: "expense",
      amount: "2000",
      description: "Moradia em outubro",
      category_id: category("Moradia"),
      occurred_on: "2026-10-10",
    },
    {
      type: "income",
      amount: "6000",
      description: "Salário de setembro",
      category_id: category("Salário"),
      occurred_on: "2026-09-10",
    },
    {
      type: "expense",
      amount: "500",
      description: "Mercado em setembro",
      category_id: category("Alimentação"),
      occurred_on: "2026-09-10",
    },
    {
      type: "expense",
      amount: "1200",
      description: "Mercado em novembro",
      category_id: category("Alimentação"),
      occurred_on: "2026-11-02",
    },
  ].map((t) => ({ ...t, space_id: fixture.spaceId }));
  expect(
    (
      await request.post(`${fixture.url}/rest/v1/transactions`, {
        headers: fixture.headers,
        data: rows,
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await request.post(`${fixture.url}/rest/v1/budgets`, {
        headers: fixture.headers,
        data: {
          space_id: fixture.spaceId,
          category_id: category("Alimentação"),
          month: "2026-11-01",
          limit_amount: "1000",
        },
      })
    ).ok(),
  ).toBe(true);
  const questions = [
    "Quanto gastei no mês passado?",
    "Qual foi minha maior categoria de despesas em outubro?",
    "Quanto entrou e quanto saiu nos últimos três meses?",
    "Quais foram meus cinco maiores gastos?",
    "Estou acima do orçamento de alimentação?",
    "Compare outubro com setembro.",
    "O que posso fazer para economizar com base nos meus gastos?",
  ];
  const expected = [
    /3[., ]?200/,
    /moradia/i,
    /R\$|BRL/,
    /1[., ]?200/,
    /120|200/,
    /outubro[\s\S]*setembro|setembro[\s\S]*outubro/i,
    /sugest|econom|reduz|revis/i,
  ];
  for (let index = 0; index < questions.length; index++) {
    let response = await page.request.post("/api/ai/chat", {
      data: { space_id: fixture.spaceId, message: questions[index] },
      timeout: 60000,
    });
    if (response.status() === 429) {
      await page.waitForTimeout(60000);
      response = await page.request.post("/api/ai/chat", {
        data: { space_id: fixture.spaceId, message: questions[index] },
        timeout: 60000,
      });
    }
    const body = await response.json();
    expect(response.ok(), `${questions[index]}: ${body.error || ""}`).toBe(
      true,
    );
    expect(body.answer).toMatch(expected[index]);
    await testInfo.attach(`question-${index + 1}`, {
      body: JSON.stringify({ question: questions[index], answer: body.answer }),
      contentType: "application/json",
    });
  }
  const sharedResponse = await request.post(
    `${fixture.url}/rest/v1/rpc/create_space`,
    {
      headers: fixture.headers,
      data: { p_name: "Nossa Casa", p_type: "family" },
    },
  );
  expect(sharedResponse.ok()).toBe(true);
  const sharedId = await sharedResponse.json();
  const sharedCategories = await (
    await request.get(
      `${fixture.url}/rest/v1/categories?space_id=eq.${sharedId}&select=id,name`,
      { headers: fixture.headers },
    )
  ).json();
  expect(
    (
      await request.post(`${fixture.url}/rest/v1/transactions`, {
        headers: fixture.headers,
        data: {
          space_id: sharedId,
          type: "expense",
          amount: "450",
          description: "Mercado da família",
          category_id: sharedCategories.find(
            (c: { name: string }) => c.name === "Alimentação",
          ).id,
          occurred_on: "2026-11-02",
        },
      })
    ).ok(),
  ).toBe(true);
  let family = await page.request.post("/api/ai/chat", {
    data: {
      space_id: sharedId,
      message: "Quanto a nossa família gastou no mercado este mês?",
    },
    timeout: 60000,
  });
  if (family.status() === 429) {
    await page.waitForTimeout(60000);
    family = await page.request.post("/api/ai/chat", {
      data: {
        space_id: sharedId,
        message: "Quanto a nossa família gastou no mercado este mês?",
      },
      timeout: 60000,
    });
  }
  const answer = await family.json();
  expect(family.ok(), answer.error).toBe(true);
  expect(answer.answer).toMatch(/450/);
  await testInfo.attach("question-8", {
    body: JSON.stringify(answer),
    contentType: "application/json",
  });
});
