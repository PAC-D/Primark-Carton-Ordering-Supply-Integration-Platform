param(
    [string]$Workbook = (Join-Path $PSScriptRoot '..\assets\factory-supplier pair.xlsx'),
    [string]$Output = (Join-Path $PSScriptRoot '..\data\supplier-factories.js')
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.IO.Compression.FileSystem

$workbookPath = (Resolve-Path -LiteralPath $Workbook).Path
$archive = [System.IO.Compression.ZipFile]::OpenRead($workbookPath)

try {
    function Read-ZipXml([string]$Name) {
        $entry = $archive.GetEntry($Name)
        if (-not $entry) { throw "Missing workbook entry: $Name" }

        $reader = [System.IO.StreamReader]::new($entry.Open())
        try { return [xml]$reader.ReadToEnd() } finally { $reader.Dispose() }
    }

    $stringsXml = Read-ZipXml 'xl/sharedStrings.xml'
    $sheetXml = Read-ZipXml 'xl/worksheets/sheet1.xml'
    $namespace = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'

    $stringManager = [System.Xml.XmlNamespaceManager]::new($stringsXml.NameTable)
    $stringManager.AddNamespace('x', $namespace)
    $sharedStrings = @(
        $stringsXml.SelectNodes('//x:si', $stringManager) | ForEach-Object {
            (($_.SelectNodes('.//x:t', $stringManager) | ForEach-Object InnerText) -join '')
        }
    )

    $sheetManager = [System.Xml.XmlNamespaceManager]::new($sheetXml.NameTable)
    $sheetManager.AddNamespace('x', $namespace)

    $rows = foreach ($row in $sheetXml.SelectNodes('//x:sheetData/x:row[position() > 1]', $sheetManager)) {
        $values = @{}
        foreach ($cell in $row.SelectNodes('./x:c', $sheetManager)) {
            $column = ([regex]::Match($cell.r, '^[A-Z]+')).Value
            $raw = $cell.SelectSingleNode('./x:v', $sheetManager).InnerText
            $values[$column] = if ($cell.t -eq 's') { $sharedStrings[[int]$raw] } else { $raw }
        }

        if ($values.A -and $values.B -and $values.C -and $values.D) {
            [pscustomobject]@{
                supplierCode = [string]$values.A
                supplierName = [string]$values.B
                factoryCode  = [string]$values.C
                factoryName  = [string]$values.D
            }
        }
    }

    $suppliers = @(
        $rows |
            Group-Object supplierCode |
            ForEach-Object {
                $first = $_.Group[0]
                [pscustomobject][ordered]@{
                    code = $first.supplierCode
                    name = $first.supplierName
                    factories = @(
                        $_.Group |
                            Group-Object factoryCode |
                            ForEach-Object {
                                [pscustomobject][ordered]@{
                                    code = $_.Group[0].factoryCode
                                    name = $_.Group[0].factoryName
                                }
                            } |
                            Sort-Object name
                    )
                }
            } |
            Sort-Object name
    )

    $outputDirectory = Split-Path -Parent $Output
    New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
    $json = $suppliers | ConvertTo-Json -Depth 6
    [System.IO.File]::WriteAllText(
        [System.IO.Path]::GetFullPath($Output),
        "// Generated from assets/factory-supplier pair.xlsx. Do not edit manually.`nwindow.SUPPLIER_FACTORY_DATA = $json;`n",
        [System.Text.UTF8Encoding]::new($false)
    )

    Write-Host "Generated $($suppliers.Count) suppliers and $($rows.Count) supplier-factory pairs in $Output"
}
finally {
    $archive.Dispose()
}
