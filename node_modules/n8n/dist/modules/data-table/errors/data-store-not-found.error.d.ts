import { UserError } from 'n8n-workflow';
export declare class DataStoreNotFoundError extends UserError {
    constructor(dataStoreId: string);
}
