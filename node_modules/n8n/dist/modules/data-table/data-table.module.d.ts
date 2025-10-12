import type { ModuleInterface } from '@n8n/decorators';
export declare class DataStoreModule implements ModuleInterface {
    init(): Promise<void>;
    shutdown(): Promise<void>;
    entities(): Promise<(typeof import("./data-table.entity").DataTable | typeof import("./data-table-column.entity").DataTableColumn)[]>;
    context(): Promise<{
        dataStoreProxyProvider: import("./data-store-proxy.service").DataStoreProxyService;
    }>;
}
