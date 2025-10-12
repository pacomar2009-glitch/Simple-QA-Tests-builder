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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataStoreController = void 0;
const api_types_1 = require("@n8n/api-types");
const decorators_1 = require("@n8n/decorators");
const bad_request_error_1 = require("../../errors/response-errors/bad-request.error");
const conflict_error_1 = require("../../errors/response-errors/conflict.error");
const internal_server_error_1 = require("../../errors/response-errors/internal-server.error");
const not_found_error_1 = require("../../errors/response-errors/not-found.error");
const data_store_service_1 = require("./data-store.service");
const data_store_column_name_conflict_error_1 = require("./errors/data-store-column-name-conflict.error");
const data_store_column_not_found_error_1 = require("./errors/data-store-column-not-found.error");
const data_store_name_conflict_error_1 = require("./errors/data-store-name-conflict.error");
const data_store_not_found_error_1 = require("./errors/data-store-not-found.error");
const data_store_validation_error_1 = require("./errors/data-store-validation.error");
let DataStoreController = class DataStoreController {
    constructor(dataStoreService) {
        this.dataStoreService = dataStoreService;
    }
    async createDataStore(req, _res, dto) {
        try {
            return await this.dataStoreService.createDataStore(req.params.projectId, dto);
        }
        catch (e) {
            if (!(e instanceof Error)) {
                throw e;
            }
            else if (e instanceof data_store_name_conflict_error_1.DataStoreNameConflictError) {
                throw new conflict_error_1.ConflictError(e.message);
            }
            else {
                throw new internal_server_error_1.InternalServerError(e.message, e);
            }
        }
    }
    async listProjectDataStores(req, _res, payload) {
        const providedFilter = payload?.filter ?? {};
        return await this.dataStoreService.getManyAndCount({
            ...payload,
            filter: { ...providedFilter, projectId: req.params.projectId },
        });
    }
    async updateDataStore(req, _res, dataStoreId, dto) {
        try {
            return await this.dataStoreService.updateDataStore(dataStoreId, req.params.projectId, dto);
        }
        catch (e) {
            if (e instanceof data_store_not_found_error_1.DataStoreNotFoundError) {
                throw new not_found_error_1.NotFoundError(e.message);
            }
            else if (e instanceof data_store_name_conflict_error_1.DataStoreNameConflictError) {
                throw new conflict_error_1.ConflictError(e.message);
            }
            else if (e instanceof Error) {
                throw new internal_server_error_1.InternalServerError(e.message, e);
            }
            else {
                throw e;
            }
        }
    }
    async deleteDataStore(req, _res, dataStoreId) {
        try {
            return await this.dataStoreService.deleteDataStore(dataStoreId, req.params.projectId);
        }
        catch (e) {
            if (e instanceof data_store_not_found_error_1.DataStoreNotFoundError) {
                throw new not_found_error_1.NotFoundError(e.message);
            }
            else if (e instanceof Error) {
                throw new internal_server_error_1.InternalServerError(e.message, e);
            }
            else {
                throw e;
            }
        }
    }
    async getColumns(req, _res, dataStoreId) {
        try {
            return await this.dataStoreService.getColumns(dataStoreId, req.params.projectId);
        }
        catch (e) {
            if (e instanceof data_store_not_found_error_1.DataStoreNotFoundError) {
                throw new not_found_error_1.NotFoundError(e.message);
            }
            else if (e instanceof Error) {
                throw new internal_server_error_1.InternalServerError(e.message, e);
            }
            else {
                throw e;
            }
        }
    }
    async addColumn(req, _res, dataStoreId, dto) {
        try {
            return await this.dataStoreService.addColumn(dataStoreId, req.params.projectId, dto);
        }
        catch (e) {
            if (e instanceof data_store_not_found_error_1.DataStoreNotFoundError) {
                throw new not_found_error_1.NotFoundError(e.message);
            }
            else if (e instanceof data_store_column_name_conflict_error_1.DataStoreColumnNameConflictError) {
                throw new conflict_error_1.ConflictError(e.message);
            }
            else if (e instanceof Error) {
                throw new internal_server_error_1.InternalServerError(e.message, e);
            }
            else {
                throw e;
            }
        }
    }
    async deleteColumn(req, _res, dataStoreId, columnId) {
        try {
            return await this.dataStoreService.deleteColumn(dataStoreId, req.params.projectId, columnId);
        }
        catch (e) {
            if (e instanceof data_store_not_found_error_1.DataStoreNotFoundError || e instanceof data_store_column_not_found_error_1.DataStoreColumnNotFoundError) {
                throw new not_found_error_1.NotFoundError(e.message);
            }
            else if (e instanceof Error) {
                throw new internal_server_error_1.InternalServerError(e.message, e);
            }
            else {
                throw e;
            }
        }
    }
    async moveColumn(req, _res, dataStoreId, columnId, dto) {
        try {
            return await this.dataStoreService.moveColumn(dataStoreId, req.params.projectId, columnId, dto);
        }
        catch (e) {
            if (e instanceof data_store_not_found_error_1.DataStoreNotFoundError || e instanceof data_store_column_not_found_error_1.DataStoreColumnNotFoundError) {
                throw new not_found_error_1.NotFoundError(e.message);
            }
            else if (e instanceof data_store_validation_error_1.DataStoreValidationError) {
                throw new bad_request_error_1.BadRequestError(e.message);
            }
            else if (e instanceof Error) {
                throw new internal_server_error_1.InternalServerError(e.message, e);
            }
            else {
                throw e;
            }
        }
    }
    async getDataStoreRows(req, _res, dataStoreId, dto) {
        try {
            return await this.dataStoreService.getManyRowsAndCount(dataStoreId, req.params.projectId, dto);
        }
        catch (e) {
            if (e instanceof data_store_not_found_error_1.DataStoreNotFoundError) {
                throw new not_found_error_1.NotFoundError(e.message);
            }
            else if (e instanceof Error) {
                throw new internal_server_error_1.InternalServerError(e.message, e);
            }
            else {
                throw e;
            }
        }
    }
    async appendDataStoreRows(req, _res, dataStoreId, dto) {
        try {
            return await this.dataStoreService.insertRows(dataStoreId, req.params.projectId, dto.data, dto.returnType);
        }
        catch (e) {
            if (e instanceof data_store_not_found_error_1.DataStoreNotFoundError) {
                throw new not_found_error_1.NotFoundError(e.message);
            }
            else if (e instanceof data_store_validation_error_1.DataStoreValidationError) {
                throw new bad_request_error_1.BadRequestError(e.message);
            }
            else if (e instanceof Error) {
                throw new internal_server_error_1.InternalServerError(e.message, e);
            }
            else {
                throw e;
            }
        }
    }
    async upsertDataStoreRow(req, _res, dataStoreId, dto) {
        try {
            return await this.dataStoreService.upsertRow(dataStoreId, req.params.projectId, dto, dto.returnData);
        }
        catch (e) {
            if (e instanceof data_store_not_found_error_1.DataStoreNotFoundError) {
                throw new not_found_error_1.NotFoundError(e.message);
            }
            else if (e instanceof data_store_validation_error_1.DataStoreValidationError) {
                throw new bad_request_error_1.BadRequestError(e.message);
            }
            else if (e instanceof Error) {
                throw new internal_server_error_1.InternalServerError(e.message, e);
            }
            else {
                throw e;
            }
        }
    }
    async updateDataStoreRow(req, _res, dataStoreId, dto) {
        try {
            return await this.dataStoreService.updateRow(dataStoreId, req.params.projectId, dto, dto.returnData);
        }
        catch (e) {
            if (e instanceof data_store_not_found_error_1.DataStoreNotFoundError) {
                throw new not_found_error_1.NotFoundError(e.message);
            }
            else if (e instanceof data_store_validation_error_1.DataStoreValidationError) {
                throw new bad_request_error_1.BadRequestError(e.message);
            }
            else if (e instanceof Error) {
                throw new internal_server_error_1.InternalServerError(e.message, e);
            }
            else {
                throw e;
            }
        }
    }
    async deleteDataTableRows(req, _res, dataTableId, dto) {
        try {
            return await this.dataStoreService.deleteRows(dataTableId, req.params.projectId, dto, dto.returnData);
        }
        catch (e) {
            if (e instanceof data_store_not_found_error_1.DataStoreNotFoundError) {
                throw new not_found_error_1.NotFoundError(e.message);
            }
            else if (e instanceof data_store_validation_error_1.DataStoreValidationError) {
                throw new bad_request_error_1.BadRequestError(e.message);
            }
            else if (e instanceof Error) {
                throw new internal_server_error_1.InternalServerError(e.message, e);
            }
            else {
                throw e;
            }
        }
    }
};
exports.DataStoreController = DataStoreController;
__decorate([
    (0, decorators_1.Post)('/'),
    (0, decorators_1.ProjectScope)('dataStore:create'),
    __param(2, decorators_1.Body),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Response,
        api_types_1.CreateDataStoreDto]),
    __metadata("design:returntype", Promise)
], DataStoreController.prototype, "createDataStore", null);
__decorate([
    (0, decorators_1.Get)('/'),
    (0, decorators_1.ProjectScope)('dataStore:listProject'),
    __param(2, decorators_1.Query),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Response,
        api_types_1.ListDataStoreQueryDto]),
    __metadata("design:returntype", Promise)
], DataStoreController.prototype, "listProjectDataStores", null);
__decorate([
    (0, decorators_1.Patch)('/:dataStoreId'),
    (0, decorators_1.ProjectScope)('dataStore:update'),
    __param(2, (0, decorators_1.Param)('dataStoreId')),
    __param(3, decorators_1.Body),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Response, String, api_types_1.UpdateDataStoreDto]),
    __metadata("design:returntype", Promise)
], DataStoreController.prototype, "updateDataStore", null);
__decorate([
    (0, decorators_1.Delete)('/:dataStoreId'),
    (0, decorators_1.ProjectScope)('dataStore:delete'),
    __param(2, (0, decorators_1.Param)('dataStoreId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Response, String]),
    __metadata("design:returntype", Promise)
], DataStoreController.prototype, "deleteDataStore", null);
__decorate([
    (0, decorators_1.Get)('/:dataStoreId/columns'),
    (0, decorators_1.ProjectScope)('dataStore:read'),
    __param(2, (0, decorators_1.Param)('dataStoreId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Response, String]),
    __metadata("design:returntype", Promise)
], DataStoreController.prototype, "getColumns", null);
__decorate([
    (0, decorators_1.Post)('/:dataStoreId/columns'),
    (0, decorators_1.ProjectScope)('dataStore:update'),
    __param(2, (0, decorators_1.Param)('dataStoreId')),
    __param(3, decorators_1.Body),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Response, String, api_types_1.AddDataStoreColumnDto]),
    __metadata("design:returntype", Promise)
], DataStoreController.prototype, "addColumn", null);
__decorate([
    (0, decorators_1.Delete)('/:dataStoreId/columns/:columnId'),
    (0, decorators_1.ProjectScope)('dataStore:update'),
    __param(2, (0, decorators_1.Param)('dataStoreId')),
    __param(3, (0, decorators_1.Param)('columnId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Response, String, String]),
    __metadata("design:returntype", Promise)
], DataStoreController.prototype, "deleteColumn", null);
__decorate([
    (0, decorators_1.Patch)('/:dataStoreId/columns/:columnId/move'),
    (0, decorators_1.ProjectScope)('dataStore:update'),
    __param(2, (0, decorators_1.Param)('dataStoreId')),
    __param(3, (0, decorators_1.Param)('columnId')),
    __param(4, decorators_1.Body),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Response, String, String, api_types_1.MoveDataStoreColumnDto]),
    __metadata("design:returntype", Promise)
], DataStoreController.prototype, "moveColumn", null);
__decorate([
    (0, decorators_1.Get)('/:dataStoreId/rows'),
    (0, decorators_1.ProjectScope)('dataStore:readRow'),
    __param(2, (0, decorators_1.Param)('dataStoreId')),
    __param(3, decorators_1.Query),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Response, String, api_types_1.ListDataStoreContentQueryDto]),
    __metadata("design:returntype", Promise)
], DataStoreController.prototype, "getDataStoreRows", null);
__decorate([
    (0, decorators_1.Post)('/:dataStoreId/insert'),
    (0, decorators_1.ProjectScope)('dataStore:writeRow'),
    __param(2, (0, decorators_1.Param)('dataStoreId')),
    __param(3, decorators_1.Body),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Response, String, api_types_1.AddDataStoreRowsDto]),
    __metadata("design:returntype", Promise)
], DataStoreController.prototype, "appendDataStoreRows", null);
__decorate([
    (0, decorators_1.Post)('/:dataStoreId/upsert'),
    (0, decorators_1.ProjectScope)('dataStore:writeRow'),
    __param(2, (0, decorators_1.Param)('dataStoreId')),
    __param(3, decorators_1.Body),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Response, String, api_types_1.UpsertDataStoreRowDto]),
    __metadata("design:returntype", Promise)
], DataStoreController.prototype, "upsertDataStoreRow", null);
__decorate([
    (0, decorators_1.Patch)('/:dataStoreId/rows'),
    (0, decorators_1.ProjectScope)('dataStore:writeRow'),
    __param(2, (0, decorators_1.Param)('dataStoreId')),
    __param(3, decorators_1.Body),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Response, String, api_types_1.UpdateDataTableRowDto]),
    __metadata("design:returntype", Promise)
], DataStoreController.prototype, "updateDataStoreRow", null);
__decorate([
    (0, decorators_1.Delete)('/:dataTableId/rows'),
    (0, decorators_1.ProjectScope)('dataStore:writeRow'),
    __param(2, (0, decorators_1.Param)('dataTableId')),
    __param(3, decorators_1.Query),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Response, String, api_types_1.DeleteDataTableRowsDto]),
    __metadata("design:returntype", Promise)
], DataStoreController.prototype, "deleteDataTableRows", null);
exports.DataStoreController = DataStoreController = __decorate([
    (0, decorators_1.RestController)('/projects/:projectId/data-tables'),
    __metadata("design:paramtypes", [data_store_service_1.DataStoreService])
], DataStoreController);
//# sourceMappingURL=data-store.controller.js.map