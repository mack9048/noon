// Choose a picture (logo, thumbnail) and add it to a FormData for upload.
import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

export type Picked = DocumentPicker.DocumentPickerAsset;

/** Opens the file chooser for an image. Returns null when cancelled; throws a friendly message when too big. */
export async function pickImage(maxMb = 2): Promise<Picked | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'], copyToCacheDirectory: true });
  const file = r.canceled ? null : r.assets[0];
  if (file?.size && file.size > maxMb * 1024 * 1024) throw new Error(`The picture is over ${maxMb} MB. Please choose a smaller one.`);
  return file;
}

export function appendFile(fd: FormData, field: string, file: Picked) {
  if (Platform.OS === 'web' && (file as any).file) fd.append(field, (file as any).file);
  else fd.append(field, { uri: file.uri, name: file.name, type: file.mimeType ?? 'image/png' } as any);
}
