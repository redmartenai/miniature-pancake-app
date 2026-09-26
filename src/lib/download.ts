import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { ApiError } from '@/api/client';
import { API_URL } from '@/lib/config';
import { useSession } from '@/state/session';

function authHeaders(): Record<string, string> {
  const { access, schoolId } = useSession.getState();
  const headers: Record<string, string> = {};
  if (access) headers.Authorization = `Bearer ${access}`;
  if (schoolId) headers['X-School-Id'] = schoolId;
  return headers;
}

/**
 * Download a protected file from the API (report cards, receipts, circulars, calendar invites).
 * Web: save through the browser. Phones: download to the cache and open the share sheet.
 * `path` is an API path such as "/fees/payments/<id>/receipt.pdf".
 */
export async function downloadFile(path: string, filename: string): Promise<void> {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  if (Platform.OS === 'web') {
    const response = await fetch(url, { headers: authHeaders() });
    if (!response.ok) throw new ApiError(response.status, 'download', "We couldn't download that file. Please try again.");
    const blob = await response.blob();
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
    return;
  }
  const folder = new Directory(Paths.cache, 'downloads');
  if (!folder.exists) folder.create({ intermediates: true });
  const target = new File(folder, filename);
  if (target.exists) target.delete();
  let file: File;
  try {
    file = await File.downloadFileAsync(url, target, { headers: authHeaders() });
  } catch {
    throw new ApiError(0, 'download', "We couldn't download that file. Check your connection and try again.");
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { dialogTitle: filename });
  }
}

/** Open a protected file to look at it: a new browser tab on the web, the share/preview sheet on phones. */
export async function openFile(path: string, filename: string): Promise<void> {
  if (Platform.OS !== 'web') return downloadFile(path, filename);
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  // Open the tab first (inside the tap) so pop-up blockers allow it, then fill it.
  const tab = window.open('', '_blank');
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) {
    tab?.close();
    throw new ApiError(response.status, 'download', "We couldn't open that file. Please try again.");
  }
  const href = URL.createObjectURL(await response.blob());
  if (tab) tab.location.href = href;
  else window.location.href = href;
}
