import { formatBRL } from '../data/games';

export default function GameCard({ game, onDetails, onAdd }) {
  return (
    <article className="game-card group reveal-card">
      <div className="game-card-image-wrap">
        <img src={game.image} alt={`Arte abstrata de ${game.title}`} className="game-card-image" />
        <span className="game-tag">{game.tag}</span>
        <div className="game-card-shine" />
      </div>

      <div className="game-card-content">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500 font-black">{game.category}</p>
          <h3 className="mt-2 text-xl font-black tracking-tight text-white">{game.title}</h3>
        </div>

        <p className="mt-3 text-sm leading-6 text-zinc-400 line-clamp-2">{game.description}</p>

        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-bold">A partir de</p>
            <p className="text-xl font-black text-amber-300">{formatBRL(game.price)}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onDetails(game)} className="btn-ghost-card">Detalhes</button>
            <button onClick={() => onAdd(game)} className="btn-gold-card">+ Carrinho</button>
          </div>
        </div>
      </div>
    </article>
  );
}
