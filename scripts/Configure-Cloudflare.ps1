#requires -Version 7.0
<#
One-time administrative authorisation. The application still runs only in Cloudflare.
No SSH, local server, home IP, source upload, firewall change or tunnel is used.
Cloudflare reads validate the target; GitHub stores three environment secrets.
#>
[CmdletBinding()]
param([switch]$Deploy)

$ErrorActionPreference = 'Stop'
$Repo = 'blackTieV2/Lodge-KT-Invictus'
$ZoneName = 'layer-8-labs.com'
$Target = 'invictus.layer-8-labs.com'
$EnvironmentName = 'production'
$GhPath = (Get-Command gh -ErrorAction Stop).Source
$PlainToken = $null
$SecureToken = $null
$TokenPointer = [IntPtr]::Zero

function Invoke-Gh {
    param([string[]]$Arguments, [AllowNull()][string]$InputText = $null, [switch]$PermitFailure)
    $Info = [Diagnostics.ProcessStartInfo]::new()
    $Info.FileName = $GhPath
    $Info.UseShellExecute = $false
    $Info.RedirectStandardInput = $true
    $Info.RedirectStandardOutput = $true
    $Info.RedirectStandardError = $true
    $Info.StandardInputEncoding = [Text.UTF8Encoding]::new($false)
    $Info.Environment['GH_PROMPT_DISABLED'] = '1'
    foreach ($Value in $Arguments) { $Info.ArgumentList.Add($Value) }
    $Process = [Diagnostics.Process]::new()
    $Process.StartInfo = $Info
    try {
        [void]$Process.Start()
        $OutTask = $Process.StandardOutput.ReadToEndAsync()
        $ErrTask = $Process.StandardError.ReadToEndAsync()
        if ($null -ne $InputText) { $Process.StandardInput.Write($InputText) }
        $Process.StandardInput.Close()
        if (-not $Process.WaitForExit(120000)) {
            $Process.Kill($true)
            throw 'GitHub command timed out. No secret output was printed.'
        }
        $Result = [pscustomobject]@{
            Code = $Process.ExitCode
            Text = $OutTask.GetAwaiter().GetResult()
            ErrorText = $ErrTask.GetAwaiter().GetResult()
        }
        if ($Result.Code -ne 0 -and -not $PermitFailure) {
            throw 'GitHub command failed. Check gh authentication, repository administration and environment permissions. Secret output was suppressed.'
        }
        return $Result
    }
    finally { $Process.Dispose() }
}
function Read-Cf {
    param([string]$Path)
    try {
        $Response = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/$Path" `
            -Method Get -Headers @{Authorization = "Bearer $PlainToken"} `
            -MaximumRedirection 0 -TimeoutSec 30 -ErrorAction Stop
    }
    catch { throw "Cloudflare read failed for '$Path'. Check the scoped token and Zero Trust setup; token/response not printed." }
    if ($Response.success -ne $true) { throw "Cloudflare did not confirm the '$Path' read." }
    return $Response.result
}
function Set-ProductionSecret {
    param([string]$Name, [string]$Value)
    [void](Invoke-Gh -Arguments @('secret','set',$Name,'--repo',$Repo,'--env',$EnvironmentName) -InputText $Value)
    Write-Host "Stored production secret: $Name"
}
function Read-Email {
    param([string]$Prompt, [switch]$Optional)
    $Value = (Read-Host $Prompt).Trim().ToLowerInvariant()
    if (-not $Value -and $Optional) { return '' }
    if ($Value -notmatch '^[^\s@]+@[^\s@]+\.[^\s@]+$') { throw 'Enter a valid sign-in email address.' }
    return $Value
}

try {
    [void](Invoke-Gh -Arguments @('auth','status','--hostname','github.com'))
    $Repository = (Invoke-Gh -Arguments @('api',"repos/$Repo")).Text | ConvertFrom-Json
    if ($Repository.full_name -cne $Repo -or -not $Repository.permissions.admin) {
        throw 'Repository identity or administrator permission is not confirmed.'
    }
    $RemoteConfig = (Invoke-Gh -Arguments @('api',"repos/$Repo/contents/wrangler.jsonc?ref=main")).Text | ConvertFrom-Json
    $Config = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($RemoteConfig.content)) | ConvertFrom-Json
    if ($Config.workers_dev -ne $false -or $Config.routes.Count -ne 1 -or
        $Config.routes[0].pattern -ne $Target -or $Config.routes[0].custom_domain -ne $true) {
        throw 'Remote main is not the approved Cloudflare-only configuration. Stop before storing credentials.'
    }
    Write-Host "Target: $Target (Cloudflare only)"
    Write-Host 'Use a scoped Cloudflare deployment API token, not your password, Global API key or Wrangler credential file.'
    Write-Host 'Required scope details are in docs/CLOUDFLARE-SETUP.md.'
    $SecureToken = Read-Host 'Paste the deployment API token (hidden)' -AsSecureString
    $TokenPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureToken)
    $PlainToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($TokenPointer).Trim()
    if ($PlainToken.Length -lt 20 -or $PlainToken.Length -gt 512 -or $PlainToken -match '\s') {
        throw 'Invalid token format.'
    }
    $Zones = @(Read-Cf "zones?name=$ZoneName&per_page=100")
    if ($Zones.Count -ne 1 -or $Zones[0].name -ne $ZoneName -or $Zones[0].status -ne 'active') {
        throw 'Exactly one accessible, active Layer-8 Labs zone is required.'
    }
    $Zone = $Zones[0]
    $AccountId = [string]$Zone.account.id
    if ($AccountId -notmatch '^[a-f0-9]{32}$' -or $Zone.id -notmatch '^[a-f0-9]{32}$') { throw 'Unexpected account or zone identifier.' }
    $Organisation = Read-Cf "accounts/$AccountId/access/organizations"
    if ($Organisation.auth_domain -notmatch '^[a-z0-9-]+\.cloudflareaccess\.com$') {
        throw 'Enable Cloudflare Zero Trust for this account before continuing. No account settings were changed.'
    }
    [void](Read-Cf "zones/$($Zone.id)/dns_records?name=$Target&per_page=100")
    [void](Read-Cf "accounts/$AccountId/workers/domains?hostname=$Target&per_page=100")
    [void](Read-Cf "accounts/$AccountId/access/apps?per_page=100")
    [void](Read-Cf "accounts/$AccountId/d1/database?name=invictus-register&per_page=100")
    Write-Host 'Cloudflare account, active zone, Zero Trust and API reads verified. Write permissions will be checked by deployment.'

    $Admin = Read-Email 'Your Invictus administrator sign-in email'
    $Treasurer = Read-Email 'Treasurer sign-in email (Enter to add later)' -Optional
    $Viewer = Read-Email 'Preceptor read-only sign-in email (Enter to add later)' -Optional
    $Roles = @{}
    $Roles[$Admin] = 'admin'
    foreach ($Entry in @(@($Treasurer,'treasurer'),@($Viewer,'viewer'))) {
        if ($Entry[0]) {
            if ($Roles.ContainsKey($Entry[0])) { throw 'The same email was entered for different roles. Nothing was uploaded.' }
            $Roles[$Entry[0]] = $Entry[1]
        }
    }
    $RoleJson = $Roles | ConvertTo-Json -Compress
    Write-Host "Will store three secrets for only $Repo / production, covering $($Roles.Count) approved sign-in accounts."
    if ((Read-Host 'Type CONFIGURE to store these credentials in GitHub').Trim() -cne 'CONFIGURE') {
        throw 'Configuration cancelled. Credentials were not uploaded.'
    }
    $Environment = Invoke-Gh -Arguments @('api',"repos/$Repo/environments/$EnvironmentName") -PermitFailure
    if ($Environment.Code -ne 0) {
        if ($Environment.ErrorText -notmatch 'HTTP 404') { throw 'Cannot verify the production environment. No protection rules were changed.' }
        [void](Invoke-Gh -Arguments @('api','--method','PUT',"repos/$Repo/environments/$EnvironmentName",'--input','-') -InputText '{}')
    }
    Set-ProductionSecret 'CLOUDFLARE_ACCOUNT_ID' $AccountId
    Set-ProductionSecret 'OFFICER_ROLES' $RoleJson
    Set-ProductionSecret 'CLOUDFLARE_API_TOKEN' $PlainToken
    Write-Host 'Credential setup complete. No local application or home-lab connection was created.'
    if ($Deploy) {
        [void](Invoke-Gh -Arguments @('workflow','run','deploy-online.yml','--repo',$Repo,'--ref','main'))
        Write-Host 'Cloud deployment requested. This is not proof of successful deployment.'
        Write-Host "Check with: gh run list --repo $Repo --workflow deploy-online.yml --limit 3"
    }
    else { Write-Host "To start deployment: gh workflow run deploy-online.yml --repo $Repo --ref main" }
}
finally {
    if ($TokenPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($TokenPointer) }
    if ($null -ne $SecureToken) { $SecureToken.Dispose() }
    $PlainToken = $null
    $RoleJson = $null
    # Managed strings are not guaranteed zeroised; no secret is intentionally persisted locally.
}
