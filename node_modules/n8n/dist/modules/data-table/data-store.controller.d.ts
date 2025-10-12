import { AddDataStoreRowsDto, AddDataStoreColumnDto, CreateDataStoreDto, DeleteDataTableRowsDto, ListDataStoreContentQueryDto, ListDataStoreQueryDto, MoveDataStoreColumnDto, UpdateDataStoreDto, UpdateDataTableRowDto, UpsertDataStoreRowDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { DataStoreRowReturn } from 'n8n-workflow';
import { DataStoreService } from './data-store.service';
export declare class DataStoreController {
    private readonly dataStoreService;
    constructor(dataStoreService: DataStoreService);
    createDataStore(req: AuthenticatedRequest<{
        projectId: string;
    }>, _res: Response, dto: CreateDataStoreDto): Promise<import("./data-table.entity").DataTable>;
    listProjectDataStores(req: AuthenticatedRequest<{
        projectId: string;
    }>, _res: Response, payload: ListDataStoreQueryDto): Promise<{
        count: number;
        data: import("./data-table.entity").DataTable[];
    }>;
    updateDataStore(req: AuthenticatedRequest<{
        projectId: string;
    }>, _res: Response, dataStoreId: string, dto: UpdateDataStoreDto): Promise<boolean>;
    deleteDataStore(req: AuthenticatedRequest<{
        projectId: string;
    }>, _res: Response, dataStoreId: string): Promise<boolean>;
    getColumns(req: AuthenticatedRequest<{
        projectId: string;
    }>, _res: Response, dataStoreId: string): Promise<import("./data-table-column.entity").DataTableColumn[]>;
    addColumn(req: AuthenticatedRequest<{
        projectId: string;
    }>, _res: Response, dataStoreId: string, dto: AddDataStoreColumnDto): Promise<import("./data-table-column.entity").DataTableColumn>;
    deleteColumn(req: AuthenticatedRequest<{
        projectId: string;
    }>, _res: Response, dataStoreId: string, columnId: string): Promise<boolean>;
    moveColumn(req: AuthenticatedRequest<{
        projectId: string;
    }>, _res: Response, dataStoreId: string, columnId: string, dto: MoveDataStoreColumnDto): Promise<boolean>;
    getDataStoreRows(req: AuthenticatedRequest<{
        projectId: string;
    }>, _res: Response, dataStoreId: string, dto: ListDataStoreContentQueryDto): Promise<{
        count: number;
        data: {
            [x: string]: import("n8n-workflow").DataStoreColumnJsType;
            id: number;
            createdAt: Date;
            updatedAt: Date;
        }[];
    }>;
    appendDataStoreRows<T extends DataStoreRowReturn | undefined>(req: AuthenticatedRequest<{
        projectId: string;
    }>, _res: Response, dataStoreId: string, dto: AddDataStoreRowsDto & {
        returnType?: T;
    }): Promise<Array<T extends true ? DataStoreRowReturn : Pick<DataStoreRowReturn, 'id'>>>;
    upsertDataStoreRow(req: AuthenticatedRequest<{
        projectId: string;
    }>, _res: Response, dataStoreId: string, dto: UpsertDataStoreRowDto): Promise<true | DataStoreRowReturn[]>;
    updateDataStoreRow(req: AuthenticatedRequest<{
        projectId: string;
    }>, _res: Response, dataStoreId: string, dto: UpdateDataTableRowDto): Promise<true | DataStoreRowReturn[]>;
    deleteDataTableRows(req: AuthenticatedRequest<{
        projectId: string;
    }>, _res: Response, dataTableId: string, dto: DeleteDataTableRowsDto): Promise<true | DataStoreRowReturn[]>;
}
