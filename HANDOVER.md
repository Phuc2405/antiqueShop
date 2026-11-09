# HANDOVER — Giỏ hàng & đặt hàng

_Cập nhật: 2026-11-09_

## Phạm vi sản phẩm

- **Một cửa hàng duy nhất.** Không làm nhiều người bán (multi-vendor). `products` không có `seller_id`.
  Role `seller` là trợ lý của chủ tiệm, có quyền quản lý **toàn bộ** sản phẩm và đơn hàng như admin
  (trừ trang `/admin/*`).
- **Thanh toán cả giỏ.** Không có tính năng chọn từng món để đặt: `CheckoutModal` gửi toàn bộ giỏ,
  muốn mua một phần thì phải bỏ bớt món khỏi giỏ.

## Cách giỏ hàng hoạt động

| Nơi lưu | Vai trò |
|---|---|
| `localStorage['hcq-cart']` (`src/stores/cart.store.ts`) | Giỏ trên trình duyệt: `items`, `checkoutId` (chống đặt trùng), `ownerId` |
| Bảng `cart_items` (RPC `replace_cart`) | Giỏ cố định của tài khoản, đồng bộ giữa các thiết bị |

`ownerId` cho biết giỏ trên máy thuộc về ai: `null` = giỏ khách, uuid = giỏ đã đồng bộ với tài khoản đó.
`src/hooks/useCartSync.ts` (gắn một lần ở `AppShell`) quyết định như sau, sau khi auth khởi tạo xong:

| Tình huống | `ownerId` trên máy | Xử lý |
|---|---|---|
| Khách chưa đăng nhập | `null` | Giỏ chỉ ở localStorage |
| Khách **vừa đăng nhập** | `null` | **Gộp** giỏ khách và giỏ server, món trùng lấy số lượng lớn hơn (tối đa bằng tồn kho), rồi đẩy lên server |
| Tải lại trang hoặc mở tab mới khi đang đăng nhập | = user hiện tại | **Lấy giỏ server làm chuẩn** (adopt) |
| Máy dùng chung, người khác đăng nhập | = user khác | Bỏ giỏ cũ, lấy giỏ server của người mới |
| Đang đăng nhập và sửa giỏ | = user | Đẩy cả giỏ lên server (debounce 700ms) |
| Đăng xuất, hoặc phiên hết hạn trong lúc đóng trình duyệt | còn uuid | Xoá giỏ trên máy, `ownerId` = `null` |

Sau mỗi lần gộp hoặc adopt, hệ thống đối chiếu tồn kho và giá của **toàn bộ** giỏ. Món nào bị bỏ hoặc giảm
số lượng thì báo bằng toast. Nếu tải giỏ server bị lỗi, giỏ trên máy giữ nguyên và **không** được đẩy lên
(tránh ghi đè dữ liệu server bằng dữ liệu cũ).

**Ví dụ:** khách có 5 món, tài khoản có 3 món. Nếu không trùng món nào thì giỏ có 8 món. Nếu trùng 2 món
thì giỏ có 6 món, và 2 món trùng lấy số lượng lớn hơn.

## Các tình huống đã rà soát và đã xử lý

| # | Tình huống | Vấn đề trước đây | Đã xử lý |
|---|---|---|---|
| 1 | Gộp giỏ khi đăng nhập | Món trên server bị ẩn hoặc hết hàng thì bị bỏ **mà không báo**. Món trong giỏ khách không được kiểm tra tồn kho lúc gộp | `fromServer()` trả về danh sách thay đổi. Sau khi gộp thì gọi `reconcile` cho cả giỏ, rồi báo bằng toast. `mergeServer` cũng báo khi số lượng trong giỏ khách bị giảm vì vượt tồn kho (lỗi này bộ test phát hiện ra) |
| 2 | Nhiều thiết bị | Mỗi lần tải lại trang đều **gộp** lại giỏ theo kiểu lấy số lớn hơn, nên món đã xoá hoặc đã giảm ở máy khác **quay lại**, và món đã đặt ở máy A quay lại giỏ khi máy B tải lại | Thêm `ownerId`. Tải lại trang khi đang đăng nhập thì **lấy giỏ server làm chuẩn**. Chỉ gộp khi giỏ trên máy là giỏ khách |
| 3 | Tồn kho hoặc giá đổi | Trang Giỏ chỉ đối chiếu một lần lúc mở trang, có thể chạy **trước** khi gộp xong, nên món mới gộp chưa được kiểm tra | `useCartSync` tự đối chiếu sau khi gộp hoặc adopt. `place_order` ở server vẫn là chốt chặn cuối (khoá dòng, kiểm tra tồn kho, tự tính giá) |
| 4 | Đặt hàng xong | Server **không** xoá `cart_items`, chỉ dựa vào client đẩy giỏ rỗng sau 700ms. Đóng tab sớm thì món đã mua còn trên server và quay lại ở lần đăng nhập sau | Migration `0003_cart_cleanup_on_order.sql`: `place_order` xoá các món vừa mua khỏi `cart_items` **trong cùng giao dịch** với việc tạo đơn |
| 5 | Đăng xuất | Đã ổn. Chỗ hở nhỏ: phiên hết hạn trong lúc đóng trình duyệt thì giỏ của user cũ nằm lại thành giỏ khách | Giờ `ownerId` còn mà không có phiên thì xoá giỏ trên máy |
| 6 | Nhiều tab cùng trình duyệt | Đã ổn (sự kiện `storage` nạp lại giỏ từ localStorage) | `ownerId` được lưu cùng giỏ nên các tab thống nhất với nhau |

Vẫn giữ như cũ và đã kiểm tra là đúng: bấm Đặt hai lần hoặc mất mạng rồi thử lại vẫn chỉ ra **1 đơn**
(nhờ `client_request_id`); không bán vượt tồn kho khi hai người đặt cùng lúc (`SELECT … FOR UPDATE`);
tối đa 5 đơn `pending` mỗi người; tài khoản bị khoá không đặt được đơn (trigger `guard_order_insert`).

## Giới hạn còn lại (chấp nhận, chưa làm)

- **Không có realtime cho giỏ.** Hai thiết bị đang **mở cùng lúc** thì máy nào lưu sau sẽ ghi đè cả giỏ,
  vì `replace_cart` thay toàn bộ. Máy B chỉ thấy thay đổi từ máy A khi tải lại trang hoặc mở tab mới.
- **Giá đổi đúng lúc đang đặt:** server lấy giá mới mà không báo lỗi. Người mua thấy tổng tiền khác trong đơn.
- **Đổi giỏ rồi đăng xuất trong vòng dưới 700ms** thì thay đổi cuối cùng không kịp lưu lên server.
- Giỏ lưu từ phiên bản cũ (localStorage v1, chưa có `ownerId`) được coi là giỏ khách, nên lần đăng nhập
  đầu tiên sau khi cập nhật sẽ **gộp** giỏ (đúng như hành vi cũ). Từ lần sau thì chạy theo quy tắc mới.

## Các file đã sửa hoặc thêm

- `supabase/migrations/0003_cart_cleanup_on_order.sql` (mới): `place_order` xoá món đã mua khỏi `cart_items`.
- `supabase/seed_test_users.sql` (mới): dữ liệu test (xem bên dưới).
- `src/stores/cart.store.ts`: thêm `ownerId`, `adoptServer`, `resetForGuest`, helper `fromServer`.
  `mergeServer` giờ trả về danh sách thay đổi. Phiên bản persist nâng lên 2 kèm `migrate`.
- `src/hooks/useCartSync.ts`: viết lại theo bảng quyết định ở trên.
- `README.md`: thêm 2 file SQL mới vào bước cài đặt.
- `tests/cart-scenarios/` (mới) và script `test:cart` trong `package.json`: bộ test kịch bản giỏ hàng.

## Triển khai

1. Chạy `supabase/migrations/0003_cart_cleanup_on_order.sql` trong SQL Editor. **Bắt buộc**, nếu không thì
   tình huống 4 vẫn còn lỗi.
2. Nếu cần dữ liệu test: chạy `supabase/seed_test_users.sql`. Chạy lại lúc nào cũng được, mỗi lần chạy sẽ
   đưa dữ liệu test về trạng thái ban đầu.
3. Build và deploy frontend như bình thường.

## Test tự động: `npm run test:cart`

File `tests/cart-scenarios/run.mjs` chạy `useCartSync` và `cart.store` **thật** qua Vite SSR. Mỗi "thiết bị"
là một instance riêng, có localStorage riêng. Supabase được mock bằng một DB giả dùng chung (giả lập
`replace_cart`, RLS ẩn sản phẩm, và `place_order` bản 0003). Không cần Supabase hay trình duyệt để chạy.

Kết quả ngày 2026-11-09: **31/31 PASS**. Bộ test phủ:
- Gộp giỏ, báo món bị bỏ hoặc giảm số lượng.
- Xoá món ở máy A rồi máy B tải lại: món không quay lại.
- Auth đang loading thì không xoá nhầm giỏ.
- Đặt hàng rồi đóng tab ngay, chạy cả trường hợp có và không có 0003 để so sánh.
- Đăng xuất, phiên hết hạn, máy dùng chung, đổi tài khoản.
- Lỗi mạng thì không ghi đè giỏ server.
- Giỏ lưu từ bản cũ (persist v1).

**Chưa test được:** đồng bộ nhiều tab (cần `window`), giao diện thật và SQL thật trên Supabase. Hai phần sau
phải test thủ công theo checklist bên dưới.

## Dữ liệu test và checklist kiểm thử thủ công

Tài khoản (mật khẩu `Test@12345`): `buyer.test@example.com` (giỏ server có sẵn T1×1, T2×2, T3×1) và
`seller.test@example.com` (role seller). Các sản phẩm `[TEST]`: T4 nằm ngoài giỏ, T5 hết hàng, T6 đang ẩn.
Cuối file seed có lệnh để đổi email, mật khẩu và role. Nếu đổi email bằng SQL thì phải đổi **cả**
`profiles.email`.

- [ ] **Gộp giỏ:** ở chế độ khách, thêm T1×2 và T4×1, rồi đăng nhập buyer.test. Giỏ phải có 4 món, trong đó
  T1×2 và T2×2. Bảng `cart_items` cũng phải khớp.
- [ ] **Báo món bị bỏ:** chạy lại seed, rồi đổi T2 thành `is_published = false`. Đăng nhập buyer.test thì
  phải có toast báo T2 bị bỏ khỏi giỏ.
- [ ] **Nhiều thiết bị:** đăng nhập buyer.test ở Chrome thường và Chrome ẩn danh. Xoá T3 ở bên A, tải lại
  bên B thì T3 **không** được quay lại.
- [ ] **Đặt hàng:** đặt ở bên A, rồi đóng tab ngay lập tức. Kiểm tra `cart_items` phải không còn các món đó.
  Tải lại bên B thì giỏ cũng phải trống.
- [ ] **Đặt trùng:** bấm Xác nhận liên tục nhiều lần, chỉ được tạo 1 đơn.
- [ ] **Tồn kho:** khi đang có giỏ, giảm `stock` trong DB, rồi bấm đặt. Phải hiện lỗi và giỏ được điều chỉnh lại.
- [ ] **Đăng xuất:** sau khi đăng xuất, giỏ trên máy phải trống và banner khách hiện ra. Đăng nhập lại thì
  giỏ server quay về.
- [ ] **Máy dùng chung:** đăng nhập user A, đăng xuất, rồi đăng nhập user B. Giỏ của B không được lẫn món
  của A.
- [ ] **Nhiều tab:** mở 2 tab, thêm món ở tab 1 thì tab 2 phải tự cập nhật.
