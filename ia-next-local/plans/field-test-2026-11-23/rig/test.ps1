# Offline tests inside the image, against the working tree (no rebuild needed). Usage: test.ps1 [pytest args]
# Example: test.ps1 tests/test_currency.py -x
$root = Split-Path (Split-Path (Split-Path $PSScriptRoot))
$a = @($args)
if (-not $a.Count) { $a = @('tests') }
docker run --rm -u root -v "${root}\tests:/app/tests:ro" -v "${root}\ia_next:/app/ia_next:ro" -v "${root}\web:/app/web:ro" `
  -v "${root}\scripts:/app/scripts:ro" -v "${root}\regression:/app/regression:ro" -v "${root}\render:/app/render:ro" `
  -v "${root}\workflows:/app/workflows:ro" -v "${root}\ia-next-local.compose.yml:/app/ia-next-local.compose.yml:ro" `
  ia-next-local:0.1 python -m pytest -q -p no:cacheprovider -W ignore @a
