export function encode(obj: any): Uint8Array {
    return new TextEncoder().encode(JSON.stringify(obj));
}

export function decode(buf: Uint8Array) {
    return JSON.parse(new TextDecoder().decode(buf));
}
