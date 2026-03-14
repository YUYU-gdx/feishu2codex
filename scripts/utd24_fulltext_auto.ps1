$env:PYTHONIOENCODING = "utf-8"
$root = Get-Location
$outDir = Join-Path $root 'downloads\utd24_fulltext_auto'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$logPath = Join-Path $outDir 'attempts.csv'
"source,query,url,status,detail" | Set-Content -Path $logPath -Encoding UTF8

$queries = @(
  '"supply chain" digital',
  '"supply chain" "digital transformation"'
)

function Add-Log($source,$query,$url,$status,$detail) {
  ($source + ',' + ($query -replace '"','""') + ',' + $url + ',' + $status + ',' + ($detail -replace '"','""')) | Add-Content -Path $logPath -Encoding UTF8
}

function Save-Pdf($source,$query,$pdfUrl,$namePrefix) {
  try {
    $file = Join-Path $outDir ($namePrefix + '_' + [IO.Path]::GetFileName(($pdfUrl -split '\?')[0]))
    Invoke-WebRequest -Uri $pdfUrl -OutFile $file -TimeoutSec 60
    Add-Log $source $query $pdfUrl 'downloaded' $file
  } catch {
    Add-Log $source $query $pdfUrl 'download_failed' $_.Exception.Message
  }
}

# arXiv
foreach ($q in $queries) {
  $uq = [uri]::EscapeDataString($q)
  $url = "https://arxiv.org/search/?query=$uq&searchtype=all&source=header"
  try {
    & browser-use open $url | Out-Null
    $html = (& browser-use get html) -join ''
    if (-not $html) { Add-Log 'arxiv' $q $url 'no_html' 'empty html'; continue }
    $pdfs = [regex]::Matches($html, 'https://arxiv.org/pdf/[0-9\.]+') | ForEach-Object { $_.Value } | Select-Object -Unique
    if ($pdfs.Count -eq 0) { Add-Log 'arxiv' $q $url 'no_pdfs' 'no pdf links'; continue }
    $i=0
    foreach ($p in $pdfs) {
      if ($i -ge 2) { break }
      Save-Pdf 'arxiv' $q ($p + '.pdf') ('arxiv_' + $i)
      $i++
    }
  } catch {
    Add-Log 'arxiv' $q $url 'error' $_.Exception.Message
  }
}

# SSRN
foreach ($q in $queries) {
  $uq = [uri]::EscapeDataString($q)
  $url = "https://papers.ssrn.com/sol3/results.cfm?txtKey_Words=$uq"
  try {
    & browser-use open $url | Out-Null
    $html = (& browser-use get html) -join ''
    if (-not $html) { Add-Log 'ssrn' $q $url 'no_html' 'empty html'; continue }
    $abs = [regex]::Matches($html, 'https://papers.ssrn.com/sol3/papers.cfm\?abstract_id=\d+') | ForEach-Object { $_.Value } | Select-Object -Unique
    if ($abs.Count -eq 0) { Add-Log 'ssrn' $q $url 'no_abs' 'no abstract links'; continue }
    $i=0
    foreach ($a in $abs) {
      if ($i -ge 1) { break }
      & browser-use open $a | Out-Null
      $ah = (& browser-use get html) -join ''
      $pdf = [regex]::Match($ah, 'https://papers.ssrn.com/sol3/Delivery.cfm/[^"\s]+').Value
      if ($pdf) { Save-Pdf 'ssrn' $q $pdf ('ssrn_' + $i) } else { Add-Log 'ssrn' $q $a 'no_pdf' 'no delivery link' }
      $i++
    }
  } catch {
    Add-Log 'ssrn' $q $url 'error' $_.Exception.Message
  }
}
