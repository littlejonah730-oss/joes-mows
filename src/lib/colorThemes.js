export const COLOR_THEMES = [
  { id: "neon_green", name: "Neon Green", hue: 153, sat: 100, light: 45, fg: "0 0% 0%" },
  { id: "ocean_blue", name: "Ocean Blue", hue: 210, sat: 100, light: 50, fg: "0 0% 0%" },
  { id: "royal_purple", name: "Royal Purple", hue: 270, sat: 75, light: 60, fg: "0 0% 0%" },
  { id: "sunset_orange", name: "Sunset Orange", hue: 25, sat: 95, light: 55, fg: "0 0% 0%" },
  { id: "crimson_red", name: "Crimson Red", hue: 0, sat: 75, light: 55, fg: "0 0% 100%" },
  { id: "cyan", name: "Cyan", hue: 190, sat: 100, light: 45, fg: "0 0% 0%" },
  { id: "gold", name: "Gold", hue: 45, sat: 90, light: 50, fg: "0 0% 0%" },
  { id: "hot_pink", name: "Hot Pink", hue: 325, sat: 85, light: 60, fg: "0 0% 0%" },
  { id: "teal", name: "Teal", hue: 175, sat: 70, light: 40, fg: "0 0% 100%" },
  { id: "indigo", name: "Indigo", hue: 240, sat: 70, light: 60, fg: "0 0% 100%" },
  { id: "lime", name: "Lime", hue: 80, sat: 80, light: 45, fg: "0 0% 0%" },
  { id: "coral", name: "Coral", hue: 10, sat: 85, light: 55, fg: "0 0% 0%" },
];

export function applyColorTheme(schemeId) {
  const scheme = COLOR_THEMES.find((t) => t.id === schemeId) || COLOR_THEMES[0];
  const primary = `${scheme.hue} ${scheme.sat}% ${scheme.light}%`;
  const neonDim = `${scheme.hue} ${Math.max(scheme.sat - 40, 30)}% ${Math.max(scheme.light - 15, 25)}%`;
  const root = document.documentElement;
  root.style.setProperty("--primary", primary);
  root.style.setProperty("--primary-foreground", scheme.fg);
  root.style.setProperty("--accent", primary);
  root.style.setProperty("--accent-foreground", scheme.fg);
  root.style.setProperty("--neon", primary);
  root.style.setProperty("--neon-dim", neonDim);
  root.style.setProperty("--ring", primary);
  root.style.setProperty("--sidebar-primary", primary);
  root.style.setProperty("--sidebar-primary-foreground", scheme.fg);
  root.style.setProperty("--sidebar-ring", primary);
}