import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const assetsDir = path.join(process.cwd(), 'public', 'assets');

  try {
    const files = fs.readdirSync(assetsDir);
    const images = files
      .filter(f => IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase()))
      .map(f => `/assets/${f}`);

    res.status(200).json(images);
  } catch {
    res.status(500).json([]);
  }
}
