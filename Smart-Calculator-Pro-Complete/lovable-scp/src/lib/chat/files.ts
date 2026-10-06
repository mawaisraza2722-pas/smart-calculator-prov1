// Local (on-device) file processing before anything is sent to the AI.
import { newId } from "./store";

export interface Attachment {
  id: string;
  kind: "image" | "pdf" | "text";
  name: string;
  mediaType: string;
  url?: string; // data URL for image/pdf
  text?: string; // extracted text
}

const readDataURL = (f: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(f);
  });

export async function compressImage(src: string, max = 1600): Promise<string> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const s = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * s);
  c.height = Math.round(img.height * s);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

export const imageAttachment = async (dataUrl: string, name = "image.jpg"): Promise<Attachment> => ({
  id: newId(),
  kind: "image",
  name,
  mediaType: "image/jpeg",
  url: await compressImage(dataUrl),
});

const TEXT_EXT = /\.(txt|md|csv|tsv|json|xml|html|htm|log|js|ts|py|css|yaml|yml)$/i;
const MAX_TEXT = 120_000;

export async function processFile(f: File): Promise<Attachment> {
  if (f.type.startsWith("image/")) {
    if (/hei[cf]/i.test(f.type)) throw new Error("HEIC images aren't supported by browsers. Please use JPG or PNG.");
    return imageAttachment(await readDataURL(f), f.name);
  }
  if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) {
    if (f.size > 15 * 1024 * 1024) throw new Error("PDF is larger than 15 MB.");
    return { id: newId(), kind: "pdf", name: f.name, mediaType: "application/pdf", url: await readDataURL(f) };
  }
  if (/\.docx$/i.test(f.name)) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() });
    return { id: newId(), kind: "text", name: f.name, mediaType: "text/plain", text: value.slice(0, MAX_TEXT) };
  }
  if (f.type.startsWith("text/") || TEXT_EXT.test(f.name) || f.type === "application/json") {
    return { id: newId(), kind: "text", name: f.name, mediaType: f.type || "text/plain", text: (await f.text()).slice(0, MAX_TEXT) };
  }
  throw new Error(`${f.name}: this file type isn't supported yet. Try PDF, DOCX, TXT, CSV or an image.`);
}

export const ACCEPT_FILES = ".pdf,.docx,.txt,.md,.csv,.tsv,.json,.xml,.html,.log,image/*";
