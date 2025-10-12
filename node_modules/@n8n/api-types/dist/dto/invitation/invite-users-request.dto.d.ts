import { z } from 'zod';
declare const invitedUserSchema: z.ZodObject<{
    email: z.ZodString;
    role: z.ZodDefault<z.ZodUnion<[z.ZodEnum<["global:admin", "global:member"]>, z.ZodEffects<z.ZodString, string, string>]>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    role: string;
}, {
    email: string;
    role?: string | undefined;
}>;
export declare class InviteUsersRequestDto extends Array<z.infer<typeof invitedUserSchema>> {
    static safeParse(data: unknown): z.SafeParseReturnType<{
        email: string;
        role?: string | undefined;
    }[], {
        email: string;
        role: string;
    }[]>;
}
export {};
