import type { Metadata } from "next";
import { ADMIN, requireUser } from "@/lib/auth";
import { PERFIS, type Perfil } from "@/lib/types";
import { gerirConta } from "@/app/actions/contas";
import { ActionForm, SubmitButton } from "@/components/forms";
import { PageHead, Pill } from "@/components/ui";
import Icon from "@/components/Icon";

export const metadata: Metadata = { title: "Funcionárias" };
export const dynamic = "force-dynamic";

const PODE: Record<Perfil, string> = {
  vendedor: "Vende, vê se há uma peça e vê as suas vendas do dia.",
  gestor: "Tudo o que a vendedora faz, mais stock, preços, corrigir vendas, relatórios e registo.",
  administrador: "Tudo o que a gestora faz, mais contas das funcionárias e mensagens SMS.",
};

function Perfis({ actual }: { actual?: string }) {
  return (
    <div className="c-chips">
      {(["vendedor", "gestor", "administrador"] as Perfil[]).map((p) => (
        <label key={p} className="c-etiqueta"><input type="radio" name="perfil" value={p} required defaultChecked={actual === p} />{PERFIS[p]}</label>
      ))}
    </div>
  );
}

/** CT-02/CT-03/CT-05: contas das funcionárias (só a administradora). */
export default async function FuncionariasPage() {
  const { sb, user } = await requireUser(ADMIN);
  const { data } = await sb.from("utilizadores").select("id, nome, username, perfil, activo").order("activo", { ascending: false }).order("nome");
  const { data: bloqueios } = await sb.rpc("contas_bloqueadas_agora").then((r) => r, () => ({ data: null }));
  const bloqueadas = new Set<string>((bloqueios as string[] | null) ?? []);
  return (
    <div className="c-page c-narrow" style={{ maxWidth: 760 }}>
      <PageHead title="Funcionárias" />
      <details className="c-card c-mais">
        <summary className="c-cta escuro"><Icon name="mais" size={18} /> Criar conta nova</summary>
        <ActionForm action={gerirConta} resetOnSuccess>
          <input type="hidden" name="accao" value="criar" />
          <div className="field"><label className="label" htmlFor="n-nome">Nome</label><input id="n-nome" name="nome" className="input on-card" required maxLength={80} placeholder="Ex.: Lúcia Mabunda" /></div>
          <div className="field">
            <label className="label" htmlFor="n-user">Utilizador (para entrar)</label>
            <input id="n-user" name="username" className="input on-card" required maxLength={32} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="Ex.: lucia" />
            <p className="hint">Letras sem acentos, números, ponto ou hífen.</p>
          </div>
          <div className="v-dois">
            <div className="field"><label className="label" htmlFor="n-pin">PIN (4 números)</label><input id="n-pin" name="pin" type="text" inputMode="numeric" pattern="\d{4}" className="input on-card" required minLength={4} maxLength={4} autoComplete="off" /></div>
            <div className="field"><label className="label" htmlFor="n-pin2">Repetir o PIN</label><input id="n-pin2" name="confirm" type="text" inputMode="numeric" pattern="\d{4}" className="input on-card" required minLength={4} maxLength={4} autoComplete="off" /></div>
          </div>
          <p className="hint">A pessoa entra tocando no nome e escrevendo este PIN. Pode mudá-lo depois em “Mudar o meu PIN”.</p>
          <p className="c-rot">Função</p>
          <Perfis actual="vendedor" />
          <SubmitButton className="c-cta" pendingText="A criar…"><Icon name="certo" size={18} /> Criar conta</SubmitButton>
        </ActionForm>
      </details>
      {(data ?? []).map((u) => (
        <details key={u.id} className="c-card c-mais">
          <summary className="c-entre" style={{ alignItems: "center" }}>
            <span className="c-avatar">{u.nome.charAt(0).toUpperCase()}</span>
            <span className="c-linha-m"><b style={{ fontSize: 15 }}>{u.nome}{u.id === user.id ? " (eu)" : ""}</b><span className="c-linha-s">{PERFIS[u.perfil as Perfil]} · {u.username}</span></span>
            {!u.activo ? <Pill tone="zero">Desactivada</Pill> : bloqueadas.has(u.username) ? <Pill tone="pouco">Bloqueada 10 min</Pill> : <Pill tone="ok">Activa</Pill>}
          </summary>
          <p className="p muted" style={{ fontSize: 14 }}>{PODE[u.perfil as Perfil]}</p>
          <ActionForm action={gerirConta} resetOnSuccess>
            <input type="hidden" name="accao" value="repor_senha" /><input type="hidden" name="id" value={u.id} />
            <p className="c-rot">Dar um PIN novo (se se esqueceu)</p>
            <div className="v-dois">
              <input name="pin" type="text" inputMode="numeric" pattern="\d{4}" className="input on-card" required minLength={4} maxLength={4} placeholder="PIN novo" aria-label="PIN novo" autoComplete="off" />
              <input name="confirm" type="text" inputMode="numeric" pattern="\d{4}" className="input on-card" required minLength={4} maxLength={4} placeholder="Repetir" aria-label="Repetir o PIN" autoComplete="off" />
            </div>
            <SubmitButton className="btn btn-primary" pendingText="A guardar…"><Icon name="cadeado" size={16} /> Guardar PIN novo</SubmitButton>
          </ActionForm>
          {u.id !== user.id ? (
            <>
              <ActionForm action={gerirConta}>
                <input type="hidden" name="accao" value="mudar_perfil" /><input type="hidden" name="id" value={u.id} />
                <p className="c-rot">Função</p>
                <Perfis actual={u.perfil} />
                <SubmitButton className="btn" pendingText="A guardar…">Mudar função</SubmitButton>
              </ActionForm>
              <ActionForm action={gerirConta} confirmText={u.activo ? `Desactivar a conta de ${u.nome}? Deixa de conseguir entrar; as vendas dela ficam nos relatórios.` : undefined}>
                <input type="hidden" name="accao" value={u.activo ? "desactivar" : "activar"} /><input type="hidden" name="id" value={u.id} />
                <SubmitButton className={u.activo ? "btn btn-danger" : "btn"} pendingText="A guardar…">{u.activo ? "Desactivar a conta" : "Activar a conta"}</SubmitButton>
              </ActionForm>
            </>
          ) : null}
        </details>
      ))}
    </div>
  );
}
