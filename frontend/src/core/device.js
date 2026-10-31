// What this copy of the app is running as, so each page shows only what fits it:
//   apk      the Android app
//   desktop  the Windows or Linux app
//   pwa      the web app added to the home screen or installed from a browser
//   web      a browser tab
const w = typeof window !== "undefined" ? window : {};
const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
const standalone = typeof matchMedia !== "undefined" && matchMedia("(display-mode: standalone)").matches;
const kind = w.mmApp ? "apk" : w.desktop || w.desktopServers ? "desktop" : standalone || (typeof navigator !== "undefined" && navigator.standalone) ? "pwa" : "web";
export const device = {
  kind,
  apk: kind == "apk",
  desktop: kind == "desktop",
  pwa: kind == "pwa",
  web: kind == "web",
  inBrowser: kind == "pwa" || kind == "web", // the page comes from a server in a browser: web push and "install" make sense
  android: /Android/i.test(ua),
  phone: /Android|iPhone|iPad|iPod/i.test(ua),
  windows: /Windows/i.test(ua),
  linux: /Linux/i.test(ua) && !/Android/i.test(ua),
  // an iPad asks for the desktop site and says "Macintosh": its touch screen tells it apart from a Mac
  ios: /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1),
  mac: /Macintosh/i.test(ua) && !(typeof navigator !== "undefined" && navigator.maxTouchPoints > 1),
};
// The kind of device in one word (win, mac, linux, android, ios; "" when unknown), for pages that show steps per device
device.os = device.ios ? "ios" : device.android ? "android" : device.windows ? "win" : device.mac ? "mac" : device.linux ? "linux" : "";
