import { UserError } from 'n8n-workflow';
export declare class DataStoreNameConflictError extends UserError {
    constructor(name: string);
}
