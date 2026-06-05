/** shpjs 无官方 @types，最小声明供 TypeScript 与 Vite 使用 */
declare module 'shpjs' {
  function getShapefile(
    input: ArrayBuffer | string | Record<string, ArrayBuffer | string> | Uint8Array
  ): Promise<unknown>;
  export default getShapefile;
}
