export type LitraDeviceType = "glow" | "beam" | "beam_lx";

export interface LitraDevice {
  device_type: LitraDeviceType;
  device_type_display: string;
  has_back_side: boolean;
  serial_number: string | null;
  device_path: string | null;
  status_display: string;
  brightness_display: string;
  temperature_display: string;
  back_status_display: string;
  back_brightness_display: string;
  is_on: boolean;
  brightness_in_lumen: number;
  temperature_in_kelvin: number;
  minimum_brightness_in_lumen: number;
  maximum_brightness_in_lumen: number;
  minimum_temperature_in_kelvin: number;
  maximum_temperature_in_kelvin: number;
  is_back_on: boolean | null;
  back_brightness_percentage: number | null;
}
