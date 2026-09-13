const crypto = require("crypto");

function sessionToken() {
  return crypto.randomBytes(32).toString("hex"); // 64 chars, matches CHAR(64) columns
}

// Access codes: human-typeable, avoids visually ambiguous chars (0/O, 1/I/L).
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function accessCode() {
  const group = () =>
    Array.from({ length: 4 }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join("");
  return `AXR-${group()}-${group()}`;
}

module.exports = { sessionToken, accessCode };
