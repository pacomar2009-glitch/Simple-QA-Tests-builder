"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataStoreValidationError = void 0;
const n8n_workflow_1 = require("n8n-workflow");
class DataStoreValidationError extends n8n_workflow_1.UserError {
    constructor(msg) {
        super(`Validation error with data store request: ${msg}`, {
            level: 'warning',
        });
    }
}
exports.DataStoreValidationError = DataStoreValidationError;
//# sourceMappingURL=data-store-validation.error.js.map