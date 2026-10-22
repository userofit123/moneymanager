// The app icons: the currency symbol (or coin) shown as the logo, on the loading screen and in Settings → Preferences.
export const SYM_SVG = {
  "₪": "<svg viewBox=\"0 0 24 24\" width=\"58%\" height=\"58%\" fill=\"currentColor\"><path d=\"M4.5 6.04V17.96H6.89V8.07H11.2C12.43 8.07 12.91 8.65 12.91 9.9V14.07H15.3V9.9C15.3 7.37 14.03 6.04 11.34 6.04ZM8.7 17.96H15.56C18.23 17.96 19.5 16.64 19.5 14.12V6.18H17.1V14.12C17.1 15.39 16.59 15.93 15.41 15.93H11.1V9.94H8.7Z\"/></svg>",
  "$": "<svg viewBox=\"0 0 24 24\" width=\"58%\" height=\"58%\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 3v18M16.5 7.5C16.2 6 14.4 5 12 5S7.8 6.2 7.8 8.2c0 4.3 8.4 2.5 8.4 7 0 2-1.8 3.8-4.2 3.8s-4.3-1-4.6-2.8\"/></svg>",
  "€": "<svg viewBox=\"0 0 24 24\" width=\"58%\" height=\"58%\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M17 6.5a6 6 0 0 0-9 2v7a6 6 0 0 0 9 2M5 10.5h9M5 13.5h9\"/></svg>",
  "£": "<svg viewBox=\"0 0 24 24\" width=\"58%\" height=\"58%\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M16.5 7a4 4 0 0 0-7.5 1.5V17M6.5 12.5h8M6 18h11\"/></svg>",
  "¥": "<svg viewBox=\"0 0 24 24\" width=\"58%\" height=\"58%\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 5l6 7 6-7M12 12v8M7.5 13.5h9M7.5 17h9\"/></svg>",
};
export const COIN_SVG = "<svg class='coin' viewBox='0 0 512 512'><defs><linearGradient id='cg' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#6f7cff'/><stop offset='1' stop-color='#c28bff'/></linearGradient></defs><rect width='512' height='512' rx='112' fill='url(#cg)'/><circle cx='256' cy='268' r='168' fill='#000' opacity='.16'/><circle cx='256' cy='256' r='168' fill='#fff'/><circle cx='256' cy='256' r='134' fill='none' stroke='#7b83ff' stroke-width='12' opacity='.55'/><g fill='none' stroke='#6f7cff' stroke-width='22' stroke-linecap='round'><circle cx='256' cy='256' r='42'/><path d='M226 226l-34-34M286 226l34-34M226 286l-34 34M286 286l34 34'/></g></svg>"; // the app's own icon (public/icon-source.svg), the same on every look

// [value, text key] of the app icon tiles, in the order they show
export const ICONS = [["coin", "coin"], ["₪", "shekel"], ["$", "dollar"], ["€", "euro"], ["£", "pound"], ["¥", "yen"]];
export const iconSvg = (v) => (v === "coin" ? COIN_SVG : SYM_SVG[v] || COIN_SVG);
