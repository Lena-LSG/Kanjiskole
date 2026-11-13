// Pick a text file and download one (import and export) in the browser.
import * as DocumentPicker from "expo-document-picker";

export async function pickText(): Promise<string | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: ["application/json", "text/plain"] });
  if (r.canceled || !r.assets[0]?.file) return null;
  return r.assets[0].file.text();
}

export function saveText(name: string, text: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return Promise.resolve(); // same signature as the native version, which really is async
}
