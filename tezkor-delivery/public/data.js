'use strict';
/* Ma'lumotlar: sayt ham, admin panel ham shu faylni ishlatadi */
const U = (id, w = 800) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const DATA = {
  services: [
    { title: 'Food', text: "Restoran va kafelardan issiq taomlar, tez va qadoqlangan holda.", tag: '25–40 daqiqa', img: U('1513104890138-7c749659a591', 1200), fb: '🍔', href: '#restaurants', cat: '' },
    { title: 'Grocery', text: "Sabzavot, mevalar va kundalik mahsulotlar uyingizgacha.", tag: '30–50 daqiqa', img: U('1542838132-92c53300491e'), fb: '🥬', href: '#products', cat: 'Market' },
    { title: 'Express', text: "Hujjat, sovg'a yoki dori-darmon. Shoshilinch buyurtmalar uchun.", tag: '15–20 daqiqa', img: U('1526367790999-0150786686a2'), fb: '⚡', href: '#popular', cat: '' }
  ],
  categories: ['Hammasi', 'Burger', 'Pizza', 'Milliy', 'Sushi', 'Shirinlik'],
  restaurants: [
    { name: 'Burger Yard', cat: 'Burger', rating: 4.8, time: '20–30', fee: 'Bepul', price: "35 000", tag: 'Mashhur', img: U('1568901346375-23c9450c58cd'), fb: '🍔' },
    { name: 'Pizza Forno', cat: 'Pizza', rating: 4.7, time: '25–35', fee: "8 000", price: "55 000", tag: '-20%', img: U('1513104890138-7c749659a591'), fb: '🍕' },
    { name: 'Osh Markazi', cat: 'Milliy', rating: 4.9, time: '30–40', fee: 'Bepul', price: "40 000", tag: 'Top 1', img: U('1512058564366-18510be2db19'), fb: '🍛' },
    { name: 'Sushi Oka', cat: 'Sushi', rating: 4.6, time: '35–45', fee: "10 000", price: "75 000", tag: 'Yangi', img: U('1579871494447-9811cf80d66c'), fb: '🍣' },
    { name: 'Grill House', cat: 'Milliy', rating: 4.7, time: '25–35', fee: "6 000", price: "50 000", tag: 'Mashhur', img: U('1555939594-58d7cb561ad1'), fb: '🍢' },
    { name: 'Sweet Corner', cat: 'Shirinlik', rating: 4.8, time: '20–30', fee: 'Bepul', price: "30 000", tag: 'Yangi', img: U('1565958011703-44f9829ba187'), fb: '🍰' }
  ],
  products: [
    ["p01", "Cheeseburger", "Fast Food", 38000, "Mol go'shti kotleti, cheddar pishlog'i, yangi salat va maxsus sous.", "1550547660-d9450f859349", "🍔", 1],
    ["p02", "Double burger", "Fast Food", 52000, "Ikki kotlet, ikki qavat pishloq va karamellangan piyoz.", "1568901346375-23c9450c58cd", "🍔", 0],
    ["p03", "Kartoshka fri", "Fast Food", 18000, "Qarsildoq kartoshka, dengiz tuzi va pishloqli sous bilan.", "1573080496219-bb080dd4f877", "🍟", 0],
    ["p04", "Tovuq qanotchalari", "Fast Food", 44000, "Achchiq-shirin sousda qovurilgan 8 dona qanotcha.", "1567620832903-9fc6debc209f", "🍗", 0],
    ["p05", "Margherita", "Pizza", 62000, "Pomidor sousi, mozzarella va yangi rayhon. 32 sm.", "1565299624946-b28f40a0ae38", "🍕", 1],
    ["p06", "Pepperoni", "Pizza", 72000, "Achchiq pepperoni va ko'p miqdorda eritilgan mozzarella. 32 sm.", "1513104890138-7c749659a591", "🍕", 0],
    ["p07", "To'rt pishloq", "Pizza", 78000, "Mozzarella, parmezan, gorgonzola va cheddar uyg'unligi. 32 sm.", "1574071318508-1cdbab80d002", "🧀", 0],
    ["p08", "Filadelfiya roll", "Sushi", 68000, "Losos, qaymoqli pishloq va bodring, 8 bo'lak.", "1617196034796-73dfa7b1fd56", "🍣", 1],
    ["p09", "Sushi to'plami", "Sushi", 118000, "24 bo'lak assorti: nigiri, roll va maki. Ikki kishilik.", "1579871494447-9811cf80d66c", "🍱", 0],
    ["p10", "Limonad", "Ichimliklar", 16000, "Limon va yalpizli uy limonadi, 0.5 l.", "1621263764928-df1444c5e859", "🍋", 0],
    ["p11", "Muzli kofe", "Ichimliklar", 22000, "Sovuq dam olingan espresso, sut va muz.", "1461023058943-07fcbe16d735", "☕", 0],
    ["p12", "Mevali smuzi", "Ichimliklar", 26000, "Banan, qulupnay va yogurtdan, qand qo'shilmagan.", "1553530666-ba11a7da3888", "🥤", 0],
    ["p13", "Yangi sabzavotlar", "Market", 28000, "Pomidor, bodring, bolgar qalampiri va ko'katlar, 2 kg.", "1542838132-92c53300491e", "🥕", 0],
    ["p14", "Mavsumiy mevalar", "Market", 45000, "Olma, nok va uzum, fermer bog'idan, 2 kg.", "1488459716781-31db52582fe9", "🍎", 0],
    ["p15", "Tandir non", "Market", 6000, "Ertalab yopilgan, issiq holda yetkaziladi.", "1509440159596-0249088772ff", "🥖", 0],
    ["p16", "Shokoladli tort", "Shirinliklar", 29000, "Belgiya shokoladli nam biskvit, bir bo'lak.", "1565958011703-44f9829ba187", "🍰", 1],
    ["p17", "Pancake to'plami", "Shirinliklar", 32000, "Besh dona yumshoq pancake, asal va mevalar bilan.", "1567620905732-2d1ec7ab7445", "🥞", 0],
    ["p18", "Donat", "Shirinliklar", 14000, "Glazurli va rangli sepmali yumshoq donat.", "1551024506-0bccd828d307", "🍩", 0]
  ].map(([id, name, cat, price, desc, img, fb, pop]) => ({ id, name, cat, price, desc, img: U(img), fb, pop: !!pop }))
};
