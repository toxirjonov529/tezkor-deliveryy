'use strict';
/* =========================================================
   XARITA (Leaflet + CARTO/OpenStreetMap)
   - yorug'/tungi rejimga mos plitkalar
   - plitka yuklanmasa avtomatik zaxira manbaga o'tadi
   - restoranlar ro'yxati bilan bog'langan, kuryerlar yo'lda silliq harakatlanadi
   ========================================================= */
const MAP_PLACES = { 'Burger Yard': [41.3111, 69.2797], 'Pizza Forno': [41.3265, 69.2285], 'Osh Markazi': [41.3394, 69.2886], 'Sushi Oka': [41.2995, 69.2681], 'Grill House': [41.3187, 69.3098], 'Sweet Corner': [41.3058, 69.2407] };
const MAP_HOME = [41.3111, 69.2797];
const COURIER_ROUTES = [
  { name: 'Jasur', from: 'Burger Yard', to: [41.3230, 69.2420], speed: 0.018 },
  { name: 'Dilshod', from: 'Grill House', to: [41.3050, 69.2650], speed: 0.014 },
  { name: 'Aziza', from: 'Osh Markazi', to: [41.3260, 69.3050], speed: 0.016 },
  { name: 'Sardor', from: 'Sweet Corner', to: [41.2930, 69.2900], speed: 0.012 }
];

function distKm(a, b) {
  const R = 6371, rad = (x) => x * Math.PI / 180;
  const dLat = rad(b[0] - a[0]), dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function initMap() {
  const el = document.getElementById('mapEl'), list = document.getElementById('mapList');
  if (!el) return;
  const rests = DATA.restaurants.filter((r) => MAP_PLACES[r.name]);

  // Ro'yxat (Leaflet bo'lmasa ham ishlaydi)
  list.innerHTML = rests.map((r) => `
    <button type="button" class="ml" data-r="${r.name}">
      <span class="ml__ic"><img src="${r.img}" alt="" loading="lazy" onerror="this.replaceWith(document.createTextNode('${r.fb}'))"></span>
      <span class="ml__t"><b>${r.name}</b><small>${r.cat} · ${r.time} daq</small></span>
      <span class="ml__r">★ ${r.rating}<em class="ml__d"></em></span>
    </button>`).join('');

  if (!window.L) {
    el.innerHTML = '<iframe title="Xarita" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=69.17%2C41.27%2C69.35%2C41.38&layer=mapnik"></iframe>';
    return;
  }

  const map = L.map(el, { zoomControl: false, scrollWheelZoom: false, minZoom: 10, maxBounds: [[41.15, 69.0], [41.5, 69.55]], maxBoundsViscosity: .8 }).setView(MAP_HOME, 12);
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Plitkalar: OpenStreetMap (kalitsiz). Xato ko'p bo'lsa Esri zaxirasi. Tungi rejim CSS filtri bilan.
  const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
  let fails = 0;
  osm.on('tileerror', () => {
    if (++fails === 6) { map.removeLayer(osm); L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: '© Esri' }).addTo(map); }
  });

  const rIcon = (r) => L.divIcon({ className: 'tzp', iconSize: [54, 64], iconAnchor: [27, 62], popupAnchor: [0, -58],
    html: `<div class="pin"><div class="pin__ph"><img src="${r.img}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${r.fb}'}))"></div><b>★ ${r.rating}</b></div>` });
  const SCOOT = '<svg viewBox="0 0 32 32"><circle cx="8" cy="23" r="3.6"/><circle cx="25" cy="23" r="3.6"/><path d="M8 23h6l3-8h5M20 15l-2-6h-3"/><rect x="5" y="9" width="9" height="7" rx="1.5" class="bx"/></svg>';
  const cIcon = (n) => L.divIcon({ className: 'tzp', iconSize: [48, 60], iconAnchor: [24, 24], popupAnchor: [0, -22],
    html: `<div class="cr"><i class="cr__p"></i><div class="cr__b">${SCOOT}</div><em>${n}</em></div>` });
  const pin = (cls, ch) => L.divIcon({ className: 'mk ' + cls, html: `<span>${ch}</span>`, iconSize: [40, 40], iconAnchor: [20, 20] });

  // Restoranlar
  const marks = {};
  rests.forEach((r) => {
    const m = L.marker(MAP_PLACES[r.name], { icon: rIcon(r), title: r.name, riseOnHover: true }).addTo(map);
    m.bindPopup(`<div class="pop"><b>${r.name}</b><span>★ ${r.rating} · ${r.time} daq · Yetkazish: ${r.fee}</span><button type="button" class="pop__b" data-open="${r.name}">Menyuni ochish</button></div>`);
    marks[r.name] = m;
  });
  map.on('popupopen', (e) => {
    const b = e.popup.getElement().querySelector('[data-open]');
    if (b) b.onclick = () => { map.closePopup(); if (typeof openRest === 'function') openRest(b.dataset.open); };
  });

  // Kuryerlar: restoran -> mijoz yo'lida silliq harakat
  const couriers = COURIER_ROUTES.map((c) => {
    const a = MAP_PLACES[c.from];
    const line = L.polyline([a, c.to], { color: '#FFC700', weight: 4, opacity: .9, dashArray: '1 10', lineCap: 'round' }).addTo(map);
    const dest = L.circleMarker(c.to, { radius: 6, color: '#000', weight: 2, fillColor: '#fff', fillOpacity: 1 }).addTo(map);
    const mk = L.marker(a, { icon: cIcon(c.name), zIndexOffset: 500, title: 'Kuryer ' + c.name }).addTo(map);
    return { ...c, a, mk, line, dest, t: Math.random(), dir: 1 };
  });
  let raf = 0, last = 0, run = false;
  const tick = (now) => {
    if (!run) return;
    const dt = Math.min((now - last) / 1000, .1); last = now;
    couriers.forEach((c) => {
      c.t += c.dir * c.speed * dt;
      if (c.t >= 1) { c.t = 1; c.dir = -1; } else if (c.t <= 0) { c.t = 0; c.dir = 1; }
      const e = c.t < .5 ? 2 * c.t * c.t : 1 - Math.pow(-2 * c.t + 2, 2) / 2;
      c.mk.setLatLng([c.a[0] + (c.to[0] - c.a[0]) * e, c.a[1] + (c.to[1] - c.a[1]) * e]);
    });
    raf = requestAnimationFrame(tick);
  };
  // Faqat ko'rinib turganda harakatlanadi (batareya va tezlik uchun)
  new IntersectionObserver((es) => {
    run = es[0].isIntersecting && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    cancelAnimationFrame(raf);
    if (run) { last = performance.now(); raf = requestAnimationFrame(tick); }
    map.invalidateSize();
  }, { threshold: .05 }).observe(el);

  // Ro'yxatdan restoran tanlash
  const items = [...list.querySelectorAll('.ml')];
  list.addEventListener('click', (e) => {
    const b = e.target.closest('.ml'); if (!b) return;
    items.forEach((x) => x.classList.toggle('on', x === b));
    const c = MAP_PLACES[b.dataset.r];
    map.flyTo(c, 15, { duration: 1.1 });
    map.once('moveend', () => marks[b.dataset.r].openPopup());
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  // Mening joylashuvim: eng yaqin restoran va masofa
  let me, ring;
  const locate = () => {
    if (!navigator.geolocation) { toast('Brauzer joylashuvni aniqlay olmaydi'); return; }
    toast('Joylashuv aniqlanmoqda…');
    navigator.geolocation.getCurrentPosition((p) => {
      const c = [p.coords.latitude, p.coords.longitude];
      if (me) { me.setLatLng(c); ring.setLatLng(c); } else {
        me = L.marker(c, { icon: pin('mk--me', '📍'), zIndexOffset: 900 }).addTo(map);
        ring = L.circle(c, { radius: Math.max(p.coords.accuracy || 80, 60), color: '#FFC700', weight: 1, fillOpacity: .15 }).addTo(map);
      }
      if (distKm(c, MAP_HOME) > 80) { me.setLatLng(c); toast("Siz Toshkent yetkazib berish hududidan tashqaridasiz"); return; }
      let best = null;
      items.forEach((b) => {
        const d = distKm(c, MAP_PLACES[b.dataset.r]);
        b.querySelector('.ml__d').textContent = d.toFixed(1) + ' km';
        if (!best || d < best.d) best = { d, b };
      });
      list.append(...items.sort((x, y) => parseFloat(x.querySelector('.ml__d').textContent) - parseFloat(y.querySelector('.ml__d').textContent)));
      map.flyTo(c, 14, { duration: 1.1 });
      toast(`Eng yaqin: ${best.b.dataset.r}, ${best.d.toFixed(1)} km`);
    }, () => toast('Joylashuvga ruxsat berilmadi. Brauzer sozlamalaridan ruxsat bering.'), { timeout: 8000, enableHighAccuracy: true });
  };
  document.getElementById('mapLoc').addEventListener('click', locate);
  document.getElementById('mapAll').addEventListener('click', () => { items.forEach((x) => x.classList.remove('on')); map.flyToBounds(rests.map((r) => MAP_PLACES[r.name]), { padding: [60, 60], duration: 1 }); });

  // Xarita ustida sichqoncha g'ildiragi faqat bosgandan keyin yaqinlashtiradi (sahifa aylanishiga xalaqit bermaydi)
  map.on('focus', () => map.scrollWheelZoom.enable());
  map.on('blur', () => map.scrollWheelZoom.disable());

  new ResizeObserver(() => map.invalidateSize()).observe(el);
  map.fitBounds(rests.map((r) => MAP_PLACES[r.name]), { padding: [50, 50] });
}
document.addEventListener('DOMContentLoaded', () => setTimeout(initMap, 0));
