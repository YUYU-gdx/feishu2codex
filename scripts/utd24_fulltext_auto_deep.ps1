$env:PYTHONIOENCODING = "utf-8"
$root = Get-Location
$outDir = Join-Path $root 'downloads\utd24_fulltext_auto'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$logPath = Join-Path $outDir 'attempts.csv'
if (-not (Test-Path $logPath)) { "source,query,url,status,detail" | Set-Content -Path $logPath -Encoding UTF8 }

$queries = @(
  '"supply chain" digital',
  '"supply chain" "digital transformation"',
  '"supply chain" analytics'
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

# IDEAS/RePEc: follow top 2 results per query and try to find pdf links
foreach ($q in $queries) {
  $uq = [uri]::EscapeDataString($q)
  $url = "https://ideas.repec.org/cgi-bin/htsearch?cmd=Search&form=extended&query=$uq"
  try {
    & browser-use open $url | Out-Null
    $html = (& browser-use get html) -join ''
    if (-not $html) { Add-Log 'ideas' $q $url 'no_html' 'empty html'; continue }
    $links = [regex]::Matches($html, 'https://ideas.repec.org/[^"]+') | ForEach-Object { $_.Value } | Select-Object -Unique
    if ($links.Count -eq 0) { Add-Log 'ideas' $q $url 'no_links' 'no result links'; continue }
    $i=0
    foreach ($l in $links) {
      if ($i -ge 2) { break }
      & browser-use open $l | Out-Null
      $lh = (& browser-use get html) -join ''
      $pdfs = [regex]::Matches($lh, 'https?://[^"\s]+\.pdf') | ForEach-Object { $_.Value } | Select-Object -Unique
      if ($pdfs.Count -eq 0) { Add-Log 'ideas' $q $l 'no_pdfs' 'no pdf links on detail'; $i++; continue }
      $j=0
      foreach ($p in $pdfs) {
        if ($j -ge 1) { break }
        Save-Pdf 'ideas' $q $p ('ideas_' + $i + '_' + $j)
        $j++
      }
      $i++
    }
  } catch {
    Add-Log 'ideas' $q $url 'error' $_.Exception.Message
  }
}

# White Rose, WRAP, UCL Discovery: follow first 2 record links and try to find pdf
$repoSources = @(
  @{ name='whiterose'; search='https://eprints.whiterose.ac.uk/cgi/search/simple?q='; host='https://eprints.whiterose.ac.uk' },
  @{ name='wrap'; search='https://wrap.warwick.ac.uk/cgi/search/simple?search='; host='https://wrap.warwick.ac.uk' },
  @{ name='ucl'; search='https://discovery.ucl.ac.uk/cgi/search/simple?search='; host='https://discovery.ucl.ac.uk' }
)
foreach ($src in $repoSources) {
  foreach ($q in $queries) {
    $uq = [uri]::EscapeDataString($q)
    $url = $src.search + $uq
    try {
      & browser-use open $url | Out-Null
      $html = (& browser-use get html) -join ''
      if (-not $html) { Add-Log $src.name $q $url 'no_html' 'empty html'; continue }
      $links = [regex]::Matches($html, $src.host + '/[0-9]+/?') | ForEach-Object { $_.Value } | Select-Object -Unique
      if ($links.Count -eq 0) { Add-Log $src.name $q $url 'no_record_links' 'no record links'; continue }
      $i=0
      foreach ($l in $links) {
        if ($i -ge 2) { break }
        & browser-use open $l | Out-Null
        $lh = (& browser-use get html) -join ''
        $pdfs = [regex]::Matches($lh, 'https?://[^"\s]+\.pdf') | ForEach-Object { $_.Value } | Select-Object -Unique
        if ($pdfs.Count -eq 0) { Add-Log $src.name $q $l 'no_pdfs' 'no pdf links on record'; $i++; continue }
        $j=0
        foreach ($p in $pdfs) {
          if ($j -ge 1) { break }
          Save-Pdf $src.name $q $p ($src.name + '_' + $i + '_' + $j)
          $j++
        }
        $i++
      }
    } catch {
      Add-Log $src.name $q $url 'error' $_.Exception.Message
    }
  }
}
