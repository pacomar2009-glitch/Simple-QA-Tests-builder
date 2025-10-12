import type { AddDataStoreColumnDto, CreateDataStoreDto, DeleteDataTableRowsDto, ListDataStoreContentQueryDto, MoveDataStoreColumnDto, DataStoreListOptions, UpsertDataStoreRowDto, UpdateDataStoreDto, UpdateDataTableRowDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ProjectRelationRepository, type User } from '@n8n/db';
import type { DataStoreColumnJsType, DataStoreRowReturn, DataStoreRows, DataTableInsertRowsReturnType, DataTableInsertRowsResult, DataTablesSizeResult } from 'n8n-workflow';
import { RoleService } from '../../services/role.service';
import { DataStoreColumnRepository } from './data-store-column.repository';
import { DataStoreRowsRepository } from './data-store-rows.repository';
import { DataStoreSizeValidator } from './data-store-size-validator.service';
import { DataStoreRepository } from './data-store.repository';
import { DataTableColumn } from './data-table-column.entity';
export declare class DataStoreService {
    private readonly dataStoreRepository;
    private readonly dataStoreColumnRepository;
    private readonly dataStoreRowsRepository;
    private readonly logger;
    private readonly dataStoreSizeValidator;
    private readonly projectRelationRepository;
    private readonly roleService;
    constructor(dataStoreRepository: DataStoreRepository, dataStoreColumnRepository: DataStoreColumnRepository, dataStoreRowsRepository: DataStoreRowsRepository, logger: Logger, dataStoreSizeValidator: DataStoreSizeValidator, projectRelationRepository: ProjectRelationRepository, roleService: RoleService);
    start(): Promise<void>;
    shutdown(): Promise<void>;
    createDataStore(projectId: string, dto: CreateDataStoreDto): Promise<import("./data-table.entity").DataTable>;
    updateDataStore(dataStoreId: string, projectId: string, dto: UpdateDataStoreDto): Promise<boolean>;
    transferDataStoresByProjectId(fromProjectId: string, toProjectId: string): Promise<boolean>;
    deleteDataStoreByProjectId(projectId: string): Promise<boolean>;
    deleteDataStoreAll(): Promise<boolean>;
    deleteDataStore(dataStoreId: string, projectId: string): Promise<boolean>;
    addColumn(dataStoreId: string, projectId: string, dto: AddDataStoreColumnDto): Promise<DataTableColumn>;
    moveColumn(dataStoreId: string, projectId: string, columnId: string, dto: MoveDataStoreColumnDto): Promise<boolean>;
    deleteColumn(dataStoreId: string, projectId: string, columnId: string): Promise<boolean>;
    getManyAndCount(options: DataStoreListOptions): Promise<{
        count: number;
        data: import("./data-table.entity").DataTable[];
    }>;
    getManyRowsAndCount(dataStoreId: string, projectId: string, dto: ListDataStoreContentQueryDto): Promise<{
        count: number;
        data: {
            [x: string]: DataStoreColumnJsType;
            id: number;
            createdAt: Date;
            updatedAt: Date;
        }[];
    }>;
    getColumns(dataStoreId: string, projectId: string): Promise<DataTableColumn[]>;
    insertRows<T extends DataTableInsertRowsReturnType = 'count'>(dataStoreId: string, projectId: string, rows: DataStoreRows, returnType?: T): Promise<DataTableInsertRowsResult<T>>;
    upsertRow<T extends boolean | undefined>(dataTableId: string, projectId: string, dto: Omit<UpsertDataStoreRowDto, 'returnData'>, returnData?: T): Promise<T extends true ? DataStoreRowReturn[] : true>;
    validateUpdateParams({ filter, data }: Pick<UpdateDataTableRowDto, 'filter' | 'data'>, columns: DataTableColumn[]): void;
    updateRow<T extends boolean | undefined>(dataTableId: string, projectId: string, dto: Omit<UpdateDataTableRowDto, 'returnData'>, returnData?: T): Promise<T extends true ? DataStoreRowReturn[] : true>;
    deleteRows<T extends boolean | undefined>(dataStoreId: string, projectId: string, dto: Omit<DeleteDataTableRowsDto, 'returnData'>, returnData?: T): Promise<T extends true ? DataStoreRowReturn[] : true>;
    private validateRowsWithColumns;
    private validateCell;
    private validateDataStoreExists;
    private validateColumnExists;
    private validateUniqueName;
    private validateAndTransformFilters;
    private validateDataTableSize;
    getDataTablesSize(user: User): Promise<DataTablesSizeResult>;
}
