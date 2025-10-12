import { GlobalConfig } from '@n8n/config';
import { DataTableSizeStatus, DataTablesSizeData } from 'n8n-workflow';
export declare class DataStoreSizeValidator {
    private readonly globalConfig;
    private lastCheck;
    private cachedSizeData;
    private pendingCheck;
    constructor(globalConfig: GlobalConfig);
    private shouldRefresh;
    getCachedSizeData(fetchSizeDataFn: () => Promise<DataTablesSizeData>, now?: Date): Promise<DataTablesSizeData>;
    validateSize(fetchSizeFn: () => Promise<DataTablesSizeData>, now?: Date): Promise<void>;
    sizeToState(sizeBytes: number): DataTableSizeStatus;
    getSizeStatus(fetchSizeFn: () => Promise<DataTablesSizeData>, now?: Date): Promise<DataTableSizeStatus>;
    private toMb;
    reset(): void;
}
