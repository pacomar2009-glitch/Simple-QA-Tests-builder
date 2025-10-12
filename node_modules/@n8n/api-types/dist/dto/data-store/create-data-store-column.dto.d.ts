import { Z } from 'zod-class';
declare const CreateDataStoreColumnDto_base: Z.Class<{
    name: import("zod").ZodString;
    type: import("zod").ZodEnum<["string", "number", "boolean", "date"]>;
}>;
export declare class CreateDataStoreColumnDto extends CreateDataStoreColumnDto_base {
}
export {};
