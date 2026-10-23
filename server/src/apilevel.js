// The "API level": how the desktop and phone apps and this server agree on whether they fit each other, without having to be the same version.
// - level: what this server offers. Raise it when the apps start to need something new from the server (a new request, a changed answer).
// - min: the oldest app level this server still understands. Raise it only when the server stops accepting what older apps send.
// The apps keep the same pair (desktop/compat.js): the level they speak and the oldest server level they work with.
// Both numbers are shown in /api/auth/status. Servers before this file (0.12.1 to 0.12.4) do not show them: the apps treat those as level 1.
export const API_LEVEL = 1;
export const API_MIN = 1;
