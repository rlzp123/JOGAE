export default function AuthLayout({ children }) {
  return <main id="jogae-auth">
    <header className="ja-top">
      <div className="ja-brand"><span className="ja-brand-mark">J</span> JOGAÊ</div>
      <span className="ja-access">SUA CONTA, SEU PRÓXIMO PLAY</span>
    </header>
    <div className="ja-layout">
      <div className="ja-story">
        <p className="ja-eyebrow"><i /> SEU PRÓXIMO PLAY COMEÇA AQUI</p>
        <h1>Entre no jogo.<br />Vá para o<br /><span>próximo nível.</span></h1>
        <p className="ja-story-copy">A sua próxima aventura está a um login de distância. Conecte-se ao universo JOGAÊ.</p>
        <div className="ja-art" aria-hidden="true">
          <span className="ja-chip ja-chip-one">PLAYER 01 · READY</span>
          <img className="ja-controller" src={`${import.meta.env.BASE_URL}controle.svg`} alt="" />
          <span className="ja-chip ja-chip-two">PRESS START ↗</span>
        </div>
        <div className="ja-perks"><span><b>✓</b> Catálogo de jogos</span><span><b>✓</b> Sua conta conectada</span><span><b>✓</b> Novas aventuras</span></div>
      </div>
      {children}
    </div>
    <footer className="ja-foot"><span>JOGAÊ · O SEU PRÓXIMO NÍVEL</span><span>RPG / AÇÃO / AVENTURA / ESPORTES</span></footer>
  </main>;
}
