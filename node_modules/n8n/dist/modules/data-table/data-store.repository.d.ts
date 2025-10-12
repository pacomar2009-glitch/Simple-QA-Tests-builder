import { type DataStoreCreateColumnSchema, type ListDataStoreQueryDto } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { DataSource, EntityManager, Repository } from '@n8n/typeorm';
import type { DataTablesSizeData } from 'n8n-workflow';
import { DataStoreRowsRepository } from './data-store-rows.repository';
import { DataTable } from './data-table.entity';
export declare class DataStoreRepository extends Repository<DataTable> {
    private dataStoreRowsRepository;
    private readonly globalConfig;
    constructor(dataSource: DataSource, dataStoreRowsRepository: DataStoreRowsRepository, globalConfig: GlobalConfig);
    createDataStore(projectId: string, name: string, columns: DataStoreCreateColumnSchema[]): Promise<DataTable>;
    deleteDataStore(dataStoreId: string, tx?: EntityManager): Promise<boolean>;
    transferDataStoreByProjectId(fromProjectId: string, toProjectId: string): Promise<boolean>;
    deleteDataStoreByProjectId(projectId: string): Promise<boolean>;
    deleteDataStoreAll(): Promise<boolean>;
    getManyAndCount(options: Partial<ListDataStoreQueryDto>): Promise<{
        count: number;
        data: DataTable[];
    }>;
    getMany(options: Partial<ListDataStoreQueryDto>): Promise<DataTable[]>;
    private getManyQuery;
    private applySelections;
    private applyFilters;
    private applySorting;
    private parseSortingParams;
    private applySortingByField;
    private applyPagination;
    private applyDefaultSelect;
    private getDataStoreColumnFields;
    private getProjectFields;
    private parseSize;
    findDataTablesSize(): Promise<DataTablesSizeData>;
    private getAllDataTablesSizeMap;
}
