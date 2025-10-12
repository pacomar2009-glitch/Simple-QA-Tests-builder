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
exports.DataStoreService = void 0;
const backend_common_1 = require("@n8n/backend-common");
const db_1 = require("@n8n/db");
const di_1 = require("@n8n/di");
const n8n_workflow_1 = require("n8n-workflow");
const role_service_1 = require("../../services/role.service");
const data_store_column_repository_1 = require("./data-store-column.repository");
const data_store_rows_repository_1 = require("./data-store-rows.repository");
const data_store_size_validator_service_1 = require("./data-store-size-validator.service");
const data_store_repository_1 = require("./data-store.repository");
const data_store_types_1 = require("./data-store.types");
const data_store_column_not_found_error_1 = require("./errors/data-store-column-not-found.error");
const data_store_name_conflict_error_1 = require("./errors/data-store-name-conflict.error");
const data_store_not_found_error_1 = require("./errors/data-store-not-found.error");
const data_store_validation_error_1 = require("./errors/data-store-validation.error");
const sql_utils_1 = require("./utils/sql-utils");
let DataStoreService = class DataStoreService {
    constructor(dataStoreRepository, dataStoreColumnRepository, dataStoreRowsRepository, logger, dataStoreSizeValidator, projectRelationRepository, roleService) {
        this.dataStoreRepository = dataStoreRepository;
        this.dataStoreColumnRepository = dataStoreColumnRepository;
        this.dataStoreRowsRepository = dataStoreRowsRepository;
        this.logger = logger;
        this.dataStoreSizeValidator = dataStoreSizeValidator;
        this.projectRelationRepository = projectRelationRepository;
        this.roleService = roleService;
        this.logger = this.logger.scoped('data-table');
    }
    async start() { }
    async shutdown() { }
    async createDataStore(projectId, dto) {
        await this.validateUniqueName(dto.name, projectId);
        const result = await this.dataStoreRepository.createDataStore(projectId, dto.name, dto.columns);
        this.dataStoreSizeValidator.reset();
        return result;
    }
    async updateDataStore(dataStoreId, projectId, dto) {
        await this.validateDataStoreExists(dataStoreId, projectId);
        await this.validateUniqueName(dto.name, projectId);
        await this.dataStoreRepository.update({ id: dataStoreId }, { name: dto.name });
        return true;
    }
    async transferDataStoresByProjectId(fromProjectId, toProjectId) {
        return await this.dataStoreRepository.transferDataStoreByProjectId(fromProjectId, toProjectId);
    }
    async deleteDataStoreByProjectId(projectId) {
        const result = await this.dataStoreRepository.deleteDataStoreByProjectId(projectId);
        if (result) {
            this.dataStoreSizeValidator.reset();
        }
        return result;
    }
    async deleteDataStoreAll() {
        const result = await this.dataStoreRepository.deleteDataStoreAll();
        if (result) {
            this.dataStoreSizeValidator.reset();
        }
        return result;
    }
    async deleteDataStore(dataStoreId, projectId) {
        await this.validateDataStoreExists(dataStoreId, projectId);
        await this.dataStoreRepository.deleteDataStore(dataStoreId);
        this.dataStoreSizeValidator.reset();
        return true;
    }
    async addColumn(dataStoreId, projectId, dto) {
        await this.validateDataStoreExists(dataStoreId, projectId);
        return await this.dataStoreColumnRepository.addColumn(dataStoreId, dto);
    }
    async moveColumn(dataStoreId, projectId, columnId, dto) {
        await this.validateDataStoreExists(dataStoreId, projectId);
        const existingColumn = await this.validateColumnExists(dataStoreId, columnId);
        await this.dataStoreColumnRepository.moveColumn(dataStoreId, existingColumn, dto.targetIndex);
        return true;
    }
    async deleteColumn(dataStoreId, projectId, columnId) {
        await this.validateDataStoreExists(dataStoreId, projectId);
        const existingColumn = await this.validateColumnExists(dataStoreId, columnId);
        await this.dataStoreColumnRepository.deleteColumn(dataStoreId, existingColumn);
        return true;
    }
    async getManyAndCount(options) {
        return await this.dataStoreRepository.getManyAndCount(options);
    }
    async getManyRowsAndCount(dataStoreId, projectId, dto) {
        await this.validateDataStoreExists(dataStoreId, projectId);
        return await this.dataStoreColumnRepository.manager.transaction(async (em) => {
            const columns = await this.dataStoreColumnRepository.getColumns(dataStoreId, em);
            if (dto.filter) {
                this.validateAndTransformFilters(dto.filter, columns);
            }
            const result = await this.dataStoreRowsRepository.getManyAndCount(dataStoreId, dto, columns, em);
            return {
                count: result.count,
                data: (0, sql_utils_1.normalizeRows)(result.data, columns),
            };
        });
    }
    async getColumns(dataStoreId, projectId) {
        await this.validateDataStoreExists(dataStoreId, projectId);
        return await this.dataStoreColumnRepository.getColumns(dataStoreId);
    }
    async insertRows(dataStoreId, projectId, rows, returnType = 'count') {
        await this.validateDataTableSize();
        await this.validateDataStoreExists(dataStoreId, projectId);
        const result = await this.dataStoreColumnRepository.manager.transaction(async (em) => {
            const columns = await this.dataStoreColumnRepository.getColumns(dataStoreId, em);
            this.validateRowsWithColumns(rows, columns);
            return await this.dataStoreRowsRepository.insertRows(dataStoreId, rows, columns, returnType, em);
        });
        this.dataStoreSizeValidator.reset();
        return result;
    }
    async upsertRow(dataTableId, projectId, dto, returnData = false) {
        await this.validateDataTableSize();
        await this.validateDataStoreExists(dataTableId, projectId);
        const result = await this.dataStoreColumnRepository.manager.transaction(async (em) => {
            const columns = await this.dataStoreColumnRepository.getColumns(dataTableId, em);
            this.validateUpdateParams(dto, columns);
            const updated = await this.dataStoreRowsRepository.updateRow(dataTableId, dto.data, dto.filter, columns, true, em);
            if (updated.length > 0) {
                return returnData ? updated : true;
            }
            const inserted = await this.dataStoreRowsRepository.insertRows(dataTableId, [dto.data], columns, returnData ? 'all' : 'id', em);
            return returnData ? inserted : true;
        });
        this.dataStoreSizeValidator.reset();
        return result;
    }
    validateUpdateParams({ filter, data }, columns) {
        if (columns.length === 0) {
            throw new data_store_validation_error_1.DataStoreValidationError('No columns found for this data table or data table not found');
        }
        if (!filter?.filters || filter.filters.length === 0) {
            throw new data_store_validation_error_1.DataStoreValidationError('Filter must not be empty');
        }
        if (!data || Object.keys(data).length === 0) {
            throw new data_store_validation_error_1.DataStoreValidationError('Data columns must not be empty');
        }
        this.validateRowsWithColumns([data], columns, false);
        this.validateAndTransformFilters(filter, columns);
    }
    async updateRow(dataTableId, projectId, dto, returnData = false) {
        await this.validateDataTableSize();
        await this.validateDataStoreExists(dataTableId, projectId);
        const result = await this.dataStoreColumnRepository.manager.transaction(async (em) => {
            const columns = await this.dataStoreColumnRepository.getColumns(dataTableId, em);
            this.validateUpdateParams(dto, columns);
            return await this.dataStoreRowsRepository.updateRow(dataTableId, dto.data, dto.filter, columns, returnData, em);
        });
        this.dataStoreSizeValidator.reset();
        return result;
    }
    async deleteRows(dataStoreId, projectId, dto, returnData = false) {
        await this.validateDataStoreExists(dataStoreId, projectId);
        const columns = await this.dataStoreColumnRepository.getColumns(dataStoreId);
        if (!dto.filter?.filters || dto.filter.filters.length === 0) {
            throw new data_store_validation_error_1.DataStoreValidationError('Filter is required for delete operations to prevent accidental deletion of all data');
        }
        this.validateAndTransformFilters(dto.filter, columns);
        const result = await this.dataStoreRowsRepository.deleteRows(dataStoreId, columns, dto.filter, returnData);
        this.dataStoreSizeValidator.reset();
        return returnData ? result : true;
    }
    validateRowsWithColumns(rows, columns, includeSystemColumns = false) {
        const allColumns = includeSystemColumns
            ? [
                ...Object.entries(n8n_workflow_1.DATA_TABLE_SYSTEM_COLUMN_TYPE_MAP).map(([name, type]) => ({
                    name,
                    type,
                })),
                ...columns,
            ]
            : columns;
        const columnNames = new Set(allColumns.map((x) => x.name));
        const columnTypeMap = new Map(allColumns.map((x) => [x.name, x.type]));
        for (const row of rows) {
            const keys = Object.keys(row);
            for (const key of keys) {
                if (!columnNames.has(key)) {
                    throw new data_store_validation_error_1.DataStoreValidationError(`unknown column name '${key}'`);
                }
                this.validateCell(row, key, columnTypeMap);
            }
        }
    }
    validateCell(row, key, columnTypeMap) {
        const cell = row[key];
        if (cell === null)
            return;
        const columnType = columnTypeMap.get(key);
        if (!columnType)
            return;
        const fieldType = data_store_types_1.columnTypeToFieldType[columnType];
        if (!fieldType)
            return;
        const validationResult = (0, n8n_workflow_1.validateFieldType)(key, cell, fieldType, {
            strict: false,
            parseStrings: false,
        });
        if (!validationResult.valid) {
            throw new data_store_validation_error_1.DataStoreValidationError(`value '${String(cell)}' does not match column type '${columnType}': ${validationResult.errorMessage}`);
        }
        if (columnType === 'date') {
            try {
                const dateInISO = validationResult.newValue.toISO();
                row[key] = dateInISO;
                return;
            }
            catch {
                throw new data_store_validation_error_1.DataStoreValidationError(`value '${String(cell)}' does not match column type 'date'`);
            }
        }
        row[key] = validationResult.newValue;
    }
    async validateDataStoreExists(dataStoreId, projectId) {
        const existingTable = await this.dataStoreRepository.findOneBy({
            id: dataStoreId,
            project: {
                id: projectId,
            },
        });
        if (!existingTable) {
            throw new data_store_not_found_error_1.DataStoreNotFoundError(dataStoreId);
        }
        return existingTable;
    }
    async validateColumnExists(dataTableId, columnId) {
        const existingColumn = await this.dataStoreColumnRepository.findOneBy({
            id: columnId,
            dataTableId,
        });
        if (existingColumn === null) {
            throw new data_store_column_not_found_error_1.DataStoreColumnNotFoundError(dataTableId, columnId);
        }
        return existingColumn;
    }
    async validateUniqueName(name, projectId) {
        const hasNameClash = await this.dataStoreRepository.existsBy({
            name,
            projectId,
        });
        if (hasNameClash) {
            throw new data_store_name_conflict_error_1.DataStoreNameConflictError(name);
        }
    }
    validateAndTransformFilters(filterObject, columns) {
        this.validateRowsWithColumns(filterObject.filters.map((f) => {
            return {
                [f.columnName]: f.value,
            };
        }), columns, true);
        for (const filter of filterObject.filters) {
            if (['like', 'ilike'].includes(filter.condition)) {
                if (filter.value === null || filter.value === undefined) {
                    throw new data_store_validation_error_1.DataStoreValidationError(`${filter.condition.toUpperCase()} filter value cannot be null or undefined`);
                }
                if (typeof filter.value !== 'string') {
                    throw new data_store_validation_error_1.DataStoreValidationError(`${filter.condition.toUpperCase()} filter value must be a string`);
                }
                if (!filter.value.includes('%')) {
                    filter.value = `%${filter.value}%`;
                }
            }
            if (['gt', 'gte', 'lt', 'lte'].includes(filter.condition)) {
                if (filter.value === null || filter.value === undefined) {
                    throw new data_store_validation_error_1.DataStoreValidationError(`${filter.condition.toUpperCase()} filter value cannot be null or undefined`);
                }
            }
        }
    }
    async validateDataTableSize() {
        await this.dataStoreSizeValidator.validateSize(async () => await this.dataStoreRepository.findDataTablesSize());
    }
    async getDataTablesSize(user) {
        const allSizeData = await this.dataStoreSizeValidator.getCachedSizeData(async () => await this.dataStoreRepository.findDataTablesSize());
        const roles = await this.roleService.rolesWithScope('project', ['dataStore:listProject']);
        const accessibleProjectIds = await this.projectRelationRepository.getAccessibleProjectsByRoles(user.id, roles);
        const accessibleProjectIdsSet = new Set(accessibleProjectIds);
        const accessibleDataTables = Object.fromEntries(Object.entries(allSizeData.dataTables).filter(([, dataTableInfo]) => accessibleProjectIdsSet.has(dataTableInfo.projectId)));
        return {
            totalBytes: allSizeData.totalBytes,
            quotaStatus: this.dataStoreSizeValidator.sizeToState(allSizeData.totalBytes),
            dataTables: accessibleDataTables,
        };
    }
};
exports.DataStoreService = DataStoreService;
exports.DataStoreService = DataStoreService = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [data_store_repository_1.DataStoreRepository,
        data_store_column_repository_1.DataStoreColumnRepository,
        data_store_rows_repository_1.DataStoreRowsRepository,
        backend_common_1.Logger,
        data_store_size_validator_service_1.DataStoreSizeValidator,
        db_1.ProjectRelationRepository,
        role_service_1.RoleService])
], DataStoreService);
//# sourceMappingURL=data-store.service.js.map