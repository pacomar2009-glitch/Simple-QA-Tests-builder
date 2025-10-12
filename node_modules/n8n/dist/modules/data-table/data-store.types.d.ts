import type { FieldTypeMap } from 'n8n-workflow';
export type DataStoreUserTableName = `${string}data_table_user_${string}`;
export declare const columnTypeToFieldType: Record<string, keyof FieldTypeMap>;
