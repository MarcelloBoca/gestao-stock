# Sola.chic · Stock e vendas

Aplicação de gestão de loja da Sola.chic: stock por cor e número, vendas, correcções, relatórios e registo de acções.
Segue o PRD "Aplicação de Gestão de Loja (MVP)" e o desenho C (fotos dos produtos).

- **Next.js 16** (App Router, TypeScript), publicada na **Vercel** (região cpt1, Cape Town).
- **Supabase** (projecto `sola-chic-loja`): PostgreSQL, autenticação, fotos (bucket `fotos`) e a função `contas` (gestão de contas com a chave de serviço, que nunca sai do Supabase).
- O stock é sempre a soma dos movimentos; vendas, correcções, anulações e movimentos são funções SQL que verificam o perfil e gravam tudo na mesma transacção, com registo de acções.
- Aspecto e ecrã de entrada copiados da aplicação de encomendas.

## Variáveis de ambiente

```
NEXT_PUBLIC_SUPABASE_URL=https://jmftawxiqqtlqoeckyit.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
```

Na Vercel (só no servidor, nunca `NEXT_PUBLIC_`):

```
PIN_SECRET=…   # 32+ caracteres aleatórios; ex.: openssl rand -base64 48
```

No Supabase (segredo da função `contas`): `SETUP_CODE`, o código para criar a conta da administradora no primeiro acesso.

## Entrar com PIN

- No ecrã de entrada toca-se no nome e escreve-se um PIN de 4 números. Os nomes que aparecem são só os de quem já entrou **neste aparelho** (cookie `sola_pessoas`); quem nunca entrou escreve o utilizador em "Outra pessoa".
- O PIN não é guardado: a palavra-passe da conta no Supabase passa a ser `HMAC-SHA256(PIN_SECRET, utilizador + PIN)`. Os limites de tentativas de sempre continuam (5 erradas bloqueiam a conta 10 minutos).
- Quem ainda não tem PIN entra uma vez com a palavra-passe ("Ainda não tenho PIN") e escolhe o PIN em "Mudar o meu PIN". A administradora dá PINs em Funcionárias (contas novas ou "Dar um PIN novo").
- **Mudar `PIN_SECRET` invalida todos os PINs.** Sem `PIN_SECRET`, a entrada com PIN fica desligada e só funciona a palavra-passe.

## Perfis

| Perfil | Pode |
| --- | --- |
| Vendedora | Vender, ver se há uma peça, ver as suas vendas do dia |
| Gestora | Tudo o anterior, mais stock, peças e preços, corrigir/anular vendas, relatórios, registo |
| Administradora | Tudo o anterior, mais contas das funcionárias e mensagens SMS |

## Por fazer

- Envio automático do SMS das 19h (NT-01 a NT-05): falta escolher o fornecedor de SMS. A lista de destinatários, a hora e o histórico já existem.
