# Security Policy

## Supported versions

TodoTube is under active development. Security fixes are applied to the latest code on the `main` branch. Older commits and experimental branches are not guaranteed to receive security fixes.

## Reporting a vulnerability

Please do not publish exploitable vulnerabilities, credentials, access tokens, private URLs, or personal data in public issues, pull requests, or discussions.

When private vulnerability reporting is available for this repository, use **Security → Advisories → Report a vulnerability** on GitHub. This creates a private report visible to the repository maintainers.

If that option is unavailable, contact the repository owner through the GitHub profile and ask for a private security-reporting channel. Do not include live credentials or real user data in the initial message.

Please include, where possible:

- The affected component and commit or version.
- A concise description of the security impact.
- Reproduction steps using test data only.
- Any suggested mitigation.

Please allow the maintainers a reasonable opportunity to investigate and prepare a fix before publicly disclosing an exploitable issue.

## Scope

Reports may cover the web application, Cloudflare Workers, Media Gateway, WebSub service, and repository automation. Third-party services and infrastructure should be reported to their respective providers when the issue is outside TodoTube's control.
