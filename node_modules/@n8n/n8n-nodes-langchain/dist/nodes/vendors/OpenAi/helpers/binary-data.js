"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var binary_data_exports = {};
__export(binary_data_exports, {
  getBinaryDataFile: () => getBinaryDataFile
});
module.exports = __toCommonJS(binary_data_exports);
const CHUNK_SIZE = 256 * 1024;
async function getBinaryDataFile(ctx, itemIdx, binaryPropertyName) {
  const binaryData = ctx.helpers.assertBinaryData(itemIdx, binaryPropertyName);
  const fileContent = binaryData.id ? await ctx.helpers.getBinaryStream(binaryData.id, CHUNK_SIZE) : await ctx.helpers.getBinaryDataBuffer(itemIdx, binaryPropertyName);
  return {
    filename: binaryData.fileName,
    contentType: binaryData.mimeType,
    fileContent
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getBinaryDataFile
});
//# sourceMappingURL=binary-data.js.map