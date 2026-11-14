-- Custo de cada peça, para o "Lucro estimado" (vendido menos o custo das peças vendidas).
-- Fica numa tabela à parte para que só a gestora e a administradora o vejam:
-- as vendedoras lêem os produtos, mas não os custos.

create table if not exists public.custos_produtos (
  produto_id uuid primary key references public.produtos(id) on delete cascade,
  custo numeric(12, 2) not null check (custo >= 0),
  actualizado_em timestamptz not null default now(),
  actualizado_por uuid references public.utilizadores(id)
);

alter table public.custos_produtos enable row level security;

drop policy if exists custos_ler_gestao on public.custos_produtos;
create policy custos_ler_gestao on public.custos_produtos
  for select to authenticated
  using (exists (
    select 1 from public.utilizadores u
    where u.id = auth.uid() and u.activo and u.perfil in ('administrador', 'gestor')
  ));
-- Sem políticas de escrita: só se muda pela função abaixo.

revoke all on public.custos_produtos from anon;
grant select on public.custos_produtos to authenticated;

-- Mudar (ou tirar, com null) o custo de uma peça. Verifica o perfil e fica no registo de acções.
create or replace function public.definir_custo(p_produto uuid, p_custo numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_perfil text;
  v_nome text;
  v_antes numeric;
begin
  select perfil into v_perfil from utilizadores where id = auth.uid() and activo;
  if v_perfil is null or v_perfil not in ('administrador', 'gestor') then
    raise exception 'PERMISSAO: Só a gestora ou a administradora pode mudar o custo.';
  end if;
  if p_custo is not null and p_custo < 0 then
    raise exception 'DADOS: O custo não pode ser negativo.';
  end if;

  select nome into v_nome from produtos where id = p_produto;
  if not found then
    raise exception 'DADOS: Peça não encontrada.';
  end if;
  select custo into v_antes from custos_produtos where produto_id = p_produto for update;

  if v_antes is not distinct from p_custo then
    return;
  end if;

  if p_custo is null then
    delete from custos_produtos where produto_id = p_produto;
  else
    insert into custos_produtos (produto_id, custo, actualizado_em, actualizado_por)
    values (p_produto, round(p_custo, 2), now(), auth.uid())
    on conflict (produto_id) do update
      set custo = excluded.custo, actualizado_em = excluded.actualizado_em, actualizado_por = excluded.actualizado_por;
  end if;

  insert into registo_accoes (accao, antes, depois, utilizador_id)
  values (
    'custo_alterado',
    jsonb_build_object('peca', v_nome, 'custo', v_antes),
    jsonb_build_object('peca', v_nome, 'custo', p_custo),
    auth.uid()
  );
end;
$$;

revoke all on function public.definir_custo(uuid, numeric) from public, anon;
grant execute on function public.definir_custo(uuid, numeric) to authenticated;
