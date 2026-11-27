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

export function DesktopHeader({ children }: { children: ReactNode }) {
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (!(event instanceof KeyboardEvent) && headerRef.current?.contains(event.target as Node) && (event.target as Element).closest?.("details[open]")) return;
      headerRef.current?.querySelectorAll("details[open]").forEach((node) => node.removeAttribute("open"));
    };
    window.addEventListener("pointerdown", close); window.addEventListener("keydown", close);
    return () => { window.removeEventListener("pointerdown", close); window.removeEventListener("keydown", close); };
  }, []);
  // Prozori se otvaraju ispod trake, pa se njena stvarna visina (ovisi o širini prozora) čuva u --desktop-top.
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const update = () => document.documentElement.style.setProperty("--desktop-top", `${Math.ceil(header.getBoundingClientRect().height)}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  return <header className="desktop-header" ref={headerRef}>
    <div className="desktop-caption"><img className="desktop-brand-icon" src="/ivertim-3d.ico" alt="" aria-hidden="true" /><strong>Ivertim 3D</strong></div>
    <div className="desktop-toolbar" role="toolbar" aria-label="Glavna traka alata">{children}</div>
  </header>;
}
type ToolbarIcon = "saveElement" | "print" | "duplicate" | "drilling" | "lines" | "solidLines" | "kant" | "decor" | "bridges";

const toolbarIconPaths: Record<ToolbarIcon, string> = {
  saveElement: "M4 10h16v10H4z M8 10V4h8v6 M9 15h6",
  print: "M7 9V3h10v6 M7 17H4V9h16v8h-3 M7 14h10v7H7z M16 12h1",
  duplicate: "M8 8h12v12H8z M4 15V4h11",
  drilling: "M3 7l9-4 9 4v11l-9 4-9-4z M3 7l9 4 9-4 M12 11v11 M6 12h2 M16 12h2 M16 16h2",
  lines: "M3 7l9-4 9 4v11l-9 4-9-4z M3 7l9 4 9-4 M12 11v11",
  solidLines: "M3 7l9-4 9 4v11l-9 4-9-4z M3 7l9 4 9-4 M12 11v11 M12 3v2",
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

export type RibbonGroup = { label: string; content: ReactNode };
export type RibbonTab = { id: string; label: string; groups: RibbonGroup[] };

/** Traka s karticama (kao u DraftSightu): kartica je skup grupa, a grupa ima naziv ispod svojih komandi. */
export function DesktopRibbon({ tabs, initial }: { tabs: RibbonTab[]; initial?: string }) {
  const storageKey = "ivertim.ribbonTab";
  const [active, setActive] = useState(() => {
    let saved: string | null = null;
    try { saved = window.localStorage.getItem(storageKey); } catch { /* bez pamćenja */ }
    return tabs.some((tab) => tab.id === saved) ? saved! : initial ?? tabs[0]!.id;
  });
  const tab = tabs.find((item) => item.id === active) ?? tabs[0]!;
  const choose = (id: string) => { setActive(id); try { window.localStorage.setItem(storageKey, id); } catch { /* bez pamćenja */ } };
  return <div className="ribbon">
    <div className="ribbon-tabs" role="tablist" aria-label="Kartice trake">
      {tabs.map((item) => <button key={item.id} role="tab" aria-selected={item.id === tab.id} onClick={() => choose(item.id)}>{item.label}</button>)}
    </div>
    <div className="ribbon-body" role="tabpanel">
      {tab.groups.map((group) => <section key={group.label} className="ribbon-group" aria-label={group.label}><div className="ribbon-group-tools">{group.content}</div><small>{group.label}</small></section>)}
    </div>
  </div>;
}

/** Velika komanda trake: ikona i kratak naziv ispod. */
export function RibbonButton({ label, icon, onClick, disabled, active, variant = "linear" }: { label: string; icon: IconName | ToolbarIcon; onClick(): void; disabled?: boolean; active?: boolean; variant?: IconVariant }) {
  return <button className="ribbon-button" title={label} aria-pressed={active} disabled={disabled} onClick={onClick}>
    {Object.hasOwn(toolbarIconPaths, icon)
      ? <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={toolbarIconPaths[icon as ToolbarIcon]} /></svg>
      : <Icon name={icon as IconName} variant={variant} size={26} />}
    <span>{label}</span>
  </button>;
}

export type RibbonChoice = { label: string; onClick(): void; disabled?: boolean; active?: boolean };

/** Jedna ikona koja skuplja srodne opcije: klik otvara padajući popis (npr. načini prikaza ili pogledi). */
export function RibbonDropdown({ label, icon, choices, disabled, variant = "linear" }: { label: string; icon: IconName | ToolbarIcon; choices: RibbonChoice[]; disabled?: boolean; variant?: IconVariant }) {
  const current = choices.find((choice) => choice.active);
  return <details className={`ribbon-drop${disabled ? " disabled" : ""}`} onClick={(event) => { if (disabled) event.preventDefault(); }}>
    <summary className="ribbon-button" title={label}>
      {Object.hasOwn(toolbarIconPaths, icon)
        ? <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={toolbarIconPaths[icon as ToolbarIcon]} /></svg>
        : <Icon name={icon as IconName} variant={variant} size={26} />}
      <span>{current?.label ?? label} ▾</span>
    </summary>
    <div>{choices.map((choice) => <button key={choice.label} aria-pressed={choice.active} disabled={choice.disabled} onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); choice.onClick(); }}>{choice.label}</button>)}</div>
  </details>;
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
