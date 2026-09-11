import fs from 'fs';
import readline from 'readline';

async function searchTranscript() {
  const filePath = 'C:/Users/Sayan Singha/.gemini/antigravity/brain/57d357e9-e03d-46f9-8447-596c8dd9dd8c/.system_generated/logs/transcript.jsonl';
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.trim()) continue;
    const obj = JSON.parse(line);
    if (obj.type === 'USER_INPUT') {
      console.log('USER_INPUT:', obj.content);
    }
  }
}

searchTranscript().catch(console.error);
