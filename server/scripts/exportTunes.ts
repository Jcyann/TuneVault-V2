import { pool } from '../db';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  const client = await pool.connect();
  const { rows } = await client.query(`
    SELECT id, title, alternative_titles, key, tune_type, region, difficulty,
      description, source_fiddler, era, youtube_url, youtube_video_id, audio_url,
      abc_notation, transcript_url, loc_url, loc_item_id, folkways_url, tater_joe_url,
      the_session_id, popularity, tags, notes, audio_source, audio_attribution, created_at
    FROM tunes ORDER BY id
  `);
  client.release();
  await pool.end();

  const outPath = path.join(__dirname, '../seedData/tunes.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(rows));
  console.log(`Exported ${rows.length} tunes to ${outPath}`);
})();
