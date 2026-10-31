// The app files on GitHub for each kind of device, as the release pipeline names them (.github/workflows/release.yml).
// downloads(os, version) gives the buttons for one device: k is the text key, href the file, main the first (filled) button.
// No version known yet: one button to the page with every download. iPhone and iPad have no file: an empty list.
export const RELEASES = "https://github.com/userofit123/moneymanager/releases";
const FILES = {
  win: [["deskWin", "Money-Manager-Setup-{v}.exe"]],
  mac: [["deskMacArm", "Money-Manager-{v}-mac-arm64.dmg"], ["deskMacIntel", "Money-Manager-{v}-mac-x64.dmg"]],
  linux: [["deskRpm", "Money-Manager-{v}-linux-x86_64.rpm"], ["deskDeb", "Money-Manager-{v}-linux-amd64.deb"], ["deskApp", "Money-Manager-{v}-linux-x86_64.AppImage"]],
  android: [["androidBtn", "Money-Manager-{v}.apk"]],
};
export function downloads(os, version) {
  const f = FILES[os];
  if (!f) return [];
  if (!version) return [{ k: "deskAll", href: RELEASES + "/latest", main: true }];
  return f.map(([k, name], i) => ({ k, href: RELEASES + "/download/v" + version + "/" + name.replace("{v}", version), main: i === 0 }));
}
