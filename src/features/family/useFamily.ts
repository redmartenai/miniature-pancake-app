import { useQuery } from '@tanstack/react-query';
import { create } from 'zustand';

import { api } from '@/api/endpoints';
import type { StudentCard } from '@/api/types';
import { useSession } from '@/state/session';

const useSelectedChild = create<{ childId?: string; select: (id: string) => void }>((set) => ({
  select: (childId) => set({ childId }),
}));

/**
 * The student(s) a family account looks at: a parent's children, or a student's own record.
 * The selected child is shared across tabs, so switching on Home also switches Bus and More.
 */
export function useFamily() {
  const role = useSession((s) => s.role);
  const schoolId = useSession((s) => s.schoolId);
  const children = useQuery({
    queryKey: ['children', schoolId],
    queryFn: api.children,
    enabled: role === 'parent',
  });
  const self = useQuery({
    queryKey: ['student-me', schoolId],
    queryFn: api.studentMe,
    enabled: role === 'student',
  });
  const { childId, select } = useSelectedChild();

  const students: StudentCard[] = role === 'parent' ? (children.data?.children ?? []) : self.data ? [self.data] : [];
  const selected = students.find((s) => s.id === childId) ?? students[0];
  const active = role === 'parent' ? children : self;

  return {
    students,
    selected,
    select,
    isParent: role === 'parent',
    isLoading: active.isLoading,
    error: active.error,
    refetch: active.refetch,
  };
}
