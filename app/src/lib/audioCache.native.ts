// Keep each recording on the phone after the first play, so it works offline from then on.
import { Directory, File, Paths } from "expo-file-system";
import { isOgg, recordingUrl } from "./recordings";

const dir = new Directory(Paths.document, "audio");

export async function localRecording(name: string): Promise<string> {
  const f = new File(dir, name);
  if (f.exists && f.size > 0) return f.uri;
  if (!dir.exists) dir.create({ intermediates: true });
  const got = await File.downloadFileAsync(recordingUrl(name), f);
  // An error page or a cut-off download must not be cached as audio.
  if (!isOgg(await got.bytes())) { got.delete(); throw new Error(`not an Ogg file: ${name}`); }
  return got.uri;
}
