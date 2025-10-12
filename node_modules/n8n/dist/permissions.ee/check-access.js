"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userHasScopes = userHasScopes;
const db_1 = require("@n8n/db");
const di_1 = require("@n8n/di");
const permissions_1 = require("@n8n/permissions");
const n8n_workflow_1 = require("n8n-workflow");
const not_found_error_1 = require("../errors/response-errors/not-found.error");
const role_service_1 = require("../services/role.service");
async function userHasScopes(user, scopes, globalOnly, { credentialId, workflowId, projectId, }) {
    if ((0, permissions_1.hasGlobalScope)(user, scopes, { mode: 'allOf' }))
        return true;
    if (globalOnly)
        return false;
    const userProjectIds = (await di_1.Container.get(db_1.ProjectRepository)
        .createQueryBuilder('project')
        .innerJoin('project.projectRelations', 'relation')
        .innerJoin('relation.role', 'role')
        .innerJoin('role.scopes', 'scope')
        .where('relation.userId = :userId', { userId: user.id })
        .andWhere('scope.slug IN (:...scopes)', { scopes })
        .groupBy('project.id')
        .having('COUNT(DISTINCT scope.slug) = :scopeCount', { scopeCount: scopes.length })
        .select(['project.id AS id'])
        .getRawMany()).map((row) => row.id);
    const roleService = di_1.Container.get(role_service_1.RoleService);
    if (credentialId) {
        const credentials = await di_1.Container.get(db_1.SharedCredentialsRepository).findBy({
            credentialsId: credentialId,
        });
        if (!credentials.length) {
            throw new not_found_error_1.NotFoundError(`Credential with ID "${credentialId}" not found.`);
        }
        const validRoles = await roleService.rolesWithScope('credential', scopes);
        return credentials.some((c) => userProjectIds.includes(c.projectId) && validRoles.includes(c.role));
    }
    if (workflowId) {
        const workflows = await di_1.Container.get(db_1.SharedWorkflowRepository).findBy({
            workflowId,
        });
        if (!workflows.length) {
            throw new not_found_error_1.NotFoundError(`Workflow with ID "${workflowId}" not found.`);
        }
        const validRoles = await roleService.rolesWithScope('workflow', scopes);
        return workflows.some((w) => userProjectIds.includes(w.projectId) && validRoles.includes(w.role));
    }
    if (projectId)
        return userProjectIds.includes(projectId);
    throw new n8n_workflow_1.UnexpectedError("`@ProjectScope` decorator was used but does not have a `credentialId`, `workflowId`, or `projectId` in its URL parameters. This is likely an implementation error. If you're a developer, please check your URL is correct or that this should be using `@GlobalScope`.");
}
//# sourceMappingURL=check-access.js.map