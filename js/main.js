/* aoki-seitai — main.js（共通挙動。ページ固有の処理は各ページの末尾 <script> に書かず、ここに data 属性で寄せる） */
(function () {
  'use strict';
  var doc = document, html = doc.documentElement, body = doc.body;
  var REDUCE = false; /* prefers-reduced-motion は無視する（フロー書§1③の裁定）。 */

  /* ---- 撮影モード（?shot=） ---- */
  if (/[?&]shot(=|&|$)/.test(location.search)) { html.classList.add('is-shot'); }

  /* ---- ヘッダー縮小 ---- */
  var header = doc.getElementById('header');
  function onScroll() {
    if (!header) return;
    var y = window.pageYOffset || html.scrollTop;
    header.classList.toggle('is-scroll', y > 60);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('load', onScroll);
  window.addEventListener('pageshow', onScroll);
  onScroll();

  /* ---- 全画面メニュー（SP/タブレット） ---- */
  var menuBtn = doc.querySelector('.l-menu-btn'), menu = doc.getElementById('menu');
  function setMenu(open) {
    if (!menuBtn || !menu) return;
    menu.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    body.classList.toggle('is-locked', open);
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1024) setMenu(false); });
  }

  /* ---- PCナビのサブメニュー（タップ／キーボード） ---- */
  doc.querySelectorAll('.l-nav__item.has-sub > button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var li = btn.parentElement, open = !li.classList.contains('is-open');
      doc.querySelectorAll('.l-nav__item.is-open').forEach(function (o) { o.classList.remove('is-open'); o.querySelector('button').setAttribute('aria-expanded', 'false'); });
      li.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
  doc.addEventListener('focusout', function (e) {
    var li = e.target.closest('.l-nav__item.has-sub');
    if (!li) return;
    setTimeout(function () {
      if (!li.contains(doc.activeElement)) { li.classList.remove('is-open'); li.querySelector('button').setAttribute('aria-expanded', 'false'); }
    }, 0);
  });
  doc.addEventListener('click', function (e) {
    if (!e.target.closest('.l-nav__item.has-sub')) {
      doc.querySelectorAll('.l-nav__item.is-open').forEach(function (o) { o.classList.remove('is-open'); o.querySelector('button').setAttribute('aria-expanded', 'false'); });
    }
  });

  /* ---- reveal（アンカー：fade-up 20px / 800ms / ease・セクション単位・一度だけ） ---- */
  var revealEls = doc.querySelectorAll('[data-reveal]');
  doc.querySelectorAll('[data-stagger]').forEach(function (group) {
    var i = 0;
    Array.prototype.forEach.call(group.children, function (child) {
      if (!child.hasAttribute('data-reveal')) child.setAttribute('data-reveal', '');
      child.style.setProperty('--d', (Math.min(i, 4) * 0.09) + 's');
      i++;
    });
    revealEls = doc.querySelectorAll('[data-reveal]');
  });
  if (html.classList.contains('is-shot') || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* ---- マーキー：画面外では止める ---- */
  var tracks = doc.querySelectorAll('.c-marquee__track');
  if (tracks.length && 'IntersectionObserver' in window) {
    var mio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('is-paused', !en.isIntersecting); });
    }, { threshold: 0 });
    tracks.forEach(function (t) { mio.observe(t); });
  }

  /* ---- FAQ アコーディオン ---- */
  doc.querySelectorAll('.c-faq__q').forEach(function (q) {
    var a = doc.getElementById(q.getAttribute('aria-controls'));
    if (!a) return;
    q.addEventListener('click', function () {
      var open = q.getAttribute('aria-expanded') !== 'true';
      q.setAttribute('aria-expanded', open ? 'true' : 'false');
      a.style.maxHeight = open ? a.scrollHeight + 'px' : '0px';
    });
  });
  window.addEventListener('resize', function () {
    doc.querySelectorAll('.c-faq__q[aria-expanded="true"]').forEach(function (q) {
      var a = doc.getElementById(q.getAttribute('aria-controls')); if (a) a.style.maxHeight = a.scrollHeight + 'px';
    });
  });

  /* ---- フォーム：疑似送信（実送信なし）＋ハニーポット＋最小バリデーション ---- */
  doc.querySelectorAll('form[data-pseudo]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var hp = form.querySelector('.c-form__hp input');
      if (hp && hp.value) { return; } /* bot */
      var ok = true;
      form.querySelectorAll('[required], input[type="email"]').forEach(function (f) {
        var field = f.closest('.c-form__field');
        var required = f.hasAttribute('required');
        var valid = f.type === 'checkbox' ? (f.checked || !required) : (!!f.value.trim() || !required);
        if (f.type === 'email' && f.value.trim()) valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value.trim());
        if (field) field.classList.toggle('is-error', !valid);
        if (!valid) ok = false;
      });
      if (!ok) { var first = form.querySelector('.is-error'); if (first) first.scrollIntoView({ block: 'center' }); return; }
      var done = doc.getElementById(form.getAttribute('data-pseudo'));
      form.hidden = true;
      if (done) { done.hidden = false; done.scrollIntoView({ block: 'start' }); }
    });
  });

  /* ---- 日付入力：空のときプレースホルダを見せる（iOS/WebKitは空欄が無表示） ---- */
  doc.querySelectorAll('.c-form__date-wrap > input[type="date"]').forEach(function (d) {
    var wrap = d.parentElement;
    var sync = function () { wrap.classList.toggle('is-empty', !d.value); };
    d.addEventListener('change', sync); d.addEventListener('input', sync); d.addEventListener('blur', sync);
    sync();
  });

  /* ---- 現在地をナビに反映（aria-current が無いページ向けの保険） ---- */
  var path = location.pathname.replace(/index\.html$/, '');
  doc.querySelectorAll('.l-nav a, .l-menu a, .l-footer__nav a').forEach(function (a) {
    var href = a.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#' || /^https?:/.test(href)) return;
    var abs = new URL(href, location.href).pathname.replace(/index\.html$/, '');
    if (abs === path && !a.hasAttribute('aria-current')) a.setAttribute('aria-current', 'page');
  });
})();
