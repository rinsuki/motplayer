import { BlobProvider } from "async-zip-reader";
import { type FileHandle } from "node:fs/promises";

export class FileHandleBlobProvider implements BlobProvider {
    private constructor(private fileHandle: FileHandle, public readonly byteLength: number) {}

    static async create(fileHandle: FileHandle): Promise<FileHandleBlobProvider> {
        const { size } = await fileHandle.stat();
        return new FileHandleBlobProvider(fileHandle, size);
    }

    slicedBlob(start: number, end: number): Promise<Blob> {
        return this.fileHandle.read({
            buffer: Buffer.allocUnsafe(end - start),
            position: start,
            length: end - start,
        }).then(({ buffer }) => {
            return new Blob([buffer]);
        })
    }
    
    slicedData(start: number, end: number): Promise<Uint8Array> {
        return this.fileHandle.read({
            buffer: Buffer.allocUnsafe(end - start),
            position: start,
            length: end - start,
        }).then(({ buffer }) => buffer)
    }
}