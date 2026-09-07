import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Readable } from "node:stream";

/**
 * Резервная копия стенда: что в неё едет и почему именно это.
 *
 * Копия снимается СНАРУЖИ по HTTP, потому что на Coolify-хосте у нас нет ни рута, ни SSH,
 * а у Coolify нет ручки «выполнить команду в контейнере» (проверено на 4.3.11: 404).
 * Значит стенд обязан уметь отдать свои данные сам.
 *
 * Берём только то, чего больше нигде нет: реестр (`.pi-web`) и состояние агента
 * (`.pi/agent` — сессии, архив, навыки). Рабочие копии репозиториев не берём вовсе: они
 * клонируются из своих remote'ов, а весят на порядок больше данных.
 */
export const BACKUP_INCLUDES = [".pi-web", ".pi/agent"] as const;

/**
 * Исключения — не «мусор», а то, что восстанавливается установкой образа: пакеты, кеши,
 * временное. На живом стенде это 335 МБ из 350, то есть без них копия из «неподъёмной»
 * становится «двадцать восемь мегабайт».
 */
export const BACKUP_EXCLUDES = [
  ".pi/agent/npm",
  ".pi/agent/tmp",
  ".pi/agent/bin",
  ".pi-web/watch",
  "node_modules",
] as const;

/** Аргументы tar. `exists` инъекцией — чтобы правило проверялось без файловой системы. */
export function backupTarArgs(home: string, exists: (relativePath: string) => boolean): string[] {
  const present = BACKUP_INCLUDES.filter((path) => exists(path));
  // Исключения обязаны стоять ДО путей: tar применяет их к тому, что перечислено после.
  const base = ["-czf", "-", "-C", home, ...BACKUP_EXCLUDES.map((path) => `--exclude=${path}`)];
  // Ни одного пути tar не принимает вовсе («no files or directories specified», код 1), а
  // на новом стенде это законное состояние. `-T /dev/null` даёт пустой, но валидный архив:
  // «копия пустая» — честный ответ, «копия не снялась» — нет.
  return present.length === 0 ? [...base, "-T", "/dev/null"] : [...base, ...present];
}

/**
 * Имя архива несёт только дату. Имя стенда сюда не заводим: стенд его знает лишь из
 * переменной окружения, а тот, кто копию забирает, знает его и так — и называет файл сам.
 */
export function backupArchiveName(now: Date): string {
  return `pi-web-${now.toISOString().slice(0, 10)}.tar.gz`;
}

export interface BackupArchive {
  /** Поток .tar.gz. Читать обязательно: непрочитанный поток оставит tar висеть. */
  readonly stream: Readable;
  /** Резолвится, когда tar закончил; отклоняется, если он умер не по-хорошему. */
  readonly completed: Promise<void>;
}

export function createBackupArchive(home: string): BackupArchive {
  const args = backupTarArgs(home, (path) => existsSync(join(home, path)));
  const child = spawn("tar", args, { stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => { stderr = `${stderr}${chunk}`.slice(-2000); });

  const completed = new Promise<void>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => {
      // Пустой дом — законный случай: перечислять нечего, tar отработал и вернул 0 на
      // пустом списке путей. Ненулевой код означает, что копия обрезана, и молчать об
      // этом нельзя: испорченный бэкап хуже отсутствующего, потому что ему верят.
      if (code === 0) resolve();
      else reject(new Error(`tar завершился с кодом ${String(code)}: ${stderr.trim()}`));
    });
  });

  return { stream: child.stdout, completed };
}
