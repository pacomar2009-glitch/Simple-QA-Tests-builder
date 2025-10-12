import { z } from 'zod';
import { Z } from 'zod-class';
declare const AddUsersToProjectDto_base: Z.Class<{
    relations: z.ZodArray<z.ZodObject<{
        userId: z.ZodString;
        role: z.ZodUnion<[z.ZodEnum<["project:admin", "project:editor", "project:viewer"]>, z.ZodEffects<z.ZodString, string, string>]>;
    }, "strip", z.ZodTypeAny, {
        userId: string;
        role: string;
    }, {
        userId: string;
        role: string;
    }>, "many">;
}>;
export declare class AddUsersToProjectDto extends AddUsersToProjectDto_base {
}
export {};
