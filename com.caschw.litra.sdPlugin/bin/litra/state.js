"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LitraState = void 0;
const identity_js_1 = require("./identity.js");
const queue_js_1 = require("./queue.js");
const process_js_1 = require("./process.js");
class LitraState {
    read;
    write;
    queue = new queue_js_1.SerializedQueue();
    devices = [];
    revision = 0;
    polling;
    visibleContexts = new Set();
    constructor(read = process_js_1.readDevices, write = process_js_1.runHelper) {
        this.read = read;
        this.write = write;
    }
    setVisible(context, visible) {
        if (visible)
            this.visibleContexts.add(context);
        else
            this.visibleContexts.delete(context);
    }
    startPolling() {
        if (this.polling)
            return;
        this.polling = setInterval(() => {
            if (this.visibleContexts.size > 0)
                void this.refresh().catch(() => undefined);
        }, 2000);
    }
    stopPolling() {
        if (this.polling)
            clearInterval(this.polling);
        this.polling = undefined;
    }
    async refresh() {
        return this.queue.enqueue(async () => {
            const devices = await this.read();
            this.devices = devices;
            this.revision++;
            return { devices, revision: this.revision };
        });
    }
    getDevices() {
        return this.devices;
    }
    getRevision() {
        return this.revision;
    }
    async mutate(target, args) {
        return this.queue.enqueue(async () => {
            let fresh;
            try {
                fresh = await this.read();
            }
            catch (error) {
                return { device: null, revision: this.revision, error: this.errorMessage(error) };
            }
            this.devices = fresh;
            this.revision++;
            try {
                (0, identity_js_1.validateUniqueSelection)(fresh, target);
            }
            catch (error) {
                return { device: null, revision: this.revision, error: this.errorMessage(error) };
            }
            const selected = (0, identity_js_1.findUniqueTarget)(fresh, target);
            if (!selected)
                return { device: null, revision: this.revision, error: "Selected light is unavailable or unreadable." };
            let wrote = false;
            try {
                await this.write(args(selected));
                wrote = true;
            }
            catch (error) {
                try {
                    const readback = await this.read();
                    this.devices = readback;
                    this.revision++;
                    const confirmed = (0, identity_js_1.findUniqueTarget)(readback, target);
                    return {
                        device: confirmed,
                        revision: this.revision,
                        error: `${this.errorMessage(error)}${confirmed ? " State was read back." : " State could not be read back."}`,
                    };
                }
                catch {
                    return { device: null, revision: this.revision, error: `${this.errorMessage(error)} State could not be read back.` };
                }
            }
            if (!wrote)
                return { device: null, revision: this.revision, error: "Write did not execute." };
            let readbackError;
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 50 : 150));
                    const readback = await this.read();
                    this.devices = readback;
                    this.revision++;
                    return { device: (0, identity_js_1.findUniqueTarget)(readback, target), revision: this.revision };
                }
                catch (error) {
                    readbackError = error;
                }
            }
            return { device: null, revision: this.revision, error: `Write succeeded, but readback failed: ${this.errorMessage(readbackError)}` };
        });
    }
    errorMessage(error) {
        return error instanceof Error ? error.message : "Unknown helper error.";
    }
}
exports.LitraState = LitraState;
//# sourceMappingURL=state.js.map