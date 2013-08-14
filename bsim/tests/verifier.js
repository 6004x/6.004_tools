module("Verifiers");

test("TextVerifier", function() {
    var beta = new FakeBeta();

    var verifier = new BSim.TextVerifier(beta, {checksum: -318887899});
    ok(!verifier.verify(), "Verification fails on un-run beta.");
    ok(/no simulation results/i.test(verifier.getMessage()), "Failed with no simulation results message.");
    beta.setCycleCount(1);
    beta.setTtyContent("wrong");
    ok(!verifier.verify(), "Verification fails on beta with incorrect output.");
    ok(/not print out the expected result/i.test(verifier.getMessage()), "Failed with bad output message.");
    beta.setTtyContent("test string");
    ok(verifier.verify(), "Verification succeeds on beta with correct output.");
    equal(verifier.getMessage(), null, "Message is null on success.");
});

test("MemoryVerifier", function() {
    var beta = new FakeBeta();

    var bad_verifier = new BSim.MemoryVerifier(beta, {addresses: {}, checksum: 42, running_checksum: -42});
    ok(!bad_verifier.verify(), "Invalid checksum doesn't verify.");
    ok(/invalid checksum/.test(bad_verifier.getMessage()), "Invalid checksum reports correct error.");

    var verifier = new BSim.MemoryVerifier(beta, {addresses: {0x8: 42, 0xC: 24}, checksum: -10, running_checksum: -10});
    ok(!verifier.verify(), "Bad memory doesn't verify.");
    ok(/00000008/.test(verifier.getMessage()) && /0000002a/.test(verifier.getMessage()), "Bad memory value is reported.");
    beta.writeWord(0x8, 42);
    ok(!verifier.verify(), "One right, one wrong doesn't verify.");
    ok(/0000000c/.test(verifier.getMessage()) && /00000018/.test(verifier.getMessage()), "Second bad memory value is reported.");
    beta.writeWord(0xC, 24);
    ok(verifier.verify(), "Correct memory verifies.");
    equal(verifier.getMessage(), null, "Correct memory has null message.");
});
