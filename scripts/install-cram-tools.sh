#!/usr/bin/env bash
set -euo pipefail
if [ "$(id -u)" -ne 0 ]; then
  echo 'Run this installer as root inside Ubuntu (the Windows setup script does this).'
  exit 1
fi
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y samtools bcftools curl ca-certificates xz-utils python3
# Official Node 22 distribution, checked against its published SHA256 manifest.
case "$(uname -m)" in
  x86_64) node_arch=x64 ;;
  aarch64) node_arch=arm64 ;;
  *) echo 'Unsupported CPU architecture'; exit 1 ;;
esac
setup_tmp=$(mktemp -d)
trap 'rm -rf -- "$setup_tmp"' EXIT
cd "$setup_tmp"
curl --fail --silent --show-error --location https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt -o SHASUMS256.txt
node_archive=$(awk -v suffix="-linux-${node_arch}.tar.xz" 'index($2,suffix) && substr($2,length($2)-length(suffix)+1)==suffix {print $2}' SHASUMS256.txt)
if [ -z "$node_archive" ] || [[ "$node_archive" == *$'\n'* ]] || [[ ! "$node_archive" =~ ^node-v22\.[0-9]+\.[0-9]+-linux-(x64|arm64)\.tar\.xz$ ]]; then
  echo 'Could not identify exactly one official Node 22 archive'; exit 1
fi
curl --fail --silent --show-error --location "https://nodejs.org/dist/latest-v22.x/$node_archive" -o "$node_archive"
awk -v file="$node_archive" '$2==file' SHASUMS256.txt > selected.sha256
sha256sum --check selected.sha256
tar -xJf "$node_archive" --directory /usr/local --strip-components=1
node --version
samtools --version
bcftools --version
echo 'CRAM tools installed. Supply your alignment, index, and exact reference FASTA to the project adapter.'
