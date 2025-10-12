import { UserError } from 'n8n-workflow';
export declare class DataStoreColumnNameConflictError extends UserError {
    constructor(columnName: string, dataStoreName: string);
}
