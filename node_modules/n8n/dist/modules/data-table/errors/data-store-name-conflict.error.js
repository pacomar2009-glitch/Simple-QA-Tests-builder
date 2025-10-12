"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataStoreNameConflictError = void 0;
const n8n_workflow_1 = require("n8n-workflow");
class DataStoreNameConflictError extends n8n_workflow_1.UserError {
    constructor(name) {
        super(`Data store with name '${name}' already exists in this project`, {
            level: 'warning',
        });
    }
}
exports.DataStoreNameConflictError = DataStoreNameConflictError;
//# sourceMappingURL=data-store-name-conflict.error.js.map