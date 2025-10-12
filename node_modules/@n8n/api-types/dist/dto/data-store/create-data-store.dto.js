"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateDataStoreDto = void 0;
const zod_1 = require("zod");
const zod_class_1 = require("zod-class");
const create_data_store_column_dto_1 = require("./create-data-store-column.dto");
const data_store_schema_1 = require("../../schemas/data-store.schema");
class CreateDataStoreDto extends zod_class_1.Z.class({
    name: data_store_schema_1.dataStoreNameSchema,
    columns: zod_1.z.array(create_data_store_column_dto_1.CreateDataStoreColumnDto),
}) {
}
exports.CreateDataStoreDto = CreateDataStoreDto;
//# sourceMappingURL=create-data-store.dto.js.map