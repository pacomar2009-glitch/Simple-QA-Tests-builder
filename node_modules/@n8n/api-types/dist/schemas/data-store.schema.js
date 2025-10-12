"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataStoreColumnValueSchema = exports.dateTimeSchema = exports.dataStoreSchema = exports.dataStoreColumnSchema = exports.dataStoreCreateColumnSchema = exports.dataStoreColumnTypeSchema = exports.dataStoreColumnNameSchema = exports.DATA_STORE_COLUMN_ERROR_MESSAGE = exports.DATA_STORE_COLUMN_MAX_LENGTH = exports.DATA_STORE_COLUMN_REGEX = exports.dataStoreIdSchema = exports.dataStoreNameSchema = exports.insertRowReturnType = void 0;
const zod_1 = require("zod");
exports.insertRowReturnType = zod_1.z.union([zod_1.z.literal('all'), zod_1.z.literal('count'), zod_1.z.literal('id')]);
exports.dataStoreNameSchema = zod_1.z.string().trim().min(1).max(128);
exports.dataStoreIdSchema = zod_1.z.string().max(36);
exports.DATA_STORE_COLUMN_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*$/;
exports.DATA_STORE_COLUMN_MAX_LENGTH = 63;
exports.DATA_STORE_COLUMN_ERROR_MESSAGE = 'Only alphabetical characters and non-leading numbers and underscores are allowed for column names, and the maximum length is 63 characters.';
exports.dataStoreColumnNameSchema = zod_1.z
    .string()
    .trim()
    .min(1)
    .max(exports.DATA_STORE_COLUMN_MAX_LENGTH)
    .regex(exports.DATA_STORE_COLUMN_REGEX, exports.DATA_STORE_COLUMN_ERROR_MESSAGE);
exports.dataStoreColumnTypeSchema = zod_1.z.enum(['string', 'number', 'boolean', 'date']);
exports.dataStoreCreateColumnSchema = zod_1.z.object({
    name: exports.dataStoreColumnNameSchema,
    type: exports.dataStoreColumnTypeSchema,
    index: zod_1.z.number().optional(),
});
exports.dataStoreColumnSchema = exports.dataStoreCreateColumnSchema.extend({
    dataStoreId: exports.dataStoreIdSchema,
});
exports.dataStoreSchema = zod_1.z.object({
    id: exports.dataStoreIdSchema,
    name: exports.dataStoreNameSchema,
    columns: zod_1.z.array(exports.dataStoreColumnSchema),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
exports.dateTimeSchema = zod_1.z
    .string()
    .datetime({ offset: true })
    .transform((s) => new Date(s))
    .pipe(zod_1.z.date());
exports.dataStoreColumnValueSchema = zod_1.z.union([
    zod_1.z.string(),
    zod_1.z.number(),
    zod_1.z.boolean(),
    zod_1.z.null(),
    zod_1.z.date(),
]);
//# sourceMappingURL=data-store.schema.js.map