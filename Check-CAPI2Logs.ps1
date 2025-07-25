param(
    [Parameter(Mandatory=$true)]
    [string]$ComputerName,
    
    [Parameter(Mandatory=$false)]
    [System.Management.Automation.PSCredential]$Credential
)

function Check-CAPI2Logs {
    param(
        [string]$Computer,
        [System.Management.Automation.PSCredential]$Cred
    )
    
    try {
        Write-Host "Checking CAPI2 logs on computer: $Computer" -ForegroundColor Yellow
        
        # Prepare session parameters
        $sessionParams = @{
            ComputerName = $Computer
            ErrorAction = 'Stop'
        }
        
        if ($Cred) {
            $sessionParams.Credential = $Cred
        }
        
        # Test connectivity first
        if (-not (Test-Connection -ComputerName $Computer -Count 1 -Quiet)) {
            throw "Computer $Computer is not reachable via ping"
        }
        
        # Check CAPI2 log status
        $scriptBlock = {
            try {
                # Get CAPI2 log information
                $capi2Log = Get-WinEvent -ListLog "Microsoft-Windows-CAPI2/Operational" -ErrorAction Stop
                
                $result = [PSCustomObject]@{
                    ComputerName = $env:COMPUTERNAME
                    LogName = $capi2Log.LogName
                    IsEnabled = $capi2Log.IsEnabled
                    LogMode = $capi2Log.LogMode
                    MaximumSizeInBytes = $capi2Log.MaximumSizeInBytes
                    RecordCount = $capi2Log.RecordCount
                    IsLogFull = $capi2Log.IsLogFull
                    LastAccessTime = $capi2Log.LastAccessTime
                    LastWriteTime = $capi2Log.LastWriteTime
                    Status = if ($capi2Log.IsEnabled) { "ENABLED" } else { "DISABLED" }
                }
                
                return $result
            }
            catch {
                throw "Failed to retrieve CAPI2 log information: $($_.Exception.Message)"
            }
        }
        
        # Execute the script block on remote computer
        $result = Invoke-Command @sessionParams -ScriptBlock $scriptBlock
        
        # Display results
        Write-Host "`nCAPI2 Log Status for $Computer:" -ForegroundColor Green
        Write-Host "================================" -ForegroundColor Green
        Write-Host "Computer Name: " -NoNewline; Write-Host $result.ComputerName -ForegroundColor Cyan
        Write-Host "Log Name: " -NoNewline; Write-Host $result.LogName -ForegroundColor Cyan
        Write-Host "Status: " -NoNewline
        if ($result.IsEnabled) {
            Write-Host $result.Status -ForegroundColor Green
        } else {
            Write-Host $result.Status -ForegroundColor Red
        }
        Write-Host "Log Mode: " -NoNewline; Write-Host $result.LogMode -ForegroundColor Cyan
        Write-Host "Maximum Size: " -NoNewline; Write-Host "$([math]::Round($result.MaximumSizeInBytes / 1MB, 2)) MB" -ForegroundColor Cyan
        Write-Host "Record Count: " -NoNewline; Write-Host $result.RecordCount -ForegroundColor Cyan
        Write-Host "Is Log Full: " -NoNewline; Write-Host $result.IsLogFull -ForegroundColor Cyan
        Write-Host "Last Access: " -NoNewline; Write-Host $result.LastAccessTime -ForegroundColor Cyan
        Write-Host "Last Write: " -NoNewline; Write-Host $result.LastWriteTime -ForegroundColor Cyan
        
        # Provide recommendations
        Write-Host "`nRecommendations:" -ForegroundColor Yellow
        if (-not $result.IsEnabled) {
            Write-Host "- CAPI2 logging is DISABLED. To enable it, run:" -ForegroundColor Red
            Write-Host "  wevtutil sl Microsoft-Windows-CAPI2/Operational /e:true" -ForegroundColor White
        } else {
            Write-Host "- CAPI2 logging is properly enabled" -ForegroundColor Green
            if ($result.RecordCount -eq 0) {
                Write-Host "- No CAPI2 events recorded yet" -ForegroundColor Yellow
            } else {
                Write-Host "- $($result.RecordCount) CAPI2 events have been recorded" -ForegroundColor Green
            }
        }
        
        return $result
    }
    catch {
        Write-Error "Error checking CAPI2 logs on $Computer: $($_.Exception.Message)"
        return $null
    }
}

function Enable-CAPI2Logs {
    param(
        [string]$Computer,
        [System.Management.Automation.PSCredential]$Cred
    )
    
    try {
        Write-Host "`nAttempting to enable CAPI2 logs on $Computer..." -ForegroundColor Yellow
        
        # Prepare session parameters
        $sessionParams = @{
            ComputerName = $Computer
            ErrorAction = 'Stop'
        }
        
        if ($Cred) {
            $sessionParams.Credential = $Cred
        }
        
        $scriptBlock = {
            try {
                # Enable CAPI2 logging
                $result = Start-Process -FilePath "wevtutil.exe" -ArgumentList "sl Microsoft-Windows-CAPI2/Operational /e:true" -Wait -PassThru -WindowStyle Hidden
                
                if ($result.ExitCode -eq 0) {
                    return "SUCCESS: CAPI2 logging has been enabled"
                } else {
                    return "FAILED: Exit code $($result.ExitCode)"
                }
            }
            catch {
                return "ERROR: $($_.Exception.Message)"
            }
        }
        
        $enableResult = Invoke-Command @sessionParams -ScriptBlock $scriptBlock
        Write-Host $enableResult -ForegroundColor $(if ($enableResult.StartsWith("SUCCESS")) { "Green" } else { "Red" })
        
        if ($enableResult.StartsWith("SUCCESS")) {
            # Verify the change
            Start-Sleep -Seconds 2
            Write-Host "Verifying the change..." -ForegroundColor Yellow
            Check-CAPI2Logs -Computer $Computer -Cred $Cred
        }
    }
    catch {
        Write-Error "Error enabling CAPI2 logs on $Computer: $($_.Exception.Message)"
    }
}

# Main execution
Clear-Host
Write-Host "CAPI2 Log Checker for Remote Computers" -ForegroundColor Magenta
Write-Host "======================================" -ForegroundColor Magenta

$result = Check-CAPI2Logs -Computer $ComputerName -Cred $Credential

if ($result -and -not $result.IsEnabled) {
    Write-Host "`nWould you like to enable CAPI2 logging on $ComputerName? (Y/N): " -ForegroundColor Yellow -NoNewline
    $response = Read-Host
    
    if ($response -eq 'Y' -or $response -eq 'y') {
        Enable-CAPI2Logs -Computer $ComputerName -Cred $Credential
    }
}

Write-Host "`nScript completed." -ForegroundColor Green