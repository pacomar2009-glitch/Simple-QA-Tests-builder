import { z } from 'zod';
import { Z } from 'zod-class';
declare const ListDataStoreContentQueryDto_base: Z.Class<{
    take: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>, number, string | undefined>, number, string | undefined>, number, string | undefined>>;
    skip: z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>, number, string | undefined>, number, string | undefined>>;
    filter: z.ZodOptional<z.ZodEffects<z.ZodOptional<z.ZodString>, {
        type: "or" | "and";
        filters: {
            value: string | number | boolean | Date | null;
            columnName: string;
            condition: "eq" | "neq" | "like" | "ilike" | "gt" | "gte" | "lt" | "lte";
        }[];
    } | undefined, string | undefined>>;
    sortBy: z.ZodOptional<z.ZodEffects<z.ZodOptional<z.ZodString>, readonly [string, "ASC" | "DESC"] | undefined, string | undefined>>;
}>;
export declare class ListDataStoreContentQueryDto extends ListDataStoreContentQueryDto_base {
}
export {};
