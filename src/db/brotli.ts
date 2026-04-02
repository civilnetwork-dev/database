import { brotliCompressSync } from "node:zlib";
import { encode } from "./msgpack";

export default function respond(data: any) {
    const packed = encode(data);
    const compressed = brotliCompressSync(packed);

    return new Response(compressed, {
        headers: {
            "Content-Type": "application/msgpack",
            "Content-Encoding": "br",
        },
    });
}
