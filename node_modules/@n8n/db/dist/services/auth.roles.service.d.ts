import { Logger } from '@n8n/backend-common';
import { RoleRepository, ScopeRepository } from '../repositories';
export declare class AuthRolesService {
    private readonly logger;
    private readonly scopeRepository;
    private readonly roleRepository;
    constructor(logger: Logger, scopeRepository: ScopeRepository, roleRepository: RoleRepository);
    private syncScopes;
    private syncRoles;
    init(): Promise<void>;
}
