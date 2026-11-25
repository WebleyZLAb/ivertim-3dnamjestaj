import type { IncomingMessage, ServerResponse } from "node:http";

export const SAVE_ELEMENT_URL: string;
export const SAVE_TEMPLATE_URL: string;
export function normalizeTemplatePath(value: unknown): string;
export function saveLibraryTemplate(options: { root: string; relativePath: unknown; xml: unknown; overwrite: boolean }): Promise<{ path: string; replaced: boolean }>;
export class LibrarySaveError extends Error { status: number; constructor(status: number, message: string); }
export function normalizeElementPath(value: unknown): string;
export function saveLibraryElement(options: { root: string; relativePath: unknown; xml: unknown; overwrite: boolean }): Promise<{ path: string; replaced: boolean }>;
export function handleSaveElementRequest(request: IncomingMessage, response: ServerResponse, root: string): Promise<boolean>;
