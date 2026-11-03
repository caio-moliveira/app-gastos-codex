"use client";

import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { act, type ActionState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

export function Submit({
  children = "Salvar",
  variant = "default",
}: {
  children?: React.ReactNode;
  variant?: "default" | "destructive" | "outline";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant={variant}>
      {pending ? "Aguarde…" : children}
    </Button>
  );
}

export function ActionForm({
  op,
  hidden = {},
  children,
  submit = "Salvar",
  confirm,
  variant = "default",
}: {
  op: string;
  hidden?: Record<string, string>;
  children?: React.ReactNode;
  submit?: string;
  confirm?: string;
  variant?: "default" | "destructive" | "outline";
}) {
  const [state, dispatch] = useActionState<ActionState, FormData>(act, {});
  return (
    <form
      action={dispatch}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className="action-form"
    >
      <input type="hidden" name="op" value={op} />
      {Object.entries(hidden).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      {confirm ? <input type="hidden" name="confirm" value="yes" /> : null}
      <FieldGroup>{children}</FieldGroup>
      {state.error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state.success ? (
        <Alert role="status">
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}
      {state.invitation ? (
        <Field>
          <FieldLabel>Link do convite</FieldLabel>
          <Input
            readOnly
            aria-label="Link do convite"
            value={state.invitation}
            onFocus={(e) => e.target.select()}
          />
        </Field>
      ) : null}
      <Submit variant={variant}>{submit}</Submit>
    </form>
  );
}

export function TextField({
  label,
  name,
  type = "text",
  required = true,
  value,
  ...props
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  value?: string;
} & Omit<React.ComponentProps<typeof Input>, "value" | "type" | "name">) {
  const id = useId();
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        name={name}
        type={type}
        required={required}
        defaultValue={value}
        {...props}
      />
    </Field>
  );
}

export function SelectField({
  label,
  name,
  options,
  value,
  required = true,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  value?: string;
  required?: boolean;
}) {
  const id = useId();
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <select
        id={id}
        name={name}
        defaultValue={value}
        required={required}
        className="native-select"
      >
        {options.map((o) => (
          <option value={o.value} key={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export type Category = { id: string; name: string; type: string };
export type Transaction = {
  id: string;
  type: string;
  amount: number | string;
  description: string;
  category_id: string;
  occurred_on: string;
  created_by: string;
};
export function TransactionDialog({
  spaceId,
  spaceName,
  categories,
  transaction,
}: {
  spaceId: string;
  spaceName: string;
  categories: Category[];
  transaction?: Transaction;
}) {
  const [type, setType] = useState(transaction?.type || "expense");
  const typeId = useId();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={transaction ? "outline" : "default"}>
          {transaction ? "Editar" : "+ Nova transação"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {transaction ? "Editar lançamento" : "Nova transação"}
          </DialogTitle>
          <DialogDescription>
            Espaço: {spaceName}. Valores em reais (BRL).
          </DialogDescription>
        </DialogHeader>
        <ActionForm
          op="transaction"
          hidden={{
            space_id: spaceId,
            ...(transaction ? { id: transaction.id } : {}),
          }}
          submit="Salvar lançamento"
        >
          <Field>
            <FieldLabel htmlFor={typeId}>Tipo</FieldLabel>
            <select
              id={typeId}
              name="type"
              className="native-select"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
            </select>
          </Field>
          <TextField
            label="Valor (R$)"
            name="amount"
            type="number"
            min="0.01"
            max="999999999999.99"
            step="0.01"
            value={transaction ? String(transaction.amount) : undefined}
          />
          <TextField
            label="Descrição"
            name="description"
            maxLength={500}
            value={transaction?.description}
          />
          <SelectField
            key={type}
            label="Categoria"
            name="category_id"
            value={transaction?.category_id}
            options={categories
              .filter((c) => c.type === type)
              .map((c) => ({ value: c.id, label: c.name }))}
          />
          <TextField
            label="Data"
            name="occurred_on"
            type="date"
            value={
              transaction?.occurred_on || new Date().toLocaleDateString("en-CA")
            }
          />
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
