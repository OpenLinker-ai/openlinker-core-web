export interface RuntimeNodePolicyInput {
  status?: string | null;
  contract_match?: boolean | null;
  features?: string[] | null;
}

export interface RuntimeNodeActionPolicy {
  knownStatus: boolean;
  canDrain: boolean;
  canActivate: boolean;
  canRevoke: boolean;
  isRevoked: boolean;
}

export function runtimeNodeActionPolicy(node: RuntimeNodePolicyInput): RuntimeNodeActionPolicy;
