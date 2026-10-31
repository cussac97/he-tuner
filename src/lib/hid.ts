// WebHID connection to the Wooting analog interface, following the official
// wooting-analog-sdk (src/device.rs):
//
//  - Protocol V2 (60HE v2, 80HE… — usage page 0xFF53, 64-byte reports): 16 entries of
//      [matrix pos: row<<5|col] [key code low] [packed] [value high]
//    packed: bit0 = actuated (the keyboard's own digital state), bits2-5 = key namespace
//    (0 = HID usage), bits6-7 = low 2 bits of a 10-bit analog value (0..1023).
//  - Protocol V1 (60HE, Two HE… — usage page 0xFF54, 48-byte reports):
//      [usage hi] [usage lo] [value 0..255] triplets.
//
// Every report is a snapshot of the pressed keys; absent keys are at rest.

import { tr } from '../i18n'
import { deviceText } from '../i18n/app/device'
import { hidToCode } from './hidCodes'
import { recorder, type SnapshotEntry } from './recorder'

export const WOOTING_VID = 0x31e3
export const WOOTING_LEGACY_VID = 0x03eb
export const ANALOG_USAGE_PAGE_V2 = 0xff53
export const ANALOG_USAGE_PAGE_V1 = 0xff54
export const LEGACY_ANALOG_USAGE_PAGE = 0x1338

const ANALOG_PAGES = [ANALOG_USAGE_PAGE_V2, ANALOG_USAGE_PAGE_V1, LEGACY_ANALOG_USAGE_PAGE]

type Protocol = 'v2' | 'v1'

const NS_HID = 0
const NS_CUSTOM_FUNCTION = 4

export interface DecodedEntry {
  code: string | null
  raw: number
  namespace: number
  row: number
  col: number
  value: number
  actuated: boolean | null
}

export function decodeV2(buf: Uint8Array): DecodedEntry[] {
  const out: DecodedEntry[] = []
  for (let i = 0; i + 4 <= buf.length; i += 4) {
    const pos = buf[i]
    const key = buf[i + 1]
    const packed = buf[i + 2]
    const value = ((buf[i + 3] << 2) | ((packed >> 6) & 0x03)) / 1023
    if (value <= 0) continue
    const namespace = (packed >> 2) & 0x0f
    const row = (pos >> 5) & 0x07
    const col = pos & 0x1f
    let code: string | null = null
    if (namespace === NS_HID) code = hidToCode(key)
    else if (namespace === NS_CUSTOM_FUNCTION) code = 'Fn'
    out.push({ code, raw: (namespace << 8) | key, namespace, row, col, value: Math.min(1, value), actuated: (packed & 0x01) !== 0 })
  }
  return out
}

export function decodeV1(buf: Uint8Array): DecodedEntry[] {
  const out: DecodedEntry[] = []
  for (let i = 0; i + 3 <= buf.length; i += 3) {
    const usage = (buf[i] << 8) | buf[i + 1]
    const value = buf[i + 2] / 255
    if (value === 0 || usage === 0) break
    out.push({ code: hidToCode(usage), raw: usage, namespace: 0, row: -1, col: -1, value, actuated: null })
  }
  return out
}

/** Unrecognized key seen in a report; `row` / `col` are -1 when the protocol has no matrix position. */
export interface UnknownKey {
  raw: number
  row: number
  col: number
}

// Status text is exposed through getters so it follows the interface language.
export type HidStatus =
  | { state: 'unsupported' }
  | { state: 'idle' }
  | { state: 'connecting' }
  | { state: 'connected'; name: string; productId: number; protocol: string }
  | { state: 'error'; message: string }

class WootingHid {
  device: HIDDevice | null = null
  status: HidStatus = typeof navigator !== 'undefined' && 'hid' in navigator ? { state: 'idle' } : { state: 'unsupported' }
  protocol: Protocol = 'v2'
  unknownKeys = new Map<string, UnknownKey>()
  lastDecoded: DecodedEntry[] = []
  private listeners = new Set<() => void>()

  onChange(l: () => void) {
    this.listeners.add(l)
    return () => {
      this.listeners.delete(l)
    }
  }

  private set(s: HidStatus) {
    this.status = s
    for (const l of this.listeners) l()
    recorder.emitStatus()
  }

  private analogPage(d: HIDDevice): number | null {
    for (const page of ANALOG_PAGES) if (d.collections.some((c) => c.usagePage === page)) return page
    return null
  }

  private pickAnalogDevice(devices: HIDDevice[]): HIDDevice | null {
    // Prefer the newest protocol when a device exposes several interfaces
    for (const page of ANALOG_PAGES) {
      const d = devices.find((x) => x.collections.some((c) => c.usagePage === page))
      if (d) return d
    }
    return null
  }

  async request(): Promise<void> {
    if (this.status.state === 'unsupported') return
    try {
      this.set({ state: 'connecting' })
      const devices = await navigator.hid.requestDevice({
        filters: [
          { vendorId: WOOTING_VID, usagePage: ANALOG_USAGE_PAGE_V2 },
          { vendorId: WOOTING_VID, usagePage: ANALOG_USAGE_PAGE_V1 },
          { vendorId: WOOTING_LEGACY_VID, usagePage: LEGACY_ANALOG_USAGE_PAGE },
        ],
      })
      const dev = this.pickAnalogDevice(devices)
      if (!dev) {
        this.set(
          devices.length
            ? {
                state: 'error',
                get message() {
                  return tr(deviceText).noAnalogInterface
                },
              }
            : { state: 'idle' },
        )
        return
      }
      await this.open(dev)
    } catch (e) {
      this.set({ state: 'error', message: (e as Error).message })
    }
  }

  async autoConnect(): Promise<void> {
    if (this.status.state === 'unsupported') return
    const devices = await navigator.hid.getDevices()
    const dev = this.pickAnalogDevice(devices)
    if (dev) await this.open(dev).catch(() => {})
  }

  private async open(dev: HIDDevice) {
    if (!dev.opened) await dev.open()
    this.device = dev
    this.protocol = this.analogPage(dev) === ANALOG_USAGE_PAGE_V2 ? 'v2' : 'v1'
    dev.addEventListener('inputreport', this.onReport)
    navigator.hid.addEventListener('disconnect', this.onDisconnect)
    recorder.setSource('hid')
    const v2 = this.protocol === 'v2'
    this.set({
      state: 'connected',
      name: dev.productName || 'Wooting',
      productId: dev.productId,
      get protocol() {
        const t = tr(deviceText)
        return v2 ? t.protocolV2 : t.protocolV1
      },
    })
  }

  async disconnect() {
    const dev = this.device
    if (!dev) return
    dev.removeEventListener('inputreport', this.onReport)
    await dev.close().catch(() => {})
    this.device = null
    recorder.ingestSnapshot(performance.now(), [])
    recorder.setSource('none')
    this.set({ state: 'idle' })
  }

  private onDisconnect = (e: HIDConnectionEvent) => {
    if (e.device === this.device) {
      this.device = null
      recorder.ingestSnapshot(performance.now(), [])
      recorder.setSource('none')
      this.set({
        state: 'error',
        get message() {
          return tr(deviceText).disconnected
        },
      })
    }
  }

  private onReport = (e: HIDInputReportEvent) => {
    const buf = new Uint8Array(e.data.buffer, e.data.byteOffset, e.data.byteLength)
    recorder.lastRaw = buf.slice()
    recorder.lastRawT = e.timeStamp
    const decoded = this.protocol === 'v2' ? decodeV2(buf) : decodeV1(buf)
    this.lastDecoded = decoded
    const travel = recorder.travel
    const entries: SnapshotEntry[] = []
    for (const k of decoded) {
      if (!k.code) {
        this.unknownKeys.set(`${k.raw}:${k.row}:${k.col}`, { raw: k.raw, row: k.row, col: k.col })
        continue
      }
      entries.push([k.code, k.value * travel, k.actuated])
    }
    recorder.ingestSnapshot(e.timeStamp, entries)
  }
}

export const hid = new WootingHid()
