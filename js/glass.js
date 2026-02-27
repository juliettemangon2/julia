const JSON_URL = 'photos.json';
const SELECTOR = '#gallery';

const VIDEO_EXT_RE = /\.(mov|mp4|webm|ogv)$/i;
const isVideo = (src, type) =>
  (type && type.toLowerCase() === 'video') || VIDEO_EXT_RE.test(src);

// ---------------------- overlay (shared) ----------------------
// One overlay that can act in two modes:
//   Mode A (standard): center media only
//   Mode B (sculpture): sidebar thumbs + viewer

const overlay = document.createElement('div');
overlay.style.cssText =
  'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.8);z-index:9999;';

const shell = document.createElement('div');
shell.style.cssText =
  'position:relative;display:flex;gap:16px;max-width:96vw;max-height:92vh;';

const thumbCol = document.createElement('div');
thumbCol.style.cssText =
  'width:120px;max-height:92vh;overflow:auto;display:none;flex-direction:column;gap:8px;padding-right:4px;';

const viewer = document.createElement('div');
viewer.style.cssText =
  'max-width:calc(96vw);max-height:92vh;display:flex;align-items:center;justify-content:center;';

const bigImg = document.createElement('img');
bigImg.style.cssText =
  'max-width:100%;max-height:92vh;box-shadow:0 8px 30px rgba(0,0,0,.6);display:none;';

const bigVid = document.createElement('video');
bigVid.style.cssText =
  'max-width:100%;max-height:92vh;box-shadow:0 8px 30px rgba(0,0,0,.6);display:none;';
bigVid.controls = true;
bigVid.playsInline = true;

viewer.appendChild(bigImg);
viewer.appendChild(bigVid);
shell.appendChild(thumbCol);
shell.appendChild(viewer);
overlay.appendChild(shell);

const closeOverlay = () => {
  overlay.style.display = 'none';
  bigVid.pause();
  bigVid.removeAttribute('src');
  bigVid.load();
  bigImg.removeAttribute('src');
};
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(); });
document.addEventListener('keydown', e => {
  if (overlay.style.display !== 'none') {
    if (e.key === 'Escape') closeOverlay();
    if (e.key === 'ArrowRight') step(+1);
    if (e.key === 'ArrowLeft') step(-1);
  }
});
document.addEventListener('DOMContentLoaded', () => document.body.appendChild(overlay));

// ---------------------- state ----------------------
let mount;
let allItems = [];
let currentFolder = ''; // which subnav folder is active

// sculpture mode state
let singles = [];              // glass/sculpture/*
let groups = new Map();        // key -> array of items
let orderOfGroups = [];        // keep insertion order
let currentGroupKey = null;
let currentIndex = 0;

// ---------------------- low-level dom helpers ----------------------
const createThumbEl = (item, small = false) => {
  if (isVideo(item.src, item.type)) {
    const v = document.createElement('video');
    v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true; v.preload = 'metadata';
    if (item.poster) v.poster = item.poster;
    const s = document.createElement('source'); s.src = item.src; v.appendChild(s);
    v.style.cssText = small
      ? 'width:100%;height:auto;display:block;border:2px solid transparent;'
      : 'width:100%;height:auto;display:block;';
    return v;
  }
  const img = document.createElement('img');
  img.loading = 'lazy'; img.decoding = 'async'; img.alt = item.alt || ''; img.src = item.src;
  img.style.cssText = small
    ? 'width:100%;height:auto;display:block;border:2px solid transparent;'
    : 'width:100%;height:auto;display:block;';
  return img;
};

const showInViewer = (item) => {
  // reset
  bigVid.pause();
  bigVid.style.display = 'none';
  bigImg.style.display = 'none';

  if (isVideo(item.src, item.type)) {
    bigVid.src = item.src;
    bigVid.style.display = 'block';
    overlay.style.display = 'flex';
    bigVid.play().catch(() => {});
  } else {
    bigImg.src = item.src;
    bigImg.style.display = 'block';
    overlay.style.display = 'flex';
  }
};

// ---------------------- sculpture grouping ----------------------
const getGroupKey = (src, explicit) => {
  if (explicit) return explicit;
  // matches ".../glass/sculpture copy/<GROUP>/..."
  const m = src.match(/glass\/sculpture copy\/([^/]+)\//i);
  return m ? m[1] : null;
};

const buildSculptureBuckets = () => {
  singles = [];
  groups = new Map();
  orderOfGroups = [];

  allItems.forEach(it => {
    const src = it.src || '';
    if (/^glass\/sculpture\//i.test(src)) {
      singles.push(it);
    } else if (/^glass\/sculpture copy\//i.test(src)) {
      const key = getGroupKey(src, it.group);
      if (!key) return;
      if (!groups.has(key)) {
        groups.set(key, []);
        orderOfGroups.push(key);
      }
      groups.get(key).push(it);
    }
  });
};

// ---------------------- sculpture UI ----------------------
const renderThumbColumn = (items) => {
  thumbCol.innerHTML = '';
  items.forEach((it, idx) => {
    const cell = document.createElement('div');
    cell.style.cssText = 'cursor:pointer;';
    const t = createThumbEl(it, true);
    cell.appendChild(t);
    cell.addEventListener('click', (e) => {
      e.stopPropagation();
      goTo(idx);
    });
    thumbCol.appendChild(cell);
  });
  highlightThumb(items, currentIndex);
};

const highlightThumb = (items, idx) => {
  [...thumbCol.children].forEach((cell, i) => {
    const el = cell.firstChild;
    el.style.borderColor = i === idx ? 'white' : 'transparent';
  });
  const sel = thumbCol.children[idx];
  if (sel) sel.scrollIntoView({ block: 'nearest', inline: 'nearest' });
};

const goTo = (idx) => {
  const items = groups.get(currentGroupKey);
  if (!items || !items.length) return;
  if (idx < 0) idx = items.length - 1;
  if (idx >= items.length) idx = 0;
  currentIndex = idx;
  showInViewer(items[currentIndex]);
  highlightThumb(items, currentIndex);
};
const step = (delta) => goTo(currentIndex + delta);

// ---------------------- standard grid + lightbox ----------------------
const openStandardLightbox = (item) => {
  thumbCol.style.display = 'none';         // no sidebar
  showInViewer(item);
};

// ---------------------- renderers ----------------------
const renderStandardGrid = (folder) => {
  const items = allItems.filter(x => x.folder === folder);

  mount.innerHTML = '';
  mount.style.display = 'grid';
  mount.style.gridTemplateColumns = 'repeat(auto-fill, minmax(320px, 1fr))';
  mount.style.gap = '12px';
  mount.style.justifyContent = 'center';

  items.forEach(x => {
    const fig = document.createElement('figure');
    fig.style.margin = '0';
    fig.style.cursor = 'zoom-in';

    if (isVideo(x.src, x.type)) {
      const vid = document.createElement('video');
      vid.muted = true; vid.loop = true; vid.autoplay = true; vid.playsInline = true; vid.preload = 'metadata';
      vid.style.width = '100%'; vid.style.height = 'auto'; vid.style.display = 'block';
      if (x.poster) vid.poster = x.poster;
      const source = document.createElement('source'); source.src = x.src; vid.appendChild(source);
      vid.addEventListener('click', () => openStandardLightbox(x));
      fig.appendChild(vid);
    } else {
      const img = document.createElement('img');
      img.loading = 'lazy'; img.decoding = 'async'; img.alt = x.alt || ''; img.src = x.src;
      img.style.width = '100%'; img.style.height = 'auto'; img.style.display = 'block';
      img.addEventListener('click', () => openStandardLightbox(x));
      fig.appendChild(img);
    }
    mount.appendChild(fig);
  });
};

const renderSculptureGrid = () => {
  // buckets are built from allItems
  buildSculptureBuckets();

  mount.innerHTML = '';
  mount.style.display = 'grid';
  mount.style.gridTemplateColumns = 'repeat(auto-fill, minmax(320px, 1fr))';
  mount.style.gap = '12px';
  mount.style.justifyContent = 'center';

  // 1) Singles (click opens viewer without thumbs)
  singles.forEach(x => {
    const fig = document.createElement('figure');
    fig.style.margin = '0';
    fig.style.cursor = 'zoom-in';
    fig.appendChild(createThumbEl(x, false));
    fig.addEventListener('click', () => {
      currentGroupKey = null;
      currentIndex = 0;
      thumbCol.style.display = 'none';     // no sidebar for single
      showInViewer(x);
    });
    mount.appendChild(fig);
  });

  // 2) Group tiles
  orderOfGroups.forEach(key => {
    const items = groups.get(key);
    if (!items || !items.length) return;

    const tileItem = items.find(i => !isVideo(i.src, i.type)) || items[0];

    const fig = document.createElement('figure');
    fig.style.margin = '0';
    fig.style.cursor = 'pointer';

    const wrap = document.createElement('div');
    wrap.appendChild(createThumbEl(tileItem, false));

    const caption = document.createElement('figcaption');
    caption.textContent = key;
    caption.style.cssText = 'font:18px/1.5 system-ui,sans-serif;color:var(--coffee);margin-top:4px;';

    fig.appendChild(wrap);
    fig.appendChild(caption);

    fig.addEventListener('click', () => {
      currentGroupKey = key;
      currentIndex = items.indexOf(tileItem);
      if (currentIndex < 0) currentIndex = 0;
      thumbCol.style.display = 'flex';    
      renderThumbColumn(items);
      showInViewer(items[currentIndex]);
      overlay.style.display = 'flex';
    });

    mount.appendChild(fig);
  });
};

// ---------------------- generic grouped grid (for any folder with group fields) ----------------------
const buildGroupedBuckets = (folder) => {
  singles = [];
  groups = new Map();
  orderOfGroups = [];

  allItems.filter(x => x.folder === folder).forEach(it => {
    const key = it.group || null;
    if (!key) return;
    if (!groups.has(key)) {
      groups.set(key, []);
      orderOfGroups.push(key);
    }
    groups.get(key).push(it);
  });
};

const renderGroupedGrid = (folder) => {
  buildGroupedBuckets(folder);

  mount.innerHTML = '';
  mount.style.display = 'grid';
  mount.style.gridTemplateColumns = 'repeat(auto-fill, minmax(320px, 1fr))';
  mount.style.gap = '12px';
  mount.style.justifyContent = 'center';

  orderOfGroups.forEach(key => {
    const items = groups.get(key);
    if (!items || !items.length) return;

    const tileItem = items.find(i => !isVideo(i.src, i.type)) || items[0];

    const fig = document.createElement('figure');
    fig.style.margin = '0';
    fig.style.cursor = 'pointer';

    const wrap = document.createElement('div');
    wrap.appendChild(createThumbEl(tileItem, false));

    const caption = document.createElement('figcaption');
    caption.textContent = key;
    caption.style.cssText = 'font:18px/1.5 system-ui,sans-serif;color:var(--coffee);margin-top:4px;';

    fig.appendChild(wrap);
    fig.appendChild(caption);

    fig.addEventListener('click', () => {
      currentGroupKey = key;
      currentIndex = items.indexOf(tileItem);
      if (currentIndex < 0) currentIndex = 0;
      thumbCol.style.display = items.length > 1 ? 'flex' : 'none';
      renderThumbColumn(items);
      showInViewer(items[currentIndex]);
      overlay.style.display = 'flex';
    });

    mount.appendChild(fig);
  });
};

// ---------------------- subnav wiring ----------------------
document.addEventListener('DOMContentLoaded', () => {
  mount = document.querySelector(SELECTOR);
  if (!mount) return;

  const subnav = document.querySelector('nav.nav-buttons[id$="-subnav"]');

  fetch(JSON_URL, { cache: 'no-store' })
    .then(r => r.json())
    .then(data => {
      allItems = data;

      // determine initial folder
      let initial = (mount.getAttribute('data-folder') || '').trim();
      if (subnav) {
        const active = subnav.querySelector('a.active');
        if (active) initial = active.getAttribute('data-folder') || initial;
      }
      if (!initial) initial = 'glass-vessels';

      currentFolder = initial;
      routeAndRender(currentFolder);

      if (subnav) {
        // click
        subnav.addEventListener('click', e => {
          const a = e.target.closest('a[data-folder]');
          if (!a) return;
          e.preventDefault();
          const folder = a.getAttribute('data-folder');
          if (!folder) return;
          // update active
          subnav.querySelectorAll('a').forEach(x => x.classList.remove('active'));
          a.classList.add('active');
          // store on mount
          mount.setAttribute('data-folder', folder);
          currentFolder = folder;
          routeAndRender(folder);
        });

        // keyboard
        subnav.addEventListener('keydown', e => {
          if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('a[data-folder]')) {
            e.preventDefault();
            const folder = e.target.getAttribute('data-folder');
            if (!folder) return;
            subnav.querySelectorAll('a').forEach(x => x.classList.remove('active'));
            e.target.classList.add('active');
            mount.setAttribute('data-folder', folder);
            currentFolder = folder;
            routeAndRender(folder);
          }
        });
      }
    })
    .catch(console.error);
});

function routeAndRender(folder) {
  if (!mount) return;
  if (folder === 'glass-sculpture') {
    renderSculptureGrid();
  } else if (folder === 'clothing-reclaimed') {
    renderGroupedGrid(folder);
  } else {
    renderStandardGrid(folder);
  }
}
