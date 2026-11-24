import { findUniqueTarget, validateUniqueSelection, type DeviceTarget } from "./identity.js";
import { SerializedQueue } from "./queue.js";
import { readDevices, runHelper, LitraProcessError } from "./process.js";
import type { LitraDevice } from "./types.js";

export type ControlStatus = "confirmed" | "pending" | "stale" | "unavailable" | "error";

export class LitraState {
  private readonly queue = new SerializedQueue();
  private devices: LitraDevice[] = [];
  private revision = 0;
  private polling: NodeJS.Timeout | undefined;
  private visibleContexts = new Set<string>();

  constructor(
    private readonly read = readDevices,
    private readonly write = runHelper,
  ) {}

  setVisible(context: string, visible: boolean): void {
    if (visible) this.visibleContexts.add(context);
    else this.visibleContexts.delete(context);
  }

  startPolling(): void {
    if (this.polling) return;
    this.polling = setInterval(() => {
      if (this.visibleContexts.size > 0) void this.refresh().catch(() => undefined);
    }, 2000);
  }

  stopPolling(): void {
    if (this.polling) clearInterval(this.polling);
    this.polling = undefined;
  }

  async refresh(): Promise<{ devices: LitraDevice[]; revision: number }> {
    return this.queue.enqueue(async () => {
      const devices = await this.read();
      this.devices = devices;
      this.revision++;
      return { devices, revision: this.revision };
    });
  }

  getDevices(): readonly LitraDevice[] {
    return this.devices;
  }

  getRevision(): number {
    return this.revision;
  }

  async mutate(
    target: DeviceTarget,
    args: (device: LitraDevice) => string[],
  ): Promise<{ device: LitraDevice | null; revision: number; error?: string }> {
    return this.queue.enqueue(async () => {
      let fresh: LitraDevice[];
      try {
        fresh = await this.read();
      } catch (error) {
        return { device: null, revision: this.revision, error: this.errorMessage(error) };
      }
      this.devices = fresh;
      this.revision++;
      try {
        validateUniqueSelection(fresh, target);
      } catch (error) {
        return { device: null, revision: this.revision, error: this.errorMessage(error) };
      }
      const selected = findUniqueTarget(fresh, target);
      if (!selected) return { device: null, revision: this.revision, error: "Selected light is unavailable or unreadable." };
      let wrote = false;
      try {
        await this.write(args(selected));
        wrote = true;
      } catch (error) {
        try {
          const readback = await this.read();
          this.devices = readback;
          this.revision++;
          const confirmed = findUniqueTarget(readback, target);
          return {
            device: confirmed,
            revision: this.revision,
            error: `${this.errorMessage(error)}${confirmed ? " State was read back." : " State could not be read back."}`,
          };
        } catch {
          return { device: null, revision: this.revision, error: `${this.errorMessage(error)} State could not be read back.` };
        }
      }
      if (!wrote) return { device: null, revision: this.revision, error: "Write did not execute." };
      let readbackError: unknown;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 50 : 150));
          const readback = await this.read();
          this.devices = readback;
          this.revision++;
          return { device: findUniqueTarget(readback, target), revision: this.revision };
        } catch (error) {
          readbackError = error;
        }
      }
      return { device: null, revision: this.revision, error: `Write succeeded, but readback failed: ${this.errorMessage(readbackError)}` };
    });
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Unknown helper error.";
  }
}
