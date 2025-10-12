import { z } from 'zod';
export declare const bannerNameSchema: z.ZodEnum<["V1", "TRIAL_OVER", "TRIAL", "NON_PRODUCTION_LICENSE", "EMAIL_CONFIRMATION", "DATA_STORE_STORAGE_LIMIT_WARNING", "DATA_STORE_STORAGE_LIMIT_ERROR"]>;
export type BannerName = z.infer<typeof bannerNameSchema>;
