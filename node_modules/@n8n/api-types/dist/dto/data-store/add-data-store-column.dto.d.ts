import { Z } from 'zod-class';
declare const AddDataStoreColumnDto_base: Z.Class<{
    name: import("zod").ZodString;
    type: import("zod").ZodEnum<["string", "number", "boolean", "date"]>;
    index: import("zod").ZodOptional<import("zod").ZodNumber>;
}>;
export declare class AddDataStoreColumnDto extends AddDataStoreColumnDto_base {
}
export {};
