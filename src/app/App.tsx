import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { router } from './router';
import { useAuthStore } from '@/stores/auth.store';

export function App() {
  const init = useAuthStore((s) => s.init);
  useEffect(() => init(), [init]); // trả về unsubscribe → an toàn với StrictMode mount 2 lần

  return (
    <MotionConfig reducedMotion="user">
      <RouterProvider router={router} />
    </MotionConfig>
  );
}
