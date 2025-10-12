import { z } from 'zod';
import { Z } from 'zod-class';
declare const AddDataStoreRowsDto_base: Z.Class<{
    data: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodDate]>>, "many">;
    returnType: z.ZodUnion<[z.ZodLiteral<"all">, z.ZodLiteral<"count">, z.ZodLiteral<"id">]>;
}>;
export declare class AddDataStoreRowsDto extends AddDataStoreRowsDto_base {
}
export {};
