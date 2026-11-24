import { findUniqueTarget, validateUniqueSelection, type DeviceTarget } from "./identity.js";
import { SerializedQueue } from "./queue.js";
import { readDevices, runHelper, LitraProcessError } from "./process.js";
import type { LitraDevice } from "./types.js";

export type ControlStatus = "confirmed" | "pending" | "stale" | "unavailable" | "error";

export interface StateNotification {
  devices: readonly LitraDevice[];
  revision: number;
  status: ControlStatus;
  error?: string;
  context?: string;
}

export type StateSubscriber = (notification: StateNotification) => void | Promise<void>;

export class LitraState {
  private readonly queue = new SerializedQueue();
  private devices: LitraDevice[] = [];
  private revision = 0;
  private polling: NodeJS.Timeout | undefined;
  private visibleContexts = new Set<string>();
  private subscribers = new Set<StateSubscriber>();
  private pollInFlight = false;
  private pollPromise: Promise<void> | undefined;

  constructor(
    private readonly read = readDevices,
    private readonly write = runHelper,
  ) {}

  setVisible(context: string, visible: boolean): void {
    if (visible) this.visibleContexts.add(context);
    else this.visibleContexts.delete(context);
  }

  subscribe(subscriber: StateSubscriber): () => void {
    this.subscribers.add(subscriber);
    if (this.devices.length > 0) void subscriber({
      devices: this.devices,
      revision: this.revision,
      status: "confirmed",
    });
    return () => this.subscribers.delete(subscriber);
  }

  startPolling(): void {
    if (this.polling) return;
    this.polling = setInterval(() => {
      if (this.visibleContexts.size > 0) void this.pollOnce();
    }, 2000);
  }

  private pollOnce(): Promise<void> {
    if (this.pollPromise) return this.pollPromise;
    this.pollPromise = this.refresh().then(
      () => undefined,
      (error: unknown) => {
        const message = this.errorMessage(error);
        this.notify("error", message);
      },
    ).finally(() => { this.pollPromise = undefined; });
    return this.pollPromise;
  }

  stopPolling(): void {
    if (this.polling) clearInterval(this.polling);
    this.polling = undefined;
  }

  async refresh(): Promise<{ devices: LitraDevice[]; revision: number }> {
    if (this.pollInFlight) return { devices: this.devices, revision: this.revision };
    this.pollInFlight = true;
    try {
      return await this.queue.enqueue(async () => {
        const devices = await this.read();
        this.devices = devices;
        this.revision++;
        this.notify("confirmed");
        return { devices, revision: this.revision };
      });
    } finally {
      this.pollInFlight = false;
    }
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
    expected?: (before: LitraDevice, after: LitraDevice) => boolean,
  ): Promise<{ device: LitraDevice | null; revision: number; error?: string }> {
    this.notify("pending");
    return this.queue.enqueue(async () => {
      let fresh: LitraDevice[];
      try {
        fresh = await this.read();
      } catch (error) {
        const message = this.errorMessage(error);
        this.notify("error", message);
        return { device: null, revision: this.revision, error: message };
      }
      this.devices = fresh;
      this.revision++;
      try {
        validateUniqueSelection(fresh, target);
      } catch (error) {
        const message = this.errorMessage(error);
        this.notify("unavailable", message);
        return { device: null, revision: this.revision, error: message };
      }
      const selected = findUniqueTarget(fresh, target);
      if (!selected) return { device: null, revision: this.revision, error: "Selected light is unavailable or unreadable." };
      let wrote = false;
      try {
        await this.write(args(selected));
        wrote = true;
      } catch (error) {
        let confirmedDevice: LitraDevice | null = null;
        let readbackError: unknown;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 50 : 150));
            const readback = await this.read();
            this.devices = readback;
            this.revision++;
            confirmedDevice = findUniqueTarget(readback, target);
            if (!confirmedDevice) continue;
            if (expected && !expected(selected, confirmedDevice)) continue;
            const message = `${this.errorMessage(error)} State was read back.`;
            this.notify("confirmed");
            return { device: confirmedDevice, revision: this.revision, error: message };
          } catch (caught) {
            readbackError = caught;
          }
        }
        const message = `${this.errorMessage(error)} ${confirmedDevice
          ? "State was read back but did not match."
          : `State could not be read back: ${this.errorMessage(readbackError)}`}`;
        this.notify("error", message);
        return { device: confirmedDevice, revision: this.revision, error: message };
      }
      if (!wrote) return { device: null, revision: this.revision, error: "Write did not execute." };
      let readbackError: unknown;
      let mismatchError: string | undefined;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 50 : 150));
          const readback = await this.read();
          this.devices = readback;
          this.revision++;
          const confirmed = findUniqueTarget(readback, target);
          if (!confirmed) {
            mismatchError = "Write completed, but the selected light was missing from readback.";
            continue;
          }
          if (expected) {
            if (!expected(selected, confirmed)) {
              mismatchError = "Readback mismatch: the requested native state was not confirmed.";
              continue;
            }
          }
          this.notify("confirmed");
          return { device: confirmed, revision: this.revision };
        } catch (error) {
          readbackError = error;
        }
      }
      const message = mismatchError
        ? mismatchError
        : `Write succeeded, but readback failed: ${this.errorMessage(readbackError)}`;
      this.notify("error", message);
      return { device: null, revision: this.revision, error: message };
    });
  }

  stop(): void {
    this.stopPolling();
    this.subscribers.clear();
  }

  private notify(status: ControlStatus, error?: string, context?: string): void {
    const notification: StateNotification = {
      devices: this.devices,
      revision: this.revision,
      status,
      error,
      context,
    };
    for (const subscriber of this.subscribers) {
      try {
        const result = subscriber(notification);
        if (result instanceof Promise) void result.catch((subscriberError) => {
          console.error("Litra state subscriber failed", subscriberError);
        });
      } catch (subscriberError) {
        console.error("Litra state subscriber failed", subscriberError);
      }
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Unknown helper error.";
  }
}
