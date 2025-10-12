"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toDslColumns = toDslColumns;
exports.isValidColumnName = isValidColumnName;
exports.addColumnQuery = addColumnQuery;
exports.deleteColumnQuery = deleteColumnQuery;
exports.quoteIdentifier = quoteIdentifier;
exports.extractReturningData = extractReturningData;
exports.extractInsertedIds = extractInsertedIds;
exports.normalizeRows = normalizeRows;
exports.normalizeValue = normalizeValue;
exports.toSqliteGlobFromPercent = toSqliteGlobFromPercent;
exports.escapeLikeSpecials = escapeLikeSpecials;
exports.toTableName = toTableName;
exports.toTableId = toTableId;
const api_types_1 = require("@n8n/api-types");
const config_1 = require("@n8n/config");
const db_1 = require("@n8n/db");
const di_1 = require("@n8n/di");
const n8n_workflow_1 = require("n8n-workflow");
const not_found_error_1 = require("../../../errors/response-errors/not-found.error");
function toDslColumns(columns) {
    return columns.map((col) => {
        const name = new db_1.DslColumn(col.name.trim());
        switch (col.type) {
            case 'number':
                return name.double;
            case 'boolean':
                return name.bool;
            case 'string':
                return name.text;
            case 'date':
                return name.timestampTimezone();
            default:
                return name.text;
        }
    });
}
function dataStoreColumnTypeToSql(type, dbType) {
    switch (type) {
        case 'string':
            return 'TEXT';
        case 'number':
            switch (dbType) {
                case 'postgres':
                    return 'DOUBLE PRECISION';
                case 'mysql':
                case 'mariadb':
                    return 'DOUBLE';
                case 'sqlite':
                    return 'REAL';
                default:
                    return 'DOUBLE';
            }
        case 'boolean':
            return 'BOOLEAN';
        case 'date':
            if (dbType === 'postgres') {
                return 'TIMESTAMP';
            }
            return 'DATETIME';
        default:
            throw new not_found_error_1.NotFoundError(`Unsupported field type: ${type}`);
    }
}
function columnToWildcardAndType(column, dbType) {
    return `${quoteIdentifier(column.name, dbType)} ${dataStoreColumnTypeToSql(column.type, dbType)}`;
}
function isValidColumnName(name) {
    return api_types_1.dataStoreColumnNameSchema.safeParse(name).success;
}
function addColumnQuery(tableName, column, dbType) {
    if (!isValidColumnName(column.name)) {
        throw new n8n_workflow_1.UnexpectedError(api_types_1.DATA_STORE_COLUMN_ERROR_MESSAGE);
    }
    const quotedTableName = quoteIdentifier(tableName, dbType);
    return `ALTER TABLE ${quotedTableName} ADD ${columnToWildcardAndType(column, dbType)}`;
}
function deleteColumnQuery(tableName, column, dbType) {
    const quotedTableName = quoteIdentifier(tableName, dbType);
    return `ALTER TABLE ${quotedTableName} DROP COLUMN ${quoteIdentifier(column, dbType)}`;
}
function quoteIdentifier(name, dbType) {
    switch (dbType) {
        case 'mysql':
        case 'mariadb':
            return `\`${name}\``;
        case 'postgres':
        case 'sqlite':
        default:
            return `"${name}"`;
    }
}
const isArrayOf = (data, itemGuard) => Array.isArray(data) && data.every(itemGuard);
const isNumber = (value) => {
    return typeof value === 'number' && Number.isFinite(value);
};
const isDate = (value) => {
    return value instanceof Date;
};
function hasInsertId(data) {
    return typeof data === 'object' && data !== null && 'insertId' in data && isNumber(data.insertId);
}
function hasRowReturnData(data) {
    return (typeof data === 'object' &&
        data !== null &&
        'id' in data &&
        isNumber(data.id) &&
        'createdAt' in data &&
        (isDate(data.createdAt) || typeof data.createdAt === 'string') &&
        'updatedAt' in data &&
        (isDate(data.updatedAt) || typeof data.updatedAt === 'string'));
}
function hasRowId(data) {
    return typeof data === 'object' && data !== null && 'id' in data && isNumber(data.id);
}
function extractReturningData(raw) {
    if (!isArrayOf(raw, hasRowReturnData)) {
        throw new n8n_workflow_1.UnexpectedError(`Expected INSERT INTO raw to be { id: number; createdAt: string; updatedAt: string }[] on Postgres or MariaDB. Is '${JSON.stringify(raw)}'`);
    }
    return raw;
}
function extractInsertedIds(raw, dbType) {
    switch (dbType) {
        case 'postgres':
        case 'mariadb': {
            if (!isArrayOf(raw, hasRowId)) {
                throw new n8n_workflow_1.UnexpectedError(`Expected INSERT INTO raw to be { id: number }[] on Postgres or MariaDB. Is '${JSON.stringify(raw)}'`);
            }
            return raw.map((r) => r.id);
        }
        case 'mysql': {
            if (!hasInsertId(raw)) {
                throw new n8n_workflow_1.UnexpectedError('Expected INSERT INTO raw.insertId: number for MySQL');
            }
            return [raw.insertId];
        }
        case 'sqlite':
        default: {
            if (!isNumber(raw)) {
                throw new n8n_workflow_1.UnexpectedError('Expected INSERT INTO raw to be a number for SQLite');
            }
            return [raw];
        }
    }
}
function normalizeRows(rows, columns) {
    const systemColumns = [
        { name: 'createdAt', type: 'date' },
        { name: 'updatedAt', type: 'date' },
    ];
    const typeMap = new Map([...columns, ...systemColumns].map((col) => [col.name, col.type]));
    return rows.map((row) => {
        const normalized = { ...row };
        for (const [key, value] of Object.entries(row)) {
            const type = typeMap.get(key);
            if (type === 'boolean') {
                if (typeof value === 'boolean') {
                    normalized[key] = value;
                }
                else if (value === 1 || value === '1') {
                    normalized[key] = true;
                }
                else if (value === 0 || value === '0') {
                    normalized[key] = false;
                }
            }
            if (type === 'date' && value !== null && value !== undefined) {
                let dateObj = null;
                if (value instanceof Date) {
                    dateObj = value;
                }
                else if (typeof value === 'string') {
                    const parsed = new Date(value.endsWith('Z') ? value : value + 'Z');
                    if (!isNaN(parsed.getTime())) {
                        dateObj = parsed;
                    }
                }
                else if (typeof value === 'number') {
                    const parsed = new Date(value);
                    if (!isNaN(parsed.getTime())) {
                        dateObj = parsed;
                    }
                }
                normalized[key] = dateObj ?? value;
            }
        }
        return normalized;
    });
}
function formatDateForDatabase(date, dbType) {
    if (dbType === 'mysql' || dbType === 'mariadb') {
        return date.toISOString().replace('T', ' ').replace('Z', '');
    }
    return date.toISOString();
}
function normalizeValue(value, columnType, dbType) {
    if (columnType !== 'date' || value === null || value === undefined) {
        return value;
    }
    if (value instanceof Date) {
        return formatDateForDatabase(value, dbType);
    }
    if (typeof value === 'string') {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            return formatDateForDatabase(date, dbType);
        }
    }
    return value;
}
function toSqliteGlobFromPercent(input) {
    const out = [];
    for (const ch of String(input ?? '')) {
        if (ch === '%')
            out.push('*');
        else if (ch === '[')
            out.push('[[]');
        else if (ch === ']')
            out.push('[]]');
        else if (ch === '*')
            out.push('[*]');
        else if (ch === '?')
            out.push('[?]');
        else
            out.push(ch);
    }
    return out.join('');
}
function escapeLikeSpecials(input) {
    return input
        .replace(/\\/g, '\\\\')
        .replace(/_/g, '\\_');
}
function toTableName(dataStoreId) {
    const { tablePrefix } = di_1.Container.get(config_1.GlobalConfig).database;
    return `${tablePrefix}data_table_user_${dataStoreId}`;
}
function toTableId(tableName) {
    return tableName.replace(/.*data_table_user_/, '');
}
//# sourceMappingURL=sql-utils.js.map