import { z } from 'zod';
import { BaseCommand } from '../base-command';
declare const flagsSchema: z.ZodObject<{
    outputDir: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    outputDir: string;
}, {
    outputDir?: string | undefined;
}>;
export declare class ExportEntitiesCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
    run(): Promise<void>;
    catch(error: Error): void;
}
export {};
