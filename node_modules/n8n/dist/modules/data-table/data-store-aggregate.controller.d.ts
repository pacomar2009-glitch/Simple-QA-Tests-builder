import { ListDataStoreQueryDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { DataStoreAggregateService } from './data-store-aggregate.service';
import { DataStoreService } from './data-store.service';
export declare class DataStoreAggregateController {
    private readonly dataStoreAggregateService;
    private readonly dataStoreService;
    constructor(dataStoreAggregateService: DataStoreAggregateService, dataStoreService: DataStoreService);
    listDataStores(req: AuthenticatedRequest, _res: Response, payload: ListDataStoreQueryDto): Promise<{
        count: number;
        data: import("./data-table.entity").DataTable[];
    }>;
    getDataTablesSize(req: AuthenticatedRequest): Promise<import("n8n-workflow").DataTablesSizeResult>;
}
