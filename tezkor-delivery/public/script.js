'use strict';
/* =========================================================
   TEZKOR DELIVERY — 1-bosqich (frontend)
   Ma'lumotlar DATA ichida. Keyingi bosqichda faqat
   API.get* funksiyalarini fetch() bilan almashtirish kifoya.
   ========================================================= */


const SERVER = {
  on: false,
  async init() { try { const r = await fetch('/api/health', { cache: 'no-store' }); SERVER.on = r.ok && (await r.json()).ok === true; } catch (e) { SERVER.on = false; } },
  async call(method, url, body) {
    const r = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    let d = {}; try { d = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error(d.error || 'Server xatosi. Qayta urinib ko\'ring.');
    return d;
  }
};
/* Keyinchalik: const API = { getRestaurants: () => fetch('/api/restaurants').then(r => r.json()) } */
const API = {
  getServices: async () => DATA.services,
  getRestaurants: async () => DATA.restaurants,
  getProducts: async () => { if (SERVER.on) { try { const a = await SERVER.call('GET', '/api/products'); if (Array.isArray(a) && a.length) return a.map((p) => ({ ...p, img: p.img || fallbackImg(p.fb || '🍽️') })); } catch (e) {} } try { const a = JSON.parse(localStorage.getItem('tz-admin-products') || 'null'); if (Array.isArray(a) && a.length) return a.map((p) => ({ ...p, img: p.img || fallbackImg(p.fb || '🍽️') })); } catch (e) {} return DATA.products; }
};

const $ = (s, r = document) => r.querySelector(s);
const money = (n) => new Intl.NumberFormat('uz-UZ').format(n).replace(/,/g, ' ');
const state = { rCat: 'Hammasi', restaurants: [], products: [] };

/* ---------- Rasm: yuklanmasa chiroyli zaxira ---------- */
function fallbackImg(emoji) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'><rect width='400' height='300' fill='#FFC700'/><text x='200' y='185' font-size='110' text-anchor='middle'>${emoji}</text></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}
function bindImg(img) {
  const src = img.dataset.src || img.getAttribute('src');
  img.loading = img.loading || 'lazy';
  img.onerror = () => { img.onerror = null; img.src = fallbackImg(img.dataset.fb || '🍽️'); };
  if (img.dataset.src) img.src = src;
}

/* ---------- Tema ---------- */
function initTheme() {
  let t = null;
  try { t = localStorage.getItem('tz-theme'); } catch (e) {}
  if (!t) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = t;
  $('#theme').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('tz-theme', next); } catch (e) {}
  });
}

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 2600);
}

/* ---------- Render ---------- */
function renderServices(list) {
  $('#svcGrid').innerHTML = list.map(s => `
    <a class="sv rv" href="${s.href}" data-cat="${s.cat}">
      <img data-src="${s.img}" data-fb="${s.fb}" alt="${s.title} xizmati">
      <span class="sv__go" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 17 17 7M8 7h9v9"/></svg></span>
      <div class="sv__b"><span class="sv__t">${s.tag}</span><h3>${s.title}</h3><p>${s.text}</p></div>
    </a>`).join('');
}

function chips(el, items, active, onPick) {
  el.innerHTML = items.map(c => `<button class="chip" role="tab" aria-selected="${c === active}" data-v="${c}">${c}</button>`).join('');
  el.onclick = (e) => { const b = e.target.closest('.chip'); if (b) onPick(b.dataset.v); };
}

function renderRestaurants() {
  const list = state.restaurants.filter(r => state.rCat === 'Hammasi' || r.cat === state.rCat);
  chips($('#chips'), DATA.categories, state.rCat, (v) => { state.rCat = v; renderRestaurants(); });
  $('#restGrid').innerHTML = list.map(r => `
    <article class="rc rv" data-r="${r.name}" tabindex="0" role="button">
      <div class="rc__img"><img data-src="${r.img}" data-fb="${r.fb}" alt="${r.name}"><span class="rc__tag">${r.tag}</span></div>
      <div class="rc__b">
        <div class="rc__top"><h3>${r.name}</h3><span class="rc__r">${r.rating}</span></div>
        <p class="rc__m">${r.cat}</p>
        <div class="rc__f"><span>${r.time} daq</span><span>Yetkazish: ${r.fee}</span><span>${r.price}+</span></div>
      </div>
    </article>`).join('');
  hydrate($('#restGrid'));
}

/* ---------- Ko'rinishda paydo bo'lish ---------- */
const io = 'IntersectionObserver' in window
  ? new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 })
  : null;
function hydrate(root) {
  root.querySelectorAll('img').forEach(bindImg);
  root.querySelectorAll('.rv').forEach((el, i) => {
    el.style.transitionDelay = Math.min(i % 4, 3) * 70 + 'ms';
    io ? io.observe(el) : el.classList.add('in');
  });
}

/* ---------- Manzil ---------- */
function initAddress() {
  const form = $('#addrForm'), input = $('#addrInput'), msg = $('#addrMsg');
  const say = (t, err) => { msg.textContent = t; msg.classList.toggle('err', !!err); };
  try { const s = localStorage.getItem('tz-addr'); if (s) input.value = s; } catch (e) {}

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value.trim();
    if (v.length < 4) { say("Manzilni to'liqroq kiriting: ko'cha va uy raqami.", true); input.focus(); return; }
    try { localStorage.setItem('tz-addr', v); } catch (er) {}
    say(`Manzil saqlandi: ${v}`);
    $('#restaurants').scrollIntoView({ behavior: 'smooth' });
  });

  $('#locate').addEventListener('click', () => {
    if (!navigator.geolocation) { say("Brauzeringiz joylashuvni aniqlay olmaydi. Manzilni qo'lda kiriting.", true); return; }
    say('Joylashuv aniqlanmoqda…');
    navigator.geolocation.getCurrentPosition(
      (p) => { input.value = `Joriy joylashuv (${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)})`; say('Joylashuv aniqlandi. Restoran topish tugmasini bosing.'); },
      () => say("Joylashuvga ruxsat berilmadi. Manzilni qo'lda kiriting.", true),
      { timeout: 8000 }
    );
  });
}

/* ---------- Navbar ---------- */
function initNav() {
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('is-stuck', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
}

/* =========================================================
   2-bosqich: katalog, qidiruv, saralash va savatcha
   Savatcha LocalStorage'da: tz-cart, tz-promo
   ========================================================= */
const SHOP_CATS = ["Hammasi", "Fast Food", "Pizza", "Sushi", "Ichimliklar", "Market", "Shirinliklar"];
const FREE_FROM = 150000;      // shu summadan yetkazish bepul
const DELIVERY_FEE = 12000;
const PROMOS = {
  TEZKOR1: { type: "ship", label: "Yetkazish bepul" },
  SALOM10: { type: "pct", value: 10, label: "10% chegirma" }
};
const shop = { cat: "Hammasi", q: "", sort: "rec", pick: {}, cart: {}, promo: "", done: null };

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const byId = (id) => state.products.find((p) => p.id === id);

/* ---------- Saqlash ---------- */
function loadCart() {
  try {
    const raw = JSON.parse(localStorage.getItem("tz-cart") || "{}");
    Object.entries(raw).forEach(([id, q]) => {
      const n = Math.floor(Number(q));
      if (byId(id) && n > 0) shop.cart[id] = Math.min(n, 99);
    });
    const code = localStorage.getItem("tz-promo") || "";
    if (PROMOS[code]) shop.promo = code;
  } catch (e) { shop.cart = {}; }
}
function saveCart() {
  try {
    localStorage.setItem("tz-cart", JSON.stringify(shop.cart));
    localStorage.setItem("tz-promo", shop.promo);
  } catch (e) {}
}

/* ---------- Katalog ---------- */
const card = (p, hot) => `
  <article class="pc rv" data-id="${p.id}">
    <div class="pc__img"><img data-src="${p.img}" data-fb="${p.fb}" alt="${p.name}">
      ${hot ? '<span class="pc__hot">Mashhur</span>' : ""}<span class="pc__k">${p.cat}</span>${favBtn(p)}</div>
    <div class="pc__b">
      <h3>${p.name}</h3><p class="pc__d">${p.desc}</p>
      <div class="pc__row"><span class="pc__p">${money(p.price)} <small>so'm</small></span></div>
      <div class="pc__act">
        <div class="qty" role="group" aria-label="Miqdor">
          <button type="button" data-a="dec" aria-label="Kamaytirish">−</button>
          <output>${shop.pick[p.id] || 1}</output>
          <button type="button" data-a="inc" aria-label="Oshirish">+</button>
        </div>
        <button type="button" class="buy" data-a="add" aria-label="${p.name} savatga qo'shish">Savatga</button>
      </div>
    </div>
  </article>`;

const emptyResult = () => `
  <div class="empty">
    <div class="empty__ic" aria-hidden="true">🔍</div>
    <h3>Hech narsa topilmadi</h3>
    <p>${shop.q ? `"${esc(shop.q)}" bo'yicha` : "Bu kategoriyada"} mahsulot yo'q. Boshqa nom yozing yoki filtrlarni tozalang.</p>
    <button type="button" class="btn btn--dark" data-a="reset">Filtrlarni tozalash</button>
  </div>`;

function filtered() {
  const q = shop.q.trim().toLowerCase();
  const l = state.products.filter((p) => (shop.cat === "Hammasi" || p.cat === shop.cat) && (!q || p.name.toLowerCase().includes(q)));
  if (shop.sort === "asc") l.sort((a, b) => a.price - b.price);
  if (shop.sort === "desc") l.sort((a, b) => b.price - a.price);
  if (shop.sort === "az") l.sort((a, b) => a.name.localeCompare(b.name, "uz"));
  return l;
}

function renderPopular() {
  const g = $("#popGrid");
  g.innerHTML = state.products.filter((p) => p.pop).slice(0, 4).map((p) => card(p, true)).join("");
  hydrate(g);
}

function renderCatalog() {
  const list = filtered();
  chips($("#pchips"), SHOP_CATS, shop.cat, (v) => { shop.cat = v; renderCatalog(); });
  $("#count").textContent = `${list.length} ta mahsulot`;
  $("#qClear").hidden = !shop.q;
  const g = $("#prodGrid");
  g.innerHTML = list.length ? list.map((p) => card(p)).join("") : emptyResult();
  hydrate(g);
}

function resetFilters() {
  Object.assign(shop, { cat: "Hammasi", q: "", sort: "rec" });
  $("#q").value = ""; $("#sort").value = "rec";
  renderCatalog();
}

function onCard(e) {
  const b = e.target.closest("[data-a]");
  if (!b) return;
  if (b.dataset.a === "reset") return resetFilters();
  const art = b.closest(".pc");
  if (!art) return;
  const id = art.dataset.id, a = b.dataset.a;
  if (a === "fav") { toggleFav(id); return; }
  let n = shop.pick[id] || 1;
  if (a === "inc") n = Math.min(n + 1, 20);
  if (a === "dec") n = Math.max(n - 1, 1);
  if (a === "add") {
    addToCart(id, n); n = 1;
    b.textContent = "Qo'shildi ✓"; b.classList.add("ok");
    setTimeout(() => { b.textContent = "Savatga"; b.classList.remove("ok"); }, 1200);
  }
  shop.pick[id] = n;
  document.querySelectorAll(`.pc[data-id="${id}"] output`).forEach((o) => { o.textContent = n; });
}

/* ---------- Savatcha: hisob-kitob ---------- */
function lines() {
  return Object.entries(shop.cart).map(([id, q]) => ({ p: byId(id), q })).filter((x) => x.p);
}
function totals() {
  const sub = lines().reduce((s, x) => s + x.p.price * x.q, 0);
  const pr = PROMOS[shop.promo];
  const disc = pr && pr.type === "pct" ? Math.round(sub * pr.value / 100) : 0;
  let fee = !sub || sub >= FREE_FROM ? 0 : DELIVERY_FEE;
  if (pr && pr.type === "ship") fee = 0;
  return { sub, disc, fee, total: sub - disc + fee };
}
function setQty(id, q) {
  if (q <= 0) delete shop.cart[id]; else shop.cart[id] = Math.min(q, 99);
  saveCart(); renderCart();
}
function addToCart(id, n) {
  const p = byId(id);
  setQty(id, (shop.cart[id] || 0) + n);
  toast(`${p.name} × ${n} savatga qo'shildi`);
}

/* ---------- Savatcha oynasi ---------- */
const emptyCart = `
  <div class="ok-view">
    <div class="ok-view__ic ok-view__ic--e" aria-hidden="true">🛒</div>
    <h3>Savatcha bo'sh</h3><p>Mahsulot tanlang, ular shu yerda ko'rinadi.</p>
    <button type="button" class="btn btn--dark" data-a="shop">Mahsulotlarga o'tish</button>
  </div>`;
const successView = () => `
  <div class="ok-view">
    <div class="ok-view__ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></div>
    <h3>Buyurtma qabul qilindi</h3>
    <p>Buyurtma raqami: <b>${shop.done.no}</b><br>Jami: <b>${money(shop.done.total)} so'm</b></p>
    <p>Taxminan 30 daqiqada yetkazamiz.</p>
    <button type="button" class="btn btn--dark" data-a="close">Davom etish</button>
  </div>`;

function renderCart() {
  const L = lines(), t = totals(), n = L.reduce((s, x) => s + x.q, 0);
  const badge = $("#cartCount");
  if (badge.textContent !== String(n)) {
    badge.textContent = n; badge.classList.add("pop");
    setTimeout(() => badge.classList.remove("pop"), 300);
  }
  $("#drawerSub").textContent = n ? `${n} ta mahsulot` : "";
  const items = $("#cartItems"), foot = $("#cartFoot");
  if (shop.done) { foot.hidden = true; items.innerHTML = successView(); return; }
  if (!L.length) { foot.hidden = true; items.innerHTML = emptyCart; return; }

  items.innerHTML = `<ul>${L.map(({ p, q }) => `
    <li class="ci" data-id="${p.id}">
      <img data-src="${p.img}" data-fb="${p.fb}" alt="${p.name}">
      <div class="ci__i">
        <h3>${p.name}</h3><span class="ci__p">${money(p.price * q)} so'm</span>
        <div class="qty qty--s" role="group" aria-label="${p.name} miqdori">
          <button type="button" data-a="dec" aria-label="Kamaytirish">−</button>
          <output>${q}</output>
          <button type="button" data-a="inc" aria-label="Oshirish">+</button>
        </div>
      </div>
      <button type="button" class="ci__x" data-a="del" aria-label="${p.name} o'chirish"><svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3"/></svg></button>
    </li>`).join("")}</ul>`;
  items.querySelectorAll("img").forEach(bindImg);

  foot.hidden = false;
  const pr = PROMOS[shop.promo];
  $("#sSub").textContent = `${money(t.sub)} so'm`;
  $("#rowDisc").hidden = !t.disc;
  $("#sDisc").textContent = `−${money(t.disc)} so'm`;
  $("#sFee").textContent = t.fee ? `${money(t.fee)} so'm` : "Bepul";
  $("#sTotal").textContent = `${money(t.total)} so'm`;
  $("#sHint").textContent = t.fee ? `Yana ${money(FREE_FROM - t.sub)} so'm qo'shsangiz, yetkazish bepul bo'ladi.` : "";
  const pi = $("#promoInput"), pm = $("#promoMsg");
  pi.value = shop.promo; pi.readOnly = !!shop.promo;
  $("#promoBtn").textContent = shop.promo ? "Bekor qilish" : "Qo'llash";
  pm.className = "promo__msg";
  pm.textContent = pr ? `✓ ${shop.promo}: ${pr.label}` : "";
}

function onCartClick(e) {
  const b = e.target.closest("[data-a]");
  if (!b) return;
  const a = b.dataset.a;
  if (a === "close") return closeCart();
  if (a === "shop") { closeCart(); $("#products").scrollIntoView({ behavior: "smooth" }); return; }
  const li = b.closest(".ci");
  if (!li) return;
  const id = li.dataset.id, q = shop.cart[id] || 0;
  if (a === "inc") setQty(id, q + 1);
  if (a === "dec") setQty(id, q - 1);
  if (a === "del") setQty(id, 0);
}

function onPromo(e) {
  e.preventDefault();
  if (shop.promo) { shop.promo = ""; saveCart(); renderCart(); return; }
  const code = $("#promoInput").value.trim().toUpperCase(), msg = $("#promoMsg");
  msg.className = "promo__msg err";
  if (!code) { msg.textContent = "Promo-kodni kiriting."; return; }
  if (!PROMOS[code]) { msg.textContent = "Bunday promo-kod topilmadi. Tekshirib qayta kiriting."; return; }
  shop.promo = code; saveCart(); renderCart();
  toast(`${PROMOS[code].label} qo'llandi`);
}

/* =========================================================
   BUYURTMA OYNASI (checkout modal)
   "Buyurtma berish" bosilganda ism, telefon va manzil so'raladi.
   ========================================================= */
// Backend ulanganda true qiling: shunda "demo" yozuvi yo'qoladi va buyurtma serverga yuboriladi (3-bosqich).
const BACKEND_READY = () => SERVER.on;

const co = {};

// Telefon: faqat 9 ta raqam, "90 123 45 67" ko'rinishida. +998 oldindan qo'yilgan.
function fmt9(v) {
  let d = String(v).replace(/\D/g, "");
  if (d.length > 9 && d.startsWith("998")) d = d.slice(3);
  d = d.slice(0, 9);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(" ");
}

function setErr(input, msg, shake) {
  const field = input.closest(".field");
  field.classList.toggle("err", !!msg);
  $("#" + input.id + "Err").textContent = msg;
  input.setAttribute("aria-invalid", msg ? "true" : "false");
  if (msg && shake) { field.classList.remove("shake"); void field.offsetWidth; field.classList.add("shake"); }
}

function openCheckout() {
  const t = totals();
  if (!t.sub) return;
  const count = lines().reduce((s, x) => s + x.q, 0);
  co.done = false;
  $("#coForm").hidden = false; $("#coDone").hidden = true;

  let saved = {}, addr = "";
  try { saved = JSON.parse(localStorage.getItem("tz-customer") || "{}"); addr = localStorage.getItem("tz-addr") || ""; } catch (e) {}
  if (!co.f.name.value) co.f.name.value = String(saved.name || "");
  if (!co.f.phone.value) co.f.phone.value = fmt9(saved.phone || "");
  if (!co.f.addr.value) co.f.addr.value = addr;
  Object.values(co.f).forEach((i) => setErr(i, ""));

  const fee = t.fee ? `Yetkazish ${money(t.fee)} so'm` : "Yetkazish bepul";
  $("#coSum").innerHTML = `<div><b>${count} ta mahsulot</b><span>${fee}${t.disc ? ` · chegirma ${money(t.disc)} so'm` : ""}</span></div><strong>${money(t.total)} so'm</strong>`;

  $("#toast").classList.remove("on"); // eski xabar oyna ustida qolmasin
  $("#drawer").inert = true;
  co.modal.classList.add("open");
  requestAnimationFrame(() => (!co.f.name.value ? co.f.name : !co.f.phone.value ? co.f.phone : co.f.addr).focus());
}

function closeCheckout() {
  co.modal.classList.remove("open");
  if (co.done) { closeCart(); return; }          // buyurtma tugagan: savatcha oynasini ham yopamiz
  $("#drawer").inert = false;
  $("#checkout").focus();
}

async function submitCheckout(e) {
  e.preventDefault();
  const name = co.f.name.value.trim(), digits = co.f.phone.value.replace(/\D/g, ""), addr = co.f.addr.value.trim();
  const bad = [];
  if (name.length < 2) bad.push([co.f.name, "Ismingizni kiriting (kamida 2 ta harf)."]);
  if (digits.length !== 9) bad.push([co.f.phone, "Telefon raqamini to'liq kiriting: 90 123 45 67"]);
  if (addr.length < 5) bad.push([co.f.addr, "Yetkazib berish manzilini kiriting: ko'cha va uy raqami."]);
  bad.push(...payErrors());
  [...Object.values(co.f), $("#coCard"), $("#coExp")].forEach((i) => setErr(i, ""));
  bad.forEach(([i, m]) => setErr(i, m, true));
  if (bad.length) { bad[0][0].focus(); return; }

  const t = totals(), count = lines().reduce((s, x) => s + x.q, 0);
  const order = { no: "TZ-" + Math.floor(1000 + Math.random() * 9000), name, phone: "+998 " + co.f.phone.value, addr, total: t.total, count, pay: payInfo().name, items: lines().map((x) => [x.p.id, x.q]) };
  if (SERVER.on) {
    const btn = $("#coSubmit"); btn.disabled = true;
    try {
      const r = await SERVER.call("POST", "/api/orders", { name, phone: digits, addr, pay: payInfo().id, promo: shop.promo, items: order.items });
      order.no = r.no; order.total = r.total;
    } catch (er) { toast(er.message); return; } finally { btn.disabled = false; }
  }
  try {
    localStorage.setItem("tz-customer", JSON.stringify({ name, phone: digits }));
    localStorage.setItem("tz-addr", addr);
  } catch (er) {}
  saveOrder(order);
  shop.cart = {}; shop.promo = ""; saveCart(); renderCart();
  $("#coCard").value = ""; $("#coExp").value = "";
  showDone(order);
}

function showDone(o) {
  co.done = true;
  $("#coForm").hidden = true;
  const note = BACKEND_READY()
    ? `<p class="done__note">Taxminan 30 daqiqada yetkazamiz.</p>`
    : `<p class="done__note">Demo rejim: server hali ulanmagan, buyurtma yuborilmadi.</p>`;
  const d = $("#coDone");
  d.innerHTML = `
    <div class="done__top">
      <div class="done__ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></div>
      <h2 id="coDoneTitle">Buyurtma rasmiylashtirildi</h2>
      <p>${esc(o.count)} ta mahsulot</p>
    </div>
    <div class="done__body">
      <dl class="done__list">
        <div><dt>Buyurtma raqami</dt><dd>${esc(o.no)}</dd></div>
        <div><dt>Ism</dt><dd>${esc(o.name)}</dd></div>
        <div><dt>Telefon</dt><dd>${esc(o.phone)}</dd></div>
        <div><dt>Manzil</dt><dd>${esc(o.addr)}</dd></div>
        <div><dt>To'lov</dt><dd>${esc(o.pay)}</dd></div>
        <div class="done__t"><dt>Jami</dt><dd>${money(o.total)} so'm</dd></div>
      </dl>
      ${trackHTML()}
      ${note}
      <button type="button" class="btn btn--dark btn--full" id="coOk">Davom etish</button>
    </div>`;
  d.hidden = false;
  co.modal.querySelector(".modal__card").scrollTop = 0;
  startTrack(o.no); $("#coOk").addEventListener("click", closeCheckout);
  $("#coOk").focus();
}

// Tab tugmasi oyna ichida aylanib turadi, Esc oynani yopadi
function trapKeys(e) {
  if (e.key === "Escape") { e.stopPropagation(); closeCheckout(); return; }
  if (e.key !== "Tab") return;
  const els = [...co.modal.querySelectorAll("button, input")].filter((el) => !el.closest("[hidden]") && !el.disabled);
  if (!els.length) return;
  const first = els[0], last = els[els.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

function initCheckout() {
  initPay();
  co.modal = $("#checkoutModal");
  co.f = { name: $("#coName"), phone: $("#coPhone"), addr: $("#coAddr") };
  $("#coClose").addEventListener("click", closeCheckout);
  $("#coBack").addEventListener("click", closeCheckout);
  co.modal.querySelector(".modal__back").addEventListener("click", closeCheckout);
  co.f.phone.addEventListener("input", () => { co.f.phone.value = fmt9(co.f.phone.value); });
  Object.values(co.f).forEach((i) => i.addEventListener("input", () => setErr(i, "")));
  $("#coFormEl").addEventListener("submit", submitCheckout);
  co.modal.addEventListener("keydown", trapKeys);
}

// Savatcha oynasidagi "Buyurtma berish" tugmasi shu funksiyani chaqiradi
function checkout() { openCheckout(); }

function openCart() {
  closeFav();
  shop.done = null; renderCart();
  const d = $("#drawer");
  d.inert = false; d.classList.add("open");
  $("#overlay").classList.add("on");
  document.body.classList.add("lock");
  $("#drawerClose").focus();
}
function closeCart() {
  const d = $("#drawer");
  d.classList.remove("open"); d.inert = true;
  $("#overlay").classList.remove("on");
  document.body.classList.remove("lock");
  $("#cart").focus();
}

/* ---------- Ishga tushirish ---------- */
/* =========================================================
   YOQTIRGANLAR (yurakcha): mahsulot kartochkasida va navbar'da
   LocalStorage kaliti: tz-fav
   ========================================================= */
shop.fav = [];
const HEART = "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z";
const isFav = (id) => shop.fav.includes(String(id));

function favBtn(p) {
  const on = isFav(p.id);
  return `<button type="button" class="fav${on ? " on" : ""}" data-a="fav" data-id="${p.id}" aria-pressed="${on}" aria-label="${on ? "Yoqtirganlardan olib tashlash" : "Yoqtirganlarga qo'shish"}"><svg viewBox="0 0 24 24"><path d="${HEART}"/></svg></button>`;
}

function loadFav() {
  try {
    const raw = JSON.parse(localStorage.getItem("tz-fav") || "[]");
    if (Array.isArray(raw)) shop.fav = [...new Set(raw.map(String))].filter((id) => byId(id));
  } catch (e) { shop.fav = []; }
}
function saveFav() { try { localStorage.setItem("tz-fav", JSON.stringify(shop.fav)); } catch (e) {} }

function toggleFav(id) {
  id = String(id);
  const i = shop.fav.indexOf(id);
  if (i >= 0) shop.fav.splice(i, 1); else shop.fav.push(id);
  saveFav(); syncFav(id);
  if (i < 0) toast(`${byId(id).name} yoqtirganlarga qo'shildi`);
}

// Barcha yurakchalar, navbar'dagi son va ro'yxatni bir xil holatga keltiradi
function syncFav(pulseId) {
  document.querySelectorAll(".fav").forEach((b) => {
    const on = isFav(b.dataset.id);
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", String(on));
    b.setAttribute("aria-label", on ? "Yoqtirganlardan olib tashlash" : "Yoqtirganlarga qo'shish");
    if (pulseId && on && b.dataset.id === pulseId) { b.classList.remove("pulse"); void b.offsetWidth; b.classList.add("pulse"); }
  });
  const n = shop.fav.length, c = $("#favCount");
  c.textContent = n; c.hidden = !n; $("#favBtn").classList.toggle("has", n > 0);
  renderFav();
}

const emptyFav = `
  <div class="ok-view">
    <div class="ok-view__ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="${HEART}"/></svg></div>
    <h3>Hali hech narsa yo'q</h3><p>Mahsulot rasmidagi yurakchani bosing, u shu yerda saqlanadi.</p>
    <button type="button" class="btn btn--dark" data-a="fav-shop">Mahsulotlarga o'tish</button>
  </div>`;

function renderFav() {
  const items = shop.fav.map(byId).filter(Boolean);
  $("#favSub").textContent = items.length ? `${items.length} ta mahsulot` : "";
  const box = $("#favItems");
  box.innerHTML = items.length ? `<ul>${items.map((p) => `
    <li class="ci" data-id="${p.id}">
      <img data-src="${esc(p.img)}" data-fb="${esc(p.fb)}" alt="${esc(p.name)}">
      <div class="ci__i">
        <h3>${esc(p.name)}</h3><span class="ci__p">${money(p.price)} so'm</span>
        <button type="button" class="buy buy--s" data-a="fav-add">Savatga</button>
      </div>
      <button type="button" class="ci__x ci__x--heart" data-a="fav-del" aria-label="${esc(p.name)} ni yoqtirganlardan olib tashlash"><svg viewBox="0 0 24 24"><path d="${HEART}"/></svg></button>
    </li>`).join("")}</ul>` : emptyFav;
  box.querySelectorAll("img").forEach(bindImg);
}

function openFav() {
  if ($("#drawer").classList.contains("open")) closeCart();
  const d = $("#favDrawer");
  d.inert = false; d.classList.add("open");
  $("#overlay").classList.add("on");
  document.body.classList.add("lock");
  $("#favClose").focus();
}
function closeFav() {
  const d = $("#favDrawer");
  if (!d.classList.contains("open")) return;
  d.classList.remove("open"); d.inert = true;
  $("#overlay").classList.remove("on");
  document.body.classList.remove("lock");
  $("#favBtn").focus();
}

function initFav() {
  $("#favDrawer").inert = true;
  $("#favBtn").addEventListener("click", openFav);
  $("#favClose").addEventListener("click", closeFav);
  $("#favItems").addEventListener("click", (e) => {
    const b = e.target.closest("[data-a]");
    if (!b) return;
    if (b.dataset.a === "fav-shop") { closeFav(); $("#products").scrollIntoView({ behavior: "smooth" }); return; }
    const li = b.closest(".ci");
    if (!li) return;
    if (b.dataset.a === "fav-add") addToCart(li.dataset.id, 1);
    if (b.dataset.a === "fav-del") toggleFav(li.dataset.id);
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape") closeFav(); });
  // Xizmat kartochkasi: Grocery bosilganda katalog "Market" kategoriyasiga o'tadi
  $("#svcGrid").addEventListener("click", (e) => {
    const a = e.target.closest(".sv");
    if (a && a.dataset.cat) { shop.cat = a.dataset.cat; renderCatalog(); }
  });
  syncFav();
}

function initShop() {
  shop.q = $("#q").value; shop.sort = $("#sort").value;
  loadCart(); loadFav();
  $("#drawer").inert = true;
  renderPopular(); renderCatalog(); renderCart();

  [$("#popGrid"), $("#prodGrid")].forEach((g) => g.addEventListener("click", onCard));
  let timer;
  $("#q").addEventListener("input", (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => { shop.q = e.target.value; renderCatalog(); }, 150);
  });
  $("#qClear").addEventListener("click", () => { $("#q").value = ""; shop.q = ""; renderCatalog(); $("#q").focus(); });
  $("#sort").addEventListener("change", (e) => { shop.sort = e.target.value; renderCatalog(); });

  $("#cart").addEventListener("click", openCart);
  $("#drawerClose").addEventListener("click", closeCart);
  $("#overlay").addEventListener("click", () => { closeCart(); closeFav(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && $("#drawer").classList.contains("open") && !$("#checkoutModal").classList.contains("open")) closeCart(); });
  $("#cartItems").addEventListener("click", onCartClick);
  $("#promoForm").addEventListener("submit", onPromo);
  $("#checkout").addEventListener("click", checkout);
  initCheckout(); initFav();
}

/* ---------- Boshlash ---------- */
async function init() {
  await SERVER.init();
  initTheme(); initNav(); initAddress();
  document.querySelectorAll('.hero img').forEach(bindImg);
  [state.restaurants, state.products] = await Promise.all([API.getRestaurants(), API.getProducts()]);
  renderServices(await API.getServices()); hydrate($('#svcGrid'));
  renderRestaurants(); initShop();
  setTimeout(() => { $('#courier').style.width = '68%'; }, 100);
}
document.addEventListener('DOMContentLoaded', init);

/* =========================================================
   TIL (uz / ru / en). Matn avtomatik tarjima qilinadi.
   Yangi til qo'shish: LANGS'ga nom, L18 qatorlariga yangi ustun.
   ========================================================= */
const LANGS = { uz: "O'zbekcha", ru: "Русский", en: "English" };
const L18 = [
  ["Xizmatlar", "Услуги", "Services"], ["Restoranlar", "Рестораны", "Restaurants"], ["Mahsulotlar", "Товары", "Products"],
  ["Ilova", "Приложение", "App"], ["Xarita", "Карта", "Map"], ["Kompaniya", "Компания", "Company"], ["Aloqa", "Контакты", "Contact"],
  ["Issiq taom kutishni yoqtirmaydi.", "Горячая еда не любит ждать.", "Hot food hates waiting."], ["Biz ham.", "Мы тоже.", "Neither do we."],
  ["Restoran taomlari, oziq-ovqat va shoshilinch buyurtmalar: bir bosishda, o'rtacha 30 daqiqada eshigingizda.", "Блюда из ресторанов, продукты и срочные заказы: одним нажатием, в среднем за 30 минут у вашей двери.", "Restaurant meals, groceries and urgent orders: one tap, at your door in 30 minutes on average."],
  ["Yetkazib berish manzilini kiriting: ko'cha va uy raqami.", "Введите адрес доставки: улица и дом.", "Enter the delivery address: street and house number."],
  ["Yetkazib berish manzilini kiriting", "Введите адрес доставки", "Enter delivery address"], ["Restoran topish", "Найти ресторан", "Find restaurants"],
  ["o'rtacha yetkazish", "в среднем доставка", "avg. delivery"], ["hamkor restoran", "ресторанов-партнёров", "partner restaurants"], ["ish vaqti", "работаем", "open hours"],
  ["Buyurtmangiz yo'lda", "Ваш заказ в пути", "Your order is on the way"], ["Kuryer: Jasur", "Курьер: Жасур", "Courier: Jasur"],
  ["Nimani yetkazib beramiz?", "Что мы доставляем?", "What do we deliver?"],
  ["Restoran va kafelardan issiq taomlar, tez va qadoqlangan holda.", "Горячие блюда из ресторанов и кафе, быстро и в упаковке.", "Hot meals from restaurants and cafes, fast and packed."],
  ["Sabzavot, mevalar va kundalik mahsulotlar uyingizgacha.", "Овощи, фрукты и продукты первой необходимости к вам домой.", "Vegetables, fruit and daily essentials to your home."],
  ["Hujjat, sovg'a yoki dori-darmon. Shoshilinch buyurtmalar uchun.", "Документы, подарки или лекарства. Для срочных заказов.", "Documents, gifts or medicine. For urgent orders."],
  ["daqiqa", "минут", "min"], ["daq", "мин", "min"],
  ["Yaqiningizdagi restoranlar", "Рестораны рядом", "Restaurants near you"], ["Hammasi", "Все", "All"], ["Milliy", "Национальная", "Local"],
  ["Shirinliklar", "Десерты", "Desserts"], ["Shirinlik", "Десерты", "Desserts"], ["Ichimliklar", "Напитки", "Drinks"], ["Market", "Маркет", "Market"],
  ["Mashhur mahsulotlar", "Популярные товары", "Popular products"], ["Barcha mahsulotlar", "Все товары", "All products"], ["Mahsulotlar katalogi", "Каталог товаров", "Product catalog"],
  ["Mashhur", "Популярное", "Popular"], ["Yangi", "Новое", "New"], ["Yetkazish:", "Доставка:", "Delivery:"], ["Bepul", "Бесплатно", "Free"],
  ["Mahsulot nomi bo'yicha qidirish", "Поиск по названию", "Search by name"], ["=Saralash", "Сортировка", "Sort"], ["Tavsiya etilgan", "Рекомендуемые", "Recommended"],
  ["Narx: arzonroq", "Цена: дешевле", "Price: low to high"], ["Narx: qimmatroq", "Цена: дороже", "Price: high to low"], ["Nomi bo'yicha", "По названию", "By name"],
  ["ta mahsulot", "товаров", "items"], ["Hech narsa topilmadi", "Ничего не найдено", "Nothing found"], ["Filtrlarni tozalash", "Сбросить фильтры", "Clear filters"],
  ["Qo'shildi ✓", "Добавлено ✓", "Added ✓"], ["Savatga", "В корзину", "Add"], ["so'm", "сум", "UZS"],
  ["Birinchi buyurtmangizga yetkazish bepul", "Доставка первого заказа бесплатно", "Free delivery on your first order"], ["Promokod:", "Промокод:", "Promo code:"],
  [". Ilova tez orada chiqadi, xabardor bo'lib turing.", ". Приложение скоро выйдет, следите за новостями.", ". The app is coming soon, stay tuned."],
  ["Buyurtma berish", "Заказать", "Order now"],
  ["Shahar bo'ylab tez, issiq va ishonchli yetkazib berish.", "Быстрая, горячая и надёжная доставка по городу.", "Fast, hot and reliable delivery across the city."],
  ["Kuryer bo'lish", "Стать курьером", "Become a courier"], ["Toshkent, O'zbekiston", "Ташкент, Узбекистан", "Tashkent, Uzbekistan"],
  ["Barcha huquqlar himoyalangan", "Все права защищены", "All rights reserved"],
  ["Yangiliklar va aksiyalardan xabardor bo'ling", "Будьте в курсе новостей и акций", "Stay in the loop on news and deals"],
  ["Telegram kanalimizga qo'shiling: chegirmalar va yangi restoranlar birinchi bo'lib shu yerda.", "Подписывайтесь на наш Telegram: скидки и новые рестораны первыми здесь.", "Join our Telegram: discounts and new restaurants appear here first."],
  ["To'lov usullari", "Способы оплаты", "Payment methods"],
  ["Savatcha bo'sh", "Корзина пуста", "Your cart is empty"], ["Mahsulot tanlang, ular shu yerda ko'rinadi.", "Выберите товары, они появятся здесь.", "Pick products and they will show up here."],
  ["Mahsulotlarga o'tish", "К товарам", "Browse products"], ["Savatcha", "Корзина", "Cart"], ["Promo-kodni kiriting.", "Введите промокод.", "Enter a promo code."],
  ["Bunday promo-kod topilmadi. Tekshirib qayta kiriting.", "Такой промокод не найден. Проверьте и повторите.", "Promo code not found. Check and try again."],
  ["Promo-kod", "Промокод", "Promo code"], ["Qo'llash", "Применить", "Apply"], ["Bekor qilish", "Отменить", "Cancel"], ["Chegirma", "Скидка", "Discount"],
  ["Yetkazish bepul", "Доставка бесплатно", "Free delivery"], ["Yetkazish", "Доставка", "Delivery"], ["=Jami", "Итого", "Total"],
  ["Yana", "Добавьте ещё", "Add"], ["qo'shsangiz, yetkazish bepul bo'ladi.", "— и доставка будет бесплатной.", "more for free delivery."],
  ["10% chegirma", "Скидка 10%", "10% off"], ["savatga qo'shildi", "добавлено в корзину", "added to cart"], ["yoqtirganlarga qo'shildi", "добавлено в избранное", "added to favorites"],
  ["qo'llandi", "применён", "applied"], ["Yoqtirganlar", "Избранное", "Favorites"], ["Hali hech narsa yo'q", "Пока ничего нет", "Nothing here yet"],
  ["Mahsulot rasmidagi yurakchani bosing, u shu yerda saqlanadi.", "Нажмите на сердечко у товара, он сохранится здесь.", "Tap the heart on a product to save it here."],
  ["Buyurtmani rasmiylashtirish", "Оформление заказа", "Checkout"], ["Ma'lumotlaringizni kiriting, kuryer siz bilan bog'lanadi.", "Введите данные, курьер свяжется с вами.", "Enter your details, the courier will contact you."],
  ["Ismingizni kiriting (kamida 2 ta harf).", "Введите имя (минимум 2 буквы).", "Enter your name (at least 2 letters)."], ["Ismingiz", "Ваше имя", "Your name"],
  ["Masalan: Jasur Karimov", "Например: Жасур Каримов", "e.g. Jasur Karimov"], ["Telefon raqamini to'liq kiriting: 90 123 45 67", "Введите номер полностью: 90 123 45 67", "Enter the full number: 90 123 45 67"],
  ["Telefon raqamingiz", "Ваш телефон", "Your phone number"], ["Yetkazib berish manzili", "Адрес доставки", "Delivery address"], ["Ko'cha, uy va xonadon raqami", "Улица, дом и квартира", "Street, house and apartment"],
  ["Buyurtmani tasdiqlash", "Подтвердить заказ", "Confirm order"], ["Savatchaga qaytish", "Вернуться в корзину", "Back to cart"], ["chegirma", "скидка", "discount"],
  ["Buyurtma rasmiylashtirildi", "Заказ оформлен", "Order placed"], ["Buyurtma raqami", "Номер заказа", "Order number"], ["=Ism", "Имя", "Name"], ["=Telefon", "Телефон", "Phone"], ["=Manzil", "Адрес", "Address"],
  ["=To'lov", "Оплата", "Payment"], ["Davom etish", "Продолжить", "Continue"], ["Demo rejim: server hali ulanmagan, buyurtma yuborilmadi.", "Демо-режим: сервер не подключён, заказ не отправлен.", "Demo mode: no server yet, the order was not sent."],
  ["Buyurtma qabul qilindi", "Заказ принят", "Order received"], ["Taxminan 30 daqiqada yetkazamiz.", "Доставим примерно за 30 минут.", "We deliver in about 30 minutes."],
  ["Sozlamalar", "Настройки", "Settings"], ["=Menyu", "Меню", "Menu"], ["=Til", "Язык", "Language"], ["Ko'rinish", "Оформление", "Appearance"], ["Tungi rejim", "Тёмная тема", "Dark mode"],
  ["To'lov usuli", "Способ оплаты", "Payment method"], ["Naqd pul", "Наличные", "Cash"], ["Kuryerga to'laysiz", "Оплата курьеру", "Pay the courier"],
  ["Ilovada tasdiqlaysiz", "Подтверждение в приложении", "Confirm in the app"], ["Bank kartasi", "Банковская карта", "Bank card"], ["Xalqaro karta", "Международная карта", "International card"],
  ["Karta raqami", "Номер карты", "Card number"], ["Amal qilish muddati", "Срок действия", "Expiry date"],
  ["Buyurtmani tasdiqlagach to'lov ilovasiga o'tasiz. Demo: haqiqiy to'lov keyingi bosqichda ulanadi.", "После подтверждения вы перейдёте в приложение оплаты. Демо: реальная оплата подключится на следующем этапе.", "After confirming you will open the payment app. Demo: real payments come in the next stage."],
  ["Karta ma'lumoti saqlanmaydi va yuborilmaydi (demo).", "Данные карты не сохраняются и не отправляются (демо).", "Card details are neither saved nor sent (demo)."],
  ["Karta raqamini to'liq kiriting (16 ta raqam).", "Введите номер карты полностью (16 цифр).", "Enter the full card number (16 digits)."], ["Muddatni OO/YY ko'rinishida kiriting.", "Введите срок в формате ММ/ГГ.", "Enter the expiry as MM/YY."],
  ["Xarita: restoranlar va kuryerlar", "Карта: рестораны и курьеры", "Map: restaurants and couriers"], ["Mening joylashuvim", "Моё местоположение", "My location"],
  ["kuryer yaqin atrofda", "курьера рядом", "couriers nearby"],
  ["Double burger", "Дабл бургер", "Double burger"], ["Kartoshka fri", "Картофель фри", "French fries"], ["Tovuq qanotchalari", "Куриные крылышки", "Chicken wings"],
  ["To'rt pishloq", "Четыре сыра", "Four cheese"], ["Filadelfiya roll", "Ролл Филадельфия", "Philadelphia roll"], ["Sushi to'plami", "Суши-сет", "Sushi set"],
  ["Limonad", "Лимонад", "Lemonade"], ["Muzli kofe", "Айс-кофе", "Iced coffee"], ["Mevali smuzi", "Фруктовый смузи", "Fruit smoothie"],
  ["Yangi sabzavotlar", "Свежие овощи", "Fresh vegetables"], ["Mavsumiy mevalar", "Сезонные фрукты", "Seasonal fruit"], ["Tandir non", "Тандырный хлеб", "Tandoor bread"],
  ["Shokoladli tort", "Шоколадный торт", "Chocolate cake"], ["Pancake to'plami", "Панкейки", "Pancake set"], ["Donat", "Пончик", "Donut"],
  ["TEZKOR DELIVERY — Tez yetkazib berish xizmati", "TEZKOR DELIVERY — Сервис быстрой доставки", "TEZKOR DELIVERY — Fast delivery service"]
];
L18.push(['Buyurtmalarim','Мои заказы','My orders'],["Hali buyurtma yo'q",'Заказов пока нет','No orders yet'],['Qayta buyurtma','Повторить заказ','Reorder'],['Qabul qilindi','Принят','Received'],['Tayyorlanmoqda','Готовится','Preparing'],["Yo'lda",'В пути','On the way'],['Yetkazildi','Доставлен','Delivered'],['Baholang','Оцените','Rate it'],['Rahmat! Bahoyingiz saqlandi','Спасибо! Оценка сохранена','Thanks! Rating saved'],['Buyurtma holati','Статус заказа','Order status'],['Holat demo tarzda yangilanadi.','Статус обновляется в демо-режиме.','Status updates in demo mode.']);
const I18 = { ru: { ex: {}, sub: [] }, en: { ex: {}, sub: [] } };
L18.forEach(([uz, ru, en]) => {
  [["ru", ru], ["en", en]].forEach(([l, v]) => {
    if (uz[0] === "=") I18[l].ex[uz.slice(1)] = v; else I18[l].sub.push([uz, v]);
  });
});
I18.ru.sub.sort((a, b) => b[0].length - a[0].length); I18.en.sub.sort((a, b) => b[0].length - a[0].length);

let LANG = "uz";
function trStr(s, lang) {
  if (lang === "uz" || !I18[lang]) return s;
  const t = s.trim(), ex = I18[lang].ex[t];
  if (ex) return s.replace(t, ex);
  for (const [k, v] of I18[lang].sub) if (s.includes(k)) s = s.split(k).join(v);
  return s;
}

const i18nStore = new WeakMap();
const I18_ATTRS = ["placeholder", "aria-label", "alt", "title"];
let i18nObs;
function i18nSync(slot, cur, set) {
  let o = i18nStore.get(slot.k) || {};
  const rec = o[slot.n];
  const src = rec && (cur === rec.src || cur === rec.tr) ? rec.src : cur;
  const tr = trStr(src, LANG);
  o[slot.n] = { src, tr }; i18nStore.set(slot.k, o);
  if (tr !== cur) set(tr);
}
function i18nApply(root) {
  if (!root) return;
  if (root.nodeType === 3) {
    const p = root.parentNode;
    if (p && !/^(SCRIPT|STYLE)$/.test(p.nodeName) && root.nodeValue.trim()) i18nSync({ k: root, n: "t" }, root.nodeValue, (v) => { root.nodeValue = v; });
    return;
  }
  if (root.nodeType !== 1 || /^(SCRIPT|STYLE)$/.test(root.nodeName)) return;
  I18_ATTRS.forEach((a) => { if (root.hasAttribute(a)) i18nSync({ k: root, n: a }, root.getAttribute(a), (v) => root.setAttribute(a, v)); });
  root.childNodes.forEach(i18nApply);
}
function i18nRun(fn) { i18nObs.disconnect(); fn(); i18nObs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: I18_ATTRS }); }
function setLang(l) {
  if (!LANGS[l]) l = "uz";
  LANG = l;
  try { localStorage.setItem("tz-lang", l); } catch (e) {}
  document.documentElement.lang = l;
  i18nRun(() => { i18nApply(document.body); });
  document.title = trStr("TEZKOR DELIVERY — Tez yetkazib berish xizmati", l);
  document.querySelectorAll("#langs button").forEach((b) => { const on = b.dataset.lang === l; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
}
function initI18n() {
  i18nObs = new MutationObserver((recs) => {
    i18nRun(() => recs.forEach((r) => {
      if (r.type === "attributes") i18nApply(r.target);
      else r.addedNodes.forEach(i18nApply);
    }));
  });
  $("#langs").innerHTML = Object.entries(LANGS).map(([k, n]) => `<button type="button" data-lang="${k}">${n}</button>`).join("");
  $("#langs").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) setLang(b.dataset.lang); });
  let l = "uz"; try { l = localStorage.getItem("tz-lang") || "uz"; } catch (e) {}
  i18nObs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: I18_ATTRS });
  setLang(l);
}

/* =========================================================
   SOZLAMALAR oynasi (tepa o'ng burchakdagi 3 chiziq)
   ========================================================= */
function openSet() {
  renderOrders();
  if ($("#drawer").classList.contains("open")) closeCart();
  closeFav();
  const d = $("#setDrawer");
  d.inert = false; d.classList.add("open");
  $("#overlay").classList.add("on"); document.body.classList.add("lock");
  $("#setBtn").setAttribute("aria-expanded", "true");
  $("#setClose").focus();
}
function closeSet() {
  const d = $("#setDrawer");
  if (!d.classList.contains("open")) return;
  d.classList.remove("open"); d.inert = true;
  $("#overlay").classList.remove("on"); document.body.classList.remove("lock");
  $("#setBtn").setAttribute("aria-expanded", "false"); $("#setBtn").focus();
}
function initSettings() {
  $("#setDrawer").inert = true;
  $("#setBtn").addEventListener("click", openSet);
  $("#setClose").addEventListener("click", closeSet);
  $("#overlay").addEventListener("click", closeSet);
  addEventListener("keydown", (e) => { if (e.key === "Escape") closeSet(); });
  $("#setDrawer .set__menu").addEventListener("click", (e) => { if (e.target.closest("a")) closeSet(); });
  const tg = $("#setTheme"), sync = () => tg.setAttribute("aria-checked", document.documentElement.dataset.theme === "dark");
  tg.addEventListener("click", () => { $("#theme").click(); sync(); });
  $("#theme").addEventListener("click", () => setTimeout(sync, 0));
  sync();
}

/* =========================================================
   TO'LOV USULLARI (checkout ichida)
   Karta ma'lumoti hech qayerga saqlanmaydi va yuborilmaydi.
   ========================================================= */
const PAYS = [
  ["cash", "Naqd pul", "Kuryerga to'laysiz", "#222222", "UZS", 0],
  ["payme", "Payme", "Ilovada tasdiqlaysiz", "#00BFBF", "P", 0],
  ["click", "Click", "Ilovada tasdiqlaysiz", "#0A8CE9", "C", 0],
  ["uzum", "Uzum Bank", "Ilovada tasdiqlaysiz", "#6F2DEB", "U", 0],
  ["humo", "Humo", "Bank kartasi", "#00A86B", "H", 1],
  ["uzcard", "Uzcard", "Bank kartasi", "#1565C0", "UZ", 1],
  ["visa", "Visa / Mastercard", "Xalqaro karta", "#1A1F71", "V", 1]
];
const payInfo = () => {
  const v = (document.querySelector("input[name=pay]:checked") || {}).value || "cash";
  const p = PAYS.find((x) => x[0] === v);
  return { id: p[0], name: p[1], card: !!p[5] };
};
function syncPay() {
  const p = payInfo();
  $("#payCard").hidden = !p.card;
  $("#payHint").textContent = p.card ? "Karta ma'lumoti saqlanmaydi va yuborilmaydi (demo)." : p.id === "cash" ? "" : "Buyurtmani tasdiqlagach to'lov ilovasiga o'tasiz. Demo: haqiqiy to'lov keyingi bosqichda ulanadi.";
}
function initPay() {
  $("#payGrid").innerHTML = PAYS.map((p, i) => `
    <label class="payopt"><input type="radio" name="pay" value="${p[0]}"${i ? "" : " checked"}>
      <span class="pb" style="--c:${p[3]}" aria-hidden="true">${p[4]}</span>
      <span class="payopt__t"><b>${p[1]}</b><small>${p[2]}</small></span></label>`).join("");
  $("#payGrid").addEventListener("change", syncPay);
  const cn = $("#coCard"), ce = $("#coExp");
  cn.addEventListener("input", () => { cn.value = cn.value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim(); setErr(cn, ""); });
  ce.addEventListener("input", () => { let d = ce.value.replace(/\D/g, "").slice(0, 4); ce.value = d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d; setErr(ce, ""); });
  syncPay();
}
function payErrors() {
  const bad = [], p = payInfo();
  if (!p.card) return bad;
  const n = $("#coCard"), e = $("#coExp"), m = Number(e.value.slice(0, 2));
  if (n.value.replace(/\D/g, "").length !== 16) bad.push([n, "Karta raqamini to'liq kiriting (16 ta raqam)."]);
  if (!/^\d\d\/\d\d$/.test(e.value) || m < 1 || m > 12) bad.push([e, "Muddatni OO/YY ko'rinishida kiriting."]);
  return bad;
}

document.addEventListener("DOMContentLoaded", () => { setTimeout(() => { initSettings(); initI18n(); }, 0); });

/* =========================================================
   Buyurtma kuzatuvi (tracking), buyurtmalar tarixi, restoran sahifasi
   ========================================================= */
const STEPS = ["Qabul qilindi", "Tayyorlanmoqda", "Yo'lda", "Yetkazildi"];
const trackHTML = () => `<p class="trk__h">Buyurtma holati</p><ol class="trk" id="trk">${STEPS.map((s) => `<li><i></i>${s}</li>`).join("")}</ol><p class="trk__n">Holat demo tarzda yangilanadi.</p>`;
let trkTimer;
function startTrack(no) {
  clearInterval(trkTimer);
  if (SERVER.on && no) {
    const li = [...document.querySelectorAll("#trk li")], n0 = document.querySelector(".trk__n"), map = { new: 0, cook: 1, way: 2, done: 3, cancel: -1 };
    if (n0) n0.textContent = "Holat restoran va kuryer yangilagan sari o'zgaradi.";
    const poll = async () => { if (!document.getElementById("trk")) { clearInterval(trkTimer); return; } try { const r = await SERVER.call("GET", "/api/orders/" + no), n = map[r.status]; if (n < 0) { if (n0) n0.textContent = "Buyurtma bekor qilingan."; clearInterval(trkTimer); return; } li.forEach((x, i) => x.classList.toggle("on", i <= n)); if (n >= 3) clearInterval(trkTimer); } catch (e) {} };
    poll(); trkTimer = setInterval(poll, 5000); return;
  }
  const li = [...document.querySelectorAll("#trk li")]; let n = 0;
  const set = () => li.forEach((x, i) => x.classList.toggle("on", i <= n));
  set();
  trkTimer = setInterval(() => { if (!document.getElementById("trk") || n >= 3) { clearInterval(trkTimer); return; } n++; set(); }, 3500);
}

const loadOrders = () => { try { return JSON.parse(localStorage.getItem("tz-orders") || "[]"); } catch (e) { return []; } };
function saveOrder(o) {
  if (!SERVER.on) try { const all = JSON.parse(localStorage.getItem("tz-admin-orders") || "[]"); all.unshift({ no: o.no, ts: Date.now(), name: o.name, phone: o.phone, addr: o.addr, pay: o.pay, total: o.total, count: o.count, items: o.items, status: "new" }); localStorage.setItem("tz-admin-orders", JSON.stringify(all.slice(0, 500))); } catch (e) {}
  try { localStorage.setItem("tz-orders", JSON.stringify([{ no: o.no, total: o.total, count: o.count, items: o.items }, ...loadOrders()].slice(0, 10))); } catch (e) {}
}
function renderOrders() {
  const L = loadOrders(), box = $("#orders");
  box.innerHTML = L.length ? L.map((o, i) => `<div class="ord"><div><b>${esc(o.no)}</b><span>${o.count} ta mahsulot · ${money(o.total)} so'm</span></div><button type="button" class="buy buy--s" data-i="${i}">Qayta buyurtma</button></div>`).join("") : `<p class="ord__e">Hali buyurtma yo'q</p>`;
}

const RMENU = { Burger: ["Fast Food"], Pizza: ["Pizza"], Sushi: ["Sushi"], Shirinlik: ["Shirinliklar"], Milliy: ["Fast Food", "Market"] };
const loadRate = () => { try { return JSON.parse(localStorage.getItem("tz-rate") || "{}"); } catch (e) { return {}; } };
function openRest(name) {
  const r = state.restaurants.find((x) => x.name === name); if (!r) return;
  closeFav(); closeSet();
  const cats = RMENU[r.cat] || [], items = state.products.filter((p) => cats.includes(p.cat)).slice(0, 6), mine = loadRate()[name] || 0;
  $("#restTitle").textContent = r.name;
  $("#restSub").textContent = `★ ${r.rating} · ${r.time} daq · Yetkazish: ${r.fee}`;
  $("#restBody").innerHTML = `
    <img class="rd__img" data-src="${esc(r.img)}" data-fb="${esc(r.fb)}" alt="${esc(r.name)}">
    <div class="rd__rate"><p>Baholang</p><div class="stars" data-r="${esc(name)}">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-s="${n}" class="${n <= mine ? "on" : ""}" aria-label="${n}">★</button>`).join("")}</div></div>
    <h3 class="rd__h">Menyu</h3>
    <ul>${items.map((p) => `<li class="ci" data-id="${p.id}"><img data-src="${esc(p.img)}" data-fb="${esc(p.fb)}" alt="${esc(p.name)}"><div class="ci__i"><h3>${esc(p.name)}</h3><span class="ci__p">${money(p.price)} so'm</span><button type="button" class="buy buy--s" data-a="r-add">Savatga</button></div><span></span></li>`).join("")}</ul>`;
  $("#restBody").querySelectorAll("img").forEach(bindImg);
  const d = $("#restDrawer"); d.inert = false; d.classList.add("open");
  $("#overlay").classList.add("on"); document.body.classList.add("lock");
  $("#restClose").focus();
}
function closeRest() {
  const d = $("#restDrawer"); if (!d.classList.contains("open")) return;
  d.classList.remove("open"); d.inert = true;
  $("#overlay").classList.remove("on"); document.body.classList.remove("lock");
}
function initExtra() {
  $("#restDrawer").inert = true;
  const g = $("#restGrid");
  g.addEventListener("click", (e) => { const a = e.target.closest(".rc"); if (a) openRest(a.dataset.r); });
  g.addEventListener("keydown", (e) => { if (e.key === "Enter") { const a = e.target.closest(".rc"); if (a) openRest(a.dataset.r); } });
  $("#restClose").addEventListener("click", closeRest);
  $("#overlay").addEventListener("click", closeRest);
  addEventListener("keydown", (e) => { if (e.key === "Escape") closeRest(); });
  $("#restBody").addEventListener("click", (e) => {
    const s = e.target.closest("[data-s]");
    if (s) {
      const box = s.parentNode, v = Number(s.dataset.s), all = loadRate(); all[box.dataset.r] = v;
      try { localStorage.setItem("tz-rate", JSON.stringify(all)); } catch (er) {}
      box.querySelectorAll("button").forEach((b) => b.classList.toggle("on", Number(b.dataset.s) <= v));
      toast("Rahmat! Bahoyingiz saqlandi"); return;
    }
    const b = e.target.closest('[data-a="r-add"]'); if (b) addToCart(b.closest(".ci").dataset.id, 1);
  });
  $("#orders").addEventListener("click", (e) => {
    const b = e.target.closest("[data-i]"); if (!b) return;
    (loadOrders()[b.dataset.i].items || []).forEach(([id, q]) => { if (byId(id)) shop.cart[id] = Math.min((shop.cart[id] || 0) + q, 99); });
    saveCart(); renderCart(); closeSet(); openCart();
  });
}
document.addEventListener("DOMContentLoaded", () => setTimeout(initExtra, 0));
