"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateDataStoreColumnDto = void 0;
const zod_class_1 = require("zod-class");
const data_store_schema_1 = require("../../schemas/data-store.schema");
class CreateDataStoreColumnDto extends zod_class_1.Z.class({
    name: data_store_schema_1.dataStoreColumnNameSchema,
    type: data_store_schema_1.dataStoreColumnTypeSchema,
}) {
}
exports.CreateDataStoreColumnDto = CreateDataStoreColumnDto;
//# sourceMappingURL=create-data-store-column.dto.js.map