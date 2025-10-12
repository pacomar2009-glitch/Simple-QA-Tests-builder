import convict from 'convict';
declare const config: convict.Config<{
    executions: {
        mode: string;
    };
    userManagement: {
        isInstanceOwnerSetUp: boolean;
        authenticationMethod: string;
    };
    endpoints: {
        rest: string;
    };
    ai: {
        enabled: boolean;
    };
}>;
export default config;
export type Config = typeof config;
