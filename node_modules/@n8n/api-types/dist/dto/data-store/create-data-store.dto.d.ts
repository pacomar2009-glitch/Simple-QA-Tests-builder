import { z } from 'zod';
import { Z } from 'zod-class';
import { CreateDataStoreColumnDto } from './create-data-store-column.dto';
declare const CreateDataStoreDto_base: Z.Class<{
    name: z.ZodString;
    columns: z.ZodArray<typeof CreateDataStoreColumnDto, "many">;
}>;
export declare class CreateDataStoreDto extends CreateDataStoreDto_base {
}
export {};
