"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.description = exports.FIELD = void 0;
exports.execute = execute;
const n8n_workflow_1 = require("n8n-workflow");
const addRow_1 = require("../../common/addRow");
const selectMany_1 = require("../../common/selectMany");
const utils_1 = require("../../common/utils");
exports.FIELD = 'upsert';
const displayOptions = {
    show: {
        resource: ['row'],
        operation: [exports.FIELD],
    },
};
exports.description = [
    ...(0, selectMany_1.getSelectFields)(displayOptions),
    (0, addRow_1.makeAddRow)(exports.FIELD, displayOptions),
];
async function execute(index) {
    const dataStoreProxy = await (0, utils_1.getDataTableProxyExecute)(this, index);
    const row = (0, addRow_1.getAddRow)(this, index);
    const filter = await (0, selectMany_1.getSelectFilter)(this, index);
    if (filter.filters.length === 0) {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'At least one condition is required');
    }
    const result = await dataStoreProxy.upsertRow({
        data: row,
        filter,
    });
    return result.map((json) => ({ json }));
}
//# sourceMappingURL=upsert.operation.js.map