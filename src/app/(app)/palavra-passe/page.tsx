import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { mudarPin } from "@/app/actions/auth";
import { ActionForm, SubmitButton } from "@/components/forms";
import { PageHead } from "@/components/ui";

export const metadata: Metadata = { title: "O meu PIN" };
export const dynamic = "force-dynamic";

const PIN = { inputMode: "numeric" as const, pattern: "\\d{4}", maxLength: 4, minLength: 4, autoComplete: "off" };

export default async function MeuPinPage() {
  const { user } = await requireUser();
  return (
    <div className="c-page c-narrow" style={{ maxWidth: 560 }}>
      <PageHead title="Mudar o meu PIN" sub="Entra na loja com o seu nome e um PIN de 4 números." />
      <section className="v-sec">
        <ActionForm action={mudarPin} resetOnSuccess>
          <input type="text" name="username" value={user.username} autoComplete="username" readOnly hidden />
          <div className="field">
            <label className="label" htmlFor="current">PIN actual</label>
            <input id="current" name="current" type="password" className="input" autoComplete="current-password" required maxLength={128} />
            <p className="hint">Se ainda não tem PIN, escreva aqui a sua palavra-passe.</p>
          </div>
          <div className="v-dois">
            <div className="field">
              <label className="label" htmlFor="pin">PIN novo</label>
              <input id="pin" name="pin" type="password" className="input" required {...PIN} />
            </div>
            <div className="field">
              <label className="label" htmlFor="confirm">Repetir o PIN</label>
              <input id="confirm" name="confirm" type="password" className="input" required {...PIN} />
            </div>
          </div>
          <p className="hint">4 números. Evite números iguais ou seguidos, como 1111 ou 1234. Depois de mudar, as sessões abertas noutros aparelhos terminam.</p>
          <SubmitButton className="btn btn-primary" pendingText="A guardar…">Guardar PIN</SubmitButton>
        </ActionForm>
      </section>
    </div>
  );
}
