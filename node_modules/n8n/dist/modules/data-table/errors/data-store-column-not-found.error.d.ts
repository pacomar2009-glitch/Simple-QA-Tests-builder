import { UserError } from 'n8n-workflow';
export declare class DataStoreColumnNotFoundError extends UserError {
    constructor(dataStoreId: string, columnId: string);
}
