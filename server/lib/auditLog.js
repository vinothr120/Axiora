// Structured stdout logging for login attempts — gives an audit trail for
// brute-force/credential-stuffing detection without storing secrets in logs.
function logLoginAttempt({ type, identifier, ip, result }) {
  const line = `[axiora][auth] type=${type} ip=${ip} identifier=${identifier} result=${result}`;
  if (result === "success") console.log(line);
  else console.warn(line);
}

// Access codes are the auth secret itself — never log one in full.
function maskCode(code) {
  const parts = String(code || "").split("-");
  if (parts.length !== 3) return "invalid";
  return `${parts[0]}-${parts[1]}-****`;
}

module.exports = { logLoginAttempt, maskCode };
