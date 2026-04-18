Write-Host "Packaging Lambda function..."

Remove-Item -Recurse -Force package -ErrorAction SilentlyContinue
Remove-Item -Force infra\lambda.zip -ErrorAction SilentlyContinue

pip install -r requirements.txt -t .\package `
  --platform manylinux2014_x86_64 `
  --only-binary=:all: `
  --python-version 3.12 `
  --quiet

Copy-Item *.py package\

Compress-Archive -Path package\* -DestinationPath .\infra\lambda.zip -Force

Remove-Item -Recurse -Force package

Write-Host "Done: infra\lambda.zip created"
Get-Item .\infra\lambda.zip | Select-Object Name, Length
