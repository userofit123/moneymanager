// A QR code made in the browser (nothing is sent anywhere): the text in, one SVG path of the dark squares out.
import qrcode from "qrcode-generator";

// size counts the squares across, without the white border around them (the quiet zone the reader needs).
export function qrPath(text, level = "M") {
  const q = qrcode(0, level); // 0 = the smallest size that fits
  q.addData(text, "Byte");
  q.make();
  const n = q.getModuleCount();
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  return { size: n, d };
}

// A key typed by hand reads easier in groups of four: "ABCD EFGH IJKL".
export const keyGroups = (k) => String(k || "").replace(/\s+/g, "").replace(/(.{4})(?=.)/g, "$1 ");
