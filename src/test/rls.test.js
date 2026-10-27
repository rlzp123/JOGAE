// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { expect, it } from 'vitest';

it('aplica o SQL e impede leitura, edição, remoção e inserção em nome de outro usuário', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql as
        'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
      grant usage on schema auth, public to authenticated;
      grant usage on schema public to anon;
      insert into auth.users values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
    `);
    await db.exec(readFileSync(resolve(process.cwd(), 'supabase/minha_lista.sql'), 'utf8'));
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';`);
    const own = await db.query(`insert into public.minha_lista(user_id,titulo) values ('00000000-0000-0000-0000-000000000001','Minecraft') returning id`);
    const gameId = own.rows[0].id;
    await db.exec(`set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';`);
    expect((await db.query('select * from public.minha_lista')).rows).toHaveLength(0);
    expect((await db.query('update public.minha_lista set titulo = $1 where id = $2 returning id', ['Outro título', gameId])).rows).toHaveLength(0);
    expect((await db.query('delete from public.minha_lista where id = $1 returning id', [gameId])).rows).toHaveLength(0);
    await expect(db.query(`insert into public.minha_lista(user_id,titulo) values ('00000000-0000-0000-0000-000000000001','Tentativa indevida')`)).rejects.toThrow(/row-level security/i);
    await db.exec(`insert into public.minha_lista(user_id,titulo) values ('00000000-0000-0000-0000-000000000002','Zelda');`);
    expect((await db.query('select titulo from public.minha_lista')).rows).toEqual([{ titulo: 'Zelda' }]);
    await db.exec(`reset role; set role anon;`);
    await expect(db.query('select * from public.minha_lista')).rejects.toThrow(/permission denied/i);
    await db.exec('reset role;');
    expect((await db.query('select * from public.minha_lista')).rows).toHaveLength(2);
  } finally { await db.close(); }
}, 20000);
