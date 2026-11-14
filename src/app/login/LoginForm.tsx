"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useState } from "react";
import { entrarComPin, esquecerNoAparelho, login } from "@/app/actions/auth";
import { PendingProvider, SubmitButton, useSubmitAction } from "@/components/forms";
import Icon from "@/components/Icon";
import { PERFIS, type ActionState, type Perfil } from "@/lib/types";

type Pessoa = { u: string; n: string; p: Perfil };
type Modo = "escolher" | "outra" | "pin" | "senha";

const iniciais = (nome: string) => nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "apagar"];

export default function LoginForm({
  next, notice, firstAccess, pessoas, pin: pinLigado, senha,
}: { next: string; notice?: string; firstAccess: boolean; pessoas: Pessoa[]; pin: boolean; senha: boolean }) {
  const inicial: Modo = senha || !pinLigado ? "senha" : pessoas.length ? "escolher" : "outra";
  const [modo, setModo] = useState<Modo>(inicial);
  const [quem, setQuem] = useState<Pessoa | null>(null);
  const [username, setUsername] = useState("");
  const [lista, setLista] = useState(pessoas);

  function escolher(p: Pessoa) {
    setQuem(p);
    setModo("pin");
  }

  return (
    <main className="v-entrada">
      <h1 className="visually-hidden">Sola.chic, stock e vendas: entrar</h1>
      <div className="v-entrada-lado">
        <span aria-hidden="true" />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h2>Stock e vendas<br />da loja, num só sítio.</h2>
          <p>Cada pessoa entra com o seu PIN. Assim sabemos quem vendeu o quê e o stock fica sempre certo.</p>
        </div>
      </div>
      <div className="v-entrada-form">
        <div className="v-entrada-caixa">
          <div className="v-entrada-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-solachic.png" alt="Sola.chic, Woman Footwear" width={168} height={168} />
          </div>
          {notice ? <p className="alert alert-rose" role="status">{notice}</p> : null}

          {modo === "escolher" ? (
            <>
              <h2 className="v-entrada-t">Quem vai entrar?</h2>
              <div className="v-pessoas">
                {lista.map((p) => (
                  <button key={p.u} type="button" className="v-pessoa" onClick={() => escolher(p)}>
                    <span className="v-ini" aria-hidden="true">{iniciais(p.n)}</span>
                    <span className="v-pessoa-t"><span className="v-pessoa-n">{p.n}</span><span className="v-pessoa-f">{PERFIS[p.p]}</span></span>
                    <Icon name="seguir" size={16} />
                  </button>
                ))}
              </div>
              <button type="button" className="btn" style={{ width: "100%" }} onClick={() => { setUsername(""); setModo("outra"); }}>
                <Icon name="utilizador" size={16} /> Outra pessoa
              </button>
            </>
          ) : null}

          {modo === "outra" ? (
            <form
              className="stack-md"
              onSubmit={(e) => {
                e.preventDefault();
                const u = username.trim().toLowerCase();
                if (u.length >= 3) escolher({ u, n: u, p: "vendedor" });
              }}
            >
              {lista.length ? (
                <button type="button" className="c-back" onClick={() => setModo("escolher")}><Icon name="voltar" size={16} /> Voltar</button>
              ) : null}
              <h2 className="v-entrada-t">Quem vai entrar?</h2>
              <div className="field">
                <label className="label" htmlFor="username">O seu utilizador</label>
                <input id="username" className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username"
                  autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="Ex.: fatima" maxLength={64} required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={username.trim().length < 3}>Continuar</button>
            </form>
          ) : null}

          {modo === "pin" && quem ? (
            <Teclado
              quem={quem}
              next={next}
              conhecida={lista.some((p) => p.u === quem.u)}
              trocar={() => setModo(lista.length ? "escolher" : "outra")}
              esquecer={() => {
                startTransition(() => { void esquecerNoAparelho(quem.u); });
                const resto = lista.filter((p) => p.u !== quem.u);
                setLista(resto);
                setModo(resto.length ? "escolher" : "outra");
              }}
            />
          ) : null}

          {modo === "senha" ? <EntrarComSenha next={next} voltar={pinLigado ? () => setModo(lista.length ? "escolher" : "outra") : undefined} /> : null}

          {modo !== "senha" && modo !== "pin" ? (
            <button type="button" className="btn btn-text" style={{ alignSelf: "center" }} onClick={() => setModo("senha")}>
              Ainda não tenho PIN: entrar com a palavra-passe
            </button>
          ) : null}
          <p className="hint" style={{ textAlign: "center" }}>Esqueceu-se do PIN? Peça à administradora da loja para lhe dar um novo.</p>
          {firstAccess ? <Link href="/primeiro-acesso" className="v-link" style={{ textAlign: "center" }}>Primeiro acesso: criar a conta da administradora</Link> : null}
        </div>
      </div>
    </main>
  );
}

function Teclado({ quem, next, conhecida, trocar, esquecer }: { quem: Pessoa; next: string; conhecida: boolean; trocar: () => void; esquecer: () => void }) {
  const [state, dispatch, pending] = useActionState<ActionState, FormData>(entrarComPin, {});
  const [pin, setPin] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (state.error) {
      setErro(state.error);
      setPin("");
    }
  }, [state]);

  function enviar(p: string) {
    const fd = new FormData();
    fd.set("username", quem.u);
    fd.set("pin", p);
    fd.set("next", next);
    startTransition(() => dispatch(fd));
  }
  function premir(k: string) {
    if (pending) return;
    setErro("");
    if (k === "apagar") return setPin((p) => p.slice(0, -1));
    if (pin.length >= 4) return;
    const p = pin + k;
    setPin(p);
    if (p.length === 4) enviar(p);
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) premir(e.key);
      else if (e.key === "Backspace") premir("apagar");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="v-pin">
      <button type="button" className="c-back" style={{ alignSelf: "flex-start" }} onClick={trocar}><Icon name="voltar" size={16} /> Trocar pessoa</button>
      <span className="v-ini v-pin-ini" aria-hidden="true">{iniciais(quem.n)}</span>
      <div style={{ textAlign: "center" }}>
        <h2 className="v-pin-ola">Olá, {quem.n.split(" ")[0]}</h2>
        <span className="muted" style={{ fontSize: 14 }}>Escreva o seu PIN de 4 dígitos</span>
      </div>
      <div className="v-pontos" role="status" aria-label={`${pin.length} de 4 números escritos`}>
        {[0, 1, 2, 3].map((i) => <span key={i} className={`v-ponto${i < pin.length ? " cheio" : ""}`} />)}
      </div>
      {erro ? <p className="alert alert-error" role="alert" style={{ alignSelf: "stretch", justifyContent: "center" }}>{erro}</p> : null}
      {pending ? <p className="muted" role="status" style={{ margin: 0 }}>A entrar…</p> : null}
      <div className="v-teclado">
        {TECLAS.map((k) =>
          k === "" ? <span key="vazio" /> : (
            <button key={k} type="button" className={`v-tecla${k === "apagar" ? " apagar" : ""}`} aria-label={k === "apagar" ? "Apagar" : k} disabled={pending} onClick={() => premir(k)}>
              {k === "apagar" ? "⌫" : k}
            </button>
          ),
        )}
      </div>
      {conhecida ? (
        <button type="button" className="btn btn-text" onClick={esquecer} style={{ fontSize: 13 }}>Tirar {quem.n.split(" ")[0]} deste aparelho</button>
      ) : null}
    </div>
  );
}

function EntrarComSenha({ next, voltar }: { next: string; voltar?: () => void }) {
  const { state, pending, onSubmit } = useSubmitAction(login);
  const [show, setShow] = useState(false);
  const error = state.error;
  return (
    <form onSubmit={onSubmit} className="stack-md" noValidate>
      <PendingProvider pending={pending}>
        {voltar ? <button type="button" className="c-back" onClick={voltar}><Icon name="voltar" size={16} /> Voltar ao PIN</button> : null}
        <h2 className="v-entrada-t">Entrar com a palavra-passe</h2>
        <input type="hidden" name="next" value={next} />
        <div className="field">
          <label className="label" htmlFor="username">Utilizador</label>
          <input id="username" name="username" className="input" type="text" autoComplete="username" autoCapitalize="none" autoCorrect="off"
            spellCheck={false} placeholder="Ex.: fatima" maxLength={64} required />
        </div>
        <div className="field">
          <label className="label" htmlFor="password">Palavra-passe</label>
          <div style={{ position: "relative" }}>
            <input id="password" name="password" className="input" type={show ? "text" : "password"} autoComplete="current-password"
              maxLength={128} required aria-invalid={error ? true : undefined} aria-describedby={error ? "login-erro" : undefined} style={{ paddingRight: 44 }} />
            <button type="button" aria-label={show ? "Esconder palavra-passe" : "Mostrar palavra-passe"} aria-pressed={show} onClick={() => setShow((v) => !v)}
              style={{ position: "absolute", right: 2, top: 2, width: 36, height: 36, border: 0, background: "none", color: "var(--fraco)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={show ? "olhoNao" : "olho"} size={18} stroke={1.8} />
            </button>
          </div>
        </div>
        {error ? <p id="login-erro" className="alert alert-error" role="alert">{error}</p> : null}
        <SubmitButton className="btn btn-primary" pendingText="A entrar…">Entrar</SubmitButton>
        <p className="hint">Depois de entrar, escolha o seu PIN em “Mudar o meu PIN”.</p>
      </PendingProvider>
    </form>
  );
}
