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

No Supabase (segredo da função `contas`): `SETUP_CODE`, o código para criar a conta da administradora no primeiro acesso.

## Perfis

| Perfil | Pode |
| --- | --- |
| Vendedora | Vender, ver se há uma peça, ver as suas vendas do dia |
| Gestora | Tudo o anterior, mais stock, peças e preços, corrigir/anular vendas, relatórios, registo |
| Administradora | Tudo o anterior, mais contas das funcionárias e mensagens SMS |

## Por fazer

- Envio automático do SMS das 19h (NT-01 a NT-05): falta escolher o fornecedor de SMS. A lista de destinatários, a hora e o histórico já existem.
