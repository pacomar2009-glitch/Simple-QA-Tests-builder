"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataStoreColumnNameConflictError = void 0;
const n8n_workflow_1 = require("n8n-workflow");
class DataStoreColumnNameConflictError extends n8n_workflow_1.UserError {
    constructor(columnName, dataStoreName) {
        super(`Data store column with name '${columnName}' already exists in data store '${dataStoreName}'`, {
            level: 'warning',
        });
    }
}
exports.DataStoreColumnNameConflictError = DataStoreColumnNameConflictError;
//# sourceMappingURL=data-store-column-name-conflict.error.js.map