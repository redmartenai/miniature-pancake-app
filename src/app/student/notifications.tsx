import { FamilyNotifications } from '@/features/common/FamilyNotifications';

/** Student notifications: the same list as parents see, linking into the student app. */
export default function StudentNotifications() {
  return <FamilyNotifications base="/student" />;
}
