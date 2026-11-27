import { useEffect, useState } from "react";

/** Lične postavke izgleda (tema aplikacije i boja pozadine 3D platna), pamte se u pregledniku. */
export type UiTheme = "light" | "dark";

export const CANVAS_BACKGROUNDS: ReadonlyArray<{ label: string; color: string }> = [
  { label: "Svijetla", color: "#f4f6f1" },
  { label: "Bijela", color: "#ffffff" },
  { label: "Siva", color: "#c9ced3" },
  { label: "Plavosiva", color: "#2b3340" },
  { label: "Tamna", color: "#16191e" },
];

const THEME_KEY = "ivertim.theme";
const CANVAS_KEY = "ivertim.canvasBackground";
const listeners = new Set<() => void>();

function readStored(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function writeStored(key: string, value: string): void {
  try { window.localStorage.setItem(key, value); } catch { /* privatni prozor: postavka važi samo do osvježavanja */ }
}

export function readTheme(): UiTheme {
  return readStored(THEME_KEY) === "dark" ? "dark" : "light";
}

export function readCanvasBackground(): string {
  const value = readStored(CANVAS_KEY);
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : CANVAS_BACKGROUNDS[0]!.color;
}

export function applyTheme(theme: UiTheme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#171a1f" : "#eef0ed");
}

export function setTheme(theme: UiTheme): void {
  writeStored(THEME_KEY, theme);
  applyTheme(theme);
  listeners.forEach((listener) => listener());
}

export function setCanvasBackground(color: string): void {
  writeStored(CANVAS_KEY, color);
  listeners.forEach((listener) => listener());
}

function useStored<T>(read: () => T): T {
  const [value, setValue] = useState(read);
  useEffect(() => {
    const update = () => setValue(read());
    listeners.add(update);
    return () => { listeners.delete(update); };
  }, [read]);
  return value;
}

export const useTheme = (): UiTheme => useStored(readTheme);
export const useCanvasBackground = (): string => useStored(readCanvasBackground);
