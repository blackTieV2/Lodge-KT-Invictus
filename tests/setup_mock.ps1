# Entirely synthetic: mocked gh executable and mocked Cloudflare reads.
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Temp = Join-Path ([IO.Path]::GetTempPath()) ('invictus-setup-test-' + [Guid]::NewGuid())
[void](New-Item -ItemType Directory $Temp)
$PreviousPath = $env:PATH
$global:SetupTestToken = 'synthetic-token-for-tests-only-1234567890'
$env:SETUP_TEST_LOG = Join-Path $Temp 'calls.jsonl'
$Shim = @'
#!/usr/bin/env python3
import base64,json,os,sys
args=sys.argv[1:]; value=sys.stdin.read()
with open(os.environ['SETUP_TEST_LOG'],'a') as f:f.write(json.dumps({'args':args,'input':value})+'\n')
mode=os.environ.get('SETUP_TEST_MODE','')
if args[:2]==['auth','status']:sys.exit(0)
if args[:2]==['api','repos/blackTieV2/Lodge-KT-Invictus']:
 print(json.dumps({'full_name':'blackTieV2/Lodge-KT-Invictus','permissions':{'admin':True}}));sys.exit(0)
if len(args)>1 and '/contents/wrangler.jsonc' in args[1]:
 config={'workers_dev':False,'routes':[{'pattern':'invictus.layer-8-labs.com','custom_domain':True}]}
 print(json.dumps({'content':base64.b64encode(json.dumps(config).encode()).decode()}));sys.exit(0)
if len(args)>1 and '/environments/production' in args[1]:
 if mode=='missing-env':print('gh: Not Found (HTTP 404)',file=sys.stderr);sys.exit(1)
 print('{}');sys.exit(0)
if args[:3]==['api','--method','PUT']:print('{}');sys.exit(0)
if args[:2]==['secret','set']:
 if mode=='fail-secret' and args[2]=='CLOUDFLARE_API_TOKEN':sys.exit(1)
 sys.exit(0)
if args[:2]==['workflow','run']:sys.exit(0)
print('Unexpected test command',file=sys.stderr);sys.exit(1)
'@
$ShimPath = Join-Path $Temp 'gh'
[IO.File]::WriteAllText($ShimPath,$Shim,[Text.UTF8Encoding]::new($false))
& chmod +x $ShimPath
if ($LASTEXITCODE) { throw 'Cannot enable synthetic test executable.' }
$env:PATH = $Temp + [IO.Path]::PathSeparator + $env:PATH
function global:Read-Host {
    param([string]$Prompt,[switch]$AsSecureString)
    if ($AsSecureString) { return ConvertTo-SecureString $global:SetupTestToken -AsPlainText -Force }
    if ($Prompt -like 'Your Invictus*') { return 'admin@example.invalid' }
    if ($Prompt -like 'Treasurer*') { if ($env:SETUP_TEST_MODE -eq 'duplicate-email') { return 'admin@example.invalid' }; return '' }
    if ($Prompt -like 'Preceptor*') { return '' }
    if ($Prompt -like 'Type CONFIGURE*') { if ($env:SETUP_TEST_MODE -eq 'cancel') { return 'NO' }; return 'CONFIGURE' }
    throw 'Unexpected test prompt.'
}
function global:Invoke-RestMethod {
    [CmdletBinding()]
    param($Uri,$Method,$Headers,$MaximumRedirection,$TimeoutSec)
    if ($Method -ne 'Get' -or $Headers.Authorization -ne "Bearer $global:SetupTestToken") { throw 'Unsafe preflight in test.' }
    if ($Uri -like '*zones?name=*') {
        return [pscustomobject]@{success=$true;result=@([pscustomobject]@{id=('b'*32);name='layer-8-labs.com';status='active';account=@{id=('a'*32)}})}
    }
    if ($Uri -like '*/access/organizations') {
        if ($env:SETUP_TEST_MODE -eq 'missing-zerotrust') { throw 'Synthetic configuration failure.' }
        return [pscustomobject]@{success=$true;result=@{auth_domain='synthetic.cloudflareaccess.com'}}
    }
    return [pscustomobject]@{success=$true;result=@()}
}
try {
    foreach ($Mode in @('success','missing-env','cancel','duplicate-email','missing-zerotrust','fail-secret')) {
        $env:SETUP_TEST_MODE=$Mode
        Remove-Item $env:SETUP_TEST_LOG -ErrorAction SilentlyContinue
        $Failed=$false
        try { $Captured = & (Join-Path $Root 'scripts/Configure-Cloudflare.ps1') -Deploy 6>&1 }
        catch { $Failed=$true; $Captured=$_.Exception.Message }
        if (($Captured|Out-String).Contains($global:SetupTestToken)) { throw 'Synthetic token leaked to displayed output.' }
        $Calls=@(Get-Content $env:SETUP_TEST_LOG|ForEach-Object{$_|ConvertFrom-Json})
        foreach($Call in $Calls) { if (($Call.args -join ' ').Contains($global:SetupTestToken)) { throw 'Token appeared in process arguments.' } }
        $Secrets=@($Calls|Where-Object{$_.args[0] -eq 'secret'})
        $Dispatch=@($Calls|Where-Object{$_.args[0] -eq 'workflow'})
        if ($Mode -in @('success','missing-env')) {
            if ($Failed -or $Secrets.Count -ne 3 -or $Dispatch.Count -ne 1) { throw "Success path failed in $Mode : $Captured" }
            if (($Secrets|Where-Object{$_.args[2] -eq 'CLOUDFLARE_API_TOKEN'}).input -cne $global:SetupTestToken) { throw 'Token stdin changed.' }
            foreach($Secret in $Secrets) { if (($Secret.args -join ' ') -notlike '*--repo blackTieV2/Lodge-KT-Invictus --env production') { throw 'Wrong secret target.' } }
            $RoleMap=($Secrets|Where-Object{$_.args[2] -eq 'OFFICER_ROLES'}).input|ConvertFrom-Json -AsHashtable
            if ($RoleMap.Count -ne 1 -or $RoleMap['admin@example.invalid'] -ne 'admin') { throw 'Incorrect role mapping.' }
        } else {
            if (-not $Failed -or $Dispatch.Count) { throw "Failure did not stop deployment in $Mode" }
            if ($Mode -ne 'fail-secret' -and $Secrets.Count) { throw 'Secrets uploaded before preflight/confirmation completed.' }
        }
        Write-Host "PASS: synthetic setup scenario $Mode"
    }
}
finally {
    $env:PATH=$PreviousPath
    Remove-Item Function:\Read-Host,Function:\Invoke-RestMethod -ErrorAction SilentlyContinue
    Remove-Item Env:\SETUP_TEST_LOG,Env:\SETUP_TEST_MODE -ErrorAction SilentlyContinue
    Remove-Variable SetupTestToken -Scope Global -ErrorAction SilentlyContinue
    Remove-Item $Temp -Recurse -Force
}
