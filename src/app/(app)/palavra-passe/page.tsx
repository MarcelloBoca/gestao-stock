import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { mudarPalavraPasse } from "@/app/actions/auth";
import { ActionForm, SubmitButton } from "@/components/forms";
import { PageHead } from "@/components/ui";

export const metadata: Metadata = { title: "Palavra-passe" };
export const dynamic = "force-dynamic";

export default async function PalavraPassePage() {
  const { user } = await requireUser();
  return (
    <div className="c-page c-narrow">
      <PageHead title="Mudar palavra-passe" sub="Depois de mudar, as sessões abertas noutros aparelhos terminam." />
      <div className="sheet pad">
        <ActionForm action={mudarPalavraPasse} resetOnSuccess>
          <input type="text" name="username" value={user.username} autoComplete="username" readOnly hidden />
          <div className="field">
            <label className="label" htmlFor="current">Palavra-passe actual</label>
            <input id="current" name="current" type="password" className="input" autoComplete="current-password" required maxLength={128} />
          </div>
          <div className="field">
            <label className="label" htmlFor="password">Nova palavra-passe</label>
            <input id="password" name="password" type="password" className="input" autoComplete="new-password" required minLength={8} maxLength={128} />
            <p className="hint">Pelo menos 8 caracteres.</p>
          </div>
          <div className="field">
            <label className="label" htmlFor="confirm">Repetir a nova palavra-passe</label>
            <input id="confirm" name="confirm" type="password" className="input" autoComplete="new-password" required minLength={8} maxLength={128} />
          </div>
          <SubmitButton pendingText="A guardar…">Guardar palavra-passe</SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}
