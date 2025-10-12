"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthRolesService = void 0;
const backend_common_1 = require("@n8n/backend-common");
const di_1 = require("@n8n/di");
const permissions_1 = require("@n8n/permissions");
const entities_1 = require("../entities");
const repositories_1 = require("../repositories");
let AuthRolesService = class AuthRolesService {
    constructor(logger, scopeRepository, roleRepository) {
        this.logger = logger;
        this.scopeRepository = scopeRepository;
        this.roleRepository = roleRepository;
    }
    async syncScopes() {
        const availableScopes = await this.scopeRepository.find({
            select: {
                slug: true,
                displayName: true,
                description: true,
            },
        });
        const availableScopesMap = new Map(availableScopes.map((scope) => [scope.slug, scope]));
        const scopesToUpdate = permissions_1.ALL_SCOPES.map((slug) => {
            const info = permissions_1.scopeInformation[slug] ?? {
                displayName: slug,
                description: null,
            };
            const existingScope = availableScopesMap.get(slug);
            if (!existingScope) {
                const newScope = new entities_1.Scope();
                newScope.slug = slug;
                newScope.displayName = info.displayName;
                newScope.description = info.description ?? null;
                return newScope;
            }
            const needsUpdate = existingScope.displayName !== info.displayName ||
                existingScope.description !== info.description;
            if (needsUpdate) {
                existingScope.displayName = info.displayName;
                existingScope.description = info.description ?? null;
                return existingScope;
            }
            return null;
        }).filter((scope) => scope !== null);
        if (scopesToUpdate.length > 0) {
            this.logger.debug(`Updating ${scopesToUpdate.length} scopes...`);
            await this.scopeRepository.save(scopesToUpdate);
            this.logger.debug('Scopes updated successfully.');
        }
        else {
            this.logger.debug('No scopes to update.');
        }
    }
    async syncRoles() {
        const existingRoles = await this.roleRepository.find({
            select: {
                slug: true,
                displayName: true,
                description: true,
                systemRole: true,
                roleType: true,
            },
            where: {
                systemRole: true,
            },
        });
        const allScopes = await this.scopeRepository.find({
            select: {
                slug: true,
            },
        });
        const existingRolesMap = new Map(existingRoles.map((role) => [role.slug, role]));
        for (const roleNamespace of Object.keys(permissions_1.ALL_ROLES)) {
            const rolesToUpdate = permissions_1.ALL_ROLES[roleNamespace]
                .map((role) => {
                const existingRole = existingRolesMap.get(role.slug);
                if (!existingRole) {
                    const newRole = this.roleRepository.create({
                        slug: role.slug,
                        displayName: role.displayName,
                        description: role.description ?? null,
                        roleType: roleNamespace,
                        systemRole: true,
                        scopes: allScopes.filter((scope) => role.scopes.includes(scope.slug)),
                    });
                    return newRole;
                }
                const needsUpdate = existingRole.displayName !== role.displayName ||
                    existingRole.description !== role.description ||
                    existingRole.roleType !== roleNamespace ||
                    existingRole.scopes.some((scope) => !role.scopes.includes(scope.slug)) ||
                    role.scopes.some((scope) => !existingRole.scopes.some((s) => s.slug === scope));
                if (needsUpdate) {
                    existingRole.displayName = role.displayName;
                    existingRole.description = role.description ?? null;
                    existingRole.roleType = roleNamespace;
                    existingRole.scopes = allScopes.filter((scope) => role.scopes.includes(scope.slug));
                    return existingRole;
                }
                return null;
            })
                .filter((role) => role !== null);
            if (rolesToUpdate.length > 0) {
                this.logger.debug(`Updating ${rolesToUpdate.length} ${roleNamespace} roles...`);
                await this.roleRepository.save(rolesToUpdate);
                this.logger.debug(`${roleNamespace} roles updated successfully.`);
            }
            else {
                this.logger.debug(`No ${roleNamespace} roles to update.`);
            }
        }
    }
    async init() {
        this.logger.debug('Initializing AuthRolesService...');
        await this.syncScopes();
        await this.syncRoles();
        this.logger.debug('AuthRolesService initialized successfully.');
    }
};
exports.AuthRolesService = AuthRolesService;
exports.AuthRolesService = AuthRolesService = __decorate([
    (0, di_1.Service)(),
    __metadata("design:paramtypes", [backend_common_1.Logger,
        repositories_1.ScopeRepository,
        repositories_1.RoleRepository])
], AuthRolesService);
//# sourceMappingURL=auth.roles.service.js.map