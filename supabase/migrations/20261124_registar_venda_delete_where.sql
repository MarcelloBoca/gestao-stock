-- Correcção: "Ocorreu um erro. Tente de novo." ao registar uma venda.
--
-- Os pedidos que chegam pela API do Supabase (PostgREST) correm com a extensão
-- pg-safeupdate, que recusa qualquer DELETE/UPDATE sem WHERE
-- (erro 21000 "DELETE requires a WHERE clause"). O registar_venda limpava a
-- tabela temporária do cesto com "delete from _linhas;", por isso todas as
-- vendas feitas pela aplicação falhavam. No editor SQL não falhava porque aí a
-- extensão não está activa.
--
-- Única mudança: "delete from _linhas where true;". O resto da função fica igual.
-- (Verificadas as outras funções em public/private: nenhuma tem DELETE/UPDATE sem WHERE.)
-- CREATE OR REPLACE mantém as permissões (grants/revokes) que a função já tem.

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
  delete from _linhas where true;
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
