"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoveDataStoreColumnDto = void 0;
const zod_1 = require("zod");
const zod_class_1 = require("zod-class");
class MoveDataStoreColumnDto extends zod_class_1.Z.class({
    targetIndex: zod_1.z.number().int().nonnegative(),
}) {
}
exports.MoveDataStoreColumnDto = MoveDataStoreColumnDto;
//# sourceMappingURL=move-data-store-column.dto.js.map