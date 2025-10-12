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
exports.DataStoreAggregateController = void 0;
const api_types_1 = require("@n8n/api-types");
const decorators_1 = require("@n8n/decorators");
const data_store_aggregate_service_1 = require("./data-store-aggregate.service");
const data_store_service_1 = require("./data-store.service");
let DataStoreAggregateController = class DataStoreAggregateController {
    constructor(dataStoreAggregateService, dataStoreService) {
        this.dataStoreAggregateService = dataStoreAggregateService;
        this.dataStoreService = dataStoreService;
    }
    async listDataStores(req, _res, payload) {
        return await this.dataStoreAggregateService.getManyAndCount(req.user, payload);
    }
    async getDataTablesSize(req) {
        return await this.dataStoreService.getDataTablesSize(req.user);
    }
};
exports.DataStoreAggregateController = DataStoreAggregateController;
__decorate([
    (0, decorators_1.Get)('/'),
    (0, decorators_1.GlobalScope)('dataStore:list'),
    __param(2, decorators_1.Query),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Response,
        api_types_1.ListDataStoreQueryDto]),
    __metadata("design:returntype", Promise)
], DataStoreAggregateController.prototype, "listDataStores", null);
__decorate([
    (0, decorators_1.Get)('/limits'),
    (0, decorators_1.GlobalScope)('dataStore:list'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DataStoreAggregateController.prototype, "getDataTablesSize", null);
exports.DataStoreAggregateController = DataStoreAggregateController = __decorate([
    (0, decorators_1.RestController)('/data-tables-global'),
    __metadata("design:paramtypes", [data_store_aggregate_service_1.DataStoreAggregateService,
        data_store_service_1.DataStoreService])
], DataStoreAggregateController);
//# sourceMappingURL=data-store-aggregate.controller.js.map