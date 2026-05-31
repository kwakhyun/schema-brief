# Security Policy

## Supported Versions

Security fixes target the latest published minor version.

## Reporting a Vulnerability

Please report vulnerabilities privately through the repository security advisory flow once the public repository is created.

Do not include secrets, API keys, or private model outputs in public issues.

## Security Notes

`schema-brief` parses untrusted model output. Treat parsed values as untrusted data until they pass validation and your application-specific authorization checks.
