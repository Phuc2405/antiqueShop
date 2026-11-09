import { lazy } from 'react';
import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/layouts/AppShell';
import { GuestLayout } from '@/layouts/GuestLayout';
import { BuyerLayout } from '@/layouts/BuyerLayout';
import { SellerLayout } from '@/layouts/SellerLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { ComingSoonPage, NotFoundPage } from '@/pages/StaticPages';

// Code-split theo trang → bundle đầu nhẹ cho mobile; khách thường không tải code dashboard.
const HomePage = lazy(() => import('@/pages/HomePage'));
const ShopPage = lazy(() => import('@/pages/ShopPage'));
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage'));
const CartPage = lazy(() => import('@/pages/CartPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const ProfilePage = lazy(() => import('@/pages/ProfilePage'));

const SellerProductsPage = lazy(() => import('@/pages/seller/SellerProductsPage'));
const SellerOrdersPage = lazy(() => import('@/pages/seller/SellerOrdersPage'));
const SellerSalesPage = lazy(() => import('@/pages/seller/SellerSalesPage'));
const SellerReviewsPage = lazy(() => import('@/pages/seller/SellerReviewsPage'));

const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'));
const AdminModerationPage = lazy(() => import('@/pages/admin/AdminModerationPage'));
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminSettingsPage'));

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      // ---- Cửa hàng: Guest xem tự do ----
      {
        element: <GuestLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'shop', element: <ShopPage /> },
          { path: 'shop/:id', element: <ProductDetailPage /> },
          { path: 'cart', element: <CartPage /> },
          { path: 'checkout', element: <Navigate to="/cart?checkout=1" replace /> },
          { path: 'about', element: <ComingSoonPage title="Câu chuyện" /> },
          { path: 'contact', element: <ContactPage /> },
          { path: 'login', element: <LoginPage /> },
          // ---- Buyer: cần đăng nhập ----
          {
            element: <BuyerLayout />,
            children: [
              { path: 'profile', element: <ProfilePage /> },
              { path: 'orders', element: <Navigate to="/profile" replace /> },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      // ---- Chủ tiệm: seller | admin ----
      {
        path: 'seller',
        element: <SellerLayout />,
        children: [
          { index: true, element: <Navigate to="products" replace /> },
          { path: 'products', element: <SellerProductsPage /> },
          { path: 'orders', element: <SellerOrdersPage /> },
          { path: 'sales', element: <SellerSalesPage /> },
          { path: 'reviews', element: <SellerReviewsPage /> },
        ],
      },
      // ---- Quản trị: chỉ admin ----
      {
        path: 'admin',
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="users" replace /> },
          { path: 'users', element: <AdminUsersPage /> },
          { path: 'moderation', element: <AdminModerationPage /> },
          { path: 'settings', element: <AdminSettingsPage /> },
        ],
      },
    ],
  },
]);
