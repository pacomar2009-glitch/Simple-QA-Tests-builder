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
exports.DataStoreSizeValidator = void 0;
const config_1 = require("@n8n/config");
const di_1 = require("@n8n/di");
const data_store_validation_error_1 = require("./errors/data-store-validation.error");
let DataStoreSizeValidator = class DataStoreSizeValidator {
    constructor(globalConfig) {
        this.globalConfig = globalConfig;
        this.pendingCheck = null;
    }
    shouldRefresh(now) {
        if (!this.lastCheck ||
            !this.cachedSizeData ||
            now.getTime() - this.lastCheck.getTime() >= this.globalConfig.dataTable.sizeCheckCacheDuration) {
            return true;
        }
        return false;
    }
    async getCachedSizeData(fetchSizeDataFn, now = new Date()) {
        if (this.pendingCheck) {
            this.cachedSizeData = await this.pendingCheck;
        }
        else {
            if (this.shouldRefresh(now)) {
                this.pendingCheck = fetchSizeDataFn();
                try {
                    this.cachedSizeData = await this.pendingCheck;
                    this.lastCheck = now;
                }
                finally {
                    this.pendingCheck = null;
                }
            }
        }
        return this.cachedSizeData;
    }
    async validateSize(fetchSizeFn, now = new Date()) {
        const size = await this.getCachedSizeData(fetchSizeFn, now);
        if (size.totalBytes >= this.globalConfig.dataTable.maxSize) {
            throw new data_store_validation_error_1.DataStoreValidationError(`Data store size limit exceeded: ${this.toMb(size.totalBytes)}MB used, limit is ${this.toMb(this.globalConfig.dataTable.maxSize)}MB`);
        }
    }
    sizeToState(sizeBytes) {
        if (sizeBytes >= this.globalConfig.dataTable.maxSize) {
            return 'error';
        }
        else if (sizeBytes >= this.globalConfig.dataTable.warningThreshold) {
            return 'warn';
        }
        return 'ok';
    }
    async getSizeStatus(fetchSizeFn, now = new Date()) {
        const size = await this.getCachedSizeData(fetchSizeFn, now);
        return this.sizeToState(size.totalBytes);
    }
    toMb(sizeInBytes) {
        return Math.round(sizeInBytes / (1024 * 1024));
    }
    reset() {
        this.lastCheck = undefined;
        this.cachedSizeData = undefined;
        this.pendingCheck = null;
    }
};
exports.DataStoreSizeValidator = DataStoreSizeValidator;
exports.DataStoreSizeValidator = DataStoreSizeValidator = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [config_1.GlobalConfig])
], DataStoreSizeValidator);
//# sourceMappingURL=data-store-size-validator.service.js.map