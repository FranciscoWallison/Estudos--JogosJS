import { useEffect } from 'react';
import Canvas from '../components/Canvas';
import { loadSprites } from '../utils/sprites';

export default function Home() {
  useEffect(() => {
    loadSprites();
  }, []);

  return <Canvas />;
}
