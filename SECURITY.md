# Security and privacy

Do not post real genome files, saved analyses, credentials or personal medical information in a public issue, discussion or pull request. Use synthetic examples.

For a vulnerability that could expose private genetic data, use GitHub's private vulnerability reporting feature if enabled. If that channel is unavailable, open an issue asking for a private reporting channel without including exploit details or private data. There is no promised response time or supported clinical deployment.

The local browser server binds to `127.0.0.1` and offers no upload endpoint. Keep it on the local computer; do not expose its port to a network. Source links use external websites when opened. Exported reports and locally saved files are sensitive even though processing is local.

The desktop app uses Electron with renderer sandboxing, context isolation and no renderer Node access. Release artifacts are unsigned previews. Check published SHA-256 values and use the repository's Releases page when downloading. Dependency and reference snapshots require ongoing maintenance; this initial release is not an assurance of complete security or clinical validation.
