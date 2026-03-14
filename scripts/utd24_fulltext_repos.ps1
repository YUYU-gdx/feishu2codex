$env:PYTHONIOENCODING = "utf-8"
$root = Get-Location
$outDir = Join-Path $root 'downloads\utd24_fulltext_auto'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$logPath = Join-Path $outDir 'attempts.csv'
if (-not (Test-Path $logPath)) { "source,query,url,status,detail" | Set-Content -Path $logPath -Encoding UTF8 }

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

# IDEAS/RePEc
foreach ($q in $queries) {
  $uq = [uri]::EscapeDataString($q)
  $url = "https://ideas.repec.org/cgi-bin/htsearch?cmd=Search&form=extended&query=$uq"
  try {
    & browser-use open $url | Out-Null
    $html = (& browser-use get html) -join ''
    if (-not $html) { Add-Log 'ideas' $q $url 'no_html' 'empty html'; continue }
    $links = [regex]::Matches($html, 'https://ideas.repec.org/[^"]+') | ForEach-Object { $_.Value } | Select-Object -Unique
    if ($links.Count -eq 0) { Add-Log 'ideas' $q $url 'no_links' 'no result links'; continue }
    Add-Log 'ideas' $q $url 'ok' ('results:' + $links.Count)
  } catch {
    Add-Log 'ideas' $q $url 'error' $_.Exception.Message
  }
}

# White Rose, WRAP, UCL Discovery
$repoSources = @(
  @{ name='whiterose'; search='https://eprints.whiterose.ac.uk/cgi/search/simple?q=' },
  @{ name='wrap'; search='https://wrap.warwick.ac.uk/cgi/search/simple?search=' },
  @{ name='ucl'; search='https://discovery.ucl.ac.uk/cgi/search/simple?search=' }
)
foreach ($src in $repoSources) {
  foreach ($q in $queries) {
    $uq = [uri]::EscapeDataString($q)
    $url = $src.search + $uq
    try {
      & browser-use open $url | Out-Null
      $html = (& browser-use get html) -join ''
      if (-not $html) { Add-Log $src.name $q $url 'no_html' 'empty html'; continue }
      $pdfs = [regex]::Matches($html, 'https?://[^"\s]+\.pdf') | ForEach-Object { $_.Value } | Select-Object -Unique
      if ($pdfs.Count -eq 0) { Add-Log $src.name $q $url 'no_pdfs' 'no pdf links'; continue }
      $i=0
      foreach ($p in $pdfs) {
        if ($i -ge 2) { break }
        Save-Pdf $src.name $q $p ($src.name + '_' + $i)
        $i++
      }
    } catch {
      Add-Log $src.name $q $url 'error' $_.Exception.Message
    }
  }
}
