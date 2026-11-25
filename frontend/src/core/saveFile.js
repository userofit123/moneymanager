// Save a file on this device: the browser downloads it (to the Downloads folder) under its name.
export function saveFile(body, name, mime = "application/octet-stream") {
  const l = document.createElement("a");
  l.href = URL.createObjectURL(body instanceof Blob ? body : new Blob([body], { type: mime }));
  l.download = name; document.body.appendChild(l); l.click(); l.remove();
  setTimeout(() => URL.revokeObjectURL(l.href), 4000);
}
