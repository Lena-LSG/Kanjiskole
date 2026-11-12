import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

export async function pickText(): Promise<string | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: ["application/json", "text/plain", "*/*"], copyToCacheDirectory: true });
  if (r.canceled || !r.assets[0]) return null;
  return new File(r.assets[0].uri).text();
}

export async function saveText(name: string, text: string): Promise<void> {
  const f = new File(Paths.cache, name);
  if (f.exists) f.delete();
  f.create();
  await f.write(text); // async since SDK 58: finish writing before the share sheet reads it
  await Sharing.shareAsync(f.uri, { mimeType: "application/json", dialogTitle: name });
}
