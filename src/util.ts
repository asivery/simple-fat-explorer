import { LowLevelFatFilesystem } from 'nufatfs';
import { FatFSDirectoryEntry, FatFSDirectoryEntryAttributes } from 'nufatfs/dist/types';

export const h = (i: number) => i.toString(16).padStart(4, '0') + 'h';
export function createStringChain(ll: LowLevelFatFilesystem, last: number) {
    let out = `${h(last)} -> `;
    let seen = new Set([last]);
    while (true) {
        try {
            const continuation = ll.readFATClusterEntry!(last);
            if (seen.has(continuation)) {
                return out + h(continuation) + '(LOOP!)';
            }
            if (ll.endOfChain.includes(continuation)) {
                break;
            }
            seen.add(continuation);
            out += `${h(continuation)} -> `;
            last = continuation;
        } catch (ex) {
            return out + '! OUT OF BOUNDS';
        }
    }
    return out + '|EoC';
}

export function renderFlags(attr: number) {
    let out = [];
    for (let e of Object.keys(FatFSDirectoryEntryAttributes)) {
        if ('1234567890'.includes(e.charAt(0))) {
            continue;
        }
        if (attr & (FatFSDirectoryEntryAttributes as any)[e]) {
            out.push(e);
        }
    }
    return `[${out.join(' | ')}]`;
}

export function getLEUint32(data: Uint8Array, offset: number = 0) {
    return (data[offset + 0] << 0) | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24);
}

export function getBEUint32(data: Uint8Array, offset: number = 0) {
    return (data[offset + 3] << 0) | (data[offset + 2] << 8) | (data[offset + 1] << 16) | (data[offset + 0] << 24);
}

export function getLEUint32AsBytes(num: number) {
    return [(num >> 0) & 0xff, (num >> 8) & 0xff, (num >> 16) & 0xff, (num >> 24) & 0xff];
}

export function getBEUint32AsBytes(num: number) {
    return [(num >> 24) & 0xff, (num >> 16) & 0xff, (num >> 8) & 0xff, (num >> 0) & 0xff];
}

export function getBEUint16AsBytes(num: number) {
    return [(num >> 8) & 0xff, (num >> 0) & 0xff];
}

export function getNthPartitionFromMBR(mbrSector: Uint8Array, n: number) {
    return {
        firstLBA: getLEUint32(mbrSector, 0x01be + 0x10 * n + 8),
        sectorCount: getLEUint32(mbrSector, 0x01be + 0x10 * n + 12),
    };
}

export function isSpecial(entry: FatFSDirectoryEntry | null) {
    if (!entry) return false;
    return entry._filenameStr == '.          ' || entry._filenameStr == '..         ';
}

export const VIRTUAL_ATTRIBUTE_CORRUPTED = 0x1000000;

export function capitalize(string: string) {
    return string.charAt(0).toUpperCase() + string.replace(/([A-Z])/g, ' $1').slice(1);
}
