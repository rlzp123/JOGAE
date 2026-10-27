export const categories = ['Todos', 'RPG', 'Ação', 'Aventura', 'Esportes'];

export const games = [
  {
    id: 'elden-ring',
    category: 'RPG',
    title: 'ELDEN RING',
    description: 'Explore um mundo sombrio, enfrente grandes desafios e construa sua própria jornada.',
    image: '/img/elden-ring.svg',
    price: 274.5,
    platforms: ['PC (Steam)', 'PlayStation 5', 'Xbox Series X/S'],
    tag: 'RPG ÉPICO'
  },
  {
    id: 'cyberpunk-2077',
    category: 'RPG',
    title: 'CYBERPUNK 2077',
    description: 'Uma aventura futurista em uma metrópole neon cheia de escolhas e ação.',
    image: '/img/cyberpunk.svg',
    price: 199.99,
    platforms: ['PC (Steam)', 'PlayStation 5', 'Xbox Series X/S'],
    tag: 'MUNDO ABERTO'
  },
  {
    id: 'spider-man-2',
    category: 'Ação',
    title: 'SPIDER-MAN 2',
    description: 'Ação cinematográfica, exploração urbana e combates rápidos em uma grande cidade.',
    image: '/img/spider-man.svg',
    price: 349.9,
    platforms: ['PlayStation 5'],
    tag: 'DESTAQUE'
  },
  {
    id: 'god-of-war',
    category: 'Ação',
    title: 'GOD OF WAR RAGNARÖK',
    description: 'Uma jornada intensa com combates, exploração e narrativa cinematográfica.',
    image: '/img/god-of-war.svg',
    price: 249.9,
    platforms: ['PC (Steam)', 'PlayStation 5', 'PlayStation 4'],
    tag: 'AÇÃO'
  },
  {
    id: 'zelda',
    category: 'Aventura',
    title: 'THE LEGEND OF ZELDA',
    description: 'Explore paisagens abertas, descubra segredos e resolva desafios pelo caminho.',
    image: '/img/zelda.svg',
    price: 390,
    platforms: ['Nintendo Switch'],
    tag: 'AVENTURA'
  },
  {
    id: 'red-dead',
    category: 'Aventura',
    title: 'RED DEAD REDEMPTION',
    description: 'Uma grande história de aventura e exploração em um cenário inspirado no velho oeste.',
    image: '/img/red-dead.svg',
    price: 249.5,
    platforms: ['PC (Steam)', 'PlayStation 5', 'Xbox Series X/S'],
    tag: 'HISTÓRIA'
  },
  {
    id: 'fc-24',
    category: 'Esportes',
    title: 'EA SPORTS FC 24',
    description: 'Futebol, competição e modos para jogar sozinho ou com amigos.',
    image: '/img/fc24.svg',
    price: 359,
    platforms: ['PC (Steam)', 'PlayStation 5', 'Xbox Series X/S', 'Nintendo Switch'],
    tag: 'FUTEBOL'
  },
  {
    id: 'forza',
    category: 'Esportes',
    title: 'FORZA HORIZON',
    description: 'Corridas em mundo aberto, eventos variados e muitos carros para descobrir.',
    image: '/img/forza.svg',
    price: 249,
    platforms: ['PC (Steam)', 'Xbox Series X/S'],
    tag: 'CORRIDA'
  }
];

export const heroGames = [games[2], games[1], games[0], games[6]];

export function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}
