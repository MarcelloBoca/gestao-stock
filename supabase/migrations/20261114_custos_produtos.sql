-- Custo de cada peça, para o "Lucro estimado" (vendido menos o custo das peças vendidas).
-- Fica numa tabela à parte para que só a gestora e a administradora o vejam:
-- as vendedoras lêem os produtos, mas não os custos.

create table if not exists public.custos_produtos (
  produto_id uuid primary key references public.produtos(id) on delete cascade,
  custo numeric(12, 2) not null check (custo >= 0),
  actualizado_em timestamptz not null default now(),
  actualizado_por uuid references public.utilizadores(id) on delete set null
);

alter table public.custos_produtos enable row level security;

drop policy if exists custos_ler_gestao on public.custos_produtos;
create policy custos_ler_gestao on public.custos_produtos
  for select to authenticated
  using ((select private.perfil_actual()) in ('administrador', 'gestor'));
-- Sem políticas de escrita: só se muda pela função abaixo.

revoke all on public.custos_produtos from anon, authenticated;
grant select on public.custos_produtos to authenticated;

-- Mudar (ou tirar, com null) o custo de uma peça. Verifica o perfil e fica no registo de acções.
create or replace function public.definir_custo(p_produto uuid, p_custo numeric)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare v_nome text; v_antes numeric;
begin
  perform private.exigir_perfil(array['administrador','gestor']::public.perfil[]);
  if p_custo is not null and (p_custo < 0 or p_custo > 100000000) then
    raise exception 'DADOS: O custo não é válido.' using errcode = 'P0001';
  end if;
  select p.nome into v_nome from public.produtos p where p.id = p_produto;
  if v_nome is null then raise exception 'DADOS: Esta peça não existe.' using errcode = 'P0001'; end if;
  select c.custo into v_antes from public.custos_produtos c where c.produto_id = p_produto for update;
  if v_antes is not distinct from round(p_custo, 2) then return; end if;

  if p_custo is null then
    delete from public.custos_produtos where produto_id = p_produto;
  else
    insert into public.custos_produtos (produto_id, custo, actualizado_em, actualizado_por)
      values (p_produto, round(p_custo, 2), now(), (select auth.uid()))
      on conflict (produto_id) do update
        set custo = excluded.custo, actualizado_em = excluded.actualizado_em, actualizado_por = excluded.actualizado_por;
  end if;

  perform private.auditar('custo_alterado', 'custos_produtos', p_produto::text,
    jsonb_build_object('peca', v_nome, 'custo', v_antes),
    jsonb_build_object('peca', v_nome, 'custo', round(p_custo, 2)));
end $function$;

revoke all on function public.definir_custo(uuid, numeric) from public, anon;
grant execute on function public.definir_custo(uuid, numeric) to authenticated;
