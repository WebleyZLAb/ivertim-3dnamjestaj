import { Icon, type IconName, type IconVariant } from "./iconsax";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { createPortal } from "react-dom";

type WindowEntry = { id: string; title: string; minimized: boolean };
type WindowManager = { sidebarWidth: number; sidebarMaxWidth: number; setSidebarWidth(width: number): void; host: HTMLDivElement | null; windows: WindowEntry[]; active: string; register(id: string, title: string): () => void; activate(id: string): void; minimize(id: string): void };
const WindowContext = createContext<WindowManager | null>(null);

export function DesktopProvider({ children }: { children: ReactNode }) {
  const [requestedSidebarWidth, setRequestedSidebarWidth] = useState(310);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const sidebarMaxWidth = Math.max(190, Math.min(560, viewportWidth - 310));
  const sidebarWidth = Math.min(requestedSidebarWidth, sidebarMaxWidth);
  const setSidebarWidth = useCallback((width: number) => {
    if (Number.isFinite(width)) setRequestedSidebarWidth(Math.max(190, Math.min(560, width)));
  }, []);
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [windows, setWindows] = useState<WindowEntry[]>([]);
  const [active, setActive] = useState("");
  const register = useCallback((id: string, title: string) => {
    setWindows((current) => [...current.filter((entry) => entry.id !== id), { id, title, minimized: false }]);
    setActive(id);
    return () => { setWindows((current) => current.filter((entry) => entry.id !== id)); setActive((current) => current === id ? "" : current); };
  }, []);
  const activate = useCallback((id: string) => { setActive(id); setWindows((current) => { const target = current.find((entry) => entry.id === id); return target ? [...current.filter((entry) => entry.id !== id), { ...target, minimized: false }] : current; }); }, []);
  const minimize = useCallback((id: string) => setWindows((current) => current.map((entry) => entry.id === id ? { ...entry, minimized: true } : entry)), []);
  useEffect(() => {
    if (!active || windows.some((entry) => entry.id === active && entry.minimized)) {
      const next = windows.filter((entry) => !entry.minimized).at(-1)?.id ?? "";
      if (next !== active) setActive(next);
    }
  }, [windows, active]);
  return <WindowContext.Provider value={{ host, windows, active, register, activate, minimize, sidebarWidth, sidebarMaxWidth, setSidebarWidth }}><div className="desktop-provider" style={{ "--desktop-panel-width": `${sidebarWidth}px`, "--desktop-right": `${sidebarWidth + 15}px` } as CSSProperties}>
    {children}
    <div className="desktop-window-host" ref={setHost} />
    <nav className="desktop-taskbar" aria-label="Otvoreni prozori">{windows.map((entry) => <button key={entry.id} className={active === entry.id && !entry.minimized ? "active" : ""} aria-pressed={active === entry.id && !entry.minimized} onClick={() => activate(entry.id)}>{entry.minimized ? "▱" : "▣"} {entry.title}</button>)}</nav>
  </div></WindowContext.Provider>;
}

export function useDesktopWindows() {
  const manager = useContext(WindowContext);
  if (!manager) throw new Error("Nedostaje radna površina.");
  return manager;
}

export function DesktopWindow({ id, title, children, onClose, className = "", initialMaximized = false }: { id: string; title: string; children: ReactNode; onClose(): void; className?: string; initialMaximized?: boolean }) {
  const manager = useContext(WindowContext);
  if (!manager) throw new Error("Nedostaje radna površina prozora.");
  const { host, register, activate, minimize, active, windows } = manager;
  const [maximized, setMaximized] = useState(initialMaximized);
  const [position, setPosition] = useState(() => ({ x: 20 + windows.length * 16, y: 18 + windows.length * 16 }));
  const frameRef = useRef<HTMLElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  useEffect(() => register(id, title), [id, title, register]);
  useEffect(() => {
    if (id === "start" && host && frameRef.current) setPosition({ x: Math.max(0, (host.clientWidth - frameRef.current.offsetWidth) / 2), y: Math.max(0, (host.clientHeight - frameRef.current.offsetHeight) / 2) });
  }, [host, id]);

  useEffect(() => {
    if (!host) return;
    const observer = new ResizeObserver(() => setPosition((current) => ({ x: Math.max(0, Math.min(current.x, host.clientWidth - (frameRef.current?.offsetWidth ?? 360))), y: Math.max(0, Math.min(current.y, host.clientHeight - Math.min(frameRef.current?.offsetHeight ?? 190, host.clientHeight))) })));
    observer.observe(host); return () => observer.disconnect();
  }, [host]);
  const minimized = windows.find((entry) => entry.id === id)?.minimized;
  if (!host) return null;
  return createPortal(<section ref={frameRef} data-desktop-window={id} role="dialog" aria-label={title} aria-modal="false" className={`desktop-window ${active === id ? "active" : ""} ${maximized ? "maximized" : ""} ${className}`} style={{ left: maximized ? 0 : position.x, top: maximized ? 0 : position.y, display: minimized ? "none" : undefined, zIndex: 10 + windows.findIndex((entry) => entry.id === id), maxWidth: maximized ? "100%" : `calc(100% - ${position.x}px)`, maxHeight: maximized ? "100%" : `calc(100% - ${position.y}px)` }} onPointerDownCapture={() => { if (active !== id) activate(id); }} onKeyDown={(event) => { if (event.key === "Escape") onClose(); event.stopPropagation(); }}>
    <header className="desktop-window-titlebar" onDoubleClick={(event) => { if (!(event.target as Element).closest("button")) setMaximized((value) => !value); }} onPointerDown={(event) => {
      if (maximized || event.button !== 0 || (event.target as Element).closest("button")) return;
      const bounds = frameRef.current?.getBoundingClientRect(); const surface = host.getBoundingClientRect();
      drag.current = { x: event.clientX, y: event.clientY, left: bounds ? bounds.left - surface.left : position.x, top: bounds ? bounds.top - surface.top : position.y };
      event.currentTarget.setPointerCapture(event.pointerId);
    }} onPointerMove={(event) => {
      if (!drag.current) return;
      const width = host.clientWidth; const height = host.clientHeight; const frameWidth = frameRef.current?.offsetWidth ?? 400;
      setPosition({ x: Math.max(0, Math.min(width - Math.min(frameWidth, width), drag.current.left + event.clientX - drag.current.x)), y: Math.max(0, Math.min(height - Math.min(frameRef.current?.offsetHeight ?? 190, height), drag.current.top + event.clientY - drag.current.y)) });
    }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      <strong><span aria-hidden="true">▣</span> {title}</strong>
      <div><button aria-label={`Smanji prozor: ${title}`} onClick={() => minimize(id)}>―</button><button aria-label={`${maximized ? "Vrati" : "Uvećaj"} prozor: ${title}`} onClick={() => setMaximized((value) => !value)}>{maximized ? "❐" : "□"}</button><button aria-label={`Zatvori prozor: ${title}`} onClick={onClose}>×</button></div>
    </header>
    <div className="desktop-window-content">{children}</div>
  </section>, host);
}

export type DesktopCommand = { label: string; onClick(): void; disabled?: boolean; shortcut?: string; separator?: boolean };
export type DesktopMenu = { label: string; items: DesktopCommand[] };
export function DesktopHeader({ menus, children }: { menus: DesktopMenu[]; children: ReactNode }) {
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (!(event instanceof KeyboardEvent) && headerRef.current?.contains(event.target as Node)) return;
      headerRef.current?.querySelectorAll("details[open]").forEach((node) => node.removeAttribute("open"));
    };
    window.addEventListener("pointerdown", close); window.addEventListener("keydown", close);
    return () => { window.removeEventListener("pointerdown", close); window.removeEventListener("keydown", close); };
  }, []);
  return <header className="desktop-header" ref={headerRef}>
    <div className="desktop-caption"><img className="desktop-brand-icon" src="/ivertim-3d.ico" alt="" aria-hidden="true" /><strong>Ivertim 3D</strong></div>
    <nav className="desktop-menubar" aria-label="Glavni meniji" onKeyDown={(event) => {
      const target = event.target as HTMLElement;
      const details = target.closest("details");
      if (!details) return;
      const summary = details.querySelector("summary");
      const commands = Array.from(details.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
      const current = commands.indexOf(target as HTMLButtonElement);
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); details.removeAttribute("open"); summary?.focus(); }
      else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault(); event.stopPropagation(); details.setAttribute("open", "");
        const next = event.key === "Home" ? 0 : event.key === "End" ? commands.length - 1 : event.key === "ArrowDown" ? (current + 1) % commands.length : current < 0 ? commands.length - 1 : (current - 1 + commands.length) % commands.length;
        commands[next]?.focus();
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault(); event.stopPropagation();
        const all = Array.from(event.currentTarget.querySelectorAll("details")); const index = all.indexOf(details);
        const next = all[(index + (event.key === "ArrowRight" ? 1 : all.length - 1)) % all.length];
        const wasOpen = details.open; details.removeAttribute("open"); if (wasOpen) next?.setAttribute("open", ""); next?.querySelector("summary")?.focus();
      }
    }}>{menus.map((menu) => <details key={menu.label} onToggle={(event) => { if (event.currentTarget.open) headerRef.current?.querySelectorAll("details[open]").forEach((node) => { if (node !== event.currentTarget) node.removeAttribute("open"); }); }}><summary>{menu.label}</summary><div>{menu.items.map((item) => <button key={item.label} className={item.separator ? "menu-separator" : ""} disabled={item.disabled} onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); item.onClick(); }}><span>{item.label}</span>{item.shortcut && <kbd>{item.shortcut}</kbd>}</button>)}</div></details>)}</nav>
    <div className="desktop-toolbar" role="toolbar" aria-label="Glavna alatna traka">{children}</div>
  </header>;
}
type ToolbarIcon = "saveElement" | "print" | "duplicate" | "drilling" | "lines" | "kant" | "decor" | "bridges";

const toolbarIconPaths: Record<ToolbarIcon, string> = {
  saveElement: "M4 10h16v10H4z M8 10V4h8v6 M9 15h6",
  print: "M7 9V3h10v6 M7 17H4V9h16v8h-3 M7 14h10v7H7z M16 12h1",
  duplicate: "M8 8h12v12H8z M4 15V4h11",
  drilling: "M3 7l9-4 9 4v11l-9 4-9-4z M3 7l9 4 9-4 M12 11v11 M6 12h2 M16 12h2 M16 16h2",
  lines: "M3 7l9-4 9 4v11l-9 4-9-4z M3 7l9 4 9-4 M12 11v11",
  kant: "M3 8l9-5 9 5-9 5z M3 8v7l9 5 9-5V8 M12 13v7 M5 13l7 4 7-4",
  decor: "M3 4h18v16H3z M7 4c6 5-6 8 0 16 M12 4c6 5-6 8 0 16 M17 4c6 5-6 8 0 16",
  bridges: "M3 4h18v16H3z M3 11h18 M10 4v7 M15 11v9",
};

export function DesktopTool({ label, icon, variant = "linear", onClick, disabled, active }: { label: string; icon: IconName | ToolbarIcon; variant?: IconVariant; onClick(): void; disabled?: boolean; active?: boolean }) {
  return <button title={label} aria-label={label} aria-pressed={active} disabled={disabled} onClick={onClick}>
    {Object.hasOwn(toolbarIconPaths, icon)
      ? <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={toolbarIconPaths[icon as ToolbarIcon]} /></svg>
      : <Icon name={icon as IconName} variant={variant} />}
  </button>;
}

export function DesktopLoader({ onReady }: { onReady(): void }) {
  useEffect(() => { const timer = window.setTimeout(onReady, 2000); return () => window.clearTimeout(timer); }, [onReady]);
  return <div className="desktop-loader" role="status" aria-label="Pokretanje Ivertim 3D"><iframe src="/loader.html" title="Ivertim 3D — učitavanje" /></div>;
}

export function StartProjectWindow({ recent, onNew, onOpen, onRecent, onClose, children }: { recent: { id: string; fileName: string; openedAt: string }[]; onNew(): void; onOpen(): void; onRecent(id: string): void; onClose(): void; children?: ReactNode }) {
  return <DesktopWindow id="start" title="Novi ili učitaj projekat" className="desktop-start-window" onClose={onClose}>
    <div className="desktop-start-actions"><button onClick={onNew}><Icon name="new" variant="bulk" size={40} /><strong>Novi projekat</strong></button><button onClick={onOpen}><Icon name="open" variant="bulk" size={40} /><strong>Učitaj projekat</strong></button><button onClick={onClose}><Icon name="cancel" variant="bulk" size={40} /><strong>Odustani</strong></button></div>
    <section className="desktop-recents" aria-label="Nedavni projekti"><h2>Nedavni projekti</h2>{recent.length ? recent.map((entry) => <button key={entry.id} title="Otvori lokalno sačuvanu kopiju posljednjeg učitanog fajla" onClick={() => onRecent(entry.id)}><Icon name="drawing" variant="linear" size={16} /><strong>{entry.fileName}</strong><time>{new Intl.DateTimeFormat('sr-Latn-BA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(entry.openedAt))}</time></button>) : <p>Ovdje će se pojaviti projekti koje otvoriš.</p>}<small>Lista otvara lokalne kopije učitanih fajlova. Izvorni fajlovi se ne prepisuju.</small></section>
    {children}
  </DesktopWindow>;
}
