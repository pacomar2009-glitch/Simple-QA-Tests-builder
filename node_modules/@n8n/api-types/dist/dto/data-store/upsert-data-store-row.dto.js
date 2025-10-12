"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpsertDataStoreRowDto = void 0;
const zod_1 = require("zod");
const zod_class_1 = require("zod-class");
const data_store_schema_1 = require("../../schemas/data-store.schema");
const data_table_filter_schema_1 = require("../../schemas/data-table-filter.schema");
const upsertFilterSchema = data_table_filter_schema_1.dataTableFilterSchema.refine((filter) => filter.filters.length > 0, {
    message: 'filter must not be empty',
});
const upsertDataStoreRowShape = {
    filter: upsertFilterSchema,
    data: zod_1.z
        .record(data_store_schema_1.dataStoreColumnNameSchema, data_store_schema_1.dataStoreColumnValueSchema)
        .refine((obj) => Object.keys(obj).length > 0, {
        message: 'data must not be empty',
    }),
    returnData: zod_1.z.boolean().optional().default(false),
};
class UpsertDataStoreRowDto extends zod_class_1.Z.class(upsertDataStoreRowShape) {
}
exports.UpsertDataStoreRowDto = UpsertDataStoreRowDto;
//# sourceMappingURL=upsert-data-store-row.dto.js.map