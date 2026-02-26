// gallery.js
const JSON_URL = 'photos.json';
const SELECTOR = '#gallery';

// helpers
const isVideo = (src, type) =>
  (type && type.toLowerCase() === 'video') ||
  /\.(mov|mp4|webm|ogv)$/i.test(src);

// lightbox (supports image or video)
const overlay = document.createElement('div');
overlay.style.cssText =
  'position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.75);z-index:9999;';

const lightboxWrap = document.createElement('div');
lightboxWrap.style.cssText = 'max-width:90vw;max-height:90vh;position:relative;';

const bigImg = document.createElement('img');
bigImg.style.cssText = 'max-width:90vw;max-height:90vh;box-shadow:0 8px 30px rgba(0,0,0,.6);display:none;';

const bigVid = document.createElement('video');
bigVid.style.cssText = 'max-width:90vw;max-height:90vh;box-shadow:0 8px 30px rgba(0,0,0,.6);display:none;';
bigVid.controls = true;
bigVid.playsInline = true;

lightboxWrap.appendChild(bigImg);
lightboxWrap.appendChild(bigVid);
overlay.appendChild(lightboxWrap);

const closeOverlay = () => {
  overlay.style.display = 'none';
  bigVid.pause();
  bigVid.removeAttribute('src'); // free memory on Safari
  bigVid.load();
  bigImg.removeAttribute('src');
};

overlay.addEventListener('click', (e) => {
  // allow clicking inside media without closing (only close on backdrop)
  if (e.target === overlay) closeOverlay();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeOverlay(); });
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

      const subnav = document.querySelector('nav.nav-buttons[id$="-subnav"]');
      if (subnav) {
        const active = subnav.querySelector('a.active');
        const initialFolder = active ? active.getAttribute('data-folder') : (mount.getAttribute('data-folder') || '');
        if (initialFolder === 'glass-sculpture') {
          // Let sculpture.js take over the Sculptures tab
          return;
        }
        showGallery(initialFolder);

        subnav.addEventListener('click', e => {
          const a = e.target.closest('a[data-folder]');
          if (!a) return;
          if (a.getAttribute('data-folder') === 'glass-sculpture') {
            // Let sculpture.js handle Sculptures navigation
            return;
          }
          e.preventDefault();
          subnav.querySelectorAll('a').forEach(x => x.classList.remove('active'));
          a.classList.add('active');
          if (mount) {
            mount.setAttribute('data-folder', a.getAttribute('data-folder'));
          }
          showGallery(a.getAttribute('data-folder'));
        });

        subnav.addEventListener('keydown', e => {
          if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('a[data-folder]')) {
            if (e.target.getAttribute('data-folder') === 'glass-sculpture') return;

            e.preventDefault();
            subnav.querySelectorAll('a').forEach(x => x.classList.remove('active'));
            e.target.classList.add('active');
            if (mount) {
              mount.setAttribute('data-folder', e.target.getAttribute('data-folder'));
            }
            showGallery(e.target.getAttribute('data-folder'));
          }
        });
      } else {
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

    const isVid = isVideo(x.src, x.type);

    if (isVid) {
      const vid = document.createElement('video');
      vid.muted = true;
      vid.loop = true;
      vid.autoplay = true;         // silent autoplay for a lively grid
      vid.playsInline = true;
      vid.preload = 'metadata';
      vid.style.width = '100%';
      vid.style.height = 'auto';
      vid.style.display = 'block';
      if (x.poster) vid.poster = x.poster;

      const source = document.createElement('source');
      source.src = x.src;
      // browser will infer type; you can set source.type = 'video/quicktime' for .mov if needed
      vid.appendChild(source);

      vid.addEventListener('click', () => {
        bigImg.style.display = 'none';
        bigImg.removeAttribute('src');
        bigVid.style.display = 'block';
        bigVid.src = x.src;
        overlay.style.display = 'flex';
        bigVid.play().catch(() => { });
      });

      fig.appendChild(vid);
    } else {
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = x.alt || '';
      img.src = x.src;
      img.style.width = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';

      img.addEventListener('click', () => {
        bigVid.pause();
        bigVid.style.display = 'none';
        bigVid.removeAttribute('src');
        bigImg.style.display = 'block';
        bigImg.src = x.src;
        overlay.style.display = 'flex';
      });

      fig.appendChild(img);
    }

    mount.appendChild(fig);
  });
}
