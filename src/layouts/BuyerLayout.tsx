import { Outlet } from 'react-router-dom';
import { RoleGate } from './RoleGate';

/**
 * Khu vực của khách đã đăng nhập (mọi role đều có tư cách người mua).
 * Lồng bên trong GuestLayout → giữ nguyên header/footer cửa hàng.
 */
export function BuyerLayout() {
  return (
    <RoleGate>
      <Outlet />
    </RoleGate>
  );
}
