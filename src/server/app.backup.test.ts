import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

describe("резервная копия стенда", () => {
  it("отдаёт архив дома: снаружи это единственный способ забрать данные стенда", async () => {
    const home = await mkdtemp(join(tmpdir(), "pi-backup-route-"));
    await mkdir(join(home, ".pi-web"), { recursive: true });
    await writeFile(join(home, ".pi-web", "projects.json"), '[{"id":"p"}]');
    const app = await buildApp({ clientDist: false, logger: false, backupHome: home });

    try {
      const response = await app.inject({ method: "GET", url: "/api/backup/export" });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toBe("application/gzip");
      expect(String(response.headers["content-disposition"])).toMatch(/attachment; filename="pi-web-\d{4}-\d{2}-\d{2}\.tar\.gz"/);
      expect(response.rawPayload.subarray(0, 2)).toEqual(Buffer.from([0x1f, 0x8b]));
    } finally {
      await app.close();
    }
  });
});
