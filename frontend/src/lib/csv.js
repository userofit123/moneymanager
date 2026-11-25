// Writing a CSV file, shared by the files the app gives out.

// Text without HTML tags or entities (descriptions can hold them).
export const nohtml = (s) => String(s == null ? "" : s).replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").trim();
// CSV text from rows of cells, with a byte-order mark so Excel reads Hebrew; a leading ' stops spreadsheets from running
// text as a formula. Used by the export (lib/exporting.js) and the Taxes and reports zip (lib/taxExport.js).
export const csvText = (rows) => { const cell = (v) => { let s = v == null ? "" : String(v); if (typeof v == "string" && /^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }; return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n"); };
