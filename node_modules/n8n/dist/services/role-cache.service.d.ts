import { Logger } from '@n8n/backend-common';
import { type Scope } from '@n8n/permissions';
import { CacheService } from './cache/cache.service';
export declare class RoleCacheService {
    private readonly cacheService;
    private readonly logger;
    private static readonly CACHE_KEY;
    private static readonly CACHE_TTL;
    constructor(cacheService: CacheService, logger: Logger);
    private buildRoleScopeMap;
    getRolesWithAllScopes(namespace: 'global' | 'project' | 'credential' | 'workflow', requiredScopes: Scope[]): Promise<string[]>;
    invalidateCache(): Promise<void>;
    refreshCache(): Promise<void>;
}
