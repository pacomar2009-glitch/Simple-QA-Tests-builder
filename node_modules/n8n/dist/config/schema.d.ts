export declare const schema: {
    executions: {
        mode: {
            doc: string;
            format: readonly ["regular", "queue"];
            default: string;
            env: string;
        };
    };
    userManagement: {
        isInstanceOwnerSetUp: {
            doc: string;
            format: BooleanConstructor;
            default: boolean;
        };
        authenticationMethod: {
            doc: string;
            format: readonly ["email", "ldap", "saml"];
            default: string;
        };
    };
    endpoints: {
        rest: {
            format: StringConstructor;
            default: string;
        };
    };
    ai: {
        enabled: {
            format: BooleanConstructor;
            default: boolean;
        };
    };
};
