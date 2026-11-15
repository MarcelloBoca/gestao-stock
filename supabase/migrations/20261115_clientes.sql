-- Clientes: nome e contacto (opcionais) registados na venda, para a loja ter a lista
-- dos seus clientes e lhes poder mandar mensagens/promoções por WhatsApp.
-- Só a gestora e a administradora vêem a lista; as vendedoras só escrevem na venda.

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 80),
  contacto text check (contacto ~ '^[0-9]{9,15}$'),
  aceita_mensagens boolean not null default true,
  criado_em timestamptz not null default now(),
  actualizado_em timestamptz not null default now(),
  criado_por uuid references public.utilizadores(id) on delete set null
);
create unique index if not exists clientes_contacto_unico on public.clientes (contacto) where contacto is not null;
create index if not exists clientes_nome_idx on public.clientes (lower(nome));

alter table public.vendas add column if not exists cliente_id uuid references public.clientes(id) on delete set null;
create index if not exists vendas_cliente_idx on public.vendas (cliente_id) where cliente_id is not null;

alter table public.clientes enable row level security;
drop policy if exists clientes_ler_gestao on public.clientes;
create policy clientes_ler_gestao on public.clientes
  for select to authenticated
  using ((select private.perfil_actual()) in ('administrador', 'gestor'));
revoke all on public.clientes from anon, authenticated;
grant select on public.clientes to authenticated;

-- Telefone só com algarismos e com o indicativo de Moçambique (258) quando tem 9 algarismos.
create or replace function private.normalizar_contacto(p text)
returns text
language plpgsql
immutable
set search_path to ''
as $function$
declare d text := regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g');
begin
  if d = '' then return null; end if;
  if left(d, 2) = '00' then d := substr(d, 3); end if;
  if char_length(d) = 9 and left(d, 1) in ('8', '2') then d := '258' || d; end if;
  if char_length(d) < 9 or char_length(d) > 15 then
    raise exception 'DADOS: O contacto não parece um número de telefone (ex.: 84 123 4567).' using errcode = 'P0001';
  end if;
  return d;
end $function$;

-- Encontra ou cria o cliente a partir do nome e/ou contacto. Devolve null se ambos vazios.
create or replace function private.cliente_da_venda(p_nome text, p_contacto text)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare v_nome text := nullif(btrim(coalesce(p_nome, '')), ''); v_tel text := private.normalizar_contacto(p_contacto); v_id uuid;
begin
  if v_nome is null and v_tel is null then return null; end if;
  if v_nome is not null and char_length(v_nome) > 80 then v_nome := left(v_nome, 80); end if;
  if v_tel is not null then
    select c.id into v_id from public.clientes c where c.contacto = v_tel for update;
    if v_id is not null then
      if v_nome is not null then update public.clientes set nome = v_nome, actualizado_em = now() where id = v_id and nome is distinct from v_nome; end if;
      return v_id;
    end if;
  else
    select c.id into v_id from public.clientes c where c.contacto is null and lower(c.nome) = lower(v_nome) order by c.criado_em limit 1;
    if v_id is not null then return v_id; end if;
  end if;
  insert into public.clientes (nome, contacto, criado_por) values (coalesce(v_nome, 'Cliente'), v_tel, (select auth.uid())) returning id into v_id;
  return v_id;
end $function$;

-- registar_venda passa a aceitar (opcionalmente) o nome e o contacto do cliente.
drop function if exists public.registar_venda(public.forma_pagamento, jsonb);
create or replace function public.registar_venda(p_forma public.forma_pagamento, p_linhas jsonb, p_cliente_nome text default null, p_cliente_contacto text default null)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_venda uuid; v_total numeric := 0; r record; v_preco numeric; v_stock int; v_linha uuid; v_cliente uuid;
begin
  perform private.exigir_perfil(array['administrador','gestor','vendedor']::public.perfil[]);
  if p_forma is null or p_forma = 'cartao' then raise exception 'DADOS: Escolha como o cliente pagou.' using errcode = 'P0001'; end if;
  v_cliente := private.cliente_da_venda(p_cliente_nome, p_cliente_contacto);
  create temp table if not exists _linhas (variante_id uuid, quantidade int, preco numeric) on commit drop;
  delete from _linhas;
  for r in select * from private.linhas_pedidas(p_linhas) loop
    select p.preco_venda into v_preco
      from public.variantes v join public.produtos p on p.id = v.produto_id join public.categorias c on c.id = p.categoria_id
      where v.id = r.variante_id and v.activa and p.activo and c.activa
      for update of v;
    if v_preco is null then raise exception 'DADOS: Uma das peças já não está à venda.' using errcode = 'P0001'; end if;
    v_stock := private.stock_de(r.variante_id);
    if v_stock < r.quantidade then
      raise exception 'STOCK: % — só há % na loja.', private.nome_variante(r.variante_id), v_stock using errcode = 'P0001';
    end if;
    insert into _linhas values (r.variante_id, r.quantidade, v_preco);
    v_total := v_total + v_preco * r.quantidade;
  end loop;
  insert into public.vendas (vendedor_id, forma_pagamento, total, cliente_id) values ((select auth.uid()), p_forma, v_total, v_cliente) returning id into v_venda;
  for r in select * from _linhas loop
    insert into public.linhas_venda (venda_id, variante_id, quantidade, preco_unitario, subtotal)
      values (v_venda, r.variante_id, r.quantidade, r.preco, r.preco * r.quantidade) returning id into v_linha;
    insert into public.movimentos_stock (variante_id, tipo, quantidade, linha_venda_id, utilizador_id)
      values (r.variante_id, 'venda', -r.quantidade, v_linha, (select auth.uid()));
  end loop;
  perform private.auditar('venda_registada', 'vendas', v_venda::text, null, private.venda_json(v_venda) || jsonb_build_object('cliente_id', v_cliente));
  return v_venda;
end $function$;
revoke all on function public.registar_venda(public.forma_pagamento, jsonb, text, text) from public, anon;
grant execute on function public.registar_venda(public.forma_pagamento, jsonb, text, text) to authenticated;

-- Gestão: mudar o nome/contacto de um cliente, ou marcar que não quer mensagens.
create or replace function public.guardar_cliente(p_id uuid, p_nome text, p_contacto text, p_aceita boolean)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare v_antes jsonb; v_nome text := nullif(btrim(coalesce(p_nome, '')), ''); v_tel text := private.normalizar_contacto(p_contacto);
begin
  perform private.exigir_perfil(array['administrador','gestor']::public.perfil[]);
  if v_nome is null or char_length(v_nome) > 80 then raise exception 'DADOS: Escreva o nome do cliente (até 80 letras).' using errcode = 'P0001'; end if;
  select to_jsonb(c) - 'criado_em' - 'actualizado_em' into v_antes from public.clientes c where c.id = p_id for update;
  if v_antes is null then raise exception 'DADOS: Este cliente não existe.' using errcode = 'P0001'; end if;
  if v_tel is not null and exists (select 1 from public.clientes c where c.contacto = v_tel and c.id <> p_id) then
    raise exception 'DADOS: Já há outro cliente com esse contacto.' using errcode = 'P0001';
  end if;
  update public.clientes set nome = v_nome, contacto = v_tel, aceita_mensagens = coalesce(p_aceita, aceita_mensagens), actualizado_em = now() where id = p_id;
  perform private.auditar('cliente_editado', 'clientes', p_id::text, v_antes,
    jsonb_build_object('nome', v_nome, 'contacto', v_tel, 'aceita_mensagens', coalesce(p_aceita, (v_antes->>'aceita_mensagens')::boolean)));
end $function$;
revoke all on function public.guardar_cliente(uuid, text, text, boolean) from public, anon;
grant execute on function public.guardar_cliente(uuid, text, text, boolean) to authenticated;

revoke all on function private.cliente_da_venda(text, text) from public, anon, authenticated;
