// Chạy: npm run test:cart
// Test kịch bản giỏ hàng: mỗi "thiết bị" = 1 Vite SSR instance (module + localStorage riêng),
// "server" Supabase = DB giả dùng chung trên globalThis.__db.
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROJ = path.resolve(HERE, '../..').replaceAll('\\', '/');
const MOCKS = path.join(HERE, 'mocks', 'all.ts').replaceAll('\\', '/');
const MOCK_REACT = path.join(HERE, 'mocks', 'react.ts').replaceAll('\\', '/');
const { createServer } = await import(pathToFileURL(`${PROJ}/node_modules/vite/dist/node/index.js`).href);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flush = async () => { for (let i = 0; i < 10; i++) await sleep(5); };

// ---------------- DB giả ----------------
const P = (n, stock, extra = {}) => ({
  id: `p${n}`, title: `Món ${n}`, price: n * 100000, stock, image_url: [], era_origin: null, is_published: true, ...extra,
});
function resetDb() {
  globalThis.__db = {
    products: new Map([P(1, 3), P(2, 2), P(3, 5), P(4, 4), P(5, 0), P(6, 1, { is_published: false })].map((p) => [p.id, p])),
    carts: new Map([['buyer', new Map([['p1', 1], ['p2', 2], ['p3', 1]])]]),
    pushes: 0,
    failFetch: false,
  };
}
const db = () => globalThis.__db;
const serverCart = (uid) => Object.fromEntries(db().carts.get(uid) ?? []);
/** Giả lập place_order (bản 0003): trừ kho + xoá món đã mua khỏi cart_items, trong cùng "transaction". */
function placeOrder(uid, items, { migration0003 = true } = {}) {
  for (const i of items) {
    const p = db().products.get(i.product_id);
    if (!p || !p.is_published) throw new Error('PRODUCT_UNAVAILABLE');
    if (p.stock < i.quantity) throw new Error('INSUFFICIENT_STOCK');
  }
  for (const i of items) db().products.get(i.product_id).stock -= i.quantity;
  if (migration0003) for (const i of items) db().carts.get(uid)?.delete(i.product_id);
}

// ---------------- Thiết bị ----------------
globalThis.__auth = {};
globalThis.__toasts = [];
const servers = [];

function memoryStorage(seed = {}) {
  const m = new Map(Object.entries(seed));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    dump: () => JSON.parse(m.get('hcq-cart') ?? 'null'),
    raw: m,
  };
}

let seq = 0;
/** Mở app trên 1 thiết bị (= tải trang). `storage` giữ lại giữa các lần tải để mô phỏng reload. */
async function openApp(name, storage, { userId = null, status = 'ready' } = {}) {
  const dev = `${name}#${seq++}`;
  globalThis.__loadingDevice = dev;
  globalThis.__auth[dev] = { userId, status };
  globalThis.localStorage = storage;
  const server = await createServer({
    configFile: false,
    root: PROJ,
    logLevel: 'error',
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
    resolve: {
      alias: [
        { find: /^@\/(lib\/supabase|services\/cart\.service|services\/product\.service|stores\/auth\.store|stores\/toast\.store)$/, replacement: MOCKS },
        { find: /^react$/, replacement: MOCK_REACT },
        { find: /^@\//, replacement: `${PROJ}/src/` },
      ],
    },
  });
  servers.push(server);
  const react = await server.ssrLoadModule(MOCK_REACT);
  const { useCartSync } = await server.ssrLoadModule('/src/hooks/useCartSync.ts');
  const { useCartStore } = await server.ssrLoadModule('/src/stores/cart.store.ts');
  const render = () => { react.__beginRender(); useCartSync(); };
  render();
  await flush();
  return {
    store: useCartStore,
    items: () => Object.fromEntries(useCartStore.getState().items.map((i) => [i.productId, i.quantity])),
    owner: () => useCartStore.getState().ownerId,
    setAuth: async (patch) => { Object.assign(globalThis.__auth[dev], patch); render(); await flush(); },
    close: () => react.__unmount(), // đóng tab: huỷ debounce đang chờ
    add: (id, qty = 1) => useCartStore.getState().add({ ...db().products.get(id), image_url: [] }, qty),
  };
}

// ---------------- Kiểm tra ----------------
const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push({ ok, name, actual, expected });
}
const sortObj = (o) => Object.fromEntries(Object.entries(o).sort());

// 1. Gộp giỏ khi khách đăng nhập
{
  resetDb(); globalThis.__toasts = [];
  const lsA = memoryStorage();
  const A = await openApp('A', lsA);
  A.add('p1', 2); A.add('p4', 1); A.add('p2', 1); A.add('p3', 1); A.add('p5', 1); // p5 hết hàng → không thêm được
  check('1a. giỏ khách trước khi đăng nhập', sortObj(A.items()), { p1: 2, p2: 1, p3: 1, p4: 1 });
  await A.setAuth({ userId: 'buyer' });
  check('1b. gộp: món trùng lấy số lớn hơn', sortObj(A.items()), { p1: 2, p2: 2, p3: 1, p4: 1 });
  check('1c. ownerId = buyer sau khi gộp', A.owner(), 'buyer');
  check('1d. server nhận bản gộp', sortObj(serverCart('buyer')), { p1: 2, p2: 2, p3: 1, p4: 1 });
  check('1e. không có toast khi không có gì bị bỏ', globalThis.__toasts.length, 0);
  A.close();
}

// 1'. Món bị ẩn / hết hàng lúc gộp → có toast báo
{
  resetDb(); globalThis.__toasts = [];
  const A = await openApp('A', memoryStorage());
  A.add('p4', 1); A.add('p3', 5);
  db().products.get('p2').is_published = false; // món trong giỏ server bị ẩn
  db().products.get('p3').stock = 2; // món trong giỏ khách bị giảm tồn kho
  db().products.get('p4').stock = 0; // món trong giỏ khách hết hàng
  await A.setAuth({ userId: 'buyer' });
  check("1'a. bỏ món ẩn/hết hàng, giảm theo tồn kho", sortObj(A.items()), { p1: 1, p3: 2 });
  const t = globalThis.__toasts.join(' | ');
  check("1'b. toast nhắc tới Món 2 (ẩn), Món 3 (giảm), Món 4 (hết)", ['Món 2', 'Món 3', 'Món 4'].every((x) => t.includes(x)), true);
  results.at(-1).actual = t;
  A.close();
}

// 2. Nhiều thiết bị: xoá ở A, B tải lại → món không quay lại
{
  resetDb(); globalThis.__toasts = [];
  const lsA = memoryStorage(), lsB = memoryStorage();
  const A = await openApp('A', lsA, { userId: 'buyer' });
  const B = await openApp('B', lsB, { userId: 'buyer' });
  check('2a. B mở lần đầu thấy giỏ server', sortObj(B.items()), { p1: 1, p2: 2, p3: 1 });
  B.close();
  A.store.getState().remove('p3');
  A.store.getState().setQuantity('p2', 1);
  await sleep(800); // debounce 700ms
  check('2b. server đã nhận thay đổi của A', sortObj(serverCart('buyer')), { p1: 1, p2: 1 });
  const B2 = await openApp('B', lsB, { userId: 'buyer' }); // B tải lại, localStorage B vẫn còn p3, p2×2
  check('2c. B tải lại: p3 KHÔNG quay lại, p2 giữ số mới', sortObj(B2.items()), { p1: 1, p2: 1 });
  await sleep(800);
  check('2d. server không bị B ghi đè ngược', sortObj(serverCart('buyer')), { p1: 1, p2: 1 });
  A.close(); B2.close();
}

// 3. Tải lại khi đang đăng nhập: auth đang 'loading' (userId tạm null) không được xoá nhầm giỏ
{
  resetDb();
  const ls = memoryStorage();
  const A = await openApp('A', ls, { userId: 'buyer' });
  A.close();
  const A2 = await openApp('A', ls, { userId: null, status: 'loading' });
  check('3a. lúc auth loading: giỏ trên máy còn nguyên', sortObj(A2.items()), { p1: 1, p2: 2, p3: 1 });
  check('3b. lúc auth loading: ownerId còn nguyên', A2.owner(), 'buyer');
  await A2.setAuth({ userId: 'buyer', status: 'ready' });
  check('3c. auth xong: lấy giỏ server', sortObj(A2.items()), { p1: 1, p2: 2, p3: 1 });
  A2.close();
}

// 4. Đặt hàng xong đóng tab ngay (trước 700ms) → giỏ server vẫn sạch nhờ 0003
for (const migration0003 of [false, true]) {
  resetDb();
  const lsA = memoryStorage(), lsB = memoryStorage();
  const B = await openApp('B', lsB, { userId: 'buyer' }); B.close(); // B từng mở, localStorage có giỏ cũ
  const A = await openApp('A', lsA, { userId: 'buyer' });
  const items = A.store.getState().items.map((i) => ({ product_id: i.productId, quantity: i.quantity }));
  placeOrder('buyer', items, { migration0003 });
  A.store.getState().clear();
  A.close(); // đóng tab ngay, debounce chưa kịp đẩy giỏ rỗng
  await sleep(800);
  const tag = migration0003 ? 'CÓ 0003' : 'KHÔNG 0003 (để so sánh)';
  check(`4a. [${tag}] giỏ server sau khi đặt`, sortObj(serverCart('buyer')), migration0003 ? {} : { p1: 1, p2: 2, p3: 1 });
  const B2 = await openApp('B', lsB, { userId: 'buyer' });
  check(`4b. [${tag}] B tải lại: món đã mua có quay lại?`, sortObj(B2.items()), migration0003 ? {} : { p1: 1, p3: 1 }); // p2 đã bán hết nên bị reconcile bỏ; p1, p3 'sống lại'
  check(`4c. [${tag}] tồn kho đã trừ`, db().products.get('p2').stock, 0);
  B2.close();
}

// 5. Đăng xuất + phiên hết hạn khi đóng trình duyệt
{
  resetDb();
  const ls = memoryStorage();
  const A = await openApp('A', ls, { userId: 'buyer' });
  await A.setAuth({ userId: null });
  check('5a. đăng xuất: giỏ trên máy trống', A.items(), {});
  check('5b. đăng xuất: ownerId = null', A.owner(), null);
  check('5c. đăng xuất: giỏ server giữ nguyên', sortObj(serverCart('buyer')), { p1: 1, p2: 2, p3: 1 });
  A.close();

  const ls2 = memoryStorage();
  const B = await openApp('B', ls2, { userId: 'buyer' }); B.close();
  const B2 = await openApp('B', ls2, { userId: null }); // mở lại, phiên đã hết hạn
  check('5d. phiên hết hạn: giỏ user cũ bị xoá khỏi máy', [B2.items(), B2.owner()], [{}, null]);
  B2.close();
}

// 6. Máy dùng chung
{
  resetDb();
  db().carts.set('user2', new Map([['p4', 1]]));
  const ls = memoryStorage();
  const A = await openApp('A', ls, { userId: 'buyer' });
  await A.setAuth({ userId: null });
  await A.setAuth({ userId: 'user2' });
  check('6a. đăng xuất rồi user2 đăng nhập: chỉ có giỏ user2', sortObj(A.items()), { p4: 1 });
  A.close();

  const ls2 = memoryStorage();
  const C = await openApp('C', ls2, { userId: 'buyer' }); C.close();
  const C2 = await openApp('C', ls2, { userId: 'user2' }); // đổi tài khoản không qua đăng xuất
  check('6b. ownerId khác user: không lẫn giỏ buyer', sortObj(C2.items()), { p4: 1 });
  check('6c. giỏ server buyer không bị dính món user2', sortObj(serverCart('buyer')), { p1: 1, p2: 2, p3: 1 });
  C2.close();
}

// 7. Lỗi mạng khi tải giỏ → giữ giỏ trên máy, không ghi đè server
{
  resetDb();
  const ls = memoryStorage();
  const A = await openApp('A', ls, { userId: 'buyer' }); A.close();
  db().failFetch = true;
  db().carts.set('buyer', new Map([['p1', 3]])); // server đổi ở thiết bị khác
  const pushesBefore = db().pushes;
  const A2 = await openApp('A', ls, { userId: 'buyer' });
  A2.store.getState().add({ ...db().products.get('p4'), image_url: [] }, 1);
  await sleep(800);
  check('7a. lỗi tải: không đẩy gì lên server', db().pushes - pushesBefore, 0);
  check('7b. server giữ nguyên', serverCart('buyer'), { p1: 3 });
  A2.close();
}

// 8. Giỏ lưu từ bản cũ (persist v1, chưa có ownerId) → coi là giỏ khách → gộp
{
  resetDb();
  const old = { state: { items: [{ productId: 'p4', title: 'Món 4', price: 400000, image: null, eraOrigin: null, maxStock: 4, quantity: 1 }], checkoutId: 'x' }, version: 1 };
  const ls = memoryStorage({ 'hcq-cart': JSON.stringify(old) });
  const A = await openApp('A', ls, { userId: 'buyer' });
  check('8a. v1 → gộp với giỏ server', sortObj(A.items()), { p1: 1, p2: 2, p3: 1, p4: 1 });
  check('8b. v1 → ownerId sau khi gộp', A.owner(), 'buyer');
  A.close();
}

await Promise.all(servers.map((s) => s.close()));
let fail = 0;
for (const r of results) {
  if (!r.ok) fail++;
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.ok ? '' : `\n      thực tế : ${JSON.stringify(r.actual)}\n      mong đợi: ${JSON.stringify(r.expected)}`}`);
}
console.log(`\n${results.length - fail}/${results.length} PASS`);
process.exit(fail ? 1 : 0);
