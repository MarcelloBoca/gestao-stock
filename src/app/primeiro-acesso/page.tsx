import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { primeiroAcesso } from "@/app/actions/auth";
import { ActionForm, SubmitButton } from "@/components/forms";
import { BackLink } from "@/components/ui";

export const metadata: Metadata = { title: "Primeiro acesso" };
export const dynamic = "force-dynamic";

export default async function PrimeiroAcessoPage() {
  const sb = await supabaseServer();
  const { data } = await sb.rpc("existe_administrador");
  if (data !== false) redirect("/login");

  return (
    <main className="screen narrow">
      <BackLink href="/login" label="Entrada" />
      <div className="stack">
        <h1 className="h1 sm">Primeiro acesso</h1>
        <p className="p muted">
          Crie a conta da administradora da loja. Depois disso, é a administradora que cria as contas das outras pessoas em Funcionárias.
        </p>
      </div>
      <div className="sheet pad">
        <ActionForm action={primeiroAcesso}>
          <div className="field">
            <label className="label" htmlFor="code">Código de configuração</label>
            <input id="code" name="code" type="password" className="input" autoComplete="off" required maxLength={200} />
            <p className="hint">O código SETUP_CODE guardado no Supabase. Só serve para criar esta primeira conta.</p>
          </div>
          <div className="field">
            <label className="label" htmlFor="name">O seu nome</label>
            <input id="name" name="name" className="input" autoComplete="name" required maxLength={80} />
          </div>
          <div className="field">
            <label className="label" htmlFor="username">Utilizador</label>
            <input id="username" name="username" className="input" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required maxLength={32} placeholder="Ex.: fatima" />
            <p className="hint">3 a 32 caracteres: letras sem acentos, números, ponto, hífen ou sublinhado.</p>
          </div>
          <div className="field">
            <label className="label" htmlFor="password">Palavra-passe</label>
            <input id="password" name="password" type="password" className="input" autoComplete="new-password" required minLength={8} maxLength={128} />
            <p className="hint">Pelo menos 8 caracteres.</p>
          </div>
          <div className="field">
            <label className="label" htmlFor="confirm">Repetir a palavra-passe</label>
            <input id="confirm" name="confirm" type="password" className="input" autoComplete="new-password" required minLength={8} maxLength={128} />
          </div>
          <SubmitButton pendingText="A criar…">Criar conta e entrar</SubmitButton>
        </ActionForm>
      </div>
    </main>
  );
}
