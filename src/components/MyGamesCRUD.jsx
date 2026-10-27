import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listGames, saveGame, deleteGame, gamesError } from '../lib/gamesService';

const emptyForm = { titulo: '', plataforma: 'PC', status: 'Quero jogar' };

export default function MyGamesCRUD({ onClose }) {
  const { user } = useAuth();
  const dialog = useRef(null);
  const active = useRef(false);
  const [games, setGames] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    active.current = true;
    dialog.current.showModal();
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await listGames(user.id);
        if (error) throw error;
        if (!cancelled) setGames(data || []);
      } catch (error) { if (!cancelled) setError(gamesError(error)); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { active.current = false; cancelled = true; };
  }, [user.id]);

  function cancelEditing() { setEditId(null); setForm(emptyForm); }
  function startEditing(game) {
    setEditId(game.id); setForm({ titulo: game.titulo, plataforma: game.plataforma, status: game.status }); setError('');
    dialog.current.querySelector('input').focus();
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (!form.titulo.trim()) { setError('Informe o nome do jogo.'); return; }
    setBusy(true); setError('');
    try {
      const { data, error } = await saveGame(user.id, form, editId);
      if (error) throw error;
      if (!active.current) return;
      setGames(previous => editId ? previous.map(game => game.id === editId ? data : game) : [data, ...previous]);
      cancelEditing();
    } catch (error) { if (active.current) setError(gamesError(error)); }
    finally { if (active.current) setBusy(false); }
  }
  async function remove(game) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const { error } = await deleteGame(user.id, game.id);
      if (error) throw error;
      if (!active.current) return;
      setGames(previous => previous.filter(item => item.id !== game.id));
      if (editId === game.id) cancelEditing();
      setPendingDelete(null);
    } catch (error) { if (active.current) setError(gamesError(error)); }
    finally { if (active.current) setBusy(false); }
  }

  return <dialog ref={dialog} className="ja-games-dialog" aria-labelledby="games-title" onCancel={onClose} onClick={event => {
    if (event.target === dialog.current) {
      const bounds = dialog.current.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }
  }}>
    <header className="ja-games-header"><div><p className="ja-card-label">SUA COLEÇÃO</p><h2 id="games-title">Minha lista de jogos</h2></div><button type="button" aria-label="Fechar lista" onClick={onClose}>×</button></header>
    <p className="ja-games-intro">Guarde seus próximos jogos e acompanhe o progresso.</p>
    <form onSubmit={submit} aria-busy={busy}>
      <fieldset disabled={busy || loading} className="ja-games-form">
        <label htmlFor="game-title">Nome do jogo<input id="game-title" value={form.titulo} onChange={event => setForm({ ...form, titulo: event.target.value })} required maxLength={100} placeholder="Ex.: Minecraft" autoFocus /></label>
        <label htmlFor="game-platform">Plataforma<select id="game-platform" value={form.plataforma} onChange={event => setForm({ ...form, plataforma: event.target.value })}>{['PC', 'PlayStation', 'Xbox', 'Nintendo Switch', 'Mobile'].map(option => <option key={option}>{option}</option>)}</select></label>
        <label htmlFor="game-status">Status<select id="game-status" value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}>{['Quero jogar', 'Jogando', 'Concluído'].map(option => <option key={option}>{option}</option>)}</select></label>
        <div className="ja-games-actions"><button type="submit" className="ja-primary">{busy ? 'AGUARDE...' : editId ? 'SALVAR ALTERAÇÕES' : 'ADICIONAR JOGO'}</button>{editId && <button type="button" className="ja-games-secondary" onClick={cancelEditing}>Cancelar edição</button>}</div>
      </fieldset>
    </form>
    {error && <p className="ja-message" role="alert">{error}</p>}
    <div className="ja-games-list" aria-live="polite">
      {loading ? <p role="status">Carregando sua lista…</p> : !games.length ? <p>Você ainda não adicionou jogos.</p> : games.map(game => <article className="ja-games-item" key={game.id}>
        <div><strong>{game.titulo}</strong><small>{game.plataforma} · {game.status}</small></div>
        {pendingDelete === game.id ? <div className="ja-games-delete"><span>Remover este jogo?</span><button type="button" disabled={busy} onClick={() => remove(game)}>Confirmar remoção</button><button type="button" disabled={busy} onClick={() => setPendingDelete(null)}>Cancelar</button></div> : <div className="ja-games-item-buttons"><button type="button" disabled={busy} onClick={() => startEditing(game)} aria-label={`Editar ${game.titulo}`}>Editar</button><button type="button" disabled={busy} onClick={() => setPendingDelete(game.id)} aria-label={`Remover ${game.titulo}`}>Remover</button></div>}
      </article>)}
    </div>
  </dialog>;
}
