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
exports.DataStoreRowsRepository = void 0;
const db_1 = require("@n8n/db");
const di_1 = require("@n8n/di");
const typeorm_1 = require("@n8n/typeorm");
const n8n_workflow_1 = require("n8n-workflow");
const sql_utils_1 = require("./utils/sql-utils");
function getConditionAndParams(filter, index, dbType, tableReference, columns) {
    const paramName = `filter_${index}`;
    const columnRef = tableReference
        ? `${(0, sql_utils_1.quoteIdentifier)(tableReference, dbType)}.${(0, sql_utils_1.quoteIdentifier)(filter.columnName, dbType)}`
        : (0, sql_utils_1.quoteIdentifier)(filter.columnName, dbType);
    if (filter.value === null) {
        switch (filter.condition) {
            case 'eq':
                return [`${columnRef} IS NULL`, {}];
            case 'neq':
                return [`${columnRef} IS NOT NULL`, {}];
        }
    }
    const columnInfo = columns?.find((col) => col.name === filter.columnName);
    const value = columnInfo ? (0, sql_utils_1.normalizeValue)(filter.value, columnInfo?.type, dbType) : filter.value;
    const operators = {
        eq: '=',
        gt: '>',
        gte: '>=',
        lt: '<',
        lte: '<=',
    };
    if (operators[filter.condition]) {
        return [`${columnRef} ${operators[filter.condition]} :${paramName}`, { [paramName]: value }];
    }
    if (filter.condition === 'neq') {
        return [`(${columnRef} != :${paramName} OR ${columnRef} IS NULL)`, { [paramName]: value }];
    }
    switch (filter.condition) {
        case 'like':
            if (['sqlite', 'sqlite-pooled'].includes(dbType)) {
                const globValue = (0, sql_utils_1.toSqliteGlobFromPercent)(value);
                return [`${columnRef} GLOB :${paramName}`, { [paramName]: globValue }];
            }
            if (['mysql', 'mariadb'].includes(dbType)) {
                const escapedValue = (0, sql_utils_1.escapeLikeSpecials)(value);
                return [
                    `${columnRef} LIKE BINARY :${paramName} ESCAPE '\\\\'`,
                    { [paramName]: escapedValue },
                ];
            }
            if (dbType === 'postgres') {
                const escapedValue = (0, sql_utils_1.escapeLikeSpecials)(value);
                return [`${columnRef} LIKE :${paramName} ESCAPE '\\'`, { [paramName]: escapedValue }];
            }
            return [`${columnRef} LIKE :${paramName}`, { [paramName]: value }];
        case 'ilike':
            if (['sqlite', 'sqlite-pooled'].includes(dbType)) {
                const escapedValue = (0, sql_utils_1.escapeLikeSpecials)(value);
                return [
                    `UPPER(${columnRef}) LIKE UPPER(:${paramName}) ESCAPE '\\'`,
                    { [paramName]: escapedValue },
                ];
            }
            if (['mysql', 'mariadb'].includes(dbType)) {
                const escapedValue = (0, sql_utils_1.escapeLikeSpecials)(value);
                return [
                    `UPPER(${columnRef}) LIKE UPPER(:${paramName}) ESCAPE '\\\\'`,
                    { [paramName]: escapedValue },
                ];
            }
            if (dbType === 'postgres') {
                const escapedValue = (0, sql_utils_1.escapeLikeSpecials)(value);
                return [`${columnRef} ILIKE :${paramName} ESCAPE '\\'`, { [paramName]: escapedValue }];
            }
            return [`UPPER(${columnRef}) LIKE UPPER(:${paramName})`, { [paramName]: value }];
    }
    throw new Error(`Unsupported filter condition: ${filter.condition}`);
}
let DataStoreRowsRepository = class DataStoreRowsRepository {
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async insertRowsBulk(table, rows, columns, em) {
        let insertedRows = 0;
        if (columns.length === 0) {
            for (const row of rows) {
                const query = em.createQueryBuilder().insert().into(table).values(row);
                await query.execute();
                insertedRows++;
            }
            return { success: true, insertedRows };
        }
        const batchSize = 800;
        const batches = Math.max(1, Math.ceil((columns.length * rows.length) / batchSize));
        const rowsPerBatch = Math.ceil(rows.length / batches);
        const columnNames = columns.map((x) => x.name);
        const dbType = this.dataSource.options.type;
        for (let i = 0; i < batches; ++i) {
            const start = i * rowsPerBatch;
            const endExclusive = Math.min(rows.length, (i + 1) * rowsPerBatch);
            if (endExclusive <= start)
                break;
            const completeRows = new Array(endExclusive - start);
            for (let j = start; j < endExclusive; ++j) {
                const insertArray = [];
                for (let h = 0; h < columnNames.length; ++h) {
                    const column = columns[h];
                    const value = rows[j][column.name] ?? null;
                    insertArray[h] = (0, sql_utils_1.normalizeValue)(value, column.type, dbType);
                }
                completeRows[j - start] = insertArray;
            }
            const query = em.createQueryBuilder().insert().into(table, columnNames).values(completeRows);
            await query.execute();
            insertedRows += completeRows.length;
        }
        return { success: true, insertedRows };
    }
    async insertRows(dataStoreId, rows, columns, returnType, em) {
        em = em ?? this.dataSource.manager;
        const inserted = [];
        const dbType = this.dataSource.options.type;
        const useReturning = dbType === 'postgres' || dbType === 'mariadb';
        const table = (0, sql_utils_1.toTableName)(dataStoreId);
        const escapedColumns = columns.map((c) => this.dataSource.driver.escape(c.name));
        const escapedSystemColumns = n8n_workflow_1.DATA_TABLE_SYSTEM_COLUMNS.map((x) => this.dataSource.driver.escape(x));
        const selectColumns = [...escapedSystemColumns, ...escapedColumns];
        if (returnType === 'count') {
            return await this.insertRowsBulk(table, rows, columns, em);
        }
        for (const row of rows) {
            const completeRow = { ...row };
            for (const column of columns) {
                if (!(column.name in completeRow)) {
                    completeRow[column.name] = null;
                }
                completeRow[column.name] = (0, sql_utils_1.normalizeValue)(completeRow[column.name], column.type, dbType);
            }
            const query = em.createQueryBuilder().insert().into(table).values(completeRow);
            if (useReturning) {
                query.returning(returnType === 'all' ? selectColumns.join(',') : 'id');
            }
            const result = await query.execute();
            if (useReturning) {
                const returned = returnType === 'all'
                    ? (0, sql_utils_1.normalizeRows)((0, sql_utils_1.extractReturningData)(result.raw), columns)
                    : (0, sql_utils_1.extractInsertedIds)(result.raw, dbType).map((id) => ({ id }));
                inserted.push.apply(inserted, returned);
                continue;
            }
            const ids = (0, sql_utils_1.extractInsertedIds)(result.raw, dbType);
            if (ids.length === 0) {
                throw new n8n_workflow_1.UnexpectedError("Couldn't find the inserted row ID");
            }
            if (returnType === 'id') {
                inserted.push(...ids.map((id) => ({ id })));
                continue;
            }
            const insertedRows = await this.getManyByIds(dataStoreId, ids, columns, em);
            inserted.push(...insertedRows);
        }
        return inserted;
    }
    async updateRow(dataStoreId, data, filter, columns, returnData = false, em) {
        em = em ?? this.dataSource.manager;
        const dbType = this.dataSource.options.type;
        const useReturning = dbType === 'postgres';
        const table = (0, sql_utils_1.toTableName)(dataStoreId);
        const escapedColumns = columns.map((c) => this.dataSource.driver.escape(c.name));
        const escapedSystemColumns = n8n_workflow_1.DATA_TABLE_SYSTEM_COLUMNS.map((x) => this.dataSource.driver.escape(x));
        const selectColumns = [...escapedSystemColumns, ...escapedColumns];
        const setData = { ...data };
        for (const column of columns) {
            if (column.name in setData) {
                setData[column.name] = (0, sql_utils_1.normalizeValue)(setData[column.name], column.type, dbType);
            }
        }
        let affectedRows = [];
        if (!useReturning && returnData) {
            const selectQuery = em.createQueryBuilder().select('id').from(table, 'dataTable');
            this.applyFilters(selectQuery, filter, 'dataTable', columns);
            affectedRows = await selectQuery.getRawMany();
        }
        setData.updatedAt = (0, sql_utils_1.normalizeValue)(new Date(), 'date', dbType);
        const query = em.createQueryBuilder().update(table);
        this.applyFilters(query, filter, undefined, columns);
        query.set(setData);
        if (useReturning && returnData) {
            query.returning(selectColumns.join(','));
        }
        const result = await query.execute();
        if (!returnData) {
            return true;
        }
        if (useReturning) {
            return (0, sql_utils_1.normalizeRows)((0, sql_utils_1.extractReturningData)(result.raw), columns);
        }
        const ids = affectedRows.map((row) => row.id);
        return await this.getManyByIds(dataStoreId, ids, columns, em);
    }
    async deleteRows(dataTableId, columns, filter, returnData = false) {
        const dbType = this.dataSource.options.type;
        const useReturning = dbType === 'postgres';
        const table = (0, sql_utils_1.toTableName)(dataTableId);
        if (!returnData) {
            await this.dataSource.manager.transaction(async (em) => {
                const query = em.createQueryBuilder().delete().from(table, 'dataTable');
                if (filter) {
                    this.applyFilters(query, filter, undefined, columns);
                }
                await query.execute();
            });
            return true;
        }
        let affectedRows = [];
        await this.dataSource.manager.transaction(async (em) => {
            if (!useReturning) {
                const selectQuery = em.createQueryBuilder().select('*').from(table, 'dataTable');
                if (filter) {
                    this.applyFilters(selectQuery, filter, 'dataTable', columns);
                }
                const rawRows = await selectQuery.getRawMany();
                affectedRows = (0, sql_utils_1.normalizeRows)(rawRows, columns);
            }
            const query = em.createQueryBuilder().delete().from(table, 'dataTable');
            if (useReturning) {
                const escapedColumns = columns.map((c) => this.dataSource.driver.escape(c.name));
                const escapedSystemColumns = n8n_workflow_1.DATA_TABLE_SYSTEM_COLUMNS.map((x) => this.dataSource.driver.escape(x));
                const selectColumns = [...escapedSystemColumns, ...escapedColumns];
                query.returning(selectColumns.join(','));
            }
            if (filter) {
                this.applyFilters(query, filter, undefined, columns);
            }
            const result = await query.execute();
            if (useReturning) {
                affectedRows = (0, sql_utils_1.normalizeRows)((0, sql_utils_1.extractReturningData)(result.raw), columns);
            }
        });
        return affectedRows;
    }
    async createTableWithColumns(dataStoreId, columns, queryRunner) {
        const dslColumns = [new db_1.DslColumn('id').int.autoGenerate2.primary, ...(0, sql_utils_1.toDslColumns)(columns)];
        const createTable = new db_1.CreateTable((0, sql_utils_1.toTableName)(dataStoreId), '', queryRunner).withColumns(...dslColumns).withTimestamps;
        await createTable.execute(queryRunner);
    }
    async dropTable(dataStoreId, queryRunner) {
        await queryRunner.dropTable((0, sql_utils_1.toTableName)(dataStoreId), true);
    }
    async addColumn(dataStoreId, column, queryRunner, dbType) {
        await queryRunner.query((0, sql_utils_1.addColumnQuery)((0, sql_utils_1.toTableName)(dataStoreId), column, dbType));
    }
    async dropColumnFromTable(dataStoreId, columnName, queryRunner, dbType) {
        await queryRunner.query((0, sql_utils_1.deleteColumnQuery)((0, sql_utils_1.toTableName)(dataStoreId), columnName, dbType));
    }
    async getManyAndCount(dataStoreId, dto, columns, em) {
        em = em ?? this.dataSource.manager;
        const [countQuery, query] = this.getManyQuery(dataStoreId, dto, em, columns);
        const data = await query.select('*').getRawMany();
        const countResult = await countQuery.select('COUNT(*) as count').getRawOne();
        const count = typeof countResult?.count === 'number' ? countResult.count : Number(countResult?.count) || 0;
        return { count: count ?? -1, data };
    }
    async getManyByIds(dataStoreId, ids, columns, em) {
        const table = (0, sql_utils_1.toTableName)(dataStoreId);
        const escapedColumns = columns.map((c) => this.dataSource.driver.escape(c.name));
        const escapedSystemColumns = n8n_workflow_1.DATA_TABLE_SYSTEM_COLUMNS.map((x) => this.dataSource.driver.escape(x));
        const selectColumns = [...escapedSystemColumns, ...escapedColumns];
        if (ids.length === 0) {
            return [];
        }
        const updatedRows = await em
            .createQueryBuilder()
            .select(selectColumns)
            .from(table, 'dataTable')
            .where({ id: (0, typeorm_1.In)(ids) })
            .getRawMany();
        return (0, sql_utils_1.normalizeRows)(updatedRows, columns);
    }
    getManyQuery(dataStoreId, dto, em, columns) {
        const query = em.createQueryBuilder();
        const tableReference = 'dataTable';
        query.from((0, sql_utils_1.toTableName)(dataStoreId), tableReference);
        if (dto.filter) {
            this.applyFilters(query, dto.filter, tableReference, columns);
        }
        const countQuery = query.clone().select('COUNT(*)');
        this.applySorting(query, dto);
        this.applyPagination(query, dto);
        return [countQuery, query];
    }
    applyFilters(query, filter, tableReference, columns) {
        const filters = filter.filters ?? [];
        const filterType = filter.type ?? 'and';
        const dbType = this.dataSource.options.type;
        const conditionsAndParams = filters.map((filter, i) => getConditionAndParams(filter, i, dbType, tableReference, columns));
        if (conditionsAndParams.length === 1) {
            const [condition, params] = conditionsAndParams[0];
            query.andWhere(condition, params);
        }
        else {
            for (const [condition, params] of conditionsAndParams) {
                if (filterType === 'or') {
                    query.orWhere(condition, params);
                }
                else {
                    query.andWhere(condition, params);
                }
            }
        }
    }
    applySorting(query, dto) {
        if (!dto.sortBy) {
            return;
        }
        const [field, order] = dto.sortBy;
        this.applySortingByField(query, field, order);
    }
    applySortingByField(query, field, direction) {
        const dbType = this.dataSource.options.type;
        const quotedField = `${(0, sql_utils_1.quoteIdentifier)('dataTable', dbType)}.${(0, sql_utils_1.quoteIdentifier)(field, dbType)}`;
        query.orderBy(quotedField, direction);
    }
    applyPagination(query, dto) {
        query.skip(dto.skip ?? 0);
        if (dto.take)
            query.take(dto.take);
    }
};
exports.DataStoreRowsRepository = DataStoreRowsRepository;
exports.DataStoreRowsRepository = DataStoreRowsRepository = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], DataStoreRowsRepository);
//# sourceMappingURL=data-store-rows.repository.js.map