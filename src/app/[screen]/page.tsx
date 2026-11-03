import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { workspace, identity, db, authorizeSpace } from "@/lib/supabase";
import { monthRange, formatDate } from "@/lib/calendar";
import { budgetStatus, formatBRL, toCents } from "@/lib/finance";
import { safeNext } from "@/lib/validation";
import {
  ActionForm,
  SelectField,
  TextField,
  TransactionDialog,
  type Category,
  type Transaction,
} from "@/components/forms";
import { Navigation } from "@/components/navigation";
import { EvolutionChart } from "@/components/overview-charts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

type Query = Record<string, string | undefined>;
type Report = {
  income: string;
  expense: string;
  result: string;
  savings_percent: string | null;
  categories: { id: string; name: string; color: string; amount: string }[];
  months: { month: string; income: string; expense: string }[];
};
type Budget = {
  id: string;
  category_id: string;
  name: string;
  limit: string;
  spent: string;
};
const titles: Record<string, string> = {
  dashboard: "Visão geral",
  transacoes: "Transações",
  orcamentos: "Orçamentos",
  espacos: "Meus espaços",
  configuracoes: "Configurações",
  assistente: "Assistente",
};
function amount(v: string | number) {
  const s = String(v);
  return formatBRL(s.startsWith("-") ? -toCents(s.slice(1)) : toCents(s));
}
function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}
function result<T>(r: { data: T; error: unknown }): NonNullable<T> {
  if (r.error || r.data === null)
    throw new Error("Não foi possível carregar os dados. Tente novamente.");
  return r.data as NonNullable<T>;
}
function EmptyState({
  text = "Seu espaço está pronto para começar.",
  detail = "Adicione seu primeiro lançamento para acompanhar suas finanças.",
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{text}</EmptyTitle>
        <EmptyDescription>{detail}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
function Brand() {
  return (
    <Link href="/" className="brand">
      <span aria-hidden="true" className="brand-mark">
        n
      </span>
      nosso bolso<span className="brand-dot">.</span>
    </Link>
  );
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ screen: string }>;
  searchParams: Promise<Query>;
}) {
  const { screen } = await params;
  const query = await searchParams;
  if (
    ["login", "cadastro", "recuperar-senha", "atualizar-senha"].includes(screen)
  )
    return <AuthPage screen={screen} query={query} />;
  if (screen === "onboarding") return <Onboarding />;
  if (!titles[screen]) notFound();
  const w = await workspace();
  const space = w.space;
  const membership = space ? await authorizeSpace(space.id) : null;
  const isOwner = membership?.role === "owner";
  const categories = space
    ? result(
        await w.client
          .from("categories")
          .select("id,name,type")
          .eq("space_id", space.id)
          .order("name"),
      )
    : [];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <p className="nav-eyebrow">SEU DINHEIRO, COM CLAREZA</p>
        <Navigation />
        <div className="sidebar-bottom">
          <ShieldCheck aria-hidden="true" />
          <p>
            Seu espaço.
            <br />
            <strong>Seus dados protegidos.</strong>
          </p>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="workspace-context">
            <span>ESPAÇO ATUAL</span>
            {space ? (
              <strong>
                {space.name}{" "}
                <Badge variant="secondary">
                  {space.type === "personal"
                    ? "Pessoal"
                    : space.type === "couple"
                      ? "Casal"
                      : "Família"}
                </Badge>
              </strong>
            ) : (
              <strong>Selecione um espaço</strong>
            )}
          </div>
          <div className="profile-label">
            <span className="avatar-circle">
              {w.profile.full_name.slice(0, 1).toUpperCase()}
            </span>
            <span>{w.profile.full_name}</span>
          </div>
        </header>
        <main id="conteudo" className="main-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {screen === "dashboard"
                  ? `BOM TER VOCÊ AQUI, ${w.profile.full_name.split(" ")[0].toUpperCase()}`
                  : "NOSSO BOLSO"}
              </p>
              <h1>{titles[screen]}</h1>
              <p className="muted">
                {screen === "dashboard"
                  ? "Um olhar tranquilo para o seu dinheiro e os seus próximos planos."
                  : "Cada detalhe no seu lugar. Cada plano mais perto."}
              </p>
            </div>
            {space && screen !== "assistente" ? (
              <TransactionDialog
                spaceId={space.id}
                spaceName={space.name}
                categories={categories}
              />
            ) : null}
          </div>
          <div className="space-switcher">
            <ActionForm op="select-space" submit="Trocar espaço">
              <SelectField
                label="Espaço selecionado"
                name="space_id"
                value={space?.id}
                options={w.spaces.map((s) => ({ value: s.id, label: s.name }))}
              />
            </ActionForm>
          </div>
          {!space ? (
            <Alert variant="destructive">
              <AlertDescription>
                O espaço selecionado não está disponível. Escolha outro espaço
                acima.
              </AlertDescription>
            </Alert>
          ) : screen === "dashboard" ? (
            <Dashboard
              spaceId={space.id}
              query={query}
              categories={categories}
            />
          ) : screen === "transacoes" ? (
            <Transactions
              spaceId={space.id}
              spaceName={space.name}
              categories={categories}
              query={query}
              userId={w.user.id}
              isOwner={isOwner}
            />
          ) : screen === "orcamentos" ? (
            <Budgets
              spaceId={space.id}
              categories={categories}
              query={query}
              isOwner={isOwner}
            />
          ) : screen === "espacos" ? (
            <Spaces spaceId={space.id} isOwner={isOwner} type={space.type} />
          ) : screen === "configuracoes" ? (
            <Settings
              spaceId={space.id}
              categories={categories}
              fullName={w.profile.full_name}
            />
          ) : (
            <div>
              <EmptyState
                text="O assistente está sendo conectado."
                detail="Em breve você poderá consultar seus dados com segurança."
              />
            </div>
          )}
        </main>
        <footer className="app-footer">
          Nosso Bolso · Um passo de cada vez, na direção dos seus planos.
        </footer>
      </div>
    </div>
  );
}

async function AuthPage({ screen, query }: { screen: string; query: Query }) {
  if (screen === "atualizar-senha") await identity();
  const signup = screen === "cadastro",
    recover = screen === "recuperar-senha",
    password = screen === "atualizar-senha";
  const title = signup
    ? "Seu próximo capítulo começa aqui."
    : recover
      ? "Vamos recuperar seu acesso."
      : password
        ? "Uma nova senha para recomeçar."
        : "Bom ter você de volta.";
  const next = safeNext(query.next);
  return (
    <main id="conteudo" className="auth-layout">
      <section className="auth-story">
        <Brand />
        <div>
          <p className="eyebrow">MENOS PREOCUPAÇÃO. MAIS POSSIBILIDADES.</p>
          <h1>
            Organize o hoje.
            <br />
            <span>Planeje o que vem.</span>
          </h1>
          <p>
            Suas finanças e os planos em família, com clareza, privacidade e
            tudo no seu espaço.
          </p>
        </div>
        <span>Feito para a vida real. Feito para vocês.</span>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <Badge variant="secondary">FINANÇAS COM PROPÓSITO</Badge>
          <h2>{title}</h2>
          <p className="muted">
            {signup
              ? "Crie sua conta e cuide do que importa."
              : recover
                ? "Enviaremos um link para o seu e-mail."
                : password
                  ? "Use pelo menos oito caracteres."
                  : "Entre no seu espaço financeiro."}
          </p>
          {query.error ? (
            <Alert variant="destructive">
              <AlertDescription>
                O link não é válido ou expirou. Solicite um novo link.
              </AlertDescription>
            </Alert>
          ) : null}
          <ActionForm
            op={
              signup
                ? "signup"
                : recover
                  ? "recover"
                  : password
                    ? "password"
                    : "login"
            }
            hidden={{ next }}
            submit={
              signup
                ? "Criar minha conta"
                : recover
                  ? "Enviar link de recuperação"
                  : password
                    ? "Atualizar senha"
                    : "Entrar"
            }
          >
            {!password ? (
              <TextField
                label="E-mail"
                name="email"
                type="email"
                autoComplete="email"
                maxLength={320}
              />
            ) : null}
            {!recover ? (
              <TextField
                label="Senha"
                name="password"
                type="password"
                autoComplete={
                  signup || password ? "new-password" : "current-password"
                }
                minLength={8}
                maxLength={128}
              />
            ) : null}
          </ActionForm>
          <div className="auth-links">
            {screen === "login" ? (
              <>
                <Link href="/recuperar-senha">Esqueci minha senha</Link>
                <span>
                  Ainda não tem conta?{" "}
                  <Link href={`/cadastro?next=${encodeURIComponent(next)}`}>
                    Crie sua conta
                  </Link>
                </span>
              </>
            ) : (
              <Link href={`/login?next=${encodeURIComponent(next)}`}>
                Voltar para entrar
              </Link>
            )}
          </div>
          <p className="privacy-note">
            <ShieldCheck aria-hidden="true" /> Seus dados pessoais e
            compartilhados ficam separados.
          </p>
        </div>
      </section>
    </main>
  );
}

async function Onboarding() {
  const { client, user } = await identity();
  const profile = result(
    await client.from("profiles").select("*").eq("id", user.id).single(),
  );
  if (profile.onboarded_at) redirect("/dashboard");
  return (
    <main id="conteudo" className="onboarding">
      <Brand />
      <Card>
        <CardHeader>
          <CardTitle>Vamos preparar seu espaço?</CardTitle>
          <CardDescription>
            Seu espaço pessoal já é privado. Você também pode criar um espaço
            para compartilhar planos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm op="onboard" submit="Começar a organizar">
            <TextField
              label="Como podemos chamar você?"
              name="full_name"
              value={profile.full_name}
              maxLength={120}
              autoComplete="name"
            />
            <SelectField
              label="Preferência de visualização"
              name="view_preference"
              options={[
                { value: "personal", label: "Finanças pessoais" },
                { value: "shared", label: "Finanças compartilhadas" },
              ]}
            />
            <SelectField
              label="Criar também um espaço compartilhado?"
              name="shared_type"
              required={false}
              options={[
                { value: "", label: "Agora não" },
                { value: "couple", label: "Casal" },
                { value: "family", label: "Família" },
              ]}
            />
            <TextField
              label="Nome do espaço compartilhado (se escolhido)"
              name="shared_name"
              required={false}
              placeholder="Nossa Casa"
              maxLength={80}
            />
          </ActionForm>
        </CardContent>
      </Card>
    </main>
  );
}

function Period({ month }: { month: string }) {
  return (
    <form className="period-form">
      <TextField label="Período" name="month" type="month" value={month} />
      <Button type="submit" variant="outline">
        Aplicar período
      </Button>
    </form>
  );
}
function selectedMonth(q: Query) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(q.month || "") &&
    Number(q.month?.slice(0, 4)) >= 1900 &&
    Number(q.month?.slice(0, 4)) <= 9998
    ? q.month!
    : today().slice(0, 7);
}
async function Dashboard({
  spaceId,
  query,
  categories,
}: {
  spaceId: string;
  query: Query;
  categories: Category[];
}) {
  const { client } = await identity();
  const month = selectedMonth(query),
    range = monthRange(month);
  const start = new Date(`${range.start}T12:00:00Z`);
  start.setUTCMonth(start.getUTCMonth() - 5);
  const [reportResult, trendResult, recent] = await Promise.all([
    client.rpc("financial_report", {
      p_space_id: spaceId,
      p_start: range.start,
      p_end: range.end,
    }),
    client.rpc("financial_report", {
      p_space_id: spaceId,
      p_start: start.toISOString().slice(0, 10),
      p_end: range.end,
    }),
    client
      .from("transactions")
      .select("*")
      .eq("space_id", spaceId)
      .gte("occurred_on", range.start)
      .lte("occurred_on", range.end)
      .order("occurred_on", { ascending: false })
      .limit(5),
  ]);
  const report = result(reportResult) as unknown as Report;
  const trend = result(trendResult) as unknown as Report;
  const cards = [
    {
      label: "Receitas do período",
      value: amount(report.income),
      icon: ArrowUpRight,
      kind: "income",
      sub: "Tudo que entrou",
    },
    {
      label: "Despesas do período",
      value: amount(report.expense),
      icon: ArrowDownRight,
      kind: "expense",
      sub: "Tudo que saiu",
    },
    {
      label: "Resultado do período",
      value: amount(report.result),
      icon: Wallet,
      kind: "balance",
      sub: "Receitas menos despesas",
    },
    {
      label: "Taxa de economia",
      value:
        report.savings_percent === null
          ? "N/D"
          : `${report.savings_percent.replace(".", ",")}%`,
      icon: Sparkles,
      kind: "savings",
      sub: "Do que entrou, ficou para você",
    },
  ];
  return (
    <>
      <Period month={month} />
      <div className="metric-grid">
        {cards.map(({ label, value, icon: Icon, kind, sub }) => (
          <Card key={label} className={`metric ${kind}`}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <Icon aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <strong>{value}</strong>
              <span>{sub}</span>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="report-grid">
        <Card>
          <CardHeader>
            <CardTitle>Evolução financeira</CardTitle>
            <CardDescription>
              Receitas e despesas · últimos seis meses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trend.months.length ? (
              <>
                <EvolutionChart months={trend.months} />
                <div className="chart-legend">
                  <span>● Receitas</span>
                  <span>● Despesas</span>
                </div>
                <details>
                  <summary>Ver valores do gráfico</summary>
                  {trend.months.map((m) => (
                    <p key={m.month}>
                      {m.month}: receitas {amount(m.income)}, despesas{" "}
                      {amount(m.expense)}
                    </p>
                  ))}
                </details>
              </>
            ) : (
              <EmptyState
                text="Cada mês conta uma história."
                detail="Seus gráficos aparecem com os primeiros lançamentos."
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Para onde vai seu dinheiro</CardTitle>
            <CardDescription>Despesas por categoria no período</CardDescription>
          </CardHeader>
          <CardContent>
            {report.categories.length ? (
              <div className="category-breakdown">
                {report.categories.map((c) => (
                  <div key={c.id}>
                    <div className="row-between">
                      <span>
                        <i style={{ background: c.color }} />
                        {c.name}
                      </span>
                      <strong>{amount(c.amount)}</strong>
                    </div>
                    <div className="bar-track">
                      <div
                        style={{
                          width: `${report.expense === "0" ? 0 : Number((toCents(c.amount) * 10000n) / (toCents(report.expense) || 1n)) / 100}%`,
                          background: c.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                text="Nenhuma despesa por aqui."
                detail="As categorias aparecerão quando houver despesas."
              />
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <div className="row-between">
            <CardTitle>Últimos lançamentos</CardTitle>
            <Link href="/transacoes" className="text-link">
              Ver todos <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <CardDescription>
            Os movimentos mais recentes deste período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionRows rows={result(recent)} categories={categories} />
        </CardContent>
      </Card>
      <Link className="assistant-callout" href="/assistente">
        <Sparkles aria-hidden="true" />
        <div>
          <strong>Uma conversa pode trazer mais clareza.</strong>
          <p>
            Pergunte sobre seus gastos, compare meses e descubra novas
            possibilidades.
          </p>
        </div>
        <ArrowRight aria-hidden="true" />
      </Link>
    </>
  );
}

function TransactionRows({
  rows,
  categories,
  controls,
}: {
  rows: Transaction[];
  categories: Category[];
  controls?: (t: Transaction) => React.ReactNode;
}) {
  if (!rows.length) return <EmptyState />;
  return (
    <div className="transaction-list">
      {rows.map((t) => (
        <div className="transaction-row" key={t.id}>
          <span className={`transaction-icon ${t.type}`}>
            {t.type === "income" ? (
              <ArrowUpRight aria-hidden="true" />
            ) : (
              <ArrowDownRight aria-hidden="true" />
            )}
          </span>
          <div className="transaction-description">
            <strong>{t.description}</strong>
            <span>
              {categories.find((c) => c.id === t.category_id)?.name} ·{" "}
              {formatDate(t.occurred_on)}
            </span>
          </div>
          <strong className={t.type === "income" ? "income-text" : ""}>
            {t.type === "income" ? "+ " : "− "}
            {amount(t.amount)}
          </strong>
          {controls ? <div className="row-controls">{controls(t)}</div> : null}
        </div>
      ))}
    </div>
  );
}

async function Transactions({
  spaceId,
  spaceName,
  categories,
  query,
  userId,
  isOwner,
}: {
  spaceId: string;
  spaceName: string;
  categories: Category[];
  query: Query;
  userId: string;
  isOwner: boolean;
}) {
  const client = await db(),
    range = monthRange(selectedMonth(query));
  const start = /^\d{4}-\d{2}-\d{2}$/.test(query.start || "")
    ? query.start!
    : range.start;
  const end = /^\d{4}-\d{2}-\d{2}$/.test(query.end || "")
    ? query.end!
    : range.end;
  const page = Math.max(1, Math.min(10000, Number(query.page) || 1));
  let request = client
    .from("transactions")
    .select("*", { count: "exact" })
    .eq("space_id", spaceId)
    .gte("occurred_on", start)
    .lte("occurred_on", end)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .range((page - 1) * 20, page * 20 - 1);
  if (["income", "expense"].includes(query.type || ""))
    request = request.eq("type", query.type!);
  if (z.uuid().safeParse(query.category).success)
    request = request.eq("category_id", query.category!);
  if (query.q)
    request = request.ilike(
      "description",
      `%${query.q.slice(0, 80).replace(/[%_\\]/g, "\\$&")}%`,
    );
  const data = await request;
  const rows = result(data);
  function pageHref(number: number) {
    const params = new URLSearchParams(
      Object.entries(query).filter(
        (e): e is [string, string] => e[1] !== undefined,
      ),
    );
    params.set("page", String(number));
    return `/transacoes?${params}`;
  }
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Encontre um lançamento</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="filter-grid">
            <TextField label="De" name="start" type="date" value={start} />
            <TextField label="Até" name="end" type="date" value={end} />
            <SelectField
              label="Tipo"
              name="type"
              value={query.type}
              required={false}
              options={[
                { value: "", label: "Todos" },
                { value: "income", label: "Receitas" },
                { value: "expense", label: "Despesas" },
              ]}
            />
            <SelectField
              label="Categoria"
              name="category"
              value={query.category}
              required={false}
              options={[
                { value: "", label: "Todas" },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
            <TextField
              label="Buscar descrição"
              name="q"
              value={query.q}
              required={false}
              maxLength={80}
            />
            <Button type="submit">Filtrar</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Seus lançamentos</CardTitle>
          <CardDescription>
            {data.count ?? 0} registros encontrados · Espaço: {spaceName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionRows
            rows={rows}
            categories={categories}
            controls={(t) =>
              t.created_by === userId || isOwner ? (
                <>
                  <TransactionDialog
                    spaceId={spaceId}
                    spaceName={spaceName}
                    categories={categories}
                    transaction={t}
                  />
                  <ActionForm
                    op="delete-transaction"
                    hidden={{ space_id: spaceId, id: t.id }}
                    submit="Excluir"
                    variant="destructive"
                    confirm={`Excluir “${t.description}”? Esta ação não pode ser desfeita.`}
                  />
                </>
              ) : (
                <Badge variant="secondary">Outro integrante</Badge>
              )
            }
          />
          <div className="pagination">
            {page > 1 ? (
              <Link href={pageHref(page - 1)}>← Anterior</Link>
            ) : null}
            <span>Página {page}</span>
            {(data.count || 0) > page * 20 ? (
              <Link href={pageHref(page + 1)}>Próxima →</Link>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

async function Budgets({
  spaceId,
  categories,
  query,
  isOwner,
}: {
  spaceId: string;
  categories: Category[];
  query: Query;
  isOwner: boolean;
}) {
  const month = selectedMonth(query);
  const client = await db();
  const budgets = result(
    await client.rpc("budget_report", {
      p_space_id: spaceId,
      p_month: `${month}-01`,
    }),
  ) as unknown as Budget[];
  return (
    <>
      <Period month={month} />
      <div className="budget-grid">
        {budgets.map((b) => {
          const status = budgetStatus(toCents(b.spent), toCents(b.limit));
          return (
            <Card key={b.id}>
              <CardHeader>
                <div className="row-between">
                  <CardTitle>{b.name}</CardTitle>
                  <Badge
                    variant={status.exceeded ? "destructive" : "secondary"}
                  >
                    {status.exceeded
                      ? "Acima do limite"
                      : status.warning
                        ? "Atenção: 80% ou mais"
                        : "Dentro do planejado"}
                  </Badge>
                </div>
                <CardDescription>Planejado: {amount(b.limit)}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="budget-amount">
                  {amount(b.spent)}
                  <span>utilizados</span>
                </div>
                <div className="bar-track">
                  <div
                    className={status.exceeded ? "over-budget" : ""}
                    style={{
                      width: `${Math.min(100, Number(status.percent) / 100)}%`,
                    }}
                  />
                </div>
                <div className="row-between">
                  <strong>
                    {(Number(status.percent) / 100).toLocaleString("pt-BR")}%
                    utilizado
                  </strong>
                  <span>
                    {status.remaining < 0n
                      ? `${formatBRL(-status.remaining)} acima`
                      : `${formatBRL(status.remaining)} restantes`}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {!budgets.length ? (
        <EmptyState
          text="Seus planos merecem um orçamento."
          detail="Defina um limite mensal por categoria para acompanhar o que ainda pode gastar."
        />
      ) : null}
      {isOwner ? (
        <Card>
          <CardHeader>
            <CardTitle>Planejar um limite</CardTitle>
            <CardDescription>
              Um limite por categoria e mês. Salvar novamente atualiza o limite
              existente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm
              op="budget"
              hidden={{ space_id: spaceId }}
              submit="Salvar orçamento"
            >
              <SelectField
                label="Categoria de despesa"
                name="category_id"
                options={categories
                  .filter((c) => c.type === "expense")
                  .map((c) => ({ value: c.id, label: c.name }))}
              />
              <TextField label="Mês" name="month" type="month" value={month} />
              <TextField
                label="Limite mensal (R$)"
                name="limit_amount"
                type="number"
                min="0.01"
                step="0.01"
              />
            </ActionForm>
          </CardContent>
        </Card>
      ) : (
        <p className="muted">
          Somente o proprietário pode alterar os limites deste espaço.
        </p>
      )}
    </>
  );
}

async function Spaces({
  spaceId,
  isOwner,
  type,
}: {
  spaceId: string;
  isOwner: boolean;
  type: string;
}) {
  const client = await db();
  const members = result(
    await client.rpc("list_members", { p_space_id: spaceId }),
  );
  const invites = isOwner
    ? result(
        await client
          .from("space_invitations")
          .select("id,email,expires_at,accepted_at,revoked_at")
          .eq("space_id", spaceId)
          .order("created_at", { ascending: false })
          .limit(30),
      )
    : [];
  return (
    <div className="settings-grid">
      <Card>
        <CardHeader>
          <CardTitle>Quem faz parte</CardTitle>
          <CardDescription>
            {type === "personal"
              ? "Este espaço é só seu. Dados pessoais não são compartilhados."
              : "Todos veem os dados compartilhados, cada pessoa mantém seu espaço pessoal privado."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.map((m) => (
            <div className="member-row" key={m.user_id}>
              <div>
                <strong>{m.full_name || "Integrante"}</strong>
                <p>{m.role === "owner" ? "Proprietário" : "Integrante"}</p>
              </div>
              {isOwner && m.role !== "owner" ? (
                <ActionForm
                  op="remove-member"
                  hidden={{ space_id: spaceId, user_id: m.user_id }}
                  submit="Remover"
                  variant="destructive"
                  confirm="Remover este integrante do espaço?"
                />
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Um novo espaço para seus planos</CardTitle>
          <CardDescription>
            Crie um espaço de casal ou família sem misturar suas finanças
            pessoais.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm op="create-space" submit="Criar espaço">
            <TextField
              label="Nome do novo espaço"
              name="name"
              placeholder="Nossa Casa"
              maxLength={80}
            />
            <SelectField
              label="Tipo de espaço"
              name="type"
              options={[
                { value: "couple", label: "Casal" },
                { value: "family", label: "Família" },
              ]}
            />
          </ActionForm>
        </CardContent>
      </Card>
      {isOwner && type !== "personal" ? (
        <Card>
          <CardHeader>
            <CardTitle>Convide quem caminha com você</CardTitle>
            <CardDescription>
              O link vale por sete dias e só pode ser aceito pela conta do
              e-mail convidado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm
              op="invite"
              hidden={{ space_id: spaceId }}
              submit="Gerar convite"
            >
              <TextField
                label="E-mail do convidado"
                name="email"
                type="email"
              />
            </ActionForm>
            {invites.map((i) => (
              <div className="member-row" key={i.id}>
                <div>
                  <strong>{i.email}</strong>
                  <p>
                    {i.accepted_at
                      ? "Aceito"
                      : i.revoked_at
                        ? "Revogado"
                        : new Date(i.expires_at) < new Date()
                          ? "Expirado"
                          : `Válido até ${formatDate(i.expires_at.slice(0, 10))}`}
                  </p>
                </div>
                {!i.accepted_at && !i.revoked_at ? (
                  <ActionForm
                    op="revoke-invite"
                    hidden={{ space_id: spaceId, id: i.id }}
                    submit="Revogar"
                    variant="outline"
                  />
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

async function Settings({
  spaceId,
  categories,
  fullName,
}: {
  spaceId: string;
  categories: Category[];
  fullName: string;
}) {
  return (
    <div className="settings-grid">
      <Card>
        <CardHeader>
          <CardTitle>Seu perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm op="profile" hidden={{ space_id: spaceId }}>
            <TextField
              label="Nome"
              name="full_name"
              value={fullName}
              maxLength={120}
            />
          </ActionForm>
          <Link href="/recuperar-senha" className="text-link">
            Redefinir minha senha
          </Link>
          <ActionForm op="logout" submit="Sair da conta" variant="outline" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Categorias do espaço</CardTitle>
          <CardDescription>
            Organize seus lançamentos do seu jeito.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="category-tags">
            {categories.map((c) => (
              <Badge key={c.id} variant="secondary">
                {c.name} · {c.type === "income" ? "Receita" : "Despesa"}
              </Badge>
            ))}
          </div>
          <ActionForm
            op="category"
            hidden={{ space_id: spaceId }}
            submit="Criar categoria"
          >
            <TextField label="Nome da categoria" name="name" maxLength={60} />
            <SelectField
              label="Tipo da categoria"
              name="type"
              options={[
                { value: "expense", label: "Despesa" },
                { value: "income", label: "Receita" },
              ]}
            />
            <TextField
              label="Cor da categoria"
              name="color"
              type="color"
              value="#237256"
            />
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
