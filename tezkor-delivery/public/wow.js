'use strict';
/* Sahifa effektlari: o'qish chizig'i, hero 3D, sanagich, Yordam formasi */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // O'qish progressi
  const bar = $('#progress');
  const prog = () => { const h = document.documentElement; bar.style.transform = `scaleX(${scrollY / Math.max(1, h.scrollHeight - innerHeight)})`; };
  addEventListener('scroll', prog, { passive: true }); prog();

  // Hero rasmi sichqoncha bo'yicha egiladi
  const hv = $('.hero__vis'), hi = $('.hero__img');
  if (hv && hi && !reduce && matchMedia('(pointer:fine)').matches) {
    hv.addEventListener('pointermove', (e) => {
      const r = hv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      hi.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 8}deg)`;
    });
    hv.addEventListener('pointerleave', () => { hi.style.transform = ''; });
  }

  // Raqamlar sanaladi
  document.querySelectorAll('[data-count]').forEach((el) => {
    const end = +el.dataset.count, suf = el.dataset.suf || '';
    if (reduce) return;
    const t0 = performance.now() + 350;
    const step = (t) => {
      const k = Math.min(Math.max((t - t0) / 1400, 0), 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))) + suf;
      if (k < 1) requestAnimationFrame(step);
    };
    el.textContent = '0' + suf; requestAnimationFrame(step);
  });

  // Yordam formasi: xabar admin panelga tushadi
  const f = $('#helpForm');
  if (f) f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#hName').value.trim(), contact = $('#hContact').value.trim(), msg = $('#hMsg').value.trim(), err = $('#hErr');
    err.className = 'help__err';
    if (name.length < 2) { err.textContent = 'Ismingizni kiriting.'; $('#hName').focus(); return; }
    if (contact.length < 5) { err.textContent = 'Telefon yoki Telegram manzilingizni kiriting.'; $('#hContact').focus(); return; }
    if (msg.length < 5) { err.textContent = 'Xabaringizni yozing (kamida 5 ta belgi).'; $('#hMsg').focus(); return; }
    if (typeof SERVER !== 'undefined' && SERVER.on) {
      try { await SERVER.call('POST', '/api/messages', { name, contact, msg }); }
      catch (er) { err.textContent = er.message; return; }
    } else try {
      const all = JSON.parse(localStorage.getItem('tz-admin-msgs') || '[]');
      all.unshift({ id: Date.now(), ts: Date.now(), name, contact, msg, read: false });
      localStorage.setItem('tz-admin-msgs', JSON.stringify(all.slice(0, 200)));
    } catch (er) {}
    f.reset(); err.className = 'help__err ok'; err.textContent = 'Xabaringiz yuborildi. Tez orada bog\'lanamiz.';
    if (typeof toast === 'function') toast('Xabaringiz yuborildi');
  });
})();
