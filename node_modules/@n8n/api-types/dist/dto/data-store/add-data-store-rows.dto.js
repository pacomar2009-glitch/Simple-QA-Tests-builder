"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddDataStoreRowsDto = void 0;
const zod_1 = require("zod");
const zod_class_1 = require("zod-class");
const data_store_schema_1 = require("../../schemas/data-store.schema");
class AddDataStoreRowsDto extends zod_class_1.Z.class({
    data: zod_1.z.array(zod_1.z.record(data_store_schema_1.dataStoreColumnNameSchema, data_store_schema_1.dataStoreColumnValueSchema)),
    returnType: data_store_schema_1.insertRowReturnType,
}) {
}
exports.AddDataStoreRowsDto = AddDataStoreRowsDto;
//# sourceMappingURL=add-data-store-rows.dto.js.map