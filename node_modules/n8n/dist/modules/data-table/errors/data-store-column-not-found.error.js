"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataStoreColumnNotFoundError = void 0;
const n8n_workflow_1 = require("n8n-workflow");
class DataStoreColumnNotFoundError extends n8n_workflow_1.UserError {
    constructor(dataStoreId, columnId) {
        super(`Could not find the column '${columnId}' in the data store: ${dataStoreId}`, {
            level: 'warning',
        });
    }
}
exports.DataStoreColumnNotFoundError = DataStoreColumnNotFoundError;
//# sourceMappingURL=data-store-column-not-found.error.js.map