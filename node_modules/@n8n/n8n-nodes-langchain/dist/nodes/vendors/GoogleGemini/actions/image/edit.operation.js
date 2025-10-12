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
var edit_operation_exports = {};
__export(edit_operation_exports, {
  description: () => description,
  execute: () => execute
});
module.exports = __toCommonJS(edit_operation_exports);
var import_n8n_workflow = require("n8n-workflow");
var import_utils = require("../../helpers/utils");
var import_transport = require("../../transport");
function isImagesParameter(param) {
  if (typeof param !== "object" || param === null) {
    return false;
  }
  const paramObj = param;
  if (!("values" in paramObj)) {
    return true;
  }
  if (!Array.isArray(paramObj.values)) {
    return false;
  }
  return paramObj.values.every((item) => {
    if (typeof item !== "object" || item === null) {
      return false;
    }
    const itemObj = item;
    if (!("binaryPropertyName" in itemObj)) {
      return true;
    }
    return typeof itemObj.binaryPropertyName === "string" || itemObj.binaryPropertyName === void 0;
  });
}
function isGenerateContentResponse(response) {
  if (typeof response !== "object" || response === null) {
    return false;
  }
  const responseObj = response;
  if (!("candidates" in responseObj) || !Array.isArray(responseObj.candidates)) {
    return false;
  }
  return responseObj.candidates.every((candidate) => {
    if (typeof candidate !== "object" || candidate === null) {
      return false;
    }
    const candidateObj = candidate;
    if (!("content" in candidateObj) || typeof candidateObj.content !== "object" || candidateObj.content === null) {
      return false;
    }
    const contentObj = candidateObj.content;
    return "parts" in contentObj && Array.isArray(contentObj.parts);
  });
}
const properties = [
  {
    displayName: "Prompt",
    name: "prompt",
    type: "string",
    placeholder: "e.g. combine the first image with the second image",
    description: "Instruction describing how to edit the image",
    default: "",
    typeOptions: {
      rows: 2
    }
  },
  {
    displayName: "Images",
    name: "images",
    type: "fixedCollection",
    placeholder: "Add Image",
    typeOptions: {
      multipleValues: true,
      multipleValueButtonText: "Add Image"
    },
    default: { values: [{ binaryPropertyName: "data" }] },
    description: "Add one or more binary fields to include images with your prompt",
    options: [
      {
        displayName: "Image",
        name: "values",
        values: [
          {
            displayName: "Binary Field Name",
            name: "binaryPropertyName",
            type: "string",
            default: "data",
            placeholder: "e.g. data",
            description: "The name of the binary field containing the image data"
          }
        ]
      }
    ]
  },
  {
    displayName: "Options",
    name: "options",
    placeholder: "Add Option",
    type: "collection",
    default: {},
    options: [
      {
        displayName: "Put Output in Field",
        name: "binaryPropertyOutput",
        type: "string",
        default: "edited",
        hint: "The name of the output field to put the binary file data in"
      }
    ]
  }
];
const displayOptions = {
  show: {
    operation: ["edit"],
    resource: ["image"]
  }
};
const description = (0, import_n8n_workflow.updateDisplayOptions)(displayOptions, properties);
async function execute(i) {
  const prompt = this.getNodeParameter("prompt", i, "");
  const binaryPropertyOutput = this.getNodeParameter("options.binaryPropertyOutput", i, "edited");
  const outputKey = typeof binaryPropertyOutput === "string" ? binaryPropertyOutput : "data";
  const imagesParam = this.getNodeParameter("images", i, {
    values: [{ binaryPropertyName: "data" }]
  });
  if (!isImagesParameter(imagesParam)) {
    throw new Error("Invalid images parameter format");
  }
  const imagesUi = imagesParam.values ?? [];
  const imageFieldNames = imagesUi.map((v) => v.binaryPropertyName).filter((n) => Boolean(n));
  const fileParts = [];
  for (const fieldName of imageFieldNames) {
    const bin = this.helpers.assertBinaryData(i, fieldName);
    const buf = await this.helpers.getBinaryDataBuffer(i, fieldName);
    const uploaded = await import_utils.uploadFile.call(this, buf, bin.mimeType);
    fileParts.push({ fileData: { fileUri: uploaded.fileUri, mimeType: uploaded.mimeType } });
  }
  const model = "models/gemini-2.5-flash-image-preview";
  const generationConfig = {
    responseModalities: ["IMAGE"]
  };
  const body = {
    contents: [
      {
        role: "user",
        parts: [...fileParts, { text: prompt }]
      }
    ],
    generationConfig
  };
  const response = await import_transport.apiRequest.call(
    this,
    "POST",
    `/v1beta/${model}:generateContent`,
    {
      body
    }
  );
  if (!isGenerateContentResponse(response)) {
    throw new Error("Invalid response format from Gemini API");
  }
  const promises = response.candidates.map(async (candidate) => {
    const imagePart = candidate.content.parts.find((part) => "inlineData" in part);
    if (!imagePart?.inlineData?.data) {
      throw new Error("No image data returned from Gemini API");
    }
    const bufferOut = Buffer.from(imagePart.inlineData.data, "base64");
    const binaryOut = await this.helpers.prepareBinaryData(
      bufferOut,
      "image.png",
      imagePart.inlineData.mimeType
    );
    return {
      binary: {
        [outputKey]: binaryOut
      },
      json: {
        ...binaryOut,
        data: void 0
      },
      pairedItem: { item: i }
    };
  });
  return await Promise.all(promises);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  description,
  execute
});
//# sourceMappingURL=edit.operation.js.map