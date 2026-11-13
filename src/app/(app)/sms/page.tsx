import type { Metadata } from "next";
import { ADMIN, requireUser } from "@/lib/auth";
import { diaCurto } from "@/lib/format";
import { gerirSms } from "@/app/actions/contas";
import { ActionForm, SubmitButton } from "@/components/forms";
import { PageHead, Pill } from "@/components/ui";
import Icon from "@/components/Icon";

export const metadata: Metadata = { title: "Mensagens SMS" };
export const dynamic = "force-dynamic";

/** NT-04/NT-05: destinatários, hora e histórico de envios do SMS diário. */
export default async function SmsPage() {
  const { sb } = await requireUser(ADMIN);
  const [{ data: dest }, { data: def }, { data: envios }] = await Promise.all([
    sb.from("destinatarios_sms").select("id, nome, numero, activo").order("activo", { ascending: false }).order("nome"),
    sb.from("definicoes").select("hora_sms").maybeSingle(),
    sb.from("envios_sms").select("id, tipo, estado, dia, tentativas, texto, destinatarios_sms(nome)").order("criado_em", { ascending: false }).limit(30),
  ]);
  const horaSms = String(def?.hora_sms ?? "19:00").slice(0, 5);
  return (
    <div className="c-page c-narrow" style={{ maxWidth: 760 }}>
      <PageHead title="Mensagens SMS" sub={`Todos os dias de abertura às ${horaSms}, com o total vendido. Ao sábado, também o total da semana.`} />
      <p className="alert alert-warn"><Icon name="aviso" size={20} /> O envio automático ainda não está ligado: falta escolher o fornecedor de SMS e o nome que aparece na mensagem. A lista abaixo já fica pronta.</p>
      <div className="c-card">
        <h2 className="c-card-t">Quem recebe</h2>
        {(dest ?? []).length === 0 ? <p className="empty">Ainda ninguém. Junte a administradora e as gestoras.</p> : (dest ?? []).map((d) => (
          <div key={d.id} className="c-entre" style={{ alignItems: "center", paddingBottom: 10, borderBottom: "1px solid var(--linha)" }}>
            <span className="c-linha-m"><b>{d.nome}</b><span className="c-linha-s">{d.numero}</span></span>
            <ActionForm action={gerirSms} className="">
              <input type="hidden" name="accao" value="activo" /><input type="hidden" name="id" value={d.id} /><input type="hidden" name="valor" value={d.activo ? "0" : "1"} />
              <SubmitButton className={`btn btn-sm${d.activo ? "" : " btn-primary"}`} pendingText="…">{d.activo ? "Deixar de enviar" : "Voltar a enviar"}</SubmitButton>
            </ActionForm>
          </div>
        ))}
        <ActionForm action={gerirSms} resetOnSuccess>
          <input type="hidden" name="accao" value="juntar" />
          <div className="inline">
            <input name="nome" className="input on-card" style={{ flex: 1, minWidth: 140 }} required maxLength={80} placeholder="Nome" aria-label="Nome" />
            <input name="numero" className="input on-card" style={{ flex: 1, minWidth: 140 }} required inputMode="tel" placeholder="84 123 4567" aria-label="Número" />
          </div>
          <SubmitButton className="btn btn-primary" pendingText="A juntar…"><Icon name="mais" size={20} /> Juntar à lista</SubmitButton>
        </ActionForm>
      </div>
      <div className="c-card">
        <h2 className="c-card-t">Hora do SMS</h2>
        <ActionForm action={gerirSms} className="inline">
          <input type="hidden" name="accao" value="hora" />
          <input name="hora" type="time" className="input on-card" defaultValue={horaSms} style={{ flex: 1, maxWidth: 200 }} aria-label="Hora" />
          <SubmitButton className="c-pequeno" pendingText="…">Guardar hora</SubmitButton>
        </ActionForm>
      </div>
      <div className="c-card">
        <h2 className="c-card-t">Últimos envios</h2>
        {(envios ?? []).length === 0 ? <p className="empty">Ainda não foi enviado nenhum SMS.</p> : (envios ?? []).map((e) => (
          <div key={e.id} className="c-entre" style={{ alignItems: "center" }}>
            <span className="c-linha-m"><b>{(e.destinatarios_sms as unknown as { nome: string } | null)?.nome}</b><span className="c-linha-s">{diaCurto(e.dia)} · {e.tipo === "semanal" ? "semanal" : "diário"}</span></span>
            <Pill tone={e.estado === "enviado" ? "ok" : e.estado === "falhado" ? "zero" : "cinza"}>{e.estado === "enviado" ? "Entregue" : e.estado === "falhado" ? `Falhou (${e.tentativas})` : "Por enviar"}</Pill>
          </div>
        ))}
      </div>
    </div>
  );
}
