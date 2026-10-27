import { useEffect, useState } from 'react';

export default function UserAvatar({ user, large = false }) {
  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.user_metadata?.display_name || user.email || 'Player';
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [avatarUrl]);
  const initials = name.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  return <span className={`ja-user-avatar ${large ? 'ja-user-avatar-large' : ''}`}>
    {avatarUrl && !failed ? <img src={avatarUrl} alt={`Foto de ${name}`} referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <span aria-label={`Perfil de ${name}`}>{initials}</span>}
  </span>;
}
