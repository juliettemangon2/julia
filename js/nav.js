(function () {
  var btn = document.getElementById('hamburger-btn');
  var nav = document.querySelector('.name-section');
  var overlay = document.getElementById('nav-overlay');

  if (!btn || !nav) return;

  function openNav() {
    nav.classList.add('nav-open');
    btn.classList.add('open');
    if (overlay) overlay.classList.add('active');
    btn.setAttribute('aria-expanded', 'true');
  }

  function closeNav() {
    nav.classList.remove('nav-open');
    btn.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    btn.setAttribute('aria-expanded', 'false');
  }

  btn.addEventListener('click', function () {
    nav.classList.contains('nav-open') ? closeNav() : openNav();
  });

  if (overlay) {
    overlay.addEventListener('click', closeNav);
  }

  // Close on nav link click (mobile)
  nav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeNav);
  });
})();
