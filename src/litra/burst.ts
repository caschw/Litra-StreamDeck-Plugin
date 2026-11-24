export interface DialMovement {
  context: string;
  target: { serialNumber?: string; devicePath?: string };
  property: "frontBrightness" | "frontTemperature" | "rearBrightness";
  signedTicks: number;
  sensitivity: number;
  revision: number;
}

export class DialBurstQueue {
  private pending: DialMovement[] = [];

  push(movement: DialMovement): readonly DialMovement[] {
    const last = this.pending[this.pending.length - 1];
    const compatible = last
      && last.context === movement.context
      && last.property === movement.property
      && last.sensitivity === movement.sensitivity
      && last.revision === movement.revision
      && ((last.target.serialNumber && last.target.serialNumber === movement.target.serialNumber)
        || (last.target.devicePath && last.target.devicePath === movement.target.devicePath));
    if (compatible) {
      last.signedTicks += movement.signedTicks;
      return this.pending;
    }
    this.pending.push(movement);
    return this.pending;
  }

  take(context: string): DialMovement[] {
    const result = this.pending.filter((m) => m.context === context);
    this.pending = this.pending.filter((m) => m.context !== context);
    return result;
  }

  clear(): void {
    this.pending = [];
  }
}
