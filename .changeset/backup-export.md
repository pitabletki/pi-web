---
"@jmfederico/pi-web": minor
---

Add `GET /api/backup/export`: the server streams a `.tar.gz` of the data only it holds — the project/machine registry and the agent state — so an instance can be backed up from outside without shell access to its host. Reinstallable weight (package caches, temporary files) is excluded, and workspace checkouts are left out entirely: they come back from their remotes.
