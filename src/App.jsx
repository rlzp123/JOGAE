import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import AuthLayout from './components/AuthLayout';
import AuthScreen from './components/AuthScreen';
import AccountControls from './components/AccountControls';
import OriginalCatalog from './components/OriginalCatalog';
import MyGamesCRUD from './components/MyGamesCRUD';
import NativeTools from './components/NativeTools';
import GeolocationTools from './components/GeolocationTools';

function SignedInApp() {
  const { user } = useAuth();
  const [gamesOpen, setGamesOpen] = useState(false);
  return (
    <>
      <OriginalCatalog />
      <AccountControls onOpenGames={() => setGamesOpen(true)} />
      {gamesOpen && <MyGamesCRUD key={user.id} onClose={() => setGamesOpen(false)} />}
      <NativeTools />
      <GeolocationTools userId={user.id} />
    </>
  );
}

export default function App() {
  const { session, loading, recovery } = useAuth();
  if (loading)
    return (
      <AuthLayout>
        <section className="ja-card" role="status">
          <p className="ja-card-label">JOGAÊ</p>
          <h2>Preparando seu play…</h2>
          <p className="ja-card-sub">Verificando sua sessão.</p>
        </section>
      </AuthLayout>
    );
  if (!session || recovery) return <AuthScreen />;
  return <SignedInApp key={session.user.id} />;
}
