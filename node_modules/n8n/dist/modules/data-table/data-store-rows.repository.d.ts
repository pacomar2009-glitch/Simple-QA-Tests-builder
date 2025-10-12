import { ListDataStoreContentQueryDto, DataTableFilter } from '@n8n/api-types';
import { DataSource, DataSourceOptions, QueryRunner, EntityManager } from '@n8n/typeorm';
import { DataStoreColumnJsType, DataStoreRows, DataStoreRowReturn, DataStoreRowsReturn, DataTableInsertRowsReturnType, DataTableInsertRowsResult } from 'n8n-workflow';
import { DataStoreUserTableName } from './data-store.types';
import { DataTableColumn } from './data-table-column.entity';
export declare class DataStoreRowsRepository {
    private dataSource;
    constructor(dataSource: DataSource);
    insertRowsBulk(table: DataStoreUserTableName, rows: DataStoreRows, columns: DataTableColumn[], em: EntityManager): Promise<{
        readonly success: true;
        readonly insertedRows: number;
    }>;
    insertRows<T extends DataTableInsertRowsReturnType>(dataStoreId: string, rows: DataStoreRows, columns: DataTableColumn[], returnType: T, em?: EntityManager): Promise<DataTableInsertRowsResult<T>>;
    updateRow<T extends boolean | undefined>(dataStoreId: string, data: Record<string, DataStoreColumnJsType | null>, filter: DataTableFilter, columns: DataTableColumn[], returnData?: T, em?: EntityManager): Promise<T extends true ? DataStoreRowReturn[] : true>;
    deleteRows(dataTableId: string, columns: DataTableColumn[], filter: DataTableFilter | undefined, returnData?: boolean): Promise<true | DataStoreRowReturn[]>;
    createTableWithColumns(dataStoreId: string, columns: DataTableColumn[], queryRunner: QueryRunner): Promise<void>;
    dropTable(dataStoreId: string, queryRunner: QueryRunner): Promise<void>;
    addColumn(dataStoreId: string, column: DataTableColumn, queryRunner: QueryRunner, dbType: DataSourceOptions['type']): Promise<void>;
    dropColumnFromTable(dataStoreId: string, columnName: string, queryRunner: QueryRunner, dbType: DataSourceOptions['type']): Promise<void>;
    getManyAndCount(dataStoreId: string, dto: ListDataStoreContentQueryDto, columns?: DataTableColumn[], em?: EntityManager): Promise<{
        count: number;
        data: DataStoreRowsReturn;
    }>;
    getManyByIds(dataStoreId: string, ids: number[], columns: DataTableColumn[], em: EntityManager): Promise<{
        [x: string]: DataStoreColumnJsType;
        id: number;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    private getManyQuery;
    private applyFilters;
    private applySorting;
    private applySortingByField;
    private applyPagination;
}
