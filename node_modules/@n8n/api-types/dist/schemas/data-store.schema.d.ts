import { z } from 'zod';
import type { ListDataStoreQueryDto } from '../dto';
export declare const insertRowReturnType: z.ZodUnion<[z.ZodLiteral<"all">, z.ZodLiteral<"count">, z.ZodLiteral<"id">]>;
export declare const dataStoreNameSchema: z.ZodString;
export declare const dataStoreIdSchema: z.ZodString;
export declare const DATA_STORE_COLUMN_REGEX: RegExp;
export declare const DATA_STORE_COLUMN_MAX_LENGTH = 63;
export declare const DATA_STORE_COLUMN_ERROR_MESSAGE = "Only alphabetical characters and non-leading numbers and underscores are allowed for column names, and the maximum length is 63 characters.";
export declare const dataStoreColumnNameSchema: z.ZodString;
export declare const dataStoreColumnTypeSchema: z.ZodEnum<["string", "number", "boolean", "date"]>;
export declare const dataStoreCreateColumnSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodEnum<["string", "number", "boolean", "date"]>;
    index: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type: "string" | "number" | "boolean" | "date";
    name: string;
    index?: number | undefined;
}, {
    type: "string" | "number" | "boolean" | "date";
    name: string;
    index?: number | undefined;
}>;
export type DataStoreCreateColumnSchema = z.infer<typeof dataStoreCreateColumnSchema>;
export declare const dataStoreColumnSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodEnum<["string", "number", "boolean", "date"]>;
    index: z.ZodOptional<z.ZodNumber>;
} & {
    dataStoreId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "string" | "number" | "boolean" | "date";
    name: string;
    dataStoreId: string;
    index?: number | undefined;
}, {
    type: "string" | "number" | "boolean" | "date";
    name: string;
    dataStoreId: string;
    index?: number | undefined;
}>;
export declare const dataStoreSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    columns: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        type: z.ZodEnum<["string", "number", "boolean", "date"]>;
        index: z.ZodOptional<z.ZodNumber>;
    } & {
        dataStoreId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "string" | "number" | "boolean" | "date";
        name: string;
        dataStoreId: string;
        index?: number | undefined;
    }, {
        type: "string" | "number" | "boolean" | "date";
        name: string;
        dataStoreId: string;
        index?: number | undefined;
    }>, "many">;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    columns: {
        type: "string" | "number" | "boolean" | "date";
        name: string;
        dataStoreId: string;
        index?: number | undefined;
    }[];
}, {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    columns: {
        type: "string" | "number" | "boolean" | "date";
        name: string;
        dataStoreId: string;
        index?: number | undefined;
    }[];
}>;
export type DataStore = z.infer<typeof dataStoreSchema>;
export type DataStoreColumn = z.infer<typeof dataStoreColumnSchema>;
export type DataStoreListFilter = {
    id?: string | string[];
    projectId?: string | string[];
    name?: string;
};
export type DataStoreListOptions = Partial<ListDataStoreQueryDto> & {
    filter: {
        projectId: string;
    };
};
export declare const dateTimeSchema: z.ZodPipeline<z.ZodEffects<z.ZodString, Date, string>, z.ZodDate>;
export declare const dataStoreColumnValueSchema: z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodDate]>;
