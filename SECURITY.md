# Security policy

Please report vulnerabilities privately to the repository maintainers. Do not include real resumes, JDs, identity fields or generated artifacts in an issue.

Supported releases are the latest `0.1.x` version. Before reporting, reproduce with synthetic data. The CLI deliberately rejects traversal, symbolic links, oversized/unsupported inputs, unsafe output directories and deletion of unmarked directories. Runtime adapter code is trusted and must be reviewed before configuration.
