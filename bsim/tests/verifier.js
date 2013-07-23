module("Verifiers");

test("TextVerifier", function() {
    var beta = new FakeBeta();

    var verifier = new BSim.TextVerifier(beta, -318887899);
    ok(!verifier.verify(), "Verification fails on un-run beta.");
    ok(/no simulation results/i.test(verifier.getMessage()), "Failed with no simulation results message.")
    beta.setCycleCount(1);
    beta.setTtyContent("wrong");
    ok(!verifier.verify(), "Verification fails on beta with incorrect output.");
    ok(/not print out the expected result/i.test(verifier.getMessage()), "Failed with bad output message.")
    beta.setTtyContent("test string");
    ok(verifier.verify(), "Verification succeeds on beta with correct output.");
    equal(verifier.getMessage(), null, "Message is null on success.");
});

