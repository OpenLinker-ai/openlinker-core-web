export function runtimeNodeActionPolicy(node) {
  const status = String(node?.status ?? "");
  const knownStatus = status === "active" || status === "draining" || status === "revoked";
  const features = Array.isArray(node?.features) ? node.features : [];

  return {
    knownStatus,
    canDrain: status === "active",
    canActivate:
      status === "draining" &&
      node?.contract_match === true &&
      features.includes("session_drain"),
    canRevoke: status === "active" || status === "draining",
    isRevoked: status === "revoked",
  };
}
