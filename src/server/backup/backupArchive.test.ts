import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { backupArchiveName, backupTarArgs, BACKUP_EXCLUDES, BACKUP_INCLUDES, createBackupArchive } from "./backupArchive.js";

describe("backupTarArgs", () => {
  it("архивирует относительно дома, чтобы копию можно было распаковать в другой дом", () => {
    const args = backupTarArgs("/home/node", () => true);
    expect(args).toContain("-C");
    expect(args[args.indexOf("-C") + 1]).toBe("/home/node");
    for (const include of BACKUP_INCLUDES) expect(args).toContain(include);
  });

  it("исключения идут ДО путей — иначе tar их не применит", () => {
    const args = backupTarArgs("/home/node", () => true);
    const lastExclude = Math.max(...BACKUP_EXCLUDES.map((p) => args.indexOf(`--exclude=${p}`)));
    const firstInclude = Math.min(...BACKUP_INCLUDES.map((p) => args.indexOf(p)));
    expect(lastExclude).toBeGreaterThan(-1);
    expect(lastExclude).toBeLessThan(firstInclude);
  });

  it("не просит tar о том, чего нет: отсутствующий путь — это ненулевой выход и обрезанная копия", () => {
    const args = backupTarArgs("/home/node", (path) => path === ".pi-web");
    expect(args).toContain(".pi-web");
    expect(args).not.toContain(".pi/agent");
  });

  it("нечего архивировать — просим у tar пустой архив, а не падение на пустом списке", () => {
    const args = backupTarArgs("/home/node", () => false);
    expect(args.slice(-2)).toEqual(["-T", "/dev/null"]);
  });

  it("тяжёлое и восстановимое в копию не едет — иначе 28 МБ данных везут внутри 350 МБ кешей", () => {
    expect(BACKUP_EXCLUDES).toContain(".pi/agent/npm");
    expect(BACKUP_EXCLUDES).toContain(".pi/agent/tmp");
    expect(BACKUP_EXCLUDES).toContain("node_modules");
  });
});

describe("backupArchiveName", () => {
  it("имя несёт дату: по папке с копиями должно быть видно, что когда снято", () => {
    expect(backupArchiveName(new Date("2026-09-07T08:30:00Z"))).toBe("pi-web-2026-09-07.tar.gz");
  });
});

describe("createBackupArchive", () => {
  it("отдаёт настоящий gzip-поток с данными дома", async () => {
    const home = await mkdtemp(join(tmpdir(), "pi-backup-"));
    await mkdir(join(home, ".pi-web"), { recursive: true });
    await writeFile(join(home, ".pi-web", "projects.json"), '[{"id":"p"}]');

    const { stream, completed } = createBackupArchive(home);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk as Buffer));
    await completed;

    const body = Buffer.concat(chunks);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toBe(0x1f);
    expect(body[1]).toBe(0x8b);
  });

  it("пустой дом — это пустая копия, а не падение", async () => {
    const home = await mkdtemp(join(tmpdir(), "pi-backup-empty-"));

    const { stream, completed } = createBackupArchive(home);
    for await (const _chunk of stream) { /* дочитываем, чтобы процесс не остался висеть */ }

    await expect(completed).resolves.toBeUndefined();
  });
});
