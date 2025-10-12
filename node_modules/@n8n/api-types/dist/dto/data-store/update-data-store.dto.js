"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateDataStoreDto = void 0;
const zod_class_1 = require("zod-class");
const data_store_schema_1 = require("../../schemas/data-store.schema");
class UpdateDataStoreDto extends zod_class_1.Z.class({
    name: data_store_schema_1.dataStoreNameSchema,
}) {
}
exports.UpdateDataStoreDto = UpdateDataStoreDto;
//# sourceMappingURL=update-data-store.dto.js.map