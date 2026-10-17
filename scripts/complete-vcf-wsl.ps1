$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms

function Select-LocalFile([string]$Title, [string]$Filter) {
    $dialog = New-Object System.Windows.Forms.OpenFileDialog
    $dialog.Title = $Title
    $dialog.Filter = $Filter
    $dialog.CheckFileExists = $true
    if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { return $null }
    return $dialog.FileName
}

function Select-LocalFolder([string]$Title) {
    $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
    $dialog.Description = $Title
    $dialog.ShowNewFolderButton = $true
    if ($dialog.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { return $null }
    return $dialog.SelectedPath
}

function Wsl-Path([string]$LocalPath) {
    $converted = & wsl.exe -d Ubuntu -- wslpath -a ($LocalPath -replace '\\', '/')
    if ($LASTEXITCODE -ne 0) { throw "Could not translate this path for WSL: $LocalPath" }
    return ($converted -join '').Trim()
}

function Run-WslNode([string]$ScriptFile, [string[]]$Arguments) {
    $linuxScript = Wsl-Path $ScriptFile
    $linuxArguments = @($Arguments | ForEach-Object { Wsl-Path $_ })
    & wsl.exe -d Ubuntu -- node $linuxScript @linuxArguments
    if ($LASTEXITCODE -ne 0) { throw 'The local calling workflow did not finish. No partial result should be imported.' }
}

try {
    $answer = [System.Windows.Forms.MessageBox]::Show(
        'This creates a new analysis-ready VCF. It keeps your original VCF unchanged, calls only missing Genome Analysis target positions from local CRAM/BAM data, and never uploads data. Continue only if you have the exact reference FASTA used for the alignment.',
        'Complete Genome Analysis VCF',
        [System.Windows.Forms.MessageBoxButtons]::OKCancel,
        [System.Windows.Forms.MessageBoxIcon]::Information)
    if ($answer -ne [System.Windows.Forms.DialogResult]::OK) { Write-Host 'Cancelled.'; exit 0 }

    $original = Select-LocalFile 'Choose the original gzip-compressed VCF to supplement' 'Compressed VCF files (*.vcf.gz)|*.vcf.gz'
    if (-not $original) { Write-Host 'Cancelled.'; exit 0 }
    $alignment = Select-LocalFile 'Choose the coordinate-sorted, single-sample CRAM or BAM file' 'Alignment files (*.cram;*.bam)|*.cram;*.bam'
    if (-not $alignment) { Write-Host 'Cancelled.'; exit 0 }
    $reference = Select-LocalFile 'Choose the exact GRCh38 reference FASTA used for this alignment' 'FASTA files (*.fa;*.fasta)|*.fa;*.fasta'
    if (-not $reference) { Write-Host 'Cancelled.'; exit 0 }
    if (-not (Test-Path -LiteralPath ($reference + '.fai'))) { throw 'The reference FASTA index (.fai) is missing. Create it with samtools faidx, then run this launcher again.' }
    $parent = Select-LocalFolder 'Choose where to save the new analysis-ready VCF folder'
    if (-not $parent) { Write-Host 'Cancelled.'; exit 0 }

    $output = Join-Path $parent ('Genome-Analysis-Completed-' + (Get-Date -Format 'yyyy-MM-dd-HHmmss'))
    if (Test-Path -LiteralPath $output) { throw "Refusing to reuse an existing output folder: $output" }
    New-Item -ItemType Directory -Path $output -ErrorAction Stop | Out-Null
    $callOutput = Join-Path $output 'Target-Calls'
    $combinedOutput = Join-Path $output 'Ready-to-Import'
    $normalizedOutput = Join-Path $output 'Analysis-Ready'
    $callScript = Join-Path $PSScriptRoot 'call-alignment.mjs'
    $supplementScript = Join-Path $PSScriptRoot 'supplement-vcf.mjs'
    $normalizeScript = Join-Path $PSScriptRoot 'normalize-analysis-vcf.mjs'

    Write-Host 'Calling only positions absent from the original VCF. This can take several minutes.' -ForegroundColor Cyan
    $linuxCallScript = Wsl-Path $callScript
    & wsl.exe -d Ubuntu -- node $linuxCallScript --alignment (Wsl-Path $alignment) --reference (Wsl-Path $reference) --build GRCh38 --output (Wsl-Path $callOutput) --missing-from (Wsl-Path $original)
    if ($LASTEXITCODE -ne 0) { throw 'Targeted calling failed. Check that WSL tools are installed, the alignment is indexed, and the reference exactly matches it.' }

    Write-Host 'Combining only absent target calls with the original VCF.' -ForegroundColor Cyan
    $outputStem = 'genome-analysis-completed'
    & wsl.exe -d Ubuntu -- node (Wsl-Path $supplementScript) (Wsl-Path $original) (Wsl-Path (Join-Path $callOutput 'panel.vcf')) (Wsl-Path $combinedOutput) $outputStem
    if ($LASTEXITCODE -ne 0) { throw 'VCF supplementation failed. The original VCF remains unchanged.' }

    $combined = Join-Path $combinedOutput ($outputStem + '.supplemented.vcf.gz')
    if (-not (Test-Path -LiteralPath $combined)) { throw 'The combined VCF was not created.' }
    Write-Host 'Normalizing the combined VCF against the verified reference.' -ForegroundColor Cyan
    & wsl.exe -d Ubuntu -- node (Wsl-Path $normalizeScript) (Wsl-Path $combined) (Wsl-Path $reference) (Wsl-Path $normalizedOutput)
    if ($LASTEXITCODE -ne 0) { throw 'Normalization failed. Do not import partial output.' }

    $final = Join-Path $normalizedOutput ($outputStem + '.supplemented.analysis-ready.vcf.gz')
    if (-not (Test-Path -LiteralPath $final)) { throw 'The analysis-ready VCF was not created.' }
    Write-Host ''
    Write-Host 'Finished successfully. Import this file into Genome Analysis:' -ForegroundColor Green
    Write-Host $final -ForegroundColor Green
    Write-Host 'The original VCF was not modified. Review provenance and supplementation-audit.json before interpreting results.'
    Invoke-Item $normalizedOutput
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
