'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import Papa from 'papaparse'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import {
  Upload,
  X,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

// ==========================================
// Types
// ==========================================

interface CsvImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ParsedUser {
  username: string
  fullName: string
  email: string
  password: string
  authType: string
  status: string
  [key: string]: string
}

interface ImportError {
  row: number
  username: string
  reason: string
}

interface ImportResult {
  created: number
  skipped: ImportError[]
  total: number
}

const EXPECTED_COLUMNS = ['username', 'fullName', 'email', 'password', 'authType', 'status']
const REQUIRED_COLUMNS = ['username']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_ROWS = 1000

// ==========================================
// Component
// ==========================================

export function CsvImportDialog({ open, onOpenChange }: CsvImportDialogProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // States
  const [file, setFile] = useState<File | null>(null)
  const [parsedRows, setParsedRows] = useState<ParsedUser[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  // Column mapping analysis
  const columnMapping = useMemo(() => {
    if (csvHeaders.length === 0) return {}
    const mapping: Record<string, { found: boolean; csvColumn?: string }> = {}
    for (const expected of EXPECTED_COLUMNS) {
      const found = csvHeaders.some(
        (h) => h.toLowerCase().trim() === expected.toLowerCase()
      )
      mapping[expected] = {
        found,
        csvColumn: found
          ? csvHeaders.find((h) => h.toLowerCase().trim() === expected.toLowerCase())
          : undefined,
      }
    }
    return mapping
  }, [csvHeaders])

  const missingRequiredColumns = useMemo(() => {
    return REQUIRED_COLUMNS.filter((col) => !columnMapping[col]?.found)
  }, [columnMapping])

  const canImport = useMemo(() => {
    return (
      file !== null &&
      parsedRows.length > 0 &&
      parsedRows.length <= MAX_ROWS &&
      missingRequiredColumns.length === 0 &&
      !isImporting &&
      !importResult
    )
  }, [file, parsedRows, missingRequiredColumns, isImporting, importResult])

  // Reset state on dialog close
  const handleOpenChange = (val: boolean) => {
    if (!val) {
      // Reset all state
      setFile(null)
      setParsedRows([])
      setCsvHeaders([])
      setParseError(null)
      setIsImporting(false)
      setImportProgress(0)
      setImportResult(null)
      setIsDragging(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
    onOpenChange(val)
  }

  // Parse CSV file
  const parseCSV = useCallback((csvFile: File) => {
    setParseError(null)
    setImportResult(null)
    setParsedRows([])
    setCsvHeaders([])

    if (!csvFile.name.toLowerCase().endsWith('.csv')) {
      setParseError('Please select a CSV file (.csv)')
      return
    }

    if (csvFile.size > MAX_FILE_SIZE) {
      setParseError(`File size exceeds 5MB limit (${(csvFile.size / (1024 * 1024)).toFixed(1)}MB)`)
      return
    }

    Papa.parse<Record<string, string>>(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setParseError(`CSV parsing error: ${results.errors[0].message}`)
          return
        }

        const headers = results.meta.fields || []
        if (headers.length === 0) {
          setParseError('CSV file appears to be empty or has no headers')
          return
        }

        const rows = results.data.map((row) => ({
          username: (row['username'] || row['Username'] || '').trim(),
          fullName: (row['fullName'] || row['fullname'] || row['Full Name'] || '').trim(),
          email: (row['email'] || row['Email'] || '').trim(),
          password: (row['password'] || row['Password'] || '').trim(),
          authType: (row['authType'] || row['authtype'] || row['Auth Type'] || 'PAP').trim(),
          status: (row['status'] || row['Status'] || 'active').trim(),
        })) as ParsedUser[]

        if (rows.length === 0) {
          setParseError('CSV file contains no data rows')
          return
        }

        if (rows.length > MAX_ROWS) {
          setParseError(`CSV file contains ${rows.length} rows, exceeding the ${MAX_ROWS} row limit`)
          return
        }

        setCsvHeaders(headers)
        setParsedRows(rows)
      },
      error: (error) => {
        setParseError(`Failed to parse CSV: ${error.message}`)
      },
    })
  }, [])

  // Handle file selection
  const handleFileSelect = useCallback(
    (selectedFile: File) => {
      setFile(selectedFile)
      parseCSV(selectedFile)
    },
    [parseCSV]
  )

  // Drag & drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) {
        handleFileSelect(droppedFile)
      }
    },
    [handleFileSelect]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (selectedFile) {
        handleFileSelect(selectedFile)
      }
    },
    [handleFileSelect]
  )

  // Handle import
  const handleImport = useCallback(async () => {
    if (!canImport || parsedRows.length === 0) return

    setIsImporting(true)
    setImportProgress(0)

    try {
      // Send in batches for progress tracking
      const batchSize = 50
      let totalCreated = 0
      const allSkipped: ImportError[] = []

      for (let i = 0; i < parsedRows.length; i += batchSize) {
        const batch = parsedRows.slice(i, i + batchSize)
        const progress = Math.round(((i + batch.length) / parsedRows.length) * 100)
        setImportProgress(progress)

        const res = await fetch('/api/users/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ users: batch }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Import failed')
        }

        const result: ImportResult = await res.json()
        totalCreated += result.created
        allSkipped.push(...result.skipped)
      }

      setImportProgress(100)
      setImportResult({
        created: totalCreated,
        skipped: allSkipped,
        total: parsedRows.length,
      })

      // Invalidate users query cache
      queryClient.invalidateQueries({ queryKey: ['users'] })

      if (allSkipped.length === 0) {
        toast.success(`Successfully imported ${totalCreated} users`)
      } else {
        toast.warning(
          `Imported ${totalCreated} users, ${allSkipped.length} skipped`
        )
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }, [canImport, parsedRows, queryClient])

  // Preview data (first 5 rows)
  const previewRows = parsedRows.slice(0, 5)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Users from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file with user data. Expected columns: username, fullName, email, password, authType, status.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Drop Zone */}
          {!file && !importResult && (
            <div
              className={`
                relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors duration-200
                ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleInputChange}
              />
              <Upload
                className={`h-10 w-10 mx-auto mb-3 ${
                  isDragging ? 'text-primary' : 'text-muted-foreground/40'
                }`}
              />
              <p className="text-sm font-medium text-foreground">
                Drop CSV file here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports .csv files up to 5MB, max {MAX_ROWS} rows
              </p>
            </div>
          )}

          {/* Parse Error */}
          {parseError && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-destructive">Parse Error</p>
                <p className="text-xs text-destructive/80 mt-0.5">{parseError}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-destructive/60 hover:text-destructive"
                onClick={() => {
                  setParseError(null)
                  setFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* File Selected Info */}
          {file && !importResult && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 min-w-0">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-sm font-medium truncate">{file.name}</span>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {parsedRows.length} rows
                </Badge>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {(file.size / 1024).toFixed(1)} KB
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => {
                  setFile(null)
                  setParsedRows([])
                  setCsvHeaders([])
                  setParseError(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Column Mapping Status */}
          {csvHeaders.length > 0 && !importResult && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Column Mapping
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {EXPECTED_COLUMNS.map((col) => {
                  const mapped = columnMapping[col]
                  const isRequired = REQUIRED_COLUMNS.includes(col)
                  if (mapped?.found) {
                    return (
                      <Badge
                        key={col}
                        variant="outline"
                        className="gap-1 text-xs bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {col}
                        {isRequired && <span className="text-destructive">*</span>}
                      </Badge>
                    )
                  } else {
                    return (
                      <Badge
                        key={col}
                        variant="outline"
                        className="gap-1 text-xs bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
                      >
                        <XCircle className="h-3 w-3" />
                        {col}
                        {isRequired && <span className="text-destructive">*</span>}
                      </Badge>
                    )
                  }
                })}
              </div>
              {missingRequiredColumns.length > 0 && (
                <p className="text-xs text-destructive">
                  Missing required column(s): {missingRequiredColumns.join(', ')}
                </p>
              )}
            </div>
          )}

          {/* Import Progress */}
          {isImporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Importing users...</span>
                <span className="font-medium">{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="h-2" />
            </div>
          )}

          {/* Import Results */}
          {importResult && (
            <div className="space-y-3">
              <div className="p-4 rounded-lg border bg-muted/30">
                <h4 className="text-sm font-semibold mb-3">Import Summary</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">{importResult.total}</p>
                    <p className="text-xs text-muted-foreground">Total Rows</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-600">{importResult.created}</p>
                    <p className="text-xs text-muted-foreground">Created</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-600">{importResult.skipped.length}</p>
                    <p className="text-xs text-muted-foreground">Skipped</p>
                  </div>
                </div>
              </div>

              {/* Skipped rows details */}
              {importResult.skipped.length > 0 && (
                <div className="space-y-1.5">
                  <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Skipped Rows
                  </h5>
                  <ScrollArea className="max-h-40">
                    <div className="space-y-1">
                      {importResult.skipped.map((skip, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/50"
                        >
                          <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                            Row {skip.row}
                          </Badge>
                          <span className="truncate text-muted-foreground">{skip.username}</span>
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-5 shrink-0 ml-auto"
                          >
                            {skip.reason}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {/* Preview Table */}
          {previewRows.length > 0 && !importResult && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Preview
                {parsedRows.length > 5 && (
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    (showing first 5 of {parsedRows.length} rows)
                  </span>
                )}
              </h4>
              <div className="border rounded-lg overflow-hidden">
                <ScrollArea className="max-h-64">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs h-8 w-10">#</TableHead>
                        {EXPECTED_COLUMNS.map((col) => (
                          <TableHead key={col} className="text-xs h-8 whitespace-nowrap">
                            {col}
                            {!columnMapping[col]?.found && REQUIRED_COLUMNS.includes(col) && (
                              <span className="text-destructive ml-0.5">*</span>
                            )}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs py-1.5 text-muted-foreground">
                            {i + 1}
                          </TableCell>
                          <TableCell className="text-xs py-1.5 font-mono font-medium">
                            {row.username || '—'}
                          </TableCell>
                          <TableCell className="text-xs py-1.5">
                            {row.fullName || '—'}
                          </TableCell>
                          <TableCell className="text-xs py-1.5 font-mono">
                            {row.email || '—'}
                          </TableCell>
                          <TableCell className="text-xs py-1.5 font-mono">
                            {row.password ? '••••••••' : '—'}
                          </TableCell>
                          <TableCell className="text-xs py-1.5">
                            {row.authType || 'PAP'}
                          </TableCell>
                          <TableCell className="text-xs py-1.5">
                            {row.status || 'active'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
          )}
        </div>

        <Separator />

        <DialogFooter className="gap-2 shrink-0">
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isImporting}>
              {importResult ? 'Close' : 'Cancel'}
            </Button>
          </DialogClose>
          {!importResult && (
            <Button
              type="button"
              onClick={handleImport}
              disabled={!canImport || isImporting}
              className="gap-2"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Importing... ({importProgress}%)
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Start Import
                  {parsedRows.length > 0 && (
                    <span className="text-xs opacity-80">({parsedRows.length} users)</span>
                  )}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
