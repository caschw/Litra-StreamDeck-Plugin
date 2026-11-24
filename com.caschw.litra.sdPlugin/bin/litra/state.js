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
    subscribers = new Set();
    pollInFlight = false;
    pollPromise;
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
    subscribe(subscriber) {
        this.subscribers.add(subscriber);
        if (this.devices.length > 0)
            void subscriber({
                devices: this.devices,
                revision: this.revision,
                status: "confirmed",
            });
        return () => this.subscribers.delete(subscriber);
    }
    startPolling() {
        if (this.polling)
            return;
        this.polling = setInterval(() => {
            if (this.visibleContexts.size > 0)
                void this.pollOnce();
        }, 2000);
    }
    pollOnce() {
        if (this.pollPromise)
            return this.pollPromise;
        this.pollPromise = this.refresh().then(() => undefined, (error) => {
            const message = this.errorMessage(error);
            this.notify("error", message);
        }).finally(() => { this.pollPromise = undefined; });
        return this.pollPromise;
    }
    stopPolling() {
        if (this.polling)
            clearInterval(this.polling);
        this.polling = undefined;
    }
    async refresh() {
        if (this.pollInFlight)
            return { devices: this.devices, revision: this.revision };
        this.pollInFlight = true;
        try {
            return await this.queue.enqueue(async () => {
                const devices = await this.read();
                this.devices = devices;
                this.revision++;
                this.notify("confirmed");
                return { devices, revision: this.revision };
            });
        }
        finally {
            this.pollInFlight = false;
        }
    }
    getDevices() {
        return this.devices;
    }
    getRevision() {
        return this.revision;
    }
    async mutate(target, args, expected) {
        this.notify("pending");
        return this.queue.enqueue(async () => {
            let fresh;
            try {
                fresh = await this.read();
            }
            catch (error) {
                const message = this.errorMessage(error);
                this.notify("error", message);
                return { device: null, revision: this.revision, error: message };
            }
            this.devices = fresh;
            this.revision++;
            try {
                (0, identity_js_1.validateUniqueSelection)(fresh, target);
            }
            catch (error) {
                const message = this.errorMessage(error);
                this.notify("unavailable", message);
                return { device: null, revision: this.revision, error: message };
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
                let confirmedDevice = null;
                let readbackError;
                for (let attempt = 0; attempt < 3; attempt++) {
                    try {
                        await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 50 : 150));
                        const readback = await this.read();
                        this.devices = readback;
                        this.revision++;
                        confirmedDevice = (0, identity_js_1.findUniqueTarget)(readback, target);
                        if (!confirmedDevice)
                            continue;
                        if (expected && !expected(selected, confirmedDevice))
                            continue;
                        const message = `${this.errorMessage(error)} State was read back.`;
                        this.notify("confirmed");
                        return { device: confirmedDevice, revision: this.revision, error: message };
                    }
                    catch (caught) {
                        readbackError = caught;
                    }
                }
                const message = `${this.errorMessage(error)} ${confirmedDevice
                    ? "State was read back but did not match."
                    : `State could not be read back: ${this.errorMessage(readbackError)}`}`;
                this.notify("error", message);
                return { device: confirmedDevice, revision: this.revision, error: message };
            }
            if (!wrote)
                return { device: null, revision: this.revision, error: "Write did not execute." };
            let readbackError;
            let mismatchError;
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 50 : 150));
                    const readback = await this.read();
                    this.devices = readback;
                    this.revision++;
                    const confirmed = (0, identity_js_1.findUniqueTarget)(readback, target);
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
                }
                catch (error) {
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
    stop() {
        this.stopPolling();
        this.subscribers.clear();
    }
    notify(status, error, context) {
        const notification = {
            devices: this.devices,
            revision: this.revision,
            status,
            error,
            context,
        };
        for (const subscriber of this.subscribers) {
            try {
                const result = subscriber(notification);
                if (result instanceof Promise)
                    void result.catch((subscriberError) => {
                        console.error("Litra state subscriber failed", subscriberError);
                    });
            }
            catch (subscriberError) {
                console.error("Litra state subscriber failed", subscriberError);
            }
        }
    }
    errorMessage(error) {
        return error instanceof Error ? error.message : "Unknown helper error.";
    }
}
exports.LitraState = LitraState;
//# sourceMappingURL=state.js.map