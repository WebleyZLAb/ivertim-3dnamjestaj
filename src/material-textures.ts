import { createContext } from 'react';
export type MaterialTextures = ReadonlyMap<string, { file?: File; url?: string; name: string; textureSize: readonly [number|null,number|null,number|null] }>;
export const MaterialTexturesContext = createContext<MaterialTextures>(new Map());
