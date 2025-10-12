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
var tiktoken_exports = {};
__export(tiktoken_exports, {
  encodingForModel: () => encodingForModel,
  getEncoding: () => getEncoding
});
module.exports = __toCommonJS(tiktoken_exports);
var import_promises = require("fs/promises");
var import_lite = require("js-tiktoken/lite");
var import_n8n_workflow = require("n8n-workflow");
var import_path = require("path");
const cache = {};
const loadJSONFile = async (filename) => {
  const filePath = (0, import_path.join)(__dirname, filename);
  const content = await (0, import_promises.readFile)(filePath, "utf-8");
  return await (0, import_n8n_workflow.jsonParse)(content);
};
async function getEncoding(encoding) {
  if (!(encoding in cache)) {
    cache[encoding] = (async () => {
      let jsonData;
      switch (encoding) {
        case "o200k_base":
          jsonData = await loadJSONFile("./o200k_base.json");
          break;
        case "cl100k_base":
          jsonData = await loadJSONFile("./cl100k_base.json");
          break;
        default:
          jsonData = await loadJSONFile("./cl100k_base.json");
      }
      return new import_lite.Tiktoken(jsonData);
    })().catch((error) => {
      delete cache[encoding];
      throw error;
    });
  }
  return await cache[encoding];
}
async function encodingForModel(model) {
  return await getEncoding((0, import_lite.getEncodingNameForModel)(model));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  encodingForModel,
  getEncoding
});
//# sourceMappingURL=tiktoken.js.map