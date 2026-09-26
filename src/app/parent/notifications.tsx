import { FamilyNotifications } from '@/features/common/FamilyNotifications';

/** ParentNotifications: everything the school sent, by day, filterable, with the bus shortcut. */
export default function ParentNotifications() {
  return <FamilyNotifications base="/parent" />;
}
