// script.js — Open Library search integration, rendering és hiba-kezelés
const form = document.getElementById('search-form');
const list = document.querySelector('.results-list');
const status = document.querySelector('#results .muted');

function coverDataUrl(title, bg = '#3b82f6'){
  const initials = (title.split(' ').slice(0,2).map(w=>w[0]||'').join('')||'BK').toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='420'>
    <rect width='100%' height='100%' fill='${bg}' rx='12' />
    <text x='50%' y='54%' font-family='Segoe UI, Roboto, Arial' font-size='72' fill='white' text-anchor='middle' dominant-baseline='middle' font-weight='700'>${initials}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function renderBooks(books){
  list.innerHTML = '';
  if(!books || books.length === 0){
    status.textContent = 'Nu s-au găsit rezultate.';
    return;
  }
  status.textContent = '';
  books.forEach((b)=>{
    const li = document.createElement('li');
    li.className = 'result-item';
    const coverSrc = b.coverUrl || coverDataUrl(b.title, b.color || '#3b82f6');
    const safeTitle = escapeHtml(b.title || 'Titlu necunoscut');
    const safeAuthor = escapeHtml(b.author || 'Autor necunoscut');
    const safeMeta = escapeHtml([b.year || '', b.publisher || ''].filter(Boolean).join(' • '));

    li.innerHTML = `
      <div class="cover"><img src="${coverSrc}" alt="Coperta: ${safeTitle}"></div>
      <div class="info">
        <h3 class="title">${safeTitle}</h3>
        <p class="author">${safeAuthor}</p>
        <p class="meta">${safeMeta}</p>
      </div>
    `;
    list.appendChild(li);
  });
}

function escapeHtml(str){
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function searchOpenLibrary(q){
  const endpoint = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=24`;
  const controller = new AbortController();
  const signal = controller.signal;
  try{
    const res = await fetch(endpoint, {signal});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return json;
  }catch(err){
    throw err;
  }
}

form.addEventListener('submit', async function(e){
  e.preventDefault();
  const q = document.getElementById('query').value.trim();
  list.innerHTML = '';
  if(!q){
    status.textContent = 'Introduceți un cuvânt cheie pentru a vedea rezultate.';
    return;
  }
  status.textContent = 'Se caută...';

  try{
    const data = await searchOpenLibrary(q);
    if(!data || !data.docs || data.docs.length === 0){
      status.textContent = 'Nu s-au găsit rezultate.';
      return;
    }

    // Map Open Library docs -> book objects used by renderBooks
    const books = data.docs.slice(0,24).map(doc => {
      const title = doc.title || (doc.title_suggest || 'Titlu necunoscut');
      const author = (doc.author_name && doc.author_name.join(', ')) || (doc.author_alternative_name && doc.author_alternative_name.join(', ')) || 'Autor necunoscut';
      const year = doc.first_publish_year || (doc.publish_year && doc.publish_year[0]) || '';
      const publisher = (doc.publisher && doc.publisher[0]) || '';
      const coverId = doc.cover_i;
      const coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null;
      return {title, author, year, publisher, coverUrl};
    });

    renderBooks(books);
  }catch(err){
    console.error('Search error:', err);
    status.textContent = 'A apărut o eroare de rețea. Verificați conexiunea și încercați din nou.';
  }
});
