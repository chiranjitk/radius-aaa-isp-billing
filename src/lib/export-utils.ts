/**
 * Export Utilities for CSV and JSON file downloads.
 *
 * These functions run entirely in the browser and trigger file downloads
 * via Blob + URL.createObjectURL — no server round-trip needed.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExportOptions {
  /** Column header names displayed in the first row */
  headers: string[]
  /** Array of row data; each inner array must match the length of `headers` */
  rows: (string | number | null | undefined)[][]
  /** File name *without* extension (the correct extension is appended automatically) */
  filename: string
  /** Optional title row inserted above the headers */
  title?: string
}

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

/**
 * Escape a single CSV cell value according to RFC 4180.
 *
 * - Fields containing commas, double-quotes, or newlines are wrapped in double-quotes.
 * - Double-quotes inside a field are escaped by doubling them (`""`).
 */
function escapeCsvCell(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value)

  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }

  return str
}

/**
 * Convert headers + rows into a CSV string.
 */
function buildCsvString(options: ExportOptions): string {
  const lines: string[] = []

  if (options.title) {
    lines.push(escapeCsvCell(options.title))
  }

  // Header row
  lines.push(options.headers.map(escapeCsvCell).join(','))

  // Data rows
  for (const row of options.rows) {
    lines.push(row.map(escapeCsvCell).join(','))
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// BOM helper – adds a UTF-8 BOM so Excel recognises the encoding correctly
// ---------------------------------------------------------------------------

const UTF8_BOM = '\uFEFF'

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Export data as a `.csv` file and trigger a browser download.
 */
export function exportToCSV(options: ExportOptions): void {
  const csv = buildCsvString(options)
  const blob = new Blob([UTF8_BOM + csv], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, `${options.filename}.csv`)
}

/**
 * Export data as a `.json` file and trigger a browser download.
 *
 * The output is an array of objects keyed by the provided header names.
 */
export function exportToJSON(options: ExportOptions): void {
  const jsonData = options.rows.map((row) => {
    const obj: Record<string, string | number | null> = {}
    options.headers.forEach((header, idx) => {
      obj[header] = row[idx] ?? null
    })
    return obj
  })

  const json = JSON.stringify(jsonData, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
  triggerDownload(blob, `${options.filename}.json`)
}

// ---------------------------------------------------------------------------
// Internal: trigger download via a temporary <a> element
// ---------------------------------------------------------------------------

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'

  document.body.appendChild(anchor)
  anchor.click()

  // Clean up
  setTimeout(() => {
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }, 100)
}
