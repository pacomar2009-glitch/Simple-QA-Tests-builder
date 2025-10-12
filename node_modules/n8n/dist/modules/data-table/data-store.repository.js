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
exports.DataStoreRepository = void 0;
const api_types_1 = require("@n8n/api-types");
const config_1 = require("@n8n/config");
const db_1 = require("@n8n/db");
const di_1 = require("@n8n/di");
const typeorm_1 = require("@n8n/typeorm");
const n8n_workflow_1 = require("n8n-workflow");
const data_store_rows_repository_1 = require("./data-store-rows.repository");
const data_table_column_entity_1 = require("./data-table-column.entity");
const data_table_entity_1 = require("./data-table.entity");
const data_store_name_conflict_error_1 = require("./errors/data-store-name-conflict.error");
const data_store_validation_error_1 = require("./errors/data-store-validation.error");
const sql_utils_1 = require("./utils/sql-utils");
let DataStoreRepository = class DataStoreRepository extends typeorm_1.Repository {
    constructor(dataSource, dataStoreRowsRepository, globalConfig) {
        super(data_table_entity_1.DataTable, dataSource.manager);
        this.dataStoreRowsRepository = dataStoreRowsRepository;
        this.globalConfig = globalConfig;
        this.parseSize = (bytes) => bytes === null ? 0 : typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
    }
    async createDataStore(projectId, name, columns) {
        if (columns.some((c) => !(0, sql_utils_1.isValidColumnName)(c.name))) {
            throw new data_store_validation_error_1.DataStoreValidationError(api_types_1.DATA_STORE_COLUMN_ERROR_MESSAGE);
        }
        let dataTableId;
        await this.manager.transaction(async (em) => {
            const dataStore = em.create(data_table_entity_1.DataTable, { name, columns, projectId });
            await em.insert(data_table_entity_1.DataTable, dataStore);
            dataTableId = dataStore.id;
            const queryRunner = em.queryRunner;
            if (!queryRunner) {
                throw new n8n_workflow_1.UnexpectedError('QueryRunner is not available');
            }
            const columnEntities = columns.map((col, index) => em.create(data_table_column_entity_1.DataTableColumn, {
                dataTableId,
                name: col.name,
                type: col.type,
                index: col.index ?? index,
            }));
            if (columnEntities.length > 0) {
                await em.insert(data_table_column_entity_1.DataTableColumn, columnEntities);
            }
            await this.dataStoreRowsRepository.createTableWithColumns(dataTableId, columnEntities, queryRunner);
        });
        if (!dataTableId) {
            throw new n8n_workflow_1.UnexpectedError('Data store creation failed');
        }
        const createdDataStore = await this.findOneOrFail({
            where: { id: dataTableId },
            relations: ['project', 'columns'],
        });
        return createdDataStore;
    }
    async deleteDataStore(dataStoreId, tx) {
        const run = async (em) => {
            const queryRunner = em.queryRunner;
            if (!queryRunner) {
                throw new n8n_workflow_1.UnexpectedError('QueryRunner is not available');
            }
            await em.delete(data_table_entity_1.DataTable, { id: dataStoreId });
            await this.dataStoreRowsRepository.dropTable(dataStoreId, queryRunner);
            return true;
        };
        if (tx) {
            return await run(tx);
        }
        return await this.manager.transaction(run);
    }
    async transferDataStoreByProjectId(fromProjectId, toProjectId) {
        if (fromProjectId === toProjectId)
            return false;
        return await this.manager.transaction(async (em) => {
            const existingTables = await em.findBy(data_table_entity_1.DataTable, { projectId: fromProjectId });
            let transferred = false;
            for (const existing of existingTables) {
                let name = existing.name;
                const hasNameClash = await em.existsBy(data_table_entity_1.DataTable, {
                    name,
                    projectId: toProjectId,
                });
                if (hasNameClash) {
                    const project = await em.findOneByOrFail(db_1.Project, { id: fromProjectId });
                    name = `${existing.name} (${project.name})`;
                    const stillHasNameClash = await em.existsBy(data_table_entity_1.DataTable, {
                        name,
                        projectId: toProjectId,
                    });
                    if (stillHasNameClash) {
                        throw new data_store_name_conflict_error_1.DataStoreNameConflictError(`Failed to transfer data store "${existing.name}" to the target project "${toProjectId}". A data table with the same name already exists in the target project.`);
                    }
                }
                await em.update(data_table_entity_1.DataTable, { id: existing.id }, { name, projectId: toProjectId });
                transferred = true;
            }
            return transferred;
        });
    }
    async deleteDataStoreByProjectId(projectId) {
        return await this.manager.transaction(async (em) => {
            const existingTables = await em.findBy(data_table_entity_1.DataTable, { projectId });
            let changed = false;
            for (const match of existingTables) {
                const result = await this.deleteDataStore(match.id, em);
                changed = changed || result;
            }
            return changed;
        });
    }
    async deleteDataStoreAll() {
        return await this.manager.transaction(async (em) => {
            const queryRunner = em.queryRunner;
            if (!queryRunner) {
                throw new n8n_workflow_1.UnexpectedError('QueryRunner is not available');
            }
            const existingTables = await em.findBy(data_table_entity_1.DataTable, {});
            let changed = false;
            for (const match of existingTables) {
                const result = await em.delete(data_table_entity_1.DataTable, { id: match.id });
                await this.dataStoreRowsRepository.dropTable(match.id, queryRunner);
                changed = changed || (result.affected ?? 0) > 0;
            }
            return changed;
        });
    }
    async getManyAndCount(options) {
        const query = this.getManyQuery(options);
        const [data, count] = await query.getManyAndCount();
        return { count, data };
    }
    async getMany(options) {
        const query = this.getManyQuery(options);
        return await query.getMany();
    }
    getManyQuery(options) {
        const query = this.createQueryBuilder('dataStore');
        this.applySelections(query);
        this.applyFilters(query, options.filter);
        this.applySorting(query, options.sortBy);
        this.applyPagination(query, options);
        return query;
    }
    applySelections(query) {
        this.applyDefaultSelect(query);
    }
    applyFilters(query, filter) {
        for (const x of ['id', 'projectId']) {
            const content = [filter?.[x]].flat().filter((x) => x !== undefined);
            if (content.length === 0)
                continue;
            query.andWhere(`dataStore.${x} IN (:...${x}s)`, {
                [x + 's']: content.length > 0 ? content : [''],
            });
        }
        if (filter?.name) {
            const nameFilters = Array.isArray(filter.name) ? filter.name : [filter.name];
            nameFilters.forEach((name, i) => {
                query.andWhere(`LOWER(dataStore.name) LIKE LOWER(:name${i})`, {
                    ['name' + i]: `%${name}%`,
                });
            });
        }
    }
    applySorting(query, sortBy) {
        if (!sortBy) {
            query.orderBy('dataStore.updatedAt', 'DESC');
            return;
        }
        const [field, order] = this.parseSortingParams(sortBy);
        this.applySortingByField(query, field, order);
    }
    parseSortingParams(sortBy) {
        const [field, order] = sortBy.split(':');
        return [field, order?.toLowerCase() === 'desc' ? 'DESC' : 'ASC'];
    }
    applySortingByField(query, field, direction) {
        if (field === 'name') {
            query
                .addSelect('LOWER(dataStore.name)', 'datastore_name_lower')
                .orderBy('datastore_name_lower', direction);
        }
        else if (['createdAt', 'updatedAt'].includes(field)) {
            query.orderBy(`dataStore.${field}`, direction);
        }
    }
    applyPagination(query, options) {
        query.skip(options.skip ?? 0);
        if (options.take !== undefined)
            query.take(options.take);
    }
    applyDefaultSelect(query) {
        query
            .leftJoinAndSelect('dataStore.project', 'project')
            .leftJoinAndSelect('dataStore.columns', 'data_store_column')
            .select([
            'dataStore',
            ...this.getDataStoreColumnFields('data_store_column'),
            ...this.getProjectFields('project'),
        ]);
    }
    getDataStoreColumnFields(alias) {
        return [
            `${alias}.id`,
            `${alias}.name`,
            `${alias}.type`,
            `${alias}.createdAt`,
            `${alias}.updatedAt`,
            `${alias}.index`,
        ];
    }
    getProjectFields(alias) {
        return [`${alias}.id`, `${alias}.name`, `${alias}.type`, `${alias}.icon`];
    }
    async findDataTablesSize() {
        const sizeMap = await this.getAllDataTablesSizeMap();
        const totalBytes = Array.from(sizeMap.values()).reduce((sum, size) => sum + size, 0);
        const query = this.createQueryBuilder('dt')
            .leftJoinAndSelect('dt.project', 'p')
            .select(['dt.id', 'dt.name', 'p.id', 'p.name']);
        const dataTablesWithProjects = await query.getMany();
        const dataTables = {};
        for (const dt of dataTablesWithProjects) {
            const sizeBytes = sizeMap.get(dt.id) ?? 0;
            dataTables[dt.id] = {
                id: dt.id,
                name: dt.name,
                projectId: dt.project.id,
                projectName: dt.project.name,
                sizeBytes,
            };
        }
        return {
            totalBytes,
            dataTables,
        };
    }
    async getAllDataTablesSizeMap() {
        const dbType = this.globalConfig.database.type;
        const tablePattern = (0, sql_utils_1.toTableName)('%');
        let sql = '';
        switch (dbType) {
            case 'sqlite':
                sql = `
        WITH data_table_names(name) AS (
          SELECT name
          FROM sqlite_schema
          WHERE type = 'table' AND name GLOB '${(0, sql_utils_1.toTableName)('*')}'
        )
        SELECT t.name AS table_name, (SELECT SUM(pgsize) FROM dbstat WHERE name = t.name) AS table_bytes
        FROM data_table_names AS t
      `;
                break;
            case 'postgresdb': {
                const schemaName = this.globalConfig.database.postgresdb?.schema;
                sql = `
        SELECT c.relname AS table_name, pg_relation_size(c.oid) AS table_bytes
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = '${schemaName}'
           AND c.relname LIKE '${tablePattern}'
           AND c.relkind IN ('r', 'm', 'p')
      `;
                break;
            }
            case 'mysqldb':
            case 'mariadb': {
                const databaseName = this.globalConfig.database.mysqldb.database;
                const isMariaDb = dbType === 'mariadb';
                const innodbTables = isMariaDb ? 'INNODB_SYS_TABLES' : 'INNODB_TABLES';
                const innodbTablespaces = isMariaDb ? 'INNODB_SYS_TABLESPACES' : 'INNODB_TABLESPACES';
                sql = `
        SELECT t.TABLE_NAME AS table_name,
            COALESCE(
                (
                  SELECT SUM(ists.ALLOCATED_SIZE)
                    FROM information_schema.${innodbTables} ist
                    JOIN information_schema.${innodbTablespaces} ists
                      ON ists.SPACE = ist.SPACE
                   WHERE ist.NAME = CONCAT(t.TABLE_SCHEMA, '/', t.TABLE_NAME)
                ),
                (t.DATA_LENGTH + t.INDEX_LENGTH)
            ) AS table_bytes
        FROM information_schema.TABLES t
        WHERE t.TABLE_SCHEMA = '${databaseName}'
          AND t.TABLE_NAME LIKE '${tablePattern}'
    `;
                break;
            }
            default:
                return new Map();
        }
        const result = (await this.query(sql));
        const sizeMap = new Map();
        for (const row of result) {
            if (row.table_bytes !== null && row.table_name) {
                const dataStoreId = (0, sql_utils_1.toTableId)(row.table_name);
                const sizeBytes = this.parseSize(row.table_bytes);
                sizeMap.set(dataStoreId, (sizeMap.get(dataStoreId) ?? 0) + sizeBytes);
            }
        }
        return sizeMap;
    }
};
exports.DataStoreRepository = DataStoreRepository;
exports.DataStoreRepository = DataStoreRepository = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        data_store_rows_repository_1.DataStoreRowsRepository,
        config_1.GlobalConfig])
], DataStoreRepository);
//# sourceMappingURL=data-store.repository.js.map