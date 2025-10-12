"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataStoreNotFoundError = void 0;
const n8n_workflow_1 = require("n8n-workflow");
class DataStoreNotFoundError extends n8n_workflow_1.UserError {
    constructor(dataStoreId) {
        super(`Could not find the data table: '${dataStoreId}'`, {
            level: 'warning',
        });
    }
}
exports.DataStoreNotFoundError = DataStoreNotFoundError;
//# sourceMappingURL=data-store-not-found.error.js.map