"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataStoreProxyService = void 0;
exports.isAllowedNode = isAllowedNode;
const backend_common_1 = require("@n8n/backend-common");
const di_1 = require("@n8n/di");
const ownership_service_1 = require("../../services/ownership.service");
const data_store_service_1 = require("./data-store.service");
const ALLOWED_NODES = [
    'n8n-nodes-base.dataTable',
    'n8n-nodes-base.dataTableTool',
    'n8n-nodes-base.evaluationTrigger',
    'n8n-nodes-base.evaluation',
];
function isAllowedNode(s) {
    return ALLOWED_NODES.includes(s);
}
let DataStoreProxyService = class DataStoreProxyService {
    constructor(dataStoreService, ownershipService, logger) {
        this.dataStoreService = dataStoreService;
        this.ownershipService = ownershipService;
        this.logger = logger;
        this.logger = this.logger.scoped('data-table');
    }
    validateRequest(node) {
        if (!isAllowedNode(node.type)) {
            throw new Error('This proxy is only available for Data table nodes');
        }
    }
    async getProjectId(workflow) {
        const homeProject = await this.ownershipService.getWorkflowProjectCached(workflow.id);
        return homeProject.id;
    }
    async getDataStoreAggregateProxy(workflow, node, projectId) {
        this.validateRequest(node);
        projectId = projectId ?? (await this.getProjectId(workflow));
        return this.makeAggregateOperations(projectId);
    }
    async getDataStoreProxy(workflow, node, dataStoreId, projectId) {
        this.validateRequest(node);
        projectId = projectId ?? (await this.getProjectId(workflow));
        return this.makeDataStoreOperations(projectId, dataStoreId);
    }
    makeAggregateOperations(projectId) {
        const dataStoreService = this.dataStoreService;
        return {
            getProjectId() {
                return projectId;
            },
            async getManyAndCount(options = {}) {
                const serviceOptions = {
                    ...options,
                    filter: { projectId, ...(options.filter ?? {}) },
                };
                return await dataStoreService.getManyAndCount(serviceOptions);
            },
            async createDataStore(options) {
                return await dataStoreService.createDataStore(projectId, options);
            },
            async deleteDataStoreAll() {
                return await dataStoreService.deleteDataStoreByProjectId(projectId);
            },
        };
    }
    makeDataStoreOperations(projectId, dataStoreId) {
        const dataStoreService = this.dataStoreService;
        return {
            async updateDataStore(options) {
                return await dataStoreService.updateDataStore(dataStoreId, projectId, options);
            },
            async deleteDataStore() {
                return await dataStoreService.deleteDataStore(dataStoreId, projectId);
            },
            async getColumns() {
                return await dataStoreService.getColumns(dataStoreId, projectId);
            },
            async addColumn(options) {
                return await dataStoreService.addColumn(dataStoreId, projectId, options);
            },
            async moveColumn(columnId, options) {
                return await dataStoreService.moveColumn(dataStoreId, projectId, columnId, options);
            },
            async deleteColumn(columnId) {
                return await dataStoreService.deleteColumn(dataStoreId, projectId, columnId);
            },
            async getManyRowsAndCount(options) {
                return await dataStoreService.getManyRowsAndCount(dataStoreId, projectId, options);
            },
            async insertRows(rows, returnType) {
                return await dataStoreService.insertRows(dataStoreId, projectId, rows, returnType);
            },
            async updateRow(options) {
                return await dataStoreService.updateRow(dataStoreId, projectId, options, true);
            },
            async upsertRow(options) {
                return await dataStoreService.upsertRow(dataStoreId, projectId, options, true);
            },
            async deleteRows(options) {
                return await dataStoreService.deleteRows(dataStoreId, projectId, options, true);
            },
        };
    }
};
exports.DataStoreProxyService = DataStoreProxyService;
exports.DataStoreProxyService = DataStoreProxyService = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [data_store_service_1.DataStoreService,
        ownership_service_1.OwnershipService,
        backend_common_1.Logger])
], DataStoreProxyService);
//# sourceMappingURL=data-store-proxy.service.js.map