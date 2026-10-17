$ErrorActionPreference = 'Stop'
$wslExe = Join-Path $env:WINDIR 'System32\wsl.exe'
$distro = 'Ubuntu'
$installedDistros = ((& $wslExe --list --quiet 2>$null) -replace "`0", '')
if ($installedDistros -notcontains $distro) {
    & $wslExe --install -d $distro --no-launch --web-download
    if ($LASTEXITCODE -ne 0) { throw 'Ubuntu installation could not finish. If Windows requests a restart, restart and run this setup again.' }
}
& $wslExe -d $distro -u root -- true
if ($LASTEXITCODE -ne 0) { throw 'Ubuntu cannot start yet. Restart Windows to apply WSL features, then run this setup again.' }
$installerPath = (Resolve-Path (Join-Path $PSScriptRoot 'install-cram-tools.sh')).Path
$linuxInstaller = & $wslExe -d $distro -u root -- wslpath -a $installerPath
if ($LASTEXITCODE -ne 0) { throw 'Could not translate the installer path into WSL.' }
& $wslExe -d $distro -u root -- bash ($linuxInstaller.Trim())
if ($LASTEXITCODE -ne 0) { throw 'CRAM tools installation failed. Review the output above; rerunning the setup is supported.' }
Write-Host 'Setup complete: Ubuntu, Node 22, SAMtools, and BCFtools are ready.'
