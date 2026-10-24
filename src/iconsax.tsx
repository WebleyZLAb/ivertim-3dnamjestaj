import { useId } from "react";
import artwork from "./iconsax-artwork.json";

export type IconName = keyof typeof artwork;
export type IconVariant = "linear" | "twotone" | "bulk";

/** Static, bundled artwork from the official Iconsax package. Never accepts external SVG. */
export function Icon({ name, variant = "linear", size = 24 }: { name: IconName; variant?: IconVariant; size?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return <span className="iconsax-icon" aria-hidden="true" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: artwork[name][variant].replaceAll("__ICON_ID__", id + "-") }} />;
}
