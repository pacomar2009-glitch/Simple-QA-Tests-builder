"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var utils_exports = {};
__export(utils_exports, {
  downloadFile: () => downloadFile,
  transferFile: () => transferFile,
  uploadFile: () => uploadFile
});
module.exports = __toCommonJS(utils_exports);
var import_n8n_workflow = require("n8n-workflow");
var import_transport = require("../transport");
var import_axios = __toESM(require("axios"));
const CHUNK_SIZE = 256 * 1024;
async function downloadFile(url, fallbackMimeType, qs) {
  const downloadResponse = await this.helpers.httpRequest({
    method: "GET",
    url,
    qs,
    returnFullResponse: true,
    encoding: "arraybuffer"
  });
  const mimeType = downloadResponse.headers?.["content-type"]?.split(";")?.[0] ?? fallbackMimeType;
  const fileContent = Buffer.from(downloadResponse.body);
  return {
    fileContent,
    mimeType
  };
}
async function uploadFile(fileContent, mimeType) {
  const numBytes = fileContent.length.toString();
  const uploadInitResponse = await import_transport.apiRequest.call(this, "POST", "/upload/v1beta/files", {
    headers: {
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": numBytes,
      "X-Goog-Upload-Header-Content-Type": mimeType,
      "Content-Type": "application/json"
    },
    option: {
      returnFullResponse: true
    }
  });
  const uploadUrl = uploadInitResponse.headers["x-goog-upload-url"];
  const uploadResponse = await this.helpers.httpRequest({
    method: "POST",
    url: uploadUrl,
    headers: {
      "Content-Length": numBytes,
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize"
    },
    body: fileContent
  });
  while (uploadResponse.file.state !== "ACTIVE" && uploadResponse.file.state !== "FAILED") {
    await new Promise((resolve) => setTimeout(resolve, 1e3));
    uploadResponse.file = await import_transport.apiRequest.call(
      this,
      "GET",
      `/v1beta/${uploadResponse.file.name}`
    );
  }
  if (uploadResponse.file.state === "FAILED") {
    throw new import_n8n_workflow.NodeOperationError(
      this.getNode(),
      uploadResponse.file.error?.message ?? "Unknown error",
      {
        description: "Error uploading file"
      }
    );
  }
  return { fileUri: uploadResponse.file.uri, mimeType: uploadResponse.file.mimeType };
}
async function transferFile(i, downloadUrl, fallbackMimeType, qs) {
  let stream;
  let mimeType;
  if (downloadUrl) {
    const downloadResponse = await import_axios.default.get(downloadUrl, {
      params: qs,
      responseType: "stream"
    });
    mimeType = downloadResponse.headers["content-type"]?.split(";")?.[0] ?? fallbackMimeType;
    stream = downloadResponse.data;
  } else {
    const binaryPropertyName = this.getNodeParameter("binaryPropertyName", i, "data");
    if (!binaryPropertyName) {
      throw new import_n8n_workflow.NodeOperationError(this.getNode(), "Binary property name is required", {
        description: "Error uploading file"
      });
    }
    const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
    if (!binaryData.id) {
      const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);
      return await uploadFile.call(this, buffer, binaryData.mimeType);
    } else {
      stream = await this.helpers.getBinaryStream(binaryData.id, CHUNK_SIZE);
      mimeType = binaryData.mimeType;
    }
  }
  const uploadInitResponse = await import_transport.apiRequest.call(this, "POST", "/upload/v1beta/files", {
    headers: {
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Type": mimeType,
      "Content-Type": "application/json"
    },
    option: { returnFullResponse: true }
  });
  const uploadUrl = uploadInitResponse.headers["x-goog-upload-url"];
  if (!uploadUrl) {
    throw new import_n8n_workflow.NodeOperationError(this.getNode(), "Failed to get upload URL");
  }
  const uploadResponse = await this.helpers.httpRequest({
    method: "POST",
    url: uploadUrl,
    headers: {
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
      "Content-Type": mimeType
    },
    body: stream,
    returnFullResponse: true
  });
  let file = uploadResponse.body.file;
  while (file.state !== "ACTIVE" && file.state !== "FAILED") {
    await new Promise((resolve) => setTimeout(resolve, 1e3));
    file = await import_transport.apiRequest.call(this, "GET", `/v1beta/${file.name}`);
  }
  if (file.state === "FAILED") {
    throw new import_n8n_workflow.NodeOperationError(this.getNode(), file.error?.message ?? "Unknown error", {
      description: "Error uploading file"
    });
  }
  return { fileUri: file.uri, mimeType: file.mimeType };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  downloadFile,
  transferFile,
  uploadFile
});
//# sourceMappingURL=utils.js.map