import { DataStoreCreateColumnSchema } from '@n8n/api-types';
import { DataSource, EntityManager, Repository } from '@n8n/typeorm';
import { DataStoreRowsRepository } from './data-store-rows.repository';
import { DataTableColumn } from './data-table-column.entity';
export declare class DataStoreColumnRepository extends Repository<DataTableColumn> {
    private dataStoreRowsRepository;
    constructor(dataSource: DataSource, dataStoreRowsRepository: DataStoreRowsRepository);
    getColumns(dataTableId: string, em?: EntityManager): Promise<DataTableColumn[]>;
    addColumn(dataTableId: string, schema: DataStoreCreateColumnSchema): Promise<DataTableColumn>;
    deleteColumn(dataStoreId: string, column: DataTableColumn): Promise<void>;
    moveColumn(dataTableId: string, column: DataTableColumn, targetIndex: number): Promise<void>;
    shiftColumns(dataTableId: string, lowestIndex: number, delta: -1 | 1, em?: EntityManager): Promise<void>;
}
