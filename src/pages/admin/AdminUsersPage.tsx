import { useMemo, useState } from 'react';
import { Lock, LockOpen, Search } from 'lucide-react';
import { DashHeader } from '@/layouts/DashboardShell';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/StatusBadge';
import { useFetch } from '@/hooks/useFetch';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/cn';
import { toAppError } from '@/lib/errors';
import { userService } from '@/services/user.service';
import { useAuthStore, selectUserId } from '@/stores/auth.store';
import { confirmDialog } from '@/stores/confirm.store';
import { toast } from '@/stores/toast.store';
import { ROLE_LABEL, type Profile, type UserRole } from '@/types/domain';

const ROLES: UserRole[] = ['buyer', 'seller', 'admin'];

export default function AdminUsersPage() {
  const me = useAuthStore(selectUserId);
  const { data, loading, error, setData } = useFetch(() => userService.list(), []);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all' | 'blocked'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const users = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((u) => {
      if (q && !`${u.email} ${u.full_name ?? ''} ${u.phone ?? ''}`.toLowerCase().includes(q)) return false;
      if (roleFilter === 'blocked') return u.is_blocked;
      return roleFilter === 'all' || u.role === roleFilter;
    });
  }, [data, query, roleFilter]);

  const apply = async (u: Profile, fn: () => Promise<Profile>, ok: string) => {
    setBusyId(u.id);
    try {
      const saved = await fn();
      setData((prev) => prev?.map((x) => (x.id === saved.id ? saved : x)));
      toast.success(ok);
    } catch (err) {
      toast.error(toAppError(err).message);
    } finally {
      setBusyId(null);
    }
  };

  const changeRole = async (u: Profile, role: UserRole) => {
    if (role === u.role) return;
    if (role === 'admin') {
      const yes = await confirmDialog({
        title: `Cấp quyền Quản trị cho ${u.email}?`,
        message: 'Quản trị viên có toàn quyền: đổi quyền người khác, khoá tài khoản, xoá nội dung và sửa cấu hình tiệm.',
        confirmLabel: 'Cấp quyền',
        danger: true,
      });
      if (!yes) return;
    }
    void apply(u, () => userService.setRole(u.id, role), `Đã đổi ${u.email} thành ${ROLE_LABEL[role]}.`);
  };

  const toggleBlock = async (u: Profile) => {
    if (!u.is_blocked) {
      const yes = await confirmDialog({
        title: `Khoá tài khoản ${u.email}?`,
        message: 'Người dùng sẽ bị đăng xuất ở lần tải trang tới và không thể đặt hàng, đánh giá hay thả tim.',
        confirmLabel: 'Khoá tài khoản',
        danger: true,
      });
      if (!yes) return;
    }
    void apply(u, () => userService.setBlocked(u.id, !u.is_blocked), u.is_blocked ? 'Đã mở khoá tài khoản.' : 'Đã khoá tài khoản.');
  };

  const counts = (k: UserRole | 'all' | 'blocked') =>
    (data ?? []).filter((u) => (k === 'all' ? true : k === 'blocked' ? u.is_blocked : u.role === k)).length;

  return (
    <>
      <DashHeader title="Quản lý người dùng" description="Phân quyền và khoá / mở khoá tài khoản." />

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block lg:w-80">
          <span className="sr-only">Tìm người dùng</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Email, tên, SĐT…" className="field pl-9" />
        </label>
        <div className="flex flex-wrap gap-2">
          {(['all', ...ROLES, 'blocked'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setRoleFilter(k)}
              aria-pressed={roleFilter === k}
              className={cn(
                'border px-3 py-1.5 text-sm',
                roleFilter === k ? 'border-ink bg-ink text-paper' : 'border-surface-line text-ink-soft hover:text-ink',
              )}
            >
              {k === 'all' ? 'Tất cả' : k === 'blocked' ? 'Bị khoá' : ROLE_LABEL[k]} ({counts(k)})
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <ListSkeleton rows={6} />
      ) : error ? (
        <EmptyState tone="error" title="Không tải được người dùng" description={error.message} />
      ) : users.length === 0 ? (
        <EmptyState title="Không có tài khoản phù hợp" />
      ) : (
        <div className="overflow-x-auto border border-surface-line">
          <table className="w-full min-w-[44rem] text-sm">
            <thead className="bg-paper-deep text-left text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Tài khoản</th>
                <th className="px-4 py-3 font-medium">Ngày tạo</th>
                <th className="px-4 py-3 font-medium">Vai trò</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-line">
              {users.map((u) => {
                const self = u.id === me;
                return (
                  <tr key={u.id} className={cn('bg-surface/40', busyId === u.id && 'opacity-60')}>
                    <td className="px-4 py-3">
                      <p className="font-serif text-base text-ink">
                        {u.full_name ?? '—'} {self && <Badge tone="brass">Bạn</Badge>}
                      </p>
                      <p className="text-ink-soft">{u.email}</p>
                      {u.phone && <p className="text-ink-faint">{u.phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={self || busyId === u.id}
                        onChange={(e) => void changeRole(u, e.target.value as UserRole)}
                        className="field w-auto py-1.5"
                        aria-label={`Vai trò của ${u.email}`}
                        title={self ? 'Không thể tự đổi quyền của chính mình' : undefined}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {u.is_blocked ? <Badge tone="danger">Đã khoá</Badge> : <Badge tone="success">Hoạt động</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!self && (
                        <Button size="sm" variant={u.is_blocked ? 'outline' : 'danger'} onClick={() => void toggleBlock(u)} disabled={busyId === u.id}>
                          {u.is_blocked ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                          {u.is_blocked ? 'Mở khoá' : 'Khoá'}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
