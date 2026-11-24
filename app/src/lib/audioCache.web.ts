// Fetch the recording (the browser's HTTP cache keeps it), check it really is Ogg audio, and play it from memory.
// Fetching ourselves is what lets a 404 or an error page fall back to the device voice instead of silence.
import { isOgg, recordingUrl } from "./recordings";

const blobs = new Map<string, string>();

export async function localRecording(name: string): Promise<string> {
  const have = blobs.get(name);
  if (have) return have;
  const res = await fetch(recordingUrl(name));
  if (!res.ok) throw new Error(`recording ${name}: HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  if (!isOgg(buf)) throw new Error(`not an Ogg file: ${name}`);
  const url = URL.createObjectURL(new Blob([buf], { type: "audio/ogg" }));
  blobs.set(name, url);
  return url;
}
