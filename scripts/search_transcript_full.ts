import fs from 'fs';
import readline from 'readline';

async function searchAll() {
  const filePath = 'C:/Users/Sayan Singha/.gemini/antigravity/brain/57d357e9-e03d-46f9-8447-596c8dd9dd8c/.system_generated/logs/transcript_full.jsonl';
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    if (line.includes('Girish') || line.includes('girish') || line.includes('V1(L)')) {
      console.log(`Match at line ${lineNum}: ${line.slice(0, 200)}...`);
    }
  }
}

searchAll().catch(console.error);
