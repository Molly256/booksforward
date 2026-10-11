import fs from 'fs';
import path from 'path';

const COVERS_DIR = 'public/books/covers';
const DATA_FILE = 'app/data.js';

if (!fs.existsSync(COVERS_DIR)) fs.mkdirSync(COVERS_DIR, { recursive: true });
if (!fs.existsSync('app')) fs.mkdirSync('app', { recursive: true });

console.log('Fetching 100 war books...');

async function get(url) {
  const ctrl = new AbortController();
  setTimeout(()=>ctrl.abort(), 15000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: {'User-Agent':'BooksForward'} });
    return r;
  } catch(e) {
    console.log('Fetch failed:', url, e.message);
    return null;
  }
}

async function run() {
  let books = [];
  
  // Get war books list from Open Library - very fast
  let url = 'https://openlibrary.org/subjects/war.json?limit=100';
  console.log('Calling', url);
  let res = await get(url);
  if (!res) { console.log('Internet blocked, trying alternative...'); url='https://openlibrary.org/search.json?q=war&limit=100'; res=await get(url); }
  
  const data = await res.json();
  const works = data.works || data.docs;
  console.log(`Found ${works.length} works`);

  for (let i=0; i<works.length && books.length<100; i++) {
    let w = works[i];
    let title = (w.title||'Unknown').replace(/"/g,'').slice(0,80);
    let author = w.authors?.[0]?.name || w.author_name?.[0] || 'Unknown';
    let coverId = w.cover_id || w.cover_i;
    let coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : `https://covers.openlibrary.org/b/title/${encodeURIComponent(title)}-L.jpg`;
    
    let coverFile = `war-${i}.jpg`;
    let coverPath = path.join(COVERS_DIR, coverFile);
    
    // download cover
    try {
      let cr = await get(coverUrl);
      if (cr && cr.ok) {
        let buf = Buffer.from(await cr.arrayBuffer());
        if (buf.length > 2000) fs.writeFileSync(coverPath, buf);
      }
    } catch {}

    // REAL preview - get description from Open Library work
    let workKey = w.key; // /works/OLxxxW
    let desc = "";
    try {
      let wr = await get(`https://openlibrary.org${workKey}.json`);
      if (wr && wr.ok) {
        let j = await wr.json();
        let d = j.description;
        if (typeof d === 'object') d = d.value;
        desc = d || j.first_sentence || "";
        if (typeof desc === 'object') desc = desc.value;
        if (Array.isArray(desc)) desc = desc[0];
      }
    } catch {}

    if (!desc) desc = `${title} is a powerful war narrative by ${author}. A story of courage, sacrifice and survival on the battlefield.`;

    desc = String(desc).replace(/\n/g,' ').replace(/"/g,"'").slice(0,2000);

    books.push({
      id: String(i),
      title,
      author: String(author).replace(/"/g,''),
      cover: fs.existsSync(coverPath) ? `/books/covers/${coverFile}` : coverUrl,
      page1: desc.slice(0,900),
      page2: desc.slice(900,1800) || "The story continues with intense battles and human resilience...",
      category: "war"
    });

    console.log(`${books.length}. ${title}`);

    // SAVE EVERY BOOK - so you see app/data.js immediately
    fs.writeFileSync(DATA_FILE, `export const books = ${JSON.stringify(books, null, 2)};\n`);
  }

  console.log(`\nDONE! ${books.length} books saved to ${DATA_FILE}`);
}

run();