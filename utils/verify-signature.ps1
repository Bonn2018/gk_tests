# PowerShell script to verify Windows file signature
# Usage: .\verify-signature.ps1 -FilePath "path\to\file.exe"

param(
    [Parameter(Mandatory=$true)]
    [string]$FilePath
)

# Check if file exists
if (-not (Test-Path $FilePath)) {
    Write-Error "File not found: $FilePath"
    exit 1
}

# Get Authenticode signature
$signature = Get-AuthenticodeSignature -FilePath $FilePath

# Convert to JSON for easier parsing
$signatureJson = $signature | ConvertTo-Json -Depth 10

Write-Host "Signature Information:"
Write-Host $signatureJson

# Check signature status
if ($signature.Status -eq "Valid") {
    Write-Host "✓ Signature is VALID"
    Write-Host "  Signer: $($signature.SignerCertificate.Subject)"
    Write-Host "  Timestamp: $($signature.TimeStamperCertificate.Subject)"
    exit 0
} elseif ($signature.Status -eq "NotSigned") {
    Write-Error "✗ File is NOT SIGNED"
    exit 1
} else {
    Write-Warning "⚠ Signature status: $($signature.Status)"
    Write-Host "  This may indicate a problem with the signature"
    exit 1
}

