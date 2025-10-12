import type { ListQueryDb } from '@n8n/db';
import { Project, User, ProjectRelationRepository, SharedWorkflowRepository, UserRepository } from '@n8n/db';
import { CacheService } from '../services/cache/cache.service';
export declare class OwnershipService {
    private cacheService;
    private userRepository;
    private projectRelationRepository;
    private sharedWorkflowRepository;
    constructor(cacheService: CacheService, userRepository: UserRepository, projectRelationRepository: ProjectRelationRepository, sharedWorkflowRepository: SharedWorkflowRepository);
    copyProject(project: Project): Partial<Project>;
    reconstructProject(project: Partial<Project>): Project | undefined;
    copyUser(user: User): Partial<User>;
    reconstructUser(cachedUser: Partial<User>): User | undefined;
    getWorkflowProjectCached(workflowId: string): Promise<Project>;
    setWorkflowProjectCacheEntry(workflowId: string, project: Project): Promise<Project>;
    getPersonalProjectOwnerCached(projectId: string): Promise<User | null>;
    addOwnedByAndSharedWith(rawWorkflow: ListQueryDb.Workflow.WithSharing): ListQueryDb.Workflow.WithOwnedByAndSharedWith;
    addOwnedByAndSharedWith(rawCredential: ListQueryDb.Credentials.WithSharing): ListQueryDb.Credentials.WithOwnedByAndSharedWith;
    getInstanceOwner(): Promise<User>;
}
