declare module "heic-convert" {
  type HeicConvertInput = {
    buffer: Buffer | Uint8Array | ArrayBuffer;
    format: "JPEG" | "PNG";
    quality?: number;
  };

  type HeicConvert = (input: HeicConvertInput) => Promise<Uint8Array>;

  const heicConvert: HeicConvert;
  export default heicConvert;
}
