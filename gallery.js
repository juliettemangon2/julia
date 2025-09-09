// gallery.js
const JSON_URL = 'photos.json';
const SELECTOR = '#gallery';

// lightbox
const overlay = document.createElement('div');
overlay.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.75);z-index:9999;';
const big = document.createElement('img');
big.style.cssText = 'max-width:90vw;max-height:90vh;box-shadow:0 8px 30px rgba(0,0,0,.6)';
overlay.appendChild(big);
overlay.addEventListener('click', () => (overlay.style.display = 'none'));
document.addEventListener('keydown', e => { if (e.key === 'Escape') overlay.style.display = 'none'; });
document.addEventListener('DOMContentLoaded', () => document.body.appendChild(overlay));

let allImages = [];
let mount;

document.addEventListener('DOMContentLoaded', () => {
  mount = document.querySelector(SELECTOR);
  if (!mount) return;

  fetch(JSON_URL)
    .then(r => r.json())
    .then(data => {
      allImages = data;

      // Find any subnav with nav-buttons and data-folder links
      const subnav = document.querySelector('nav.nav-buttons[id$="-subnav"]');
      if (subnav) {
        // default from active subnav button
        const active = subnav.querySelector('a.active');
        const initialFolder = active ? active.getAttribute('data-folder') : (mount.getAttribute('data-folder') || '');
        showGallery(initialFolder);

        // click handling scoped to subnav only
        subnav.addEventListener('click', e => {
          const a = e.target.closest('a[data-folder]');
          if (!a) return;
          e.preventDefault();
          subnav.querySelectorAll('a').forEach(x => x.classList.remove('active'));
          a.classList.add('active');
          showGallery(a.getAttribute('data-folder'));
        });
        // Also handle keyboard navigation (Enter/Space)
        subnav.addEventListener('keydown', e => {
          if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('a[data-folder]')) {
            e.preventDefault();
            subnav.querySelectorAll('a').forEach(x => x.classList.remove('active'));
            e.target.classList.add('active');
            showGallery(e.target.getAttribute('data-folder'));
          }
        });
      } else {
        // generic page (e.g., jewelry.html) using data-folder or ?folder=
        const folderAttr = mount.getAttribute('data-folder');
        const urlFolder = new URLSearchParams(location.search).get('folder');
        showGallery(folderAttr || urlFolder || '');
      }
    })
    .catch(console.error);
});

function showGallery(folder) {
  if (!mount) return;
  mount.innerHTML = '';

  const items = allImages.filter(x => x.folder === folder);

  // grid; tops line up; natural aspect ratios
  mount.style.display = 'grid';
  mount.style.gridTemplateColumns = 'repeat(auto-fill, minmax(320px, 1fr))';
  mount.style.gap = '12px';
  mount.style.justifyContent = 'center';

  items.forEach(x => {
    const fig = document.createElement('figure');
    fig.style.margin = '0';
    fig.style.cursor = 'zoom-in';

    const img = document.createElement('img');
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = x.alt || '';
    img.src = x.src;
    img.style.width = '100%';
    img.style.height = 'auto';     // keep original aspect ratio
    img.style.display = 'block';

    img.addEventListener('click', () => {
      big.src = x.src;
      overlay.style.display = 'flex';
    });

    fig.appendChild(img);
    mount.appendChild(fig);
  });
}
