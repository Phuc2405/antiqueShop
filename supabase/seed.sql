-- Dữ liệu mẫu (tuỳ chọn). Ảnh dùng Unsplash — thay bằng ảnh thật trong bucket `product-images`.
insert into public.products (title, description, price, stock, era_origin, image_url) values
  ('Đồng hồ quả lắc Odo', 'Vỏ gỗ sồi, máy chạy tốt, mặt số men trắng nguyên bản.', 12500000, 1, 'Thập niên 1930 · Pháp',
   array['https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=900']),
  ('Máy ảnh Rolleiflex 2.8F', 'Ống kính Planar 80mm, màn trập êm, có bao da.', 28000000, 1, '1960 · Đức',
   array['https://images.unsplash.com/photo-1495121553079-4c61bcce1894?w=900']),
  ('Bình gốm men lam', 'Hoạ tiết hoa sen, không nứt, đáy có hiệu đề.', 6800000, 2, 'Cuối thế kỷ XIX · Việt Nam',
   array['https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=900']),
  ('Máy đánh chữ Olivetti', 'Phím chữ Latin, ruy-băng mới, hoạt động trơn tru.', 4200000, 3, 'Thập niên 1950 · Ý',
   array['https://images.unsplash.com/photo-1504691342899-4d92b50853e1?w=900']);
