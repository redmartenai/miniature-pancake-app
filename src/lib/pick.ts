import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export type PickedFile = { uri: string; name: string; type: string; file?: File; size?: number };

/**
 * Let the user choose photos (gallery, several at once) or one PDF.
 * Returns null when they cancel; throws 'permission' when the gallery is off-limits.
 */
export async function pickFiles(kind: 'photo' | 'pdf', limit = 6): Promise<PickedFile[] | null> {
  if (kind === 'photo') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) throw new Error('permission');
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.8, selectionLimit: limit });
    if (picked.canceled) return null;
    return picked.assets.map((a, i) => ({ uri: a.uri, name: a.fileName ?? `photo-${i + 1}.jpg`, type: a.mimeType ?? 'image/jpeg', file: (a as { file?: File }).file }));
  }
  const picked = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
  if (picked.canceled || !picked.assets[0]) return null;
  const a = picked.assets[0];
  return [{ uri: a.uri, name: a.name, type: 'application/pdf', file: a.file }];
}

/** Append picked files to a multipart form: real Blobs on web, `{uri, name, type}` on native. */
export async function appendFiles(form: FormData, field: string, files: PickedFile[]) {
  for (const f of files) {
    if (Platform.OS === 'web') form.append(field, f.file ?? (await (await fetch(f.uri)).blob()), f.name);
    else form.append(field, { uri: f.uri, name: f.name, type: f.type } as unknown as Blob);
  }
}
