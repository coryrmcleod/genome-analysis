$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
function Select-LocalFile([string]$title, [string]$filter) {
    $dialog = New-Object System.Windows.Forms.OpenFileDialog
    $dialog.Title = $title
    $dialog.Filter = $filter
    $dialog.CheckFileExists = $true
    if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { return $null }
    return $dialog.FileName
}
function Wsl-Path([string]$localPath) {
    $converted = & wsl.exe -d Ubuntu -- wslpath -a ($localPath -replace '\\', '/')
    if ($LASTEXITCODE -ne 0) { throw 'Could not translate the local file path for WSL.' }
    return ($converted -join '').Trim()
}
try {
    $inputFile = Select-LocalFile 'Choose the supplemented VCF to normalize' 'VCF files (*.vcf;*.vcf.gz)|*.vcf;*.vcf.gz'
    if (-not $inputFile) { Write-Host 'Cancelled.'; exit 0 }
    $referenceFile = 'D:\Genome Data Nebula Genomics\Reference\illumina-hg38.fa'
    if (-not (Test-Path -LiteralPath $referenceFile)) {
        $referenceFile = Select-LocalFile 'Choose the verified GRCh38 FASTA' 'FASTA files (*.fa;*.fasta)|*.fa;*.fasta'
    }
    if (-not $referenceFile) { Write-Host 'Cancelled.'; exit 0 }
    $outputDirectory = Join-Path (Split-Path -Parent $inputFile) ('Normalized-' + (Get-Date -Format 'yyyy-MM-dd-HHmmss'))
    $scriptFile = Join-Path $PSScriptRoot 'normalize-analysis-vcf.mjs'
    Write-Host 'Creating a separate normalized copy. Your original file stays unchanged.'
    & wsl.exe -d Ubuntu -- node (Wsl-Path $scriptFile) (Wsl-Path $inputFile) (Wsl-Path $referenceFile) (Wsl-Path $outputDirectory)
    if ($LASTEXITCODE -ne 0) { throw 'Normalization failed. Review the message above; do not import partial output.' }
    Write-Host ('Finished. Import the analysis-ready VCF from: ' + $outputDirectory)
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
