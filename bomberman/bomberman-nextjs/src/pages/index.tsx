import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import CharacterSelector from '@/components/CharacterSelector';
import { quickMatch } from '@/lib/lobbyService';

export default function Home() {
  const { user, loading, authError } = useAuth();
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [characterIndex, setCharacterIndex] = useState(0);
  const [joining, setJoining] = useState(false);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', paddingTop: '100px' }}>
        <h2>Carregando...</h2>
      </div>
    );
  }

  if (authError) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '16px',
        padding: '20px',
      }}>
        <h1 style={{ fontSize: '36px', color: '#ffd700', margin: 0 }}>BOMBERMAN ONLINE</h1>
        <div style={{
          background: '#1a1a2e',
          border: '1px solid #f44336',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '500px',
          width: '100%',
        }}>
          <h3 style={{ color: '#f44336', margin: '0 0 12px 0' }}>Erro de Configuracao Firebase</h3>
          <p style={{ color: '#ffcdd2', margin: '0 0 16px 0', lineHeight: '1.5' }}>{authError}</p>
          <p style={{ color: '#888', margin: 0, fontSize: '13px' }}>
            Verifique o Firebase Console e tente recarregar a pagina.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              background: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Recarregar
          </button>
          <button
            onClick={() => router.push('/offline')}
            style={{
              padding: '12px 24px',
              background: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Jogar Offline
          </button>
        </div>
      </div>
    );
  }

  const handleQuickMatch = async () => {
    if (!user || !playerName.trim()) return;
    setJoining(true);
    try {
      sessionStorage.setItem('playerName', playerName.trim());
      sessionStorage.setItem('characterIndex', String(characterIndex));
      const roomId = await quickMatch(user.uid, playerName.trim(), characterIndex);
      router.push(`/room/${roomId}`);
    } catch (err) {
      console.error('Erro no quick match:', err);
      setJoining(false);
    }
  };

  const handleLobby = () => {
    if (!playerName.trim()) return;
    sessionStorage.setItem('playerName', playerName.trim());
    sessionStorage.setItem('characterIndex', String(characterIndex));
    router.push('/lobby');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '24px',
      padding: '40px 16px 24px',
      minHeight: '100vh',
      width: '100%',
      boxSizing: 'border-box',
    }}>
      <h1 style={{
        fontSize: 'clamp(28px, 8vw, 48px)',
        fontWeight: 'bold',
        color: '#ffd700',
        textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
        margin: 0,
        textAlign: 'center',
      }}>
        BOMBERMAN ONLINE
      </h1>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        background: '#111',
        padding: '32px',
        borderRadius: '12px',
        border: '1px solid #333',
        width: '100%',
        maxWidth: '500px',
      }}>
        <div style={{ width: '100%' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '14px' }}>
            Seu nome:
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Digite seu nome..."
            maxLength={20}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: '#222',
              border: '1px solid #444',
              borderRadius: '6px',
              color: 'white',
              fontSize: '16px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ width: '100%' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '14px' }}>
            Escolha seu personagem:
          </label>
          <CharacterSelector selected={characterIndex} onSelect={setCharacterIndex} />
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          width: '100%',
          marginTop: '8px',
        }}>
          <button
            onClick={handleQuickMatch}
            disabled={!playerName.trim() || joining}
            style={{
              flex: 1,
              padding: '14px',
              background: !playerName.trim() || joining ? '#444' : '#ff6b00',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: !playerName.trim() || joining ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '16px',
            }}
          >
            {joining ? 'Entrando...' : 'Jogo Rapido'}
          </button>

          <button
            onClick={handleLobby}
            disabled={!playerName.trim()}
            style={{
              flex: 1,
              padding: '14px',
              background: !playerName.trim() ? '#444' : '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: !playerName.trim() ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '16px',
            }}
          >
            Ver Salas
          </button>
        </div>

        <button
          onClick={() => router.push('/offline')}
          style={{
            width: '100%',
            padding: '14px',
            background: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '16px',
          }}
        >
          Jogar Offline
        </button>
      </div>
    </div>
  );
}
