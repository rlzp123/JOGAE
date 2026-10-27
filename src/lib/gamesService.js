import { supabase } from './supabaseClient';

const fields = 'id, titulo, plataforma, status, criado_em';
const table = 'minha_lista';

export function listGames(userId) {
  return supabase.from(table).select(fields).eq('user_id', userId).order('criado_em', { ascending: false });
}

export function saveGame(userId, game, id = null) {
  const payload = { titulo: game.titulo.trim(), plataforma: game.plataforma, status: game.status };
  if (id) return supabase.from(table).update(payload).eq('id', id).eq('user_id', userId).select(fields).single();
  return supabase.from(table).insert({ ...payload, user_id: userId }).select(fields).single();
}

export function deleteGame(userId, id) {
  return supabase.from(table).delete().eq('id', id).eq('user_id', userId).select('id').single();
}

export function gamesError(error) {
  if (['42P01', 'PGRST205'].includes(error?.code)) return 'A tabela minha_lista ainda não existe. Execute o arquivo supabase/minha_lista.sql no SQL Editor.';
  if (error?.code === '42501') return 'Não foi possível acessar sua lista. Confira a sessão e as políticas da tabela.';
  if (error?.code === 'PGRST116') return 'Este jogo não está mais disponível na sua lista. Feche e abra a lista para atualizar.';
  if (/fetch|network|timeout/i.test(error?.message || '')) return 'Confira sua conexão e tente novamente.';
  return 'Não foi possível concluir a operação. Tente novamente.';
}
