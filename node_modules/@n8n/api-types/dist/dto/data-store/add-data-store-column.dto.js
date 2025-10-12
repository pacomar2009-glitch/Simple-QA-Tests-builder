"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddDataStoreColumnDto = void 0;
const zod_class_1 = require("zod-class");
const data_store_schema_1 = require("../../schemas/data-store.schema");
class AddDataStoreColumnDto extends zod_class_1.Z.class(data_store_schema_1.dataStoreCreateColumnSchema.shape) {
}
exports.AddDataStoreColumnDto = AddDataStoreColumnDto;
//# sourceMappingURL=add-data-store-column.dto.js.map