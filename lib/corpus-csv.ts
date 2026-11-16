export function corpusCsvText(value: string): string {
  return /^[\t\r\n ]*[=+\-@]/.test(value) ? `'${value}` : value;
}

export function corpusCsvCell(value: string): string {
  return /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
