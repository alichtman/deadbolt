// Use lightweight Argon2id parameters in tests.
// Tests verify correctness of the encryption scheme, not KDF hardness.
process.env.DEADBOLT_ARGON2_TEST_PARAMS = '1';
