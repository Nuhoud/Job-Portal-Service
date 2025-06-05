import { SetMetadata } from "@nestjs/common";
import { Role } from "../enums/role.enums";

export const ROLES_KEY = 'roles';
// ensure we're foing list of roles in them at least one role is required
export const Roles = (...roles: [Role,...Role[]]) => SetMetadata(ROLES_KEY, roles);
